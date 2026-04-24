import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { DocumentTypeDto } from './dto/document-type.dto';   
import { DocumentCategoryDto } from './dto/document-category.dto';

@Controller('documents')
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,         
    ) {}

    @Get()
    getDocuments() {
        return { message: 'GET /documents - будет реализовано Маше Н' };
    }

    @Get(':id')
    getDocumentById() {
        return { message: 'GET /documents/:id - будет реализовано Маше Н' };
    }

    @Post()
    createDocument() {
        return { message: 'POST /documents - будет реализовано Маше Н' };
    }



    @Get('document-types')
    @UseGuards(AuthGuard('jwt'))
    async getDocumentTypes(): Promise<DocumentTypeDto[]> {
        return this.documentsService.findAllDocumentTypes();
    }

    @Get('document-categories')
    @UseGuards(AuthGuard('jwt'))
    async getDocumentCategories(): Promise<DocumentCategoryDto[]> {
        return this.documentsService.findAllDocumentCategories();
    }
}
