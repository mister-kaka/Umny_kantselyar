import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentType, DocumentCategory])],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
