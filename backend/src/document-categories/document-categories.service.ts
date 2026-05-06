import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryDto } from './dto/document-category.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class DocumentCategoriesService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly documentCategoryRepository: Repository<DocumentCategory>,
    private readonly logger: AppLoggerService,
  ) {}

  async findAll(): Promise<DocumentCategoryDto[]> {
    try {
      const categories = await this.documentCategoryRepository.find();

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'GET',
        url: '/document-categories',
        action: 'получение справочника категорий документов',
        status: 'success',
        statusCode: 200,
        message: 'Справочник категорий успешно получен',
      });

      return categories.map(category => ({
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'GET',
        url: '/document-categories',
        action: 'получение справочника категорий документов',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      console.error('Ошибка при получении справочника категорий:', error);
      throw new HttpException(
        'Ошибка сервера при получении справочника категорий',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}