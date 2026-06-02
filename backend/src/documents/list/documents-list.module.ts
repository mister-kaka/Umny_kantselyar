import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DocumentsListService } from './documents-list.service';
import { Document } from '../../entities/document.entity';
import { AiSetting } from '../../entities/ai-setting.entity';
import { LoggerModule } from '../../logger/logger.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, AiSetting]),
        HttpModule,
        LoggerModule,
    ],
    providers: [DocumentsListService],
    exports: [DocumentsListService],
})
export class DocumentsListModule {}