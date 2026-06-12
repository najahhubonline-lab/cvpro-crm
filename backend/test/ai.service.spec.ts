import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../src/ai/ai.service';
import { MemoryService } from '../src/ai/memory.service';
import { PromptService } from '../src/ai/prompt.service';
import { VERTEX_AI_CLIENT } from '../src/ai/vertex.provider';
import { LeadStage } from '@prisma/client';

describe('AiService', () => {
  let service: AiService;

  const mockGoogleGenAI = {
    models: {
      generateContent: jest.fn(),
    },
  };

  const mockMemoryService = {
    getConversationHistory: jest.fn(),
  };

  const mockPromptService = {
    getSystemInstruction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: VERTEX_AI_CLIENT, useValue: mockGoogleGenAI },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a reply successfully', async () => {
    mockMemoryService.getConversationHistory.mockResolvedValue([]);
    mockPromptService.getSystemInstruction.mockReturnValue('System Prompt');
    mockGoogleGenAI.models.generateContent.mockResolvedValue({ text: 'AI Response' });

    const customer = { id: '1', phone: '123', stage: LeadStage.NEW } as any;
    const result = await service.generateReply('conv_1', 'Hello', customer);

    expect(result).toBe('AI Response');
    expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: 'System Prompt',
        temperature: 0.7,
      },
    });
  });
});
