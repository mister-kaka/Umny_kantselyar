import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RouteDocumentDto {
    @IsNumber()
    departmentId!: number;

    @IsString()
    @IsOptional()
    comment?: string;
}