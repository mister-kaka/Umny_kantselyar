import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentTypeDto } from './dto/document-type.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  type: string;
  url: string;
  action: string;
  status: string;
  statusCode?: number;
  message?: string;
}

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
  ) {}


  private getMoscowTime(): string {
    return new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }


  private async writeLog(logEntry: LogEntry): Promise<void> {
    const logFilePath = path.join(__dirname, '../../logs.json');
    let logs: LogEntry[] = [];

    try {
      const fileContent = await fs.readFile(logFilePath, 'utf8');
      logs = JSON.parse(fileContent);
    } catch {
      logs = [];
    }

    logs.push(logEntry);
    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2));
  }
  

  async findAll(): Promise<DocumentTypeDto[]> {
    const timestamp = this.getMoscowTime();

    try {
      const types = await this.documentTypeRepository.find();

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/document-types',
        action: 'получение справочника типов документов',
        status: 'success',
        statusCode: 200,
        message: 'Справочник типов документов успешно получен',
      });

      return types.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code,
        description: type.description,
      }));

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ошибка сервера при получении справочника типов документов';

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/document-types',
        action: 'получение справочника типов документов',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      console.error('Ошибка при получении справочника типов документов:', error);

      throw new HttpException(
        'Ошибка сервера при получении справочника типов документов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}