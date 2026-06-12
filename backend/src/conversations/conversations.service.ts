import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.conversation.findMany({
      include: { customer: true },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { 
        customer: true,
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return conversation;
  }

  async toggleBot(id: string, botActive: boolean) {
    return this.prisma.conversation.update({
      where: { id },
      data: { botActive },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }
}
