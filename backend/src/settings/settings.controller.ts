import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('ai-config')
  async getAiConfig() {
    return this.settingsService.getAiConfig();
  }

  @Patch('ai-config')
  async updateAiConfig(@Body() body: { masterPrompt?: string; packages?: any }) {
    return this.settingsService.updateAiConfig(body);
  }
}
