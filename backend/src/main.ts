// CRITICAL: Trace and Profiler must be imported and started before any other modules
import * as trace from '@google-cloud/trace-agent';
import * as profiler from '@google-cloud/profiler';
if (process.env.NODE_ENV === 'production') {
  trace.start();
  profiler.start({ serviceContext: { service: 'taskora-backend' } }).catch(console.error);
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  if (!process.env.DATABASE_URL && process.env.DB_PASSWORD && process.env.DB_SOCKET_PATH) {
    const dbUser = process.env.DB_USER || 'postgres';
    const dbName = process.env.DB_NAME || 'cvpro';
    const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
    process.env.DATABASE_URL = `postgresql://${dbUser}:${encodedPassword}@localhost/${dbName}?host=${process.env.DB_SOCKET_PATH}&connection_limit=5`;
    logger.log('DATABASE_URL constructed dynamically from environment variables.');
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  
  app.use(compression());
  app.use(cookieParser());
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
