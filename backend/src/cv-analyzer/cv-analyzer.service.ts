import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CvAnalyzerService {
  private readonly logger = new Logger(CvAnalyzerService.name);

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      this.logger.log(`📄 Extracting text from file with MIME type: ${mimeType}`);

      // PDF Files
      if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
        this.logger.log('📋 Processing PDF file...');
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        if (!data.text || data.text.trim().length === 0) {
          this.logger.warn('⚠️ PDF extracted but no text found');
          return '[PDF contains no extractable text]';
        }
        this.logger.log(`✅ PDF text extracted: ${data.text.length} characters`);
        return data.text;
      }

      // DOCX Files
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        this.logger.log('📋 Processing DOCX/DOC file...');
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value || result.value.trim().length === 0) {
          this.logger.warn('⚠️ DOCX extracted but no text found');
          return '[DOCX contains no extractable text]';
        }
        this.logger.log(`✅ DOCX text extracted: ${result.value.length} characters`);
        return result.value;
      }

      // Plain Text Files
      if (mimeType === 'text/plain' || mimeType === 'text/x-markdown') {
        this.logger.log('📋 Processing TXT file...');
        const text = buffer.toString('utf-8');
        if (!text || text.trim().length === 0) {
          this.logger.warn('⚠️ Text file is empty');
          return '[Empty text file]';
        }
        this.logger.log(`✅ Text file extracted: ${text.length} characters`);
        return text;
      }

      // Images (for future OCR)
      if (mimeType.startsWith('image/')) {
        this.logger.log('🖼️ Image file detected');
        return '[Image file - AI will analyze visually]';
      }

      // Video/Audio
      if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
        this.logger.log('🎥🎵 Media file detected');
        return '[Media file - AI will process]';
      }

      // Unsupported
      this.logger.warn(`⚠️ Unsupported file type: ${mimeType}`);
      return `[Unsupported file type: ${mimeType}]`;
    } catch (error: any) {
      this.logger.error(`❌ Failed to extract text: ${error.message}`, error.stack);
      return `[Error extracting text: ${error.message}]`;
    }
  }

  async analyzeCv(text: string): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    try {
      let score = 0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const suggestions: string[] = [];

      const hasEmail = /\S+@\S+\.\S+/.test(text);
      const hasPhone = /(\+?\d[\d\s\-\(\)]{7,}\d)/.test(text);
      const hasLinkedIn = /linkedin\.com/i.test(text);

      if (hasEmail && hasPhone) {
        score += 15;
        strengths.push('✅ Contact information complete');
      } else {
        weaknesses.push('⚠️ Missing contact info');
        suggestions.push('Add email and phone number');
      }

      if (hasLinkedIn) {
        score += 5;
        strengths.push('✅ LinkedIn profile included');
      }

      const hasExperience = /experience|work history|employment/i.test(text);
      const hasEducation = /education|degree|university/i.test(text);
      const hasSkills = /skills|competencies/i.test(text);

      if (hasExperience) { score += 20; strengths.push('✅ Work experience present'); }
      if (hasEducation) { score += 15; strengths.push('✅ Education section present'); }
      if (hasSkills) { score += 15; strengths.push('✅ Skills section present'); }

      score = Math.min(score, 100);

      return { score, strengths, weaknesses, suggestions };
    } catch (error: any) {
      this.logger.error(`❌ Failed to analyze CV: ${error.message}`);
      return { score: 0, strengths: [], weaknesses: ['Error'], suggestions: [] };
    }
  }
}
