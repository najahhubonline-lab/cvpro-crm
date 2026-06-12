import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class CvAnalyzerService {
  private readonly logger = new Logger(CvAnalyzerService.name);

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        // Use dynamic import for pdf-parse to avoid TypeScript issues
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        return data.text;
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      return '';
    } catch (error: any) {
      this.logger.error(`Failed to extract text: ${error.message}`);
      return '';
    }
  }
}
