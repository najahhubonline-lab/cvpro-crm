import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SignatureValidatorService {
  constructor(private configService: ConfigService) {}

  validateSignature(payload: string, signatureHeader: string): boolean {
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    
    if (!appSecret || !signatureHeader) {
      throw new UnauthorizedException('Missing signature or app secret');
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload, 'utf-8')
      .digest('hex');

    const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;

    if (signatureHeader !== expectedSignatureWithPrefix) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
