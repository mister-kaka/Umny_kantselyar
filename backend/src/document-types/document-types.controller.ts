import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentTypesService } from './document-types.service';
import { DocumentTypeDto } from '../document-types/dto/document-type.dto';

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
    async create(@Body('name') name: string): Promise<DocumentTypeDto> {
        return this.documentTypesService.create(name);
    }
}