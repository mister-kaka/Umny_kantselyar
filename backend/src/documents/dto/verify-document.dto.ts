import { IsNumber, IsOptional, IsString } from 'class-validator';

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

    @IsString()
    @IsOptional()
    comment?: string;
}