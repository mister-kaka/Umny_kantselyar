import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategory } from '../entities/document-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentCategory])],
  controllers: [DocumentCategoriesController],
  providers: [DocumentCategoriesService],
})
export class DocumentCategoriesModule {}