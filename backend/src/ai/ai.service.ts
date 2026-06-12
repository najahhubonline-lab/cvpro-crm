import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { Customer, LeadStage, MessageSender } from '@prisma/client';
import { MemoryService } from './memory.service';
import { PromptService } from './prompt.service';
import { CvAnalyzerService } from '../cv-analyzer/cv-analyzer.service';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
    private readonly promptService: PromptService,
    private readonly cvAnalyzer: CvAnalyzerService,
  ) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');
    const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'us-central1';

    this.ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });

    this.storage = new Storage({ projectId });
    this.bucketName = this.configService.get<string>('MEDIA_BUCKET_NAME') || 'cvpro-499119-cvpro-media';

    this.logger.log(`✅ AI Service initialized with Vertex AI`);
  }

  async generateReply(
    conversationId: string,
    userMessage: string,
    customer: Customer,
    mediaUrl?: string,
    mediaType?: string,
    extractedCvText?: string,
  ): Promise<string> {
    try {
      this.logger.log(`🧠 Generating AI reply for customer: ${customer.name}`);

      const history = await this.memoryService.getConversationHistory(conversationId, 10);
      let systemInstruction = this.promptService.getSystemInstruction(customer);

      // 🚨 CRITICAL: Check if CV text was extracted
      if (extractedCvText && extractedCvText.trim().length > 50 && !extractedCvText.includes('[Error')) {
        this.logger.log(`📄 CV text detected (${extractedCvText.length} chars), performing analysis...`);
        
        const cvAnalysis = await this.cvAnalyzer.analyzeCv(extractedCvText);
        
        systemInstruction += `\n\n📊 CV ANALYSIS RESULTS:
- ATS Score: ${cvAnalysis.score}/100
- Strengths: ${cvAnalysis.strengths.join(', ')}
- Weaknesses: ${cvAnalysis.weaknesses.join(', ')}
- Suggestions: ${cvAnalysis.suggestions.join(', ')}

IMPORTANT: The customer just sent their CV. Here is the extracted text:
"${extractedCvText.substring(0, 2000)}"

Analyze this CV thoroughly, provide personalized feedback based on the ATS score, highlight 2-3 strengths and weaknesses, and recommend the most suitable package from the available ones. Reply in the same language the user is using (Arabic or English).`;
      }

      const contents = [...history];
      const userParts: any[] = [];

      if (userMessage) {
        userParts.push({ text: userMessage });
      }

      // Handle media (images, videos, audio) - NOT documents
      if (mediaUrl && mediaType && mediaType !== 'document') {
        try {
          this.logger.log(`📥 Processing ${mediaType} from GCS: ${mediaUrl}`);
          
          const mediaData = await this.downloadMediaFromGcs(mediaUrl);
          
          if (mediaData) {
            const base64Data = mediaData.buffer.toString('base64');
            let mimeType = this.getMimeType(mediaType, mediaUrl);
            
            userParts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            });
            
            this.logger.log(`✅ ${mediaType} processed successfully`);
          }
        } catch (error: any) {
          this.logger.error(`❌ Failed to process media: ${error.message}`);
          userParts.push({ text: `[Media attachment: ${mediaType}]` });
        }
      }

      if (userParts.length === 0) {
        userParts.push({ text: '[Empty message]' });
      }

      if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
        contents.push({ role: 'user', parts: userParts });
      } else {
        contents[contents.length - 1].parts.push(...userParts);
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const replyText = response.text || 'عذراً، لم أتمكن من فهم رسالتك.';

      // await this.memoryService.saveToMemory(conversationId, 'user', userMessage || `[${mediaType || 'message'}]`);
      // await this.memoryService.saveToMemory(conversationId, 'ai', replyText);

      this.logger.log(`✅ AI reply generated successfully (${replyText.length} chars)`);

      return replyText;
    } catch (error: any) {
      this.logger.error(`❌ Failed to generate AI reply: ${error.message}`, error.stack);
      return 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.';
    }
  }

  private async downloadMediaFromGcs(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const urlParts = url.replace('https://storage.googleapis.com/', '').split('/');
      const bucketName = urlParts[0];
      const fileName = urlParts.slice(1).join('/');

      this.logger.log(`📥 Downloading from bucket: ${bucketName}, file: ${fileName}`);

      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);

      const [buffer] = await file.download();
      
      return {
        buffer,
        mimeType: file.metadata.contentType || 'application/octet-stream',
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to download from GCS: ${error.message}`);
      return null;
    }
  }

  private getMimeType(mediaType: string, url: string): string {
    const ext = url.split('.').pop()?.toLowerCase() || '';

    if (mediaType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      if (ext === 'png') return 'image/png';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'webp') return 'image/webp';
      return 'image/jpeg';
    }

    if (mediaType === 'video' || ['mp4', 'webm', 'mov'].includes(ext)) {
      if (ext === 'webm') return 'video/webm';
      if (ext === 'mov') return 'video/quicktime';
      return 'video/mp4';
    }

    if (mediaType === 'audio' || ['ogg', 'mp3', 'wav', 'm4a'].includes(ext)) {
      if (ext === 'mp3') return 'audio/mpeg';
      if (ext === 'wav') return 'audio/wav';
      if (ext === 'm4a') return 'audio/mp4';
      return 'audio/ogg';
    }

    return 'application/octet-stream';
  }
}
