import { Controller, Get, Post, Patch, Param, Body, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OperationsService } from './operations.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(
    private readonly opsService: OperationsService,
    private readonly storageService: StorageService,
  ) {}

  @Get('tasks')
  getTasks() { return this.opsService.getTeamTasks(); }

  @Get('orders')
  getOrders() { return this.opsService.getAllOrders(); }

  @Post('orders')
  createOrder(@Body() body: { customerId: string; serviceTypeId: string; amount: number; currency?: string }) {
    return this.opsService.createOrder(body.customerId, body.serviceTypeId, body.amount, body.currency || 'AED');
  }

  @Post('orders/:orderId/tasks')
  createTask(@Param('orderId') orderId: string, @Body() body: { type: string; assignedTo?: string }) {
    return this.opsService.createTask(orderId, body.type, body.assignedTo);
  }

  @Patch('tasks/:id/status')
  updateTask(@Param('id') id: string, @Body() body: { status: string; outputUrl?: string }) {
    return this.opsService.updateTaskStatus(id, body.status, body.outputUrl);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('taskId') taskId: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!taskId) throw new BadRequestException('taskId is required');

    const { Readable } = require('stream');
    const stream = Readable.from(file.buffer);
    const filename = `deliverables/${taskId}/${Date.now()}-${file.originalname}`;
    
    const url = await this.storageService.uploadMediaStream(stream, filename, file.mimetype);
    
    await this.opsService.updateTaskStatus(taskId, 'DONE', url);
    
    return { url, taskId };
  }
}
