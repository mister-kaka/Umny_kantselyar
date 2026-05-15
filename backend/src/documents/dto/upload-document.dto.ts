export class UploadDocumentResponseDto {
  id!: number;
  registrationNumber!: string;
  fileName!: string;
  fileSize!: number;
  filePath!: string;
  uploadedAt!: Date;
}