import { IsString, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  language!: string;

  @IsString()
  category!: string;

  @IsArray()
  components!: any[];
}
