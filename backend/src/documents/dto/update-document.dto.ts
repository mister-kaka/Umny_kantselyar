import { IsString, IsOptional, IsInt, IsDateString, IsNumber, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    senderName?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    documentTypeId?: number;

    @IsOptional()
    @IsString()
    documentTypeName?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    categoryId?: number;

    @IsOptional()
    @IsString()
    categoryName?: string;

    @IsOptional()
    @IsDateString()
    receivedDate?: string;

    @IsOptional()
    @IsString()
    sourceType?: string;

    @IsOptional()
    @IsString()
    contactInfo?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(999999999.99)
    @Type(() => Number)
    extractedAmount?: number;

    @IsOptional()
    @IsDateString()
    extractedDate?: string;

    @IsOptional()
    @IsString()
    extractedCounterparty?: string;

    @IsOptional()
    @IsString()
    sourceTypeSuggested?: string;

    @IsOptional()
    @IsString()
    sourceOrganizationSuggested?: string;

    @IsOptional()
    @IsString()
    sourceSenderSuggested?: string;

    @IsOptional()
    @IsString()
    sourceContactSuggested?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    keyPhrases?: string[];
}