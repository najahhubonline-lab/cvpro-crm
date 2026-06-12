import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleBotDto {
  @IsBoolean()
  @IsNotEmpty()
  botActive!: boolean;
}
