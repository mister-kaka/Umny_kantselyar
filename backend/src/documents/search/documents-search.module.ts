import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DocumentsSearchService } from './documents-search.service';
import { Document } from '../../entities/document.entity';
import { AiSetting } from '../../entities/ai-setting.entity';
import { DocumentsListModule } from '../list/documents-list.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, AiSetting]),
        HttpModule,
        DocumentsListModule,
    ],
    providers: [DocumentsSearchService],
    exports: [DocumentsSearchService],
})
export class DocumentsSearchModule {}