import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { MetaApiService } from './meta-api.service';
import { SignatureValidatorService } from './signature-validator.service';
import { PayloadParserService } from './payload-parser.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { AiModule } from '../ai/ai.module';
import { CvAnalyzerModule } from '../cv-analyzer/cv-analyzer.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    AiModule,
    CvAnalyzerModule, 
    StorageModule,
    BullModule.registerQueue({
      name: 'incoming-messages',
    }),
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService, 
    MetaApiService, 
    SignatureValidatorService, 
    PayloadParserService,
    WhatsappProcessor
  ],
  exports: [WhatsappService, MetaApiService],
})
export class WhatsappModule {}
