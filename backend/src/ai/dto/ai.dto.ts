import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateReplyDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
