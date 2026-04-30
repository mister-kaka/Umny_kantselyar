import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryDto } from './dto/document-category.dto';
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
export class DocumentCategoriesService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly documentCategoryRepository: Repository<DocumentCategory>,
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
  

  async findAll(): Promise<DocumentCategoryDto[]> {
    const timestamp = this.getMoscowTime();

    try {
      const categories = await this.documentCategoryRepository.find();

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/document-categories',
        action: 'получение справочника категорий документов',
        status: 'success',
        statusCode: 200,
        message: 'Справочник категорий документов успешно получен',
      });

      return categories.map(category => ({
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description,
      }));

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ошибка сервера при получении справочника категорий документов';

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/document-categories',
        action: 'получение справочника категорий документов',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      console.error('Ошибка при получении справочника категорий документов:', error);

      throw new HttpException(
        'Ошибка сервера при получении справочника категорий документов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}