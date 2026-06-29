import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, ParseIntPipe, HttpException, UploadedFile, Req, UseInterceptors, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsListService } from './list/documents-list.service';
import { DocumentsSearchService } from './search/documents-search.service';
import { DocumentsCrudService } from './crud/documents-crud.service';
import { TextExtractionService } from './extraction/text-extraction.service';
import { DocumentsRoutingService } from './routing/documents-routing.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { UploadDocumentResponseDto } from './dto/upload-document.dto';
import { ExtractTextResponseDto } from './dto/extract-text-response.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RouteDocumentDto } from './dto/route-document.dto';
import { RejectDocumentDto } from './dto/reject-document.dto';
import { RoutingResponseDto } from './dto/routing-response.dto';
import { RouteTemplateDto } from './dto/route-template.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
        role: string;
    };
}

@Controller('documents')
export class DocumentsController {
    constructor(
        private readonly listService: DocumentsListService,
        private readonly searchService: DocumentsSearchService,
        private readonly crudService: DocumentsCrudService,
        private readonly extractionService: TextExtractionService,
        private readonly routingService: DocumentsRoutingService,
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
    @Get('routing')
    async getRoutingDocuments(
        @Query('departmentId') departmentId?: string,
        @Query('operatorId') operatorId?: string,
        @Query('filter') filter?: 'all' | 'matched' | 'mismatched',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<RoutingResponseDto> {
        const deptId = departmentId ? parseInt(departmentId, 10) : undefined;
        const operId = operatorId ? parseInt(operatorId, 10) : undefined;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.routingService.getRoutingDocuments(deptId, operId, filter, pageNum, limitNum);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('route-templates')
    async getRouteTemplates(): Promise<RouteTemplateDto[]> {
        return this.routingService.getRouteTemplates();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('route-templates')
    async createRouteTemplate(
        @Req() req: RequestWithUser,
        @Body() dto: { name: string; description?: string; departmentIds: number[] },
    ): Promise<RouteTemplateDto> {
        return this.routingService.createRouteTemplate(dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('admin')
    @Delete('route-templates/:id')
    async deleteRouteTemplate(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
    ): Promise<{ message: string }> {
        await this.routingService.deleteRouteTemplate(id, req.user.userId);
        return { message: 'Шаблон удалён' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('export')
    async exportDocuments(
        @Query() filters: GetDocumentsDto,
        @Req() req: RequestWithUser,
        @Res() res: Response,
    ) {
        const buffer = await this.listService.exportToExcel(filters, req.user.userId);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=documents.xlsx');
        res.send(buffer);
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
        @Req() req: RequestWithUser,
        @Body() dto: VerifyDocumentDto,
    ) {
        return this.crudService.verifyDocument(id, dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/route')
    async routeDocument(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
        @Body() dto: RouteDocumentDto,
    ) {
        return this.crudService.routeDocument(id, dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async deleteDocument(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
    ): Promise<{ message: string }> {
        await this.crudService.delete(id, req.user.userId);
        return { message: 'Документ удалён' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/extract-text')
    async extractText(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ExtractTextResponseDto> {
        return this.extractionService.extractText(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/reject')
    async rejectDocument(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectDocumentDto,
        @Req() req: RequestWithUser,
    ) {
        return this.crudService.rejectDocument(id, dto.comment, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Put(':id')
    async updateDocument(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
        @Body() dto: UpdateDocumentDto,
    ) {
        return this.crudService.updateDocument(id, req.user.userId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/comments')
    async getComments(@Param('id', ParseIntPipe) id: number) {
        return this.crudService.getComments(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/comments')
    async addComment(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
        @Body() dto: AddCommentDto,
    ) {
        return this.crudService.addComment(id, req.user.userId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id/comments/:commentId')
    async deleteComment(
        @Param('id', ParseIntPipe) id: number,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Req() req: RequestWithUser,
    ) {
        return this.crudService.deleteComment(id, commentId, req.user.userId);
    }
}