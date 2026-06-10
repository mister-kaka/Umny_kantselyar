import { IsBoolean, IsOptional, IsNumber, IsString, Min, Max, IsIn } from 'class-validator';

export class UpdateInterfaceSettingsDto {
  @IsOptional()
  @IsBoolean()
  compactView?: boolean;

  @IsOptional()
  @IsBoolean()
  showConfidence?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  defaultPageLimit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark'])
  theme?: string;
}