// backend/src/documents/crud/documents-crud.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsCrudService } from './documents-crud.service';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { OcrResult } from '../../entities/ocr-result.entity';
import { DocumentSource } from '../../entities/document-source.entity';
import { DocumentClassification } from '../../entities/document-classification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Document, DocumentRoute, DocumentFile,
            OcrResult, DocumentSource, DocumentClassification,
        ]),
    ],
    providers: [DocumentsCrudService],
    exports: [DocumentsCrudService],
})
export class DocumentsCrudModule {}