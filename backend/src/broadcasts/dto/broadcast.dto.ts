import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';

export class CreateBroadcastDto {
  @IsString()
  name!: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  targetAudience?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
