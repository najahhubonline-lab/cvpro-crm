import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastsService } from '../src/broadcasts/broadcasts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EventsGateway } from '../src/events/events.gateway';
import { getQueueToken } from '@nestjs/bullmq';
import { BroadcastStatus } from '@prisma/client';

describe('BroadcastsService', () => {
  let service: BroadcastsService;

  const mockPrismaService = {
    broadcast: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  const mockQueue = { add: jest.fn() };
  const mockEvents = { notifyBroadcastUpdate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('broadcasts'), useValue: mockQueue },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<BroadcastsService>(BroadcastsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a scheduled broadcast and add to queue', async () => {
    const futureDate = new Date(Date.now() + 10000);
    const mockBroadcast = { id: '1', status: BroadcastStatus.SCHEDULED, scheduledFor: futureDate };
    mockPrismaService.broadcast.create.mockResolvedValue(mockBroadcast);

    const result = await service.create({ name: 'Test', templateId: 't1', scheduledFor: futureDate.toISOString() });

    expect(result).toEqual(mockBroadcast);
    expect(mockQueue.add).toHaveBeenCalledWith('send-broadcast', { broadcastId: '1' }, expect.any(Object));
    expect(mockEvents.notifyBroadcastUpdate).toHaveBeenCalled();
  });
});
