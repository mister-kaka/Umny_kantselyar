// backend/src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSetting } from '../entities/ai-setting.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { Document } from '../entities/document.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { Department } from '../entities/department.entity';
import { DocumentClassification } from '../entities/document-classification.entity';
import { DocumentSource } from '../entities/document-source.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AiSetting,
            DocumentAiResult,
            Document,
            DocumentType,
            DocumentCategory,
            Department,
            DocumentClassification,
            DocumentSource,
        ]),
        HttpModule,
    ],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule {}