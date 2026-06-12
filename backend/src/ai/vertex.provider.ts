import { Provider } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export const VERTEX_AI_CLIENT = 'VERTEX_AI_CLIENT';

export const VertexProvider: Provider = {
  provide: VERTEX_AI_CLIENT,
  useFactory: () => {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'cvpro-499119',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  },
};
