import { Provider } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export const VERTEX_AI_CLIENT = 'VERTEX_AI_CLIENT';

export const VertexProvider: Provider = {
  provide: VERTEX_AI_CLIENT,
  useFactory: () => {
    // The SDK strictly requires process.env.API_KEY to be set.
    // We initialize it exactly as per the guidelines.
    return new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
  },
};
