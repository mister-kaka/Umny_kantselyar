import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

import { Document } from '../entities/document.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentRoute } from '../entities/document-route.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        Document,
        DocumentType,
        DocumentCategory,
        DocumentRoute,
    ])],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}