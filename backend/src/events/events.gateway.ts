import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyNewMessage(message: any) {
    this.server.emit('newMessage', message);
  }

  notifyConversationUpdate(conversation: any) {
    this.server.emit('conversationUpdate', conversation);
  }

  notifyBroadcastUpdate(broadcast: any) {
    this.server.emit('broadcastUpdate', broadcast);
  }
}
