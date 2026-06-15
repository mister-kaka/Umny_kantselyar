import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentTypesService } from './document-types.service';
import { DocumentTypeDto } from '../document-types/dto/document-type.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
    };
}

@Controller('document-types')
export class DocumentTypesController {
    constructor(
        private readonly documentTypesService: DocumentTypesService,
    ) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getDocumentTypes(): Promise<DocumentTypeDto[]> {
        return this.documentTypesService.findAll();
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(
        @Req() req: RequestWithUser,
        @Body('name') name: string,
    ): Promise<DocumentTypeDto> {
        return this.documentTypesService.create(name, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
    ): Promise<{ message: string }> {
        await this.documentTypesService.delete(id, req.user.userId);
        return { message: 'Тип документа удалён' };
    }
}