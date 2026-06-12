import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { LeadStage } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;
}
