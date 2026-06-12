import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from '../src/messages/messages.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MetaApiService } from '../src/whatsapp/meta-api.service';
import { EventsGateway } from '../src/events/events.gateway';
import { MessageSender } from '@prisma/client';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockPrismaService = {
    message: { findMany: jest.fn(), create: jest.fn() },
    conversation: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockMetaApi = { sendText: jest.fn() };
  const mockEvents = { notifyNewMessage: jest.fn(), notifyConversationUpdate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetaApiService, useValue: mockMetaApi },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a message and send via Meta API if sender is AGENT', async () => {
    mockPrismaService.conversation.findUnique.mockResolvedValue({ id: '1', customer: { phone: '123' } });
    mockMetaApi.sendText.mockResolvedValue({ messages: [{ id: 'wa_1' }] });
    mockPrismaService.message.create.mockResolvedValue({ id: 'm1', text: 'Hello' });
    mockPrismaService.conversation.update.mockResolvedValue({ id: '1' });

    const result = await service.create('1', 'Hello', MessageSender.AGENT);

    expect(result).toEqual({ id: 'm1', text: 'Hello' });
    expect(mockMetaApi.sendText).toHaveBeenCalledWith('123', 'Hello');
    expect(mockEvents.notifyNewMessage).toHaveBeenCalled();
  });
});
