import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../src/customers/customers.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { LeadStage } from '@prisma/client';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return paginated customers', async () => {
    const mockCustomers = [{ id: '1', phone: '123', stage: LeadStage.NEW }];
    mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
    mockPrismaService.customer.count.mockResolvedValue(1);

    const result = await service.findAll(0, 10);
    expect(result.data).toEqual(mockCustomers);
    expect(result.total).toBe(1);
    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should create a customer', async () => {
    const dto = { phone: '123456', name: 'Test' };
    mockPrismaService.customer.create.mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto);
    expect(result).toEqual({ id: '1', ...dto });
    expect(mockPrismaService.customer.create).toHaveBeenCalledWith({ data: dto });
  });
});
