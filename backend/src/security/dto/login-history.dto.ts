export class LoginHistoryDto {
    id!: number;
    userId!: number;
    ipAddress!: string | null;
    userAgent!: string | null;
    loginTime!: Date;
}