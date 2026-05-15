import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Document,
            DocumentRoute,
            DocumentFile,
            OcrResult,
        ]),
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}