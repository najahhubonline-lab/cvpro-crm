import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(redisHost: string, redisPort: number, redisPassword?: string): Promise<void> {
    const pubClient = new Redis({ host: redisHost, port: redisPort, password: redisPassword });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => this.logger.error('Redis PubClient Error', err));
    subClient.on('error', (err) => this.logger.error('Redis SubClient Error', err));

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Connected to Redis for Socket.io Adapter');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
