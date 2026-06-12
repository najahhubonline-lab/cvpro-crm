import { Injectable, Inject, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { MemoryService } from './memory.service';
import { PromptService } from './prompt.service';
import { VERTEX_AI_CLIENT } from './vertex.provider';
import { Customer } from '@prisma/client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(VERTEX_AI_CLIENT) private ai: GoogleGenAI,
    private memoryService: MemoryService,
    private promptService: PromptService,
  ) {}

  async generateReply(conversationId: string, userMessage: string, customer: Customer): Promise<string> {
    try {
      const history = await this.memoryService.getConversationHistory(conversationId, 10);
      const systemInstruction = this.promptService.getSystemInstruction(customer);

      const contents = [...history];
      if (contents.length === 0 || contents[contents.length - 1].role !== 'user' || contents[contents.length - 1].parts[0].text !== userMessage) {
         contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
         });
      }

      // Implement Retry Logic with Exponential Backoff for Rate Limits (429)
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents as any,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
          return response.text || 'I am sorry, I could not process that request.';
        } catch (error: any) {
          if (error?.status === 429 && retries > 1) {
            this.logger.warn(`Vertex AI Rate Limit hit. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            retries--;
            delay *= 2; // Exponential backoff
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('Max retries exceeded for Vertex AI');
    } catch (error) {
      this.logger.error('Error generating AI reply', error);
      return 'I am currently experiencing technical difficulties. Please try again later or wait for a human agent.';
    }
  }
}
