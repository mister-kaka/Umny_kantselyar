import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategory } from '../entities/document-category.entity';
import { LoggerModule } from '../logger/logger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentCategory]), LoggerModule, NotificationsModule],
  controllers: [DocumentCategoriesController],
  providers: [DocumentCategoriesService],
})
export class DocumentCategoriesModule {}