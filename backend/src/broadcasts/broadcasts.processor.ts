import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from '../whatsapp/meta-api.service';
import { EventsGateway } from '../events/events.gateway';
import { BroadcastStatus } from '@prisma/client';

// CRITICAL FIX: Increase concurrency to handle thousands of messages efficiently
@Processor('broadcasts', { concurrency: 50 })
export class BroadcastsProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { broadcastId } = job.data;
    this.logger.log(`Processing broadcast ${broadcastId}`);

    let broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: { template: true },
    });

    if (!broadcast || broadcast.status !== BroadcastStatus.SCHEDULED) {
      this.logger.warn(`Broadcast ${broadcastId} not found or not scheduled.`);
      return;
    }

    broadcast = await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.SENDING },
      include: { template: true },
    });
    this.eventsGateway.notifyBroadcastUpdate(broadcast);

    try {
      const filters: any = broadcast.targetAudience || {};
      const customers = await this.prisma.customer.findMany({
        where: filters,
      });

      let sent = 0;
      let failed = 0;

      // Process in batches to avoid overwhelming the Meta API
      const batchSize = 20;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (customer) => {
          try {
            await this.metaApi.sendTemplate(
              customer.phone,
              broadcast!.template.name,
              broadcast!.template.language,
              [] 
            );
            sent++;
          } catch (error) {
            failed++;
            this.logger.error(`Failed to send to ${customer.phone}`, error);
          }
        }));

        // Update progress
        const progress = Math.round(((sent + failed) / customers.length) * 100);
        await job.updateProgress(progress);
        
        broadcast = await this.prisma.broadcast.update({
          where: { id: broadcastId },
          data: { sentCount: sent, failedCount: failed },
          include: { template: true },
        });
        this.eventsGateway.notifyBroadcastUpdate(broadcast);
      }

      broadcast = await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: BroadcastStatus.COMPLETED,
          sentCount: sent,
          failedCount: failed,
        },
        include: { template: true },
      });
      this.eventsGateway.notifyBroadcastUpdate(broadcast);

      this.logger.log(`Broadcast ${broadcastId} completed. Sent: ${sent}, Failed: ${failed}`);
    } catch (error) {
      this.logger.error(`Broadcast ${broadcastId} failed critically`, error);
      broadcast = await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: BroadcastStatus.FAILED },
        include: { template: true },
      });
      this.eventsGateway.notifyBroadcastUpdate(broadcast);
      throw error;
    }
  }
}
