import { Controller, Post, Body, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GenerateReplyDto } from './dto/ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * This endpoint acts as a proxy for direct frontend calls to Vertex AI,
   * replacing the old Express server.js proxy.
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateProxy(@Body() body: GenerateReplyDto, @Res() res: Response) {
    try {
      // We pass null for customer here as it's a generic proxy call. 
      // The main WhatsApp flow uses the service directly with full context.
      const reply = await this.aiService.generateReply(body.conversationId || 'proxy-session', body.prompt, null as any);
      
      return res.status(HttpStatus.OK).json({ text: reply });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
