import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe, HttpException, UploadedFile, Req, UseInterceptors, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { UploadDocumentResponseDto } from './dto/upload-document.dto';
import { ExtractTextResponseDto } from './dto/extract-text-response.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getDocuments(@Query() filters: GetDocumentsDto): Promise<DocumentsListResponseDto> {
        return this.documentsService.findAll(filters);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('search')
    async searchDocuments(@Query('q') q: string): Promise<DocumentListItemDto[]> {
        return this.documentsService.search(q);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    async getDocumentById(@Param('id', ParseIntPipe) id: number): Promise<DocumentCardDto> {
        return this.documentsService.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async deleteDocument(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        await this.documentsService.delete(id);
        return { message: 'Документ удалён' };
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
        return this.documentsService.uploadDocument(file, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/extract-text')
    async extractText(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ExtractTextResponseDto> {
        return this.documentsService.extractText(id);
    }
}