import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsString()
  @MaxLength(50)
  providerCode!: string;

  @IsString()
  @MaxLength(100)
  modelName!: string;

  @IsString()
  @MaxLength(500)
  apiKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}