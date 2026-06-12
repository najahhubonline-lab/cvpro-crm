import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from '../src/conversations/conversations.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    conversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all conversations', async () => {
    const mockConvs = [{ id: '1', customerId: 'c1' }];
    mockPrismaService.conversation.findMany.mockResolvedValue(mockConvs);

    const result = await service.findAll();
    expect(result).toEqual(mockConvs);
    expect(mockPrismaService.conversation.findMany).toHaveBeenCalled();
  });

  it('should toggle bot active status', async () => {
    const mockConv = { id: '1', botActive: false };
    mockPrismaService.conversation.update.mockResolvedValue(mockConv);

    const result = await service.toggleBot('1', false);
    expect(result).toEqual(mockConv);
    expect(mockPrismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { botActive: false },
    });
  });
});
