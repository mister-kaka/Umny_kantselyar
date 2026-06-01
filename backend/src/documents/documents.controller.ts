// backend/src/documents/documents.controller.ts
import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, ParseIntPipe, HttpException, UploadedFile, Req, UseInterceptors, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsListService } from './list/documents-list.service';
import { DocumentsSearchService } from './search/documents-search.service';
import { DocumentsCrudService } from './crud/documents-crud.service';
import { TextExtractionService } from './extraction/text-extraction.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { UploadDocumentResponseDto } from './dto/upload-document.dto';
import { ExtractTextResponseDto } from './dto/extract-text-response.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RouteDocumentDto } from './dto/route-document.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('documents')
export class DocumentsController {
    constructor(
        private readonly listService: DocumentsListService,
        private readonly searchService: DocumentsSearchService,
        private readonly crudService: DocumentsCrudService,
        private readonly extractionService: TextExtractionService,
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getDocuments(@Query() filters: GetDocumentsDto): Promise<DocumentsListResponseDto> {
        return this.listService.findAll(filters);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('search/ai')
    async searchAi(@Query('q') q: string): Promise<DocumentsListResponseDto> {
        return this.searchService.searchAi(q);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('search')
    async searchDocuments(@Query('q') q: string): Promise<DocumentListItemDto[]> {
        return this.searchService.search(q);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: RequestWithUser,
    ): Promise<UploadDocumentResponseDto> {
        if (!file) {
            throw new HttpException('Файл обязателен', 400);
        }
        return this.crudService.uploadDocument(file, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('generate-embeddings')
    async generateEmbeddings(): Promise<{ message: string; count: number }> {
        return this.extractionService.generateEmbeddings();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    async getDocumentById(@Param('id', ParseIntPipe) id: number): Promise<DocumentCardDto> {
        return this.crudService.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Put(':id/verify')
    async verifyDocument(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: VerifyDocumentDto,
    ) {
        return this.crudService.verifyDocument(id, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/route')
    async routeDocument(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RouteDocumentDto,
    ) {
        return this.crudService.routeDocument(id, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async deleteDocument(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        await this.crudService.delete(id);
        return { message: 'Документ удалён' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/extract-text')
    async extractText(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ExtractTextResponseDto> {
        return this.extractionService.extractText(id);
    }
}