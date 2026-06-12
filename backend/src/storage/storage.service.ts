import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string;
  private logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.storage = new Storage();
    this.bucketName = this.configService.get<string>('MEDIA_BUCKET_NAME') || 'cvpro-media';
  }

  // CRITICAL FIX: Accept a stream and pipe it directly to GCS to keep memory footprint flat
  async uploadMediaStream(stream: Readable, filename: string, mimeType: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filename);
      
      const writeStream = file.createWriteStream({
        metadata: { contentType: mimeType },
        resumable: false,
      });
      
      await pipeline(stream, writeStream);
      
      return `https://storage.googleapis.com/${this.bucketName}/${filename}`;
    } catch (error: any) {
      this.logger.error(`Failed to upload media stream to GCS: ${error.message}`);
      throw error;
    }
  }
}
