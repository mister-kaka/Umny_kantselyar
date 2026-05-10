import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Document } from '../entities/document.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { AiSetting } from '../entities/ai-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Document,
            DocumentAiResult,
            AiSetting,
        ]),
        HttpModule,
    ],
    controllers: [AiController],
    providers: [AiService],
})
export class AiModule {}