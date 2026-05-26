export class NotificationDto {
    id!: number;
    type!: string;
    title!: string;
    message!: string | null;
    documentId!: number | null;
    isRead!: boolean;
    createdAt!: Date;
}

export class NotificationListResponseDto {
    items!: NotificationDto[];
    total!: number;
    page!: number;
    limit!: number;
    totalPages!: number;
}

export class UnreadCountDto {
    total!: number;
    newDocument!: number;
    aiComplete!: number;
    extractError!: number;
    pendingVerification!: number;
    routedToDepartment!: number;
    lowConfidence!: number;
    routeError!: number;
    overdueVerification!: number;
}