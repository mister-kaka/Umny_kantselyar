import { IsOptional, IsString } from 'class-validator';

export class RejectDocumentDto {
    @IsOptional()
    @IsString()
    comment?: string;
}