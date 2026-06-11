import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentTypeDto } from './dto/document-type.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { transliterate } from '../utils/transliterate';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    private readonly logger: AppLoggerService,
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

  async create(name: string): Promise<DocumentTypeDto> {
    try {
      const type = this.documentTypeRepository.create({
        name,
        code: transliterate(name).toLowerCase().replace(/\s+/g, '_'),
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

      return { id: saved.id, name: saved.name, code: saved.code, description: saved.description };

    } catch (error) {
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
}