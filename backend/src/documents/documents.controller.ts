import { Controller, Get, Post } from '@nestjs/common';

@Controller('documents')
export class DocumentsController {
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
    getDocumentTypes() {
        return { message: 'GET /document-types - будет реализовано Сашей' };
    }

    @Get('document-categories')
    getDocumentCategories() {
        return { message: 'GET /document-categories - будет реализовано Сашей' };
    }
}