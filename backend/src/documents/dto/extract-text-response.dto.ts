export class ExtractTextResponseDto {
  id!: number;
  documentId!: number;
  rawText!: string;
  normalizedText!: string;
  ocrConfidence!: number | null;
  language!: string;
  processedAt!: Date;
}