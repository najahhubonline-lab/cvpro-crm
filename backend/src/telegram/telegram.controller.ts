import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('send')
  async sendMessage(@Body() body: { telegramUserId: string; text: string }) {
    this.logger.log(`📤 Sending Telegram message to ${body.telegramUserId}`);
    await this.telegramService.sendMessage(body.telegramUserId, body.text);
    return { success: true };
  }
}
