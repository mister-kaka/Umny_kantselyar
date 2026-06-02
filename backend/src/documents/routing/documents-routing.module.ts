import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsRoutingService } from './documents-routing.service';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { LoggerModule } from '../../logger/logger.module';

@Module({
    imports: [TypeOrmModule.forFeature([Document, DocumentRoute]), LoggerModule],
    providers: [DocumentsRoutingService],
    exports: [DocumentsRoutingService],
})
export class DocumentsRoutingModule {}