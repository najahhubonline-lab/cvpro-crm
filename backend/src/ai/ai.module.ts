import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { PromptService } from './prompt.service';
import { AiController } from './ai.controller';
import { VertexProvider } from './vertex.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, MemoryService, PromptService, VertexProvider],
  exports: [AiService],
})
export class AiModule {}
