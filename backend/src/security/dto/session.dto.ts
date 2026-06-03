export class SessionDto {
    id!: number;
    userId!: number;
    token!: string;
    createdAt!: Date;
    expiresAt!: Date;
    ipAddress!: string | null;
    userAgent!: string | null;
}