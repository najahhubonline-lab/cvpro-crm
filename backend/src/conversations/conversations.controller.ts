import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ToggleBotDto } from './dto/conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Patch(':id/bot')
  toggleBot(@Param('id') id: string, @Body() toggleBotDto: ToggleBotDto) {
    return this.conversationsService.toggleBot(id, toggleBotDto.botActive);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.conversationsService.markAsRead(id);
  }
}
