import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}
