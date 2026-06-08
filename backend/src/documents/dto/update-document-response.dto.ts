export class UpdateDocumentResponseDto {
    id!: number;
    registrationNumber!: string;
    title!: string;
    senderName!: string;
    receivedDate!: Date | null;
    documentTypeId!: number | null;
    categoryId!: number | null;
    sourceType?: string | null;
    contactInfo?: string | null;
    extractedAmount!: number | null;
    extractedDate!: Date | null;
    extractedCounterparty!: string | null;
    sourceTypeSuggested!: string | null;
    sourceOrganizationSuggested!: string | null;
    sourceSenderSuggested!: string | null;
    sourceContactSuggested!: string | null;
    keyPhrases!: string[] | null;
    updatedAt!: Date;
}