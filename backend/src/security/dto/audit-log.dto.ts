export class AuditLogDto {
    id!: number;
    userId!: number;
    userName!: string;
    action!: string;
    documentId!: number | null;
    details!: any;
    createdAt!: Date;
}