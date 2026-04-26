import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto } from './dto/document-list.dto';
import { DocumentTypeDto } from './dto/document-type.dto';
import { DocumentCategoryDto } from './dto/document-category.dto';

@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}


    @UseGuards(AuthGuard('jwt'))
    @Get('document-types')
    async getDocumentTypes(): Promise<DocumentTypeDto[]> {
        return this.documentsService.findAllDocumentTypes();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('document-categories')
    async getDocumentCategories(): Promise<DocumentCategoryDto[]> {
        return this.documentsService.findAllDocumentCategories();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getDocuments(@Query() filters: GetDocumentsDto): Promise<DocumentsListResponseDto> {
        return this.documentsService.findAll(filters);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    getDocumentById(@Param('id') id: string) {
        return { message: 'GET /documents/${id} - будет реализовано марией н. позже' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    createDocument() {
        return { message: 'POST /documents -  будет реализовано марией н. позже' };
    }
}