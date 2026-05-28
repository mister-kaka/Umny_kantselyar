import { IsOptional, IsInt, IsString, IsBoolean, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDocumentsDto {

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    typeId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    categoryId?: number;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional() 
    @IsString() 
    @IsIn(['document', 'upload']) 
    dateField?: 'document' | 'upload';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    departmentId?: number;

    @IsOptional()
    @IsString()
    searchQuery?: string;

    @IsOptional()
    @IsString()
    senderQuery?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    useSemanticSearch?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}