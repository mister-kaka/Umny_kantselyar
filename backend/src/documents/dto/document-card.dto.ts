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
    typeId!: number | null;
    categoryId!: number | null;
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
}