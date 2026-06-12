import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { MessageSender, MessageStatus, LeadStage, Customer } from '@prisma/client';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('✅ Telegram bot started successfully');

      this.bot.on('message', async (msg) => {
        if (msg.text) await this.handleTextMessage(msg);
      });

      this.bot.on('photo', async (msg) => {
        await this.handlePhotoMessage(msg);
      });

      this.bot.on('document', async (msg) => {
        await this.handleDocumentMessage(msg);
      });

      this.bot.on('voice', async (msg) => {
        await this.handleVoiceMessage(msg);
      });

      this.bot.on('video', async (msg) => {
        await this.handleVideoMessage(msg);
      });
    } catch (error: any) {
      this.logger.error(`❌ Failed to start Telegram bot: ${error.message}`);
    }
  }

  private async handleTextMessage(msg: TelegramBot.Message) {
    const telegramUserId = msg.from?.id.toString();
    const userName = msg.from?.first_name || msg.from?.username || 'Unknown';
    const userText = msg.text || '';
    
    if (!telegramUserId) return;
    
    this.logger.log(`📨 Telegram message from ${userName}: ${userText}`);
    await this.processMessage(telegramUserId, userName, userText, null, null);
  }

  private async handlePhotoMessage(msg: TelegramBot.Message) {
    const telegramUserId = msg.from?.id.toString();
    const userName = msg.from?.first_name || msg.from?.username || 'Unknown';
    const caption = msg.caption || '[Photo]';
    const photo = msg.photo?.[msg.photo.length - 1];
    
    if (!telegramUserId || !photo) return;
    
    const fileLink = await this.bot.getFileLink(photo.file_id);
    await this.processMessage(telegramUserId, userName, caption, fileLink.toString(), 'image');
  }

  private async handleDocumentMessage(msg: TelegramBot.Message) {
    const telegramUserId = msg.from?.id.toString();
    const userName = msg.from?.first_name || msg.from?.username || 'Unknown';
    const caption = msg.caption || '[Document]';
    
    if (!telegramUserId || !msg.document) return;
    
    const fileLink = await this.bot.getFileLink(msg.document.file_id);
    await this.processMessage(telegramUserId, userName, caption, fileLink.toString(), 'document');
  }

  private async handleVoiceMessage(msg: TelegramBot.Message) {
    const telegramUserId = msg.from?.id.toString();
    const userName = msg.from?.first_name || msg.from?.username || 'Unknown';
    
    if (!telegramUserId || !msg.voice) return;
    
    const fileLink = await this.bot.getFileLink(msg.voice.file_id);
    await this.processMessage(telegramUserId, userName, '[Voice Message]', fileLink.toString(), 'audio');
  }

  private async handleVideoMessage(msg: TelegramBot.Message) {
    const telegramUserId = msg.from?.id.toString();
    const userName = msg.from?.first_name || msg.from?.username || 'Unknown';
    const caption = msg.caption || '[Video]';
    
    if (!telegramUserId || !msg.video) return;
    
    const fileLink = await this.bot.getFileLink(msg.video.file_id);
    await this.processMessage(telegramUserId, userName, caption, fileLink.toString(), 'video');
  }

  private async processMessage(
    telegramUserId: string,
    userName: string,
    userText: string,
    mediaUrl: string | null,
    mediaType: string | null,
  ) {
    try {
      const customerPhone = `telegram_${telegramUserId}`;
      let customer = await this.prisma.customer.findUnique({ where: { phone: customerPhone } });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: { phone: customerPhone, name: userName, stage: LeadStage.NEW },
        });
        this.logger.log(`✅ Created new Telegram customer: ${customer.id}`);
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
          data: { customerId: customer.id, botActive: true },
        });
      }

      const savedMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          waMessageId: `tg_${Date.now()}_${telegramUserId}`,
          text: userText,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          sender: MessageSender.USER,
          status: MessageStatus.DELIVERED,
        },
      });

      const updatedConv = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() },
        include: { customer: true },
      });

      this.eventsGateway.notifyNewMessage(savedMessage);
      this.eventsGateway.notifyConversationUpdate(updatedConv);

      if (conversation.botActive) {
        await this.generateAndSendAiReply(conversation.id, customer, userText, telegramUserId, mediaUrl, mediaType);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to process Telegram message: ${error.message}`, error.stack);
    }
  }

  private async generateAndSendAiReply(
    conversationId: string,
    customer: Customer,
    userText: string,
    telegramUserId: string,
    mediaUrl?: string | null,
    mediaType?: string | null,
  ) {
    try {
      const replyText = await this.aiService.generateReply(
        conversationId, userText, customer, mediaUrl || undefined, mediaType || undefined,
      );

      await this.bot.sendMessage(telegramUserId, replyText, { parse_mode: 'Markdown' });

      const aiMessage = await this.prisma.message.create({
        data: {
          conversationId,
          waMessageId: `tg_ai_${Date.now()}_${telegramUserId}`,
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
      this.logger.log(`✅ Telegram AI reply sent successfully`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send Telegram AI reply: ${error.message}`, error.stack);
    }
  }

  async sendMessage(telegramUserId: string, text: string) {
    try {
      await this.bot.sendMessage(telegramUserId, text, { parse_mode: 'Markdown' });
    } catch (error: any) {
      this.logger.error(`❌ Failed to send Telegram message: ${error.message}`);
    }
  }
}
