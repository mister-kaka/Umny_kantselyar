import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
    @IsOptional()
    @IsBoolean()
    newDocument?: boolean;

    @IsOptional()
    @IsBoolean()
    aiComplete?: boolean;

    @IsOptional()
    @IsBoolean()
    extractError?: boolean;

    @IsOptional()
    @IsBoolean()
    pendingVerification?: boolean;

    @IsOptional()
    @IsBoolean()
    routedToDepartment?: boolean;

    @IsOptional()
    @IsBoolean()
    lowConfidence?: boolean;

    @IsOptional()
    @IsBoolean()
    routeError?: boolean;

    @IsOptional()
    @IsBoolean()
    overdueVerification?: boolean;
}