import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(private prisma: PrismaService) {}

  async createOrder(customerId: string, serviceTypeId: string, amount: number, currency: string) {
    this.logger.log(`Creating order for customer ${customerId}, service ${serviceTypeId}, amount ${amount}`);
    return this.prisma.order.create({
      data: { customerId, serviceTypeId, totalAmount: amount, currency },
      include: { serviceType: true, customer: true }
    });
  }

  async createTask(orderId: string, type: string, assignedTo?: string) {
    return this.prisma.task.create({
      data: { orderId, type, assignedTo },
      include: { order: { include: { customer: true, serviceType: true } } }
    });
  }

  async updateTaskStatus(taskId: string, status: string, outputUrl?: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status, outputUrl },
    });
  }

  async getTeamTasks() {
    return this.prisma.task.findMany({
      include: { order: { include: { customer: true, serviceType: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { customer: true, serviceType: true, tasks: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
