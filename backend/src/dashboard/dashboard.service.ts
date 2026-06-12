import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalLeads = await this.prisma.customer.count();
    const activeChats = await this.prisma.conversation.count({
      where: { unreadCount: { gt: 0 } }
    });
    
    // Calculate real chart data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessages = await this.prisma.message.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      select: { timestamp: true }
    });

    const recentLeads = await this.prisma.customer.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = new Map<string, { name: string; messages: number; leads: number }>();

    // Initialize the last 7 days in order
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap.set(dayName, { name: dayName, messages: 0, leads: 0 });
    }

    // Aggregate messages
    recentMessages.forEach(m => {
      const dayName = days[m.timestamp.getDay()];
      if (chartDataMap.has(dayName)) {
        chartDataMap.get(dayName)!.messages++;
      }
    });

    // Aggregate leads
    recentLeads.forEach(l => {
      const dayName = days[l.createdAt.getDay()];
      if (chartDataMap.has(dayName)) {
        chartDataMap.get(dayName)!.leads++;
      }
    });

    const chartData = Array.from(chartDataMap.values());

    return {
      totalLeads,
      activeChats,
      revenue: 0, // Placeholder for actual revenue logic
      conversionRate: totalLeads > 0 ? Math.round((activeChats / totalLeads) * 100) : 0,
      aiResolutionRate: 100, // Placeholder for AI resolution tracking
      chartData
    };
  }
}
