export class AnalyzeAiResponseDto {
    id!: number;
    documentId!: number;
    documentTypeSuggested!: string | null;
    categorySuggested!: string | null;
    summaryText!: string | null;
    departmentSuggested!: string | null;
    confidenceScore!: number | null;
    providerCode!: string;
    modelName!: string;
    createdAt!: Date;
}