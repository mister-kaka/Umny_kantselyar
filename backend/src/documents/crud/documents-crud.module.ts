import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsCrudService } from './documents-crud.service';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { OcrResult } from '../../entities/ocr-result.entity';
import { DocumentSource } from '../../entities/document-source.entity';
import { DocumentClassification } from '../../entities/document-classification.entity';
import { DocumentComment } from '../../entities/document-comment.entity';
import { DocumentAiResult } from '../../entities/document-ai-result.entity';
import { User } from '../../entities/user.entity';
import { DocumentType } from '../../entities/document-type.entity';
import { DocumentCategory } from '../../entities/document-category.entity';
import { LoggerModule } from '../../logger/logger.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditLogModule } from '../../audit/audit-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Document,
            DocumentRoute,
            DocumentFile,
            OcrResult,
            DocumentSource,
            DocumentClassification,
            DocumentComment,
            DocumentAiResult,
            User,
            DocumentType,
            DocumentCategory,
        ]),
        LoggerModule,
        NotificationsModule,
        AuditLogModule,
    ],
    providers: [DocumentsCrudService],
    exports: [DocumentsCrudService],
})
export class DocumentsCrudModule {}