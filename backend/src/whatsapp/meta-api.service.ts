import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly apiUrl: string;
  private readonly graphUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(private configService: ConfigService) {
    const version = this.configService.get<string>('META_API_VERSION') || 'v18.0';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.graphUrl = `https://graph.facebook.com/${version}`;
    this.apiUrl = `${this.graphUrl}/${this.phoneNumberId}/messages`;
  }

  async sendText(to: string, text: string): Promise<any> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Failed to send message: ${JSON.stringify(data)}`);
        throw new Error('Failed to send WhatsApp message');
      }
      return data;
    } catch (error) {
      this.logger.error('Error sending WhatsApp message', error);
      throw error;
    }
  }

  async sendTemplate(to: string, templateName: string, languageCode: string = 'en', components: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Failed to send template: ${JSON.stringify(data)}`);
        throw new Error('Failed to send WhatsApp template');
      }
      return data;
    } catch (error) {
      this.logger.error('Error sending WhatsApp template', error);
      throw error;
    }
  }

  // CRITICAL FIX: Return a stream instead of an ArrayBuffer to prevent memory exhaustion on large files
  async downloadMediaStream(mediaId: string): Promise<Readable> {
    try {
      // 1. Get Media URL
      const urlResponse = await fetch(`${this.graphUrl}/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      const urlData = await urlResponse.json();
      
      if (!urlResponse.ok || !urlData.url) {
        throw new Error(`Failed to get media URL: ${JSON.stringify(urlData)}`);
      }

      // 2. Download binary data as a stream
      const mediaResponse = await fetch(urlData.url, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      
      if (!mediaResponse.ok || !mediaResponse.body) {
        throw new Error('Failed to download media stream');
      }

      // Convert Web ReadableStream to Node.js Readable stream
      return Readable.fromWeb(mediaResponse.body as any);
    } catch (error) {
      this.logger.error(`Error downloading media stream ${mediaId}`, error);
      throw error;
    }
  }
}
