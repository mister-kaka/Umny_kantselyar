export class DocumentListItemDto {
    id!: number;
    registrationNumber!: string;
    title!: string;
    senderName!: string;
    receivedDate!: Date | null;
    uploadedAt?: Date | null;  
    documentType!: string;      
    category!: string | null;  
    currentStatus!: string;
    department!: string | null;
    confidenceScore?: number | null;
}

export class DocumentsListResponseDto {
    items!: DocumentListItemDto[];
    total!: number;      
    page!: number;       
    limit!: number;       
    totalPages!: number; 
}