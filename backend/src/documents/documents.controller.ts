import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto  } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';

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

}
