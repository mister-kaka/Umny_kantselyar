import { Expose } from 'class-transformer';

export class NotificationSettingsResponseDto {
    @Expose()
    id!: number;

    @Expose()
    userId!: number;

    @Expose()
    newDocument!: boolean;

    @Expose()
    aiComplete!: boolean;

    @Expose()
    extractError!: boolean;

    @Expose()
    pendingVerification!: boolean;

    @Expose()
    routedToDepartment!: boolean;

    @Expose()
    lowConfidence!: boolean;

    @Expose()
    routeError!: boolean;

    @Expose()
    overdueVerification!: boolean;

    @Expose()
    updatedAt!: Date;
}