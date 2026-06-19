import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentTypeDto } from './dto/document-type.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { transliterate } from '../utils/transliterate';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    private readonly logger: AppLoggerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(): Promise<DocumentTypeDto[]> {
    try {
      const types = await this.documentTypeRepository.find();

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'GET',
        url: '/document-types',
        action: 'получение справочника типов документов',
        status: 'success',
        statusCode: 200,
        message: 'Справочник типов успешно получен',
      });

      return types.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code,
        description: type.description,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'GET',
        url: '/document-types',
        action: 'получение справочника типов документов',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при получении справочника типов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(name: string, userId: number): Promise<DocumentTypeDto> {
    try {
      const existingByName = await this.documentTypeRepository.findOne({ where: { name } });
      if (existingByName) {
        throw new HttpException('Тип документа с таким названием уже существует', HttpStatus.CONFLICT);
      }

      const code = transliterate(name).toLowerCase().replace(/\s+/g, '_');
      const existingByCode = await this.documentTypeRepository.findOne({ where: { code } });
      if (existingByCode) {
        throw new HttpException('Тип документа с таким кодом уже существует', HttpStatus.CONFLICT);
      }

      const type = this.documentTypeRepository.create({
        name,
        code,
        description: 'Создан оператором',
      });
      const saved = await this.documentTypeRepository.save(type);

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'POST',
        url: '/document-types',
        action: 'создание нового типа документа',
        status: 'success',
        statusCode: 201,
        message: `Тип "${name}" создан (id: ${saved.id})`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_created',
        'Справочник изменён',
        `Создан новый тип документа: «${name}»`,
      );

      return { id: saved.id, name: saved.name, code: saved.code, description: saved.description };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'POST',
        url: '/document-types',
        action: 'создание нового типа документа',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при создании типа документа',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: number, userId: number): Promise<void> {
    try {
      const type = await this.documentTypeRepository.findOne({ where: { id } });
      if (!type) {
        throw new HttpException('Тип документа не найден', HttpStatus.NOT_FOUND);
      }

      const count = await this.documentTypeRepository.manager
        .createQueryBuilder()
        .from('documents', 'd')
        .where('d.document_type_id = :id', { id })
        .getCount();

      if (count > 0) {
        throw new HttpException(
          `Невозможно удалить тип «${type.name}»: с ним связано ${count} документов`,
          HttpStatus.CONFLICT,
        );
      }

      await this.documentTypeRepository.remove(type);

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'DELETE',
        url: `/document-types/${id}`,
        action: 'удаление типа документа',
        status: 'success',
        statusCode: 200,
        message: `Тип "${type.name}" удалён (id: ${id})`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_deleted',
        'Справочник изменён',
        `Удалён тип документа: «${type.name}»`,
      );

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'DocumentTypes',
        type: 'DELETE',
        url: `/document-types/${id}`,
        action: 'удаление типа документа',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при удалении типа документа',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}