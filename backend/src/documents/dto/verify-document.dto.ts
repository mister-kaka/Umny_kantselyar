import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class VerifyDocumentDto {
    @IsNumber()
    @IsOptional()
    typeId?: number;

    @IsNumber()
    @IsOptional()
    categoryId?: number;

    @IsNumber()
    @IsOptional()
    departmentId?: number;

    @IsDateString()
    @IsOptional()
    receivedDate?: string;

    @IsString()
    @IsOptional()
    senderName?: string;

    @IsString()
    @IsOptional()
    comment?: string;
}