import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    customer: { count: jest.fn(), findMany: jest.fn() },
    conversation: { count: jest.fn() },
    message: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return aggregated stats', async () => {
    mockPrismaService.customer.count.mockResolvedValue(100);
    mockPrismaService.conversation.count.mockResolvedValue(10);
    mockPrismaService.message.findMany.mockResolvedValue([]);
    mockPrismaService.customer.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(result.totalLeads).toBe(100);
    expect(result.activeChats).toBe(10);
    expect(result.conversionRate).toBe(10);
    expect(result.chartData).toHaveLength(7);
  });
});
