import { Injectable, Inject, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { MemoryService } from './memory.service';
import { VERTEX_AI_CLIENT } from './vertex.provider';
import { Customer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private configCache: any = null;
  private cacheTime: number = 0;

  constructor(
    @Inject(VERTEX_AI_CLIENT) private ai: GoogleGenAI,
    private memoryService: MemoryService,
    private prisma: PrismaService,
  ) {}

  private async getAiConfig() {
    const now = Date.now();
    if (this.configCache && now - this.cacheTime < 60000) return this.configCache;
    const config = await this.prisma.aiConfig.findFirst();
    this.configCache = config;
    this.cacheTime = now;
    return config;
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
      const config = await this.getAiConfig();
      const history = await this.memoryService.getConversationHistory(conversationId, 10);
      let systemInstruction = config?.masterPrompt || 'You are a helpful assistant.';
      const packagesInfo = config?.packages ? `\nAvailable Packages:\n${JSON.stringify(config.packages, null, 2)}` : '';

      // 🚨 CRITICAL: If CV text is extracted, inject analysis prompt
      if (extractedCvText && extractedCvText.length > 50) {
        systemInstruction += `\n\nIMPORTANT: The customer just sent their CV. Here is the extracted text:\n"${extractedCvText.substring(0, 1500)}"\n\nAnalyze this CV, provide an ATS compatibility score out of 100, highlight 2 strengths, 2 weaknesses, and recommend the most suitable package from the available ones. Reply in the same language the user is using.`;
      }

      const contents = [...history];
      const userParts: any[] = [];
      if (userMessage) userParts.push({ text: userMessage });

      if (mediaUrl && mediaType && mediaType !== 'document') {
        try {
          const response = await fetch(mediaUrl);
          if (!response.ok) throw new Error(`Failed to download media`);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = buffer.toString('base64');
          let mimeType = 'application/octet-stream';
          if (mediaType === 'image') mimeType = 'image/jpeg';
          else if (mediaType === 'audio') mimeType = 'audio/ogg';
          else if (mediaType === 'video') mimeType = 'video/mp4';
          userParts.push({ inlineData: { mimeType, data: base64Data } });
        } catch (error: any) {
          this.logger.warn(`Failed to process media: ${error.message}`);
        }
      }

      if (userParts.length === 0) userParts.push({ text: userMessage || '[Empty message]' });

      if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
        contents.push({ role: 'user', parts: userParts });
      } else {
        contents[contents.length - 1].parts.push(...userParts);
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any,
        config: { systemInstruction: `${systemInstruction}\n${packagesInfo}`, temperature: 0.7 },
      });
      return response.text || 'I am sorry, I could not process that request.';
    } catch (error) {
      this.logger.error('Error generating AI reply', error);
      return 'I am currently experiencing technical difficulties.';
    }
  }
}
