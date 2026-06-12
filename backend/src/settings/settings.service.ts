import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAiConfig() {
    let config = await this.prisma.aiConfig.findFirst();
    if (!config) {
      config = await this.prisma.aiConfig.create({
        data: { masterPrompt: '', packages: [] }
      });
    }
    return config;
  }

  async updateAiConfig(data: { masterPrompt?: string; packages?: any }) {
    const current = await this.getAiConfig();
    return this.prisma.aiConfig.update({
      where: { id: current.id },
      data: {
        masterPrompt: data.masterPrompt ?? current.masterPrompt,
        packages: data.packages ?? current.packages,
      }
    });
  }
}
