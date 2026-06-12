import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsProcessor } from './broadcasts.processor';
import { BroadcastsEventsListener } from './broadcasts-events.listener';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'broadcasts',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      }
    }),
    WhatsappModule,
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsProcessor, BroadcastsEventsListener],
})
export class BroadcastsModule {}
