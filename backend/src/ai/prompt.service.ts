import { Injectable } from '@nestjs/common';
import { Customer, LeadStage } from '@prisma/client';

@Injectable()
export class PromptService {
  getSystemInstruction(customer?: Customer): string {
    let instruction = `You are a helpful, professional, and friendly sales assistant for CVPRO, a CRM company. 
Your goal is to assist customers, answer their questions about our CRM, and guide them towards booking a demo or purchasing a plan.
Keep your answers concise, suitable for WhatsApp (use emojis sparingly but effectively).
Do not invent features we don't have. We offer: Contact Management, WhatsApp Integration, AI Auto-replies, and Broadcasts.`;

    if (customer) {
      instruction += `\n\nYou are currently talking to a customer named ${customer.name || 'a user'}. `;
      instruction += `Their current lead stage is ${customer.stage}. `;
      
      if (customer.stage === LeadStage.NEW) {
        instruction += `Since they are a new lead, try to qualify them by asking what their main challenge is with customer management.`;
      } else if (customer.stage === LeadStage.QUALIFIED) {
        instruction += `They are qualified. Try to push gently for a proposal or a demo.`;
      }
    }

    return instruction;
  }
}
