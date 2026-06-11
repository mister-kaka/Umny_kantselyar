import { Expose } from 'class-transformer';

export class NotificationSettingsResponseDto {
    @Expose()
    id!: number;

    @Expose()
    userId!: number;

    @Expose()
    newDocument!: boolean;

    @Expose()
    documentReady!: boolean;

    @Expose()
    extractError!: boolean;

    @Expose()
    pendingVerification!: boolean;

    @Expose()
    routedToDepartment!: boolean;

    @Expose()
    rejected!: boolean;

    @Expose()
    verified!: boolean;

    @Expose()
    lowConfidence!: boolean;

    @Expose()
    passwordChanged!: boolean;

    @Expose()
    profileUpdated!: boolean;

    @Expose()
    settingsChanged!: boolean;

    @Expose()
    newLogin!: boolean;

    @Expose()
    commentAdded!: boolean;

    @Expose()
    documentDeleted!: boolean;

    @Expose()
    updatedAt!: Date;
}