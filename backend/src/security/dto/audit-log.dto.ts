export class AuditLogDto {
    id!: number;
    userId!: number;
    userName!: string;
    userAvatarUrl!: string | null;
    action!: string;
    documentId!: number | null;
    details!: any;
    createdAt!: Date;
}