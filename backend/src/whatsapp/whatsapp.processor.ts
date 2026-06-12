import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappService } from './whatsapp.service';

// CRITICAL FIX: Process incoming webhooks asynchronously to prevent Meta API timeouts
@Processor('incoming-messages', { concurrency: 50 })
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly whatsappService: WhatsappService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing webhook payload job ${job.id}`);
    try {
      await this.whatsappService.handleWebhook(job.data);
    } catch (error) {
      this.logger.error(`Failed to process webhook job ${job.id}`, error);
      throw error;
    }
  }
}
