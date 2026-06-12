import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from '../whatsapp/meta-api.service';
import { EventsGateway } from '../events/events.gateway';
import { MessageSender, MessageStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private eventsGateway: EventsGateway,
  ) {}

  async findByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async create(conversationId: string, text: string, sender: MessageSender) {
    // 1. Get conversation and customer to find the phone number
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    let waMessageId = null;

    // 2. If the sender is AGENT, we must actually send the message to WhatsApp
    if (sender === MessageSender.AGENT) {
      try {
        const metaResponse = await this.metaApi.sendText(conversation.customer.phone, text);
        waMessageId = metaResponse.messages?.[0]?.id;
      } catch (error) {
        this.logger.error('Failed to send agent message to WhatsApp', error);
        // We continue to save it in DB but mark it as FAILED
      }
    }

    // 3. Save to database
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        text,
        sender,
        waMessageId,
        status: waMessageId ? MessageStatus.SENT : (sender === MessageSender.AGENT ? MessageStatus.FAILED : MessageStatus.SENT),
      },
    });

    // 4. Update conversation last message timestamp
    const updatedConv = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
      include: { customer: true }
    });

    // 5. Emit WebSocket events so the UI updates instantly for all connected agents
    this.eventsGateway.notifyNewMessage(message);
    this.eventsGateway.notifyConversationUpdate(updatedConv);

    return message;
  }
}
