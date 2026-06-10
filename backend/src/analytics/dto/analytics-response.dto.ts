export class AnalyticsResponseDto {
    totalDocuments!: number;
    avgConfidence!: number;
    rejectedCount!: number;
    last7Days!: number;
    pendingVerificationCount!: number;
    aiProcessedCount!: number;
}