import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('broadcasts')
@UseGuards(JwtAuthGuard)
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get()
  findAll() {
    return this.broadcastsService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateBroadcastDto) {
    return this.broadcastsService.create(createDto);
  }

  @Post(':id/start')
  startNow(@Param('id') id: string) {
    return this.broadcastsService.startNow(id);
  }
}
