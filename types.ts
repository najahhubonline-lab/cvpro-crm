export enum LeadStage {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  WON = 'WON',
  LOST = 'LOST'
}

export enum MessageSender {
  USER = 'USER',
  AI = 'AI',
  AGENT = 'AGENT'
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  stage: LeadStage;
  lastContact: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sender: MessageSender;
  timestamp: string;
  status?: MessageStatus;
}

export interface Conversation {
  id: string;
  customerId: string;
  unreadCount: number;
  botActive: boolean;
  lastMessageAt: string;
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED';
  targetAudience: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledFor: string;
}

export interface DashboardStats {
  totalLeads: number;
  activeChats: number;
  revenue: number;
  conversionRate: number;
  aiResolutionRate: number;
  chartData: Array<{ name: string; messages: number; leads: number }>;
}
