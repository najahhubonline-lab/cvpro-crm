import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { BroadcastStatus } from '@prisma/client';

@Injectable()
export class BroadcastsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('broadcasts') private broadcastsQueue: Queue,
    private eventsGateway: EventsGateway,
  ) {}

  async create(data: any) {
    const broadcast = await this.prisma.broadcast.create({
      data: {
        name: data.name,
        templateId: data.templateId,
        targetAudience: data.targetAudience,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        status: data.scheduledFor ? BroadcastStatus.SCHEDULED : BroadcastStatus.DRAFT,
      },
      include: { template: true },
    });

    if (broadcast.status === BroadcastStatus.SCHEDULED) {
      const delay = broadcast.scheduledFor!.getTime() - Date.now();
      await this.broadcastsQueue.add(
        'send-broadcast',
        { broadcastId: broadcast.id },
        { delay: Math.max(0, delay) }
      );
    }

    this.eventsGateway.notifyBroadcastUpdate(broadcast);
    return broadcast;
  }

  async findAll() {
    return this.prisma.broadcast.findMany({
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startNow(id: string) {
    const broadcast = await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.SCHEDULED, scheduledFor: new Date() },
      include: { template: true },
    });

    await this.broadcastsQueue.add('send-broadcast', { broadcastId: broadcast.id });
    this.eventsGateway.notifyBroadcastUpdate(broadcast);
    return broadcast;
  }
}
