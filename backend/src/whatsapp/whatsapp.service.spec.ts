import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from './meta-api.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { PayloadParserService } from './payload-parser.service';
import { StorageService } from '../storage/storage.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const mockPrismaService = {
    webhookEvent: { create: jest.fn() },
    customer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    message: { create: jest.fn(), updateMany: jest.fn() },
  };

  const mockMetaApiService = {
    sendText: jest.fn(),
    downloadMediaStream: jest.fn(),
  };

  const mockAiService = {
    generateReply: jest.fn(),
  };

  const mockEventsGateway = {
    notifyNewMessage: jest.fn(),
    notifyConversationUpdate: jest.fn(),
  };

  const mockStorageService = {
    uploadMediaStream: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        PayloadParserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetaApiService, useValue: mockMetaApiService },
        { provide: AiService, useValue: mockAiService },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process incoming text message and trigger AI', async () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            contacts: [{ profile: { name: 'Test User' } }],
            messages: [{ from: '1234567890', id: 'msg_1', type: 'text', text: { body: 'Hello' } }]
          }
        }]
      }]
    };

    mockPrismaService.customer.findUnique.mockResolvedValue({ id: 'cust_1', phone: '1234567890' });
    mockPrismaService.customer.update.mockResolvedValue({ id: 'cust_1' });
    mockPrismaService.conversation.findFirst.mockResolvedValue({ id: 'conv_1', botActive: true });
    mockPrismaService.message.create.mockResolvedValue({ id: 'msg_db_1' });
    mockPrismaService.conversation.update.mockResolvedValue({ id: 'conv_1' });
    
    mockAiService.generateReply.mockResolvedValue('AI Reply');
    mockMetaApiService.sendText.mockResolvedValue({ messages: [{ id: 'wa_msg_2' }] });

    await service.handleWebhook(payload);

    expect(mockPrismaService.webhookEvent.create).toHaveBeenCalled();
    expect(mockPrismaService.message.create).toHaveBeenCalled();
    expect(mockAiService.generateReply).toHaveBeenCalledWith('conv_1', 'Hello', expect.any(Object));
    expect(mockMetaApiService.sendText).toHaveBeenCalledWith('1234567890', 'AI Reply');
  });
});
