import { QueueEventsHost, QueueEventsListener, OnQueueEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener('broadcasts')
export class BroadcastsEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(BroadcastsEventsListener.name);

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    // DLQ Alerting: This triggers when a job exhausts all retries
    this.logger.error(`[DLQ ALERT] Broadcast Job ${jobId} failed permanently: ${failedReason}`);
    
    // In a full production environment, integrate with GCP Error Reporting or Slack here:
    // e.g., await this.alertingService.sendSlackAlert(`Broadcast failed: ${failedReason}`);
  }

  @OnQueueEvent('completed')
  onCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Broadcast Job ${jobId} completed successfully.`);
  }
}
