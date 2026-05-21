import { AiResultResponseDto } from '../../ai/dto/ai-result.dto';

export class DocumentFileDto {
    id!: number;
    fileName!: string;
    fileType!: string;
    filePath!: string;
    fileSize!: number;
    uploadedAt!: Date;
}

export class OcrResultDto {
    id!: number;
    rawText!: string | null;
    normalizedText!: string | null;
    language!: string;
    ocrConfidence!: number | null;
    processedAt!: Date;
}

export class DocumentClassificationDto {
    id!: number;
    type!: string | null;
    category!: string | null;
    typeConfidence!: number | null;
    categoryConfidence!: number | null;
    isVerified!: boolean;
    createdAt!: Date;
}

export class DocumentRouteDto {
    departmentName!: string;
    routeStatus!: string;
    routeReason!: string | null;
    routedAt!: Date;
}

export class DocumentSourceDto {
    sourceType!: string;
    organizationName!: string | null;
    senderName!: string | null;
    contactInfo!: string | null;
}

export class DocumentCardDto {
    id!: number;
    registrationNumber!: string;
    title!: string;
    senderName!: string;
    receivedDate!: Date;
    currentStatus!: string;
    confidenceScore!: number | null;
  
    documentType!: string | null;
    category!: string | null;
  
    createdBy!: string;
    createdAt!: Date;

    files!: DocumentFileDto[];
    ocrResult!: OcrResultDto | null;
    classification!: DocumentClassificationDto | null;
    routes!: DocumentRouteDto[];

     source!: DocumentSourceDto | null;

     aiResult!: AiResultResponseDto | null;
}