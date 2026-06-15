import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryDto } from './dto/document-category.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { transliterate } from '../utils/transliterate';

@Injectable()
export class DocumentCategoriesService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly documentCategoryRepository: Repository<DocumentCategory>,
    private readonly logger: AppLoggerService,
    private readonly notificationsService: NotificationsService,
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

  async create(name: string, userId: number): Promise<DocumentCategoryDto> {
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

      await this.notificationsService.createNotification(
        userId,
        'reference_created',
        'Справочник изменён',
        `Создана новая категория: «${name}»`,
      );

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

  async delete(id: number, userId: number): Promise<void> {
    try {
      const category = await this.documentCategoryRepository.findOne({ where: { id } });
      if (!category) {
        throw new HttpException('Категория не найдена', HttpStatus.NOT_FOUND);
      }

      await this.documentCategoryRepository.remove(category);

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'DELETE',
        url: `/document-categories/${id}`,
        action: 'удаление категории',
        status: 'success',
        statusCode: 200,
        message: `Категория "${category.name}" удалена (id: ${id})`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_deleted',
        'Справочник изменён',
        `Удалена категория: «${category.name}»`,
      );

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'DocumentCategories',
        type: 'DELETE',
        url: `/document-categories/${id}`,
        action: 'удаление категории',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при удалении категории',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}