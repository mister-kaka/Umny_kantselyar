import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
    @IsOptional()
    @IsBoolean()
    newDocument?: boolean;

    @IsOptional()
    @IsBoolean()
    documentReady?: boolean;

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
    rejected?: boolean;

    @IsOptional()
    @IsBoolean()
    verified?: boolean;

    @IsOptional()
    @IsBoolean()
    lowConfidence?: boolean;

    @IsOptional()
    @IsBoolean()
    passwordChanged?: boolean;

    @IsOptional()
    @IsBoolean()
    profileUpdated?: boolean;

    @IsOptional()
    @IsBoolean()
    settingsChanged?: boolean;

    @IsOptional()
    @IsBoolean()
    newLogin?: boolean;

    @IsOptional()
    @IsBoolean()
    commentAdded?: boolean;

    @IsOptional()
    @IsBoolean()
    documentDeleted?: boolean;

    @IsOptional()
    @IsBoolean()
    referenceCreated?: boolean;

    @IsOptional()
    @IsBoolean()
    referenceDeleted?: boolean;
}