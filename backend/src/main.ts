import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Global prefix for API
  app.setGlobalPrefix('api/v1');

  // Serve static files from frontend build
  // The correct path in the container is /app/dist/client
  const clientPath = join(__dirname, '..', 'client');
  logger.log(`📁 Serving frontend from: ${clientPath}`);
  
  app.useStaticAssets(clientPath, {
    index: false,
  });

  // SPA fallback - serve index.html for all non-API routes
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Skip API routes
    if (path.startsWith('/api/')) {
      return next();
    }
    
    // Skip socket.io routes
    if (path.startsWith('/socket.io/')) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA)
    res.sendFile(join(clientPath, 'index.html'));
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📁 Frontend path: ${clientPath}`);
  logger.log(`🔌 API prefix: /api/v1`);
}

bootstrap();
