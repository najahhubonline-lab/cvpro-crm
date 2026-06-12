import { Injectable } from '@nestjs/common';

export interface ParsedMessage {
  from: string;
  text: string;
  messageId: string;
  contactName: string;
  type: string;
  timestamp: string;
  mediaId?: string;
  mediaType?: string;
}

export interface ParsedStatus {
  messageId: string;
  status: string;
  timestamp: string;
  recipientId: string;
}

@Injectable()
export class PayloadParserService {
  parseMessages(entry: any): ParsedMessage[] {
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value || !value.messages || !Array.isArray(value.messages)) {
      return [];
    }

    const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

    return value.messages.map((msg: any) => {
      let text = '';
      let mediaId: string | undefined;
      let mediaType: string | undefined;

      // Handle different message types
      if (msg.type === 'text') {
        text = msg.text?.body || '';
      } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msg.type)) {
        mediaId = msg[msg.type]?.id;
        mediaType = msg.type;
        text = msg[msg.type]?.caption || ''; // Some media types have captions
      } else if (msg.type === 'location') {
        text = `Location: ${msg.location?.latitude}, ${msg.location?.longitude}`;
        mediaType = 'location';
      } else if (msg.type === 'button') {
        text = msg.button?.text || '';
      } else if (msg.type === 'interactive') {
        text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
      } else {
        text = `[Unsupported message type: ${msg.type}]`;
      }

      return {
        from: msg.from,
        text,
        messageId: msg.id,
        contactName,
        type: msg.type,
        timestamp: msg.timestamp,
        mediaId,
        mediaType,
      };
    });
  }

  parseStatuses(entry: any): ParsedStatus[] {
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value || !value.statuses || !Array.isArray(value.statuses)) {
      return [];
    }

    return value.statuses.map((status: any) => ({
      messageId: status.id,
      status: status.status.toUpperCase(),
      timestamp: status.timestamp,
      recipientId: status.recipient_id,
    }));
  }
}
