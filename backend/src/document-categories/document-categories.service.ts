import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryDto } from './dto/document-category.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { transliterate } from '../utils/transliterate';

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

      throw new HttpException(
        'Ошибка сервера при получении справочника категорий',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(name: string): Promise<DocumentCategoryDto> {
    try {
      const category = this.documentCategoryRepository.create({
        name,
        code: transliterate(name).toLowerCase().replace(/\s+/g, '_'),
        description: 'Создана оператором',
      });
      const saved = await this.documentCategoryRepository.save(category);

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'POST',
        url: '/document-categories',
        action: 'создание новой категории документа',
        status: 'success',
        statusCode: 201,
        message: `Категория "${name}" создана (id: ${saved.id})`,
      });

      return { id: saved.id, name: saved.name, code: saved.code, description: saved.description };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'POST',
        url: '/document-categories',
        action: 'создание новой категории документа',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при создании категории документа',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}