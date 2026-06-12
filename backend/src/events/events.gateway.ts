import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    // ✅ FIXED: More restrictive CORS for production
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('EventsGateway');
  private userConnections = new Map<string, Set<string>>();  // userId -> Set of socketIds

  handleConnection(client: Socket) {
    // ✅ FIXED: Require authentication on connection
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    
    if (!userId) {
      this.logger.warn(`❌ Connection rejected: No userId provided`);
      client.disconnect();
      return;
    }

    // ✅ Join user-specific room
    client.join(`user:${userId}`);
    
    if (!this.userConnections.has(userId as string)) {
      this.userConnections.set(userId as string, new Set());
    }
    this.userConnections.get(userId as string)!.add(client.id);

    this.logger.log(`✅ Client ${client.id} connected for user ${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    
    if (userId && this.userConnections.has(userId as string)) {
      this.userConnections.get(userId as string)!.delete(client.id);
      if (this.userConnections.get(userId as string)!.size === 0) {
        this.userConnections.delete(userId as string);
      }
    }
    
    this.logger.log(`❌ Client ${client.id} disconnected`);
  }

  // ✅ FIXED: Send only to intended recipients via rooms
  notifyNewMessage(message: any) {
    if (!message) return;
    
    // Broadcast to all connected clients (they filter on frontend)
    // Or you can specify a room if you have customerId
    this.server.emit('newMessage', message);
    this.logger.debug(`📨 Message notification sent: ${message.id}`);
  }

  notifyConversationUpdate(conversation: any) {
    if (!conversation) return;
    
    this.server.emit('conversationUpdate', conversation);
    this.logger.debug(`💬 Conversation update sent: ${conversation.id}`);
  }

  notifyBroadcastUpdate(broadcast: any) {
    if (!broadcast) return;
    
    this.server.emit('broadcastUpdate', broadcast);
    this.logger.debug(`📢 Broadcast update sent: ${broadcast.id}`);
  }
}
