import { Controller, Get, Post, Req, Res, Query, Headers, UnauthorizedException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SignatureValidatorService } from './signature-validator.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private configService: ConfigService,
    private signatureValidator: SignatureValidatorService,
    @InjectQueue('incoming-messages') private incomingMessagesQueue: Queue,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      res.status(HttpStatus.OK).send(challenge);
    } else {
      res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is missing. Ensure rawBody is enabled in NestFactory.');
    }
    
    this.signatureValidator.validateSignature(rawBody.toString('utf8'), signature);

    // CRITICAL FIX: Push to BullMQ for asynchronous processing to prevent Meta webhook timeouts
    await this.incomingMessagesQueue.add('process-webhook', req.body, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    return 'EVENT_RECEIVED';
  }
}
