import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; language: string; category: string; components: any }) {
    return this.prisma.template.create({
      data: {
        name: data.name,
        language: data.language,
        category: data.category,
        components: data.components,
        status: 'APPROVED', // In a real scenario, this syncs with Meta's approval status
      },
    });
  }

  // Mock function to simulate syncing templates from Meta WhatsApp Manager
  async syncFromMeta() {
    const mockTemplates = [
      { name: 'hello_world', language: 'en_US', category: 'UTILITY', components: [{ type: 'BODY', text: 'Hello World!' }] },
      { name: 'promo_offer', language: 'en', category: 'MARKETING', components: [{ type: 'BODY', text: 'Special offer for you!' }] }
    ];

    for (const t of mockTemplates) {
      await this.prisma.template.upsert({
        where: { name: t.name },
        update: { category: t.category, components: t.components },
        create: { name: t.name, language: t.language, category: t.category, components: t.components, status: 'APPROVED' }
      });
    }
    return this.findAll();
  }
}
