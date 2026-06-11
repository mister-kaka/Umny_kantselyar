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
    documentReady!: number;
    extractError!: number;
    pendingVerification!: number;
    routedToDepartment!: number;
    rejected!: number;
    verified!: number;
    lowConfidence!: number;
}

export class NotificationFilterDto {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    isRead?: boolean;
}