import { DocumentAiResult } from '../../entities/document-ai-result.entity';

export class AiResultResponseDto {
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
    extractedDate?: Date | null;
    extractedAmount?: number | null;
    extractedCounterparty?: string | null;
    keyPhrases?: string[] | null;
    sourceTypeSuggested?: string | null;
    sourceOrganizationSuggested?: string | null;
    sourceSenderSuggested?: string | null;
    sourceContactSuggested?: string | null;

    static fromEntity(result: DocumentAiResult): AiResultResponseDto {
        return {
            id: result.id,
            documentId: result.documentId,
            documentTypeSuggested: result.documentTypeSuggested,
            categorySuggested: result.categorySuggested,
            summaryText: result.summaryText,
            departmentSuggested: result.departmentSuggested,
            confidenceScore: result.confidenceScore ? Number(result.confidenceScore) : null,
            providerCode: result.providerCode,
            modelName: result.modelName,
            createdAt: result.createdAt,
            extractedDate: result.extractedDate || null,
            extractedAmount: result.extractedAmount ? Number(result.extractedAmount) : null,
            extractedCounterparty: result.extractedCounterparty || null,
            keyPhrases: result.keyPhrases || null,
            sourceTypeSuggested: result.sourceTypeSuggested || null,
            sourceOrganizationSuggested: result.sourceOrganizationSuggested || null,
            sourceSenderSuggested: result.sourceSenderSuggested || null,
            sourceContactSuggested: result.sourceContactSuggested || null,
        };
    }
}