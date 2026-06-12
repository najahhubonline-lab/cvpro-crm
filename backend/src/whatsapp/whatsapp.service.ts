import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from './meta-api.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { PayloadParserService, ParsedMessage, ParsedStatus } from './payload-parser.service';
import { StorageService } from '../storage/storage.service';
import { MessageSender, MessageStatus, LeadStage } from '@prisma/client';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private aiService: AiService,
    private eventsGateway: EventsGateway,
    private payloadParser: PayloadParserService,
    private storageService: StorageService,
  ) {}

  async handleWebhook(payload: any) {
    try {
      await this.prisma.webhookEvent.create({
        data: { type: 'whatsapp', payload: payload, processed: true },
      });

      const entry = payload.entry?.[0];
      if (!entry) return;

      const messages = this.payloadParser.parseMessages(entry);
      for (const msg of messages) {
        await this.processIncomingMessage(msg);
      }

      const statuses = this.payloadParser.parseStatuses(entry);
      for (const status of statuses) {
        await this.processMessageStatus(status);
      }
    } catch (error) {
      this.logger.error('Error handling webhook', error);
    }
  }

  private async processIncomingMessage(msg: ParsedMessage) {
    let customer = await this.prisma.customer.findUnique({ where: { phone: msg.from } });
    
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone: msg.from, name: msg.contactName, stage: LeadStage.NEW },
      });
    } else {
      customer = await this.prisma.customer.update({
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
        data: { customerId: customer.id },
      });
    }

    let finalMediaUrl = msg.mediaId;

    // CRITICAL FIX: Stream media directly from Meta to GCS without buffering in memory
    if (msg.mediaId) {
      try {
        const mediaStream = await this.metaApi.downloadMediaStream(msg.mediaId);
        const ext = msg.mediaType === 'image' ? 'jpg' : msg.mediaType === 'video' ? 'mp4' : msg.mediaType === 'audio' ? 'ogg' : 'bin';
        const filename = `${msg.messageId}.${ext}`;
        
        finalMediaUrl = await this.storageService.uploadMediaStream(
          mediaStream, 
          filename, 
          msg.mediaType || 'application/octet-stream'
        );
        
        this.logger.log(`Successfully streamed media ${msg.mediaId} to GCS`);
      } catch (error) {
        this.logger.error(`Failed to process media ${msg.mediaId}`, error);
      }
    }

    const savedMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        waMessageId: msg.messageId,
        text: msg.text,
        mediaUrl: finalMediaUrl,
        mediaType: msg.mediaType,
        sender: MessageSender.USER,
        status: MessageStatus.DELIVERED,
      },
    });

    const updatedConv = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() },
      include: { customer: true }
    });

    this.eventsGateway.notifyNewMessage(savedMessage);
    this.eventsGateway.notifyConversationUpdate(updatedConv);

    if (conversation.botActive && msg.text) {
      await this.generateAndSendAiReply(conversation.id, customer, msg.text, msg.from);
    }
  }

  private async generateAndSendAiReply(conversationId: string, customer: any, userText: string, phone: string) {
    try {
      const replyText = await this.aiService.generateReply(conversationId, userText, customer);
      
      const metaResponse = await this.metaApi.sendText(phone, replyText);
      const sentWaMessageId = metaResponse.messages?.[0]?.id;

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
        include: { customer: true }
      });

      this.eventsGateway.notifyNewMessage(aiMessage);
      this.eventsGateway.notifyConversationUpdate(updatedConv);

    } catch (error) {
      this.logger.error('Failed to generate or send AI reply', error);
    }
  }

  private async processMessageStatus(status: ParsedStatus) {
    if (Object.values(MessageStatus).includes(status.status as MessageStatus)) {
      await this.prisma.message.updateMany({
        where: { waMessageId: status.messageId },
        data: { status: status.status as MessageStatus },
      });
    }
  }
}
