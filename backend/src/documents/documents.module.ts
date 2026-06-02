import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsSearchModule } from './search/documents-search.module';
import { DocumentsCrudModule } from './crud/documents-crud.module';
import { TextExtractionModule } from './extraction/text-extraction.module';
import { DocumentsListModule } from './list/documents-list.module';
import { DocumentsRoutingModule } from './routing/documents-routing.module';

@Module({
    imports: [
        DocumentsListModule,
        DocumentsSearchModule,
        DocumentsCrudModule,
        TextExtractionModule,
        DocumentsRoutingModule,
    ],
    controllers: [DocumentsController],
})
export class DocumentsModule {}