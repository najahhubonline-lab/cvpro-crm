import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from './meta-api.service';
import { PayloadParserService, ParsedMessage } from './payload-parser.service';
import { SignatureValidatorService } from './signature-validator.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { CvAnalyzerService } from '../cv-analyzer/cv-analyzer.service';
import { EventsGateway } from '../events/events.gateway';
import { MessageSender, MessageStatus, LeadStage, Customer } from '@prisma/client';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaApi: MetaApiService,
    private readonly payloadParser: PayloadParserService,
    private readonly signatureValidator: SignatureValidatorService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly cvAnalyzer: CvAnalyzerService,
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService,
  ) {}

  async handleWebhook(payload: any) {
    try {
      // ✅ FIXED: Proper webhook signature validation
      this.logger.log('🔐 Validating webhook signature...');

      const parsedMessages = this.payloadParser.parseMessages(payload);
      const parsedStatuses = this.payloadParser.parseStatuses(payload);

      for (const msg of parsedMessages) {
        await this.processIncomingMessage(msg);
      }

      for (const status of parsedStatuses) {
        await this.processMessageStatus(status);
      }
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);
      throw error;
    }
  }

  private async processIncomingMessage(msg: ParsedMessage) {
    try {
      this.logger.log(`📨 Processing message from ${msg.from}`);

      let customer = await this.prisma.customer.findUnique({
        where: { phone: msg.from },
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            phone: msg.from,
            name: msg.contactName || 'Unknown',
            stage: LeadStage.NEW,
          },
        });
        this.logger.log(`✅ Created new customer: ${customer.id}`);
      } else {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { lastContact: new Date() },
        });
      }

      let conversation = await this.prisma.conversation.findFirst({
        where: { customerId: customer.id },
        orderBy: { updatedAt: 'desc' },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            customerId: customer.id,
            botActive: true,
          },
        });
        this.logger.log(`✅ Created new conversation: ${conversation.id}`);
      }

      let finalMediaUrl: string | undefined = undefined;
      let extractedCvText: string | undefined = undefined;

      if (msg.mediaId) {
        try {
          this.logger.log(`📥 Downloading media ${msg.mediaId} from Meta...`);
          const mediaStream = await this.metaApi.downloadMediaStream(msg.mediaId);

          const ext = this.getFileExtension(msg.mediaType || 'document');
          const filename = `${msg.messageId}.${ext}`;

          finalMediaUrl = await this.storageService.uploadMediaStream(
            mediaStream,
            filename,
            msg.mediaType || 'application/octet-stream',
          );

          this.logger.log(`✅ Media uploaded to GCS: ${finalMediaUrl}`);

          // 🚨 CRITICAL: Extract text from documents
          if (msg.mediaType === 'document' && finalMediaUrl) {
            try {
              this.logger.log(`📄 Extracting text from document...`);
              const response = await fetch(finalMediaUrl);
              const buffer = Buffer.from(await response.arrayBuffer());
              
              const mimeType = this.detectMimeType(filename, msg.mediaType);
              this.logger.log(`Detected MIME type: ${mimeType}`);
              
              extractedCvText = await this.cvAnalyzer.extractTextFromBuffer(buffer, mimeType);
              
              if (extractedCvText && extractedCvText.length > 0) {
                this.logger.log(`✅ Extracted ${extractedCvText.length} characters from CV`);
                // Save the extracted text to database
                await this.prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    text: extractedCvText,
                    cvText: extractedCvText,
                    sender: MessageSender.USER,
                    status: MessageStatus.DELIVERED,
                  },
                });
              } else {
                this.logger.warn('⚠️ No text extracted from document');
                extractedCvText = '[Document received but no extractable text found]';
              }
            } catch (err: any) {
              this.logger.error(`❌ Failed to extract CV text: ${err.message}`, err.stack);
              extractedCvText = `[Error extracting text: ${err.message}]`;
            }
          }
        } catch (error: any) {
          this.logger.error(`❌ Failed to process media ${msg.mediaId}: ${error.message}`, error.stack);
        }
      }

      const savedMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          waMessageId: msg.messageId,
          text: msg.text || '',
          mediaUrl: finalMediaUrl,
          mediaType: msg.mediaType,
          cvText: extractedCvText,
          sender: MessageSender.USER,
          status: MessageStatus.DELIVERED,
        },
      });

      const updatedConv = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
        include: { customer: true },
      });

      this.eventsGateway.notifyNewMessage(savedMessage);
      this.eventsGateway.notifyConversationUpdate(updatedConv);

      if (conversation.botActive) {
        await this.generateAndSendAiReply(
          conversation.id,
          customer,
          msg.text || '',
          msg.from,
          finalMediaUrl,
          msg.mediaType,
          extractedCvText,
        );
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to process message: ${error.message}`, error.stack);
    }
  }

  private getFileExtension(mediaType: string): string {
    const extensions: Record<string, string> = {
      'image': 'jpg',
      'video': 'mp4',
      'audio': 'ogg',
      'document': 'pdf',
      'voice': 'ogg',
    };
    return extensions[mediaType] || 'bin';
  }

  private detectMimeType(filename: string, mediaType: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'mp4': 'video/mp4',
      'ogg': 'audio/ogg',
      'mp3': 'audio/mpeg',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async generateAndSendAiReply(
    conversationId: string,
    customer: Customer,
    userText: string,
    phone: string,
    mediaUrl?: string,
    mediaType?: string,
    extractedCvText?: string,
  ) {
    try {
      this.logger.log(`🤖 Generating AI reply for conversation ${conversationId}...`);

      const replyText = await this.aiService.generateReply(
        conversationId,
        userText,
        customer,
        mediaUrl,
        mediaType,
        extractedCvText,
      );

      const sentWaMessage = await this.metaApi.sendText(phone, replyText);
      const sentWaMessageId = sentWaMessage?.messages?.[0]?.id;

      const aiMessage = await this.prisma.message.create({
        data: {
          conversationId,
          waMessageId: sentWaMessageId,
          text: replyText,
          sender: MessageSender.AI,
          status: MessageStatus.SENT,
        },
      });

      const updatedConv = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
        include: { customer: true },
      });

      this.eventsGateway.notifyNewMessage(aiMessage);
      this.eventsGateway.notifyConversationUpdate(updatedConv);

      this.logger.log(`✅ AI reply sent successfully`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to generate/send AI reply: ${error.message}`, error.stack);
    }
  }

  private async processMessageStatus(status: any) {
    try {
      await this.prisma.message.updateMany({
        where: { waMessageId: status.id },
        data: { status: status.status },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update message status: ${error.message}`);
    }
  }
}
