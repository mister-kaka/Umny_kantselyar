import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentTypeDto } from './dto/document-type.dto';
import { AppLoggerService } from '../logger/app-logger.service';

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

      console.error('Ошибка при получении справочника типов:', error);
      throw new HttpException(
        'Ошибка сервера при получении справочника типов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}