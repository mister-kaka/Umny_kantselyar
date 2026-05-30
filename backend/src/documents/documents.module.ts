import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { DocumentSource } from '../entities/document-source.entity';
import { AiSetting } from '../entities/ai-setting.entity';
import { DocumentClassification } from '../entities/document-classification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Document,
            DocumentRoute,
            DocumentFile,
            OcrResult,
            DocumentSource,
            DocumentClassification,
            AiSetting,
        ]),
        HttpModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}