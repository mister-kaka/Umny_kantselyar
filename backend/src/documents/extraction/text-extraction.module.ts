import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TextExtractionService } from './text-extraction.service';
import { Document } from '../../entities/document.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { OcrResult } from '../../entities/ocr-result.entity';
import { ImageProcessorModule } from '../../image-processor/image-processor.module';
import { DocumentsSearchModule } from '../search/documents-search.module';
import { LoggerModule } from '../../logger/logger.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditLogModule } from '../../audit/audit-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, DocumentFile, OcrResult]),
        ImageProcessorModule,
        DocumentsSearchModule,
        LoggerModule,
        NotificationsModule,
        AuditLogModule,
    ],
    providers: [TextExtractionService],
    exports: [TextExtractionService],
})
export class TextExtractionModule {}