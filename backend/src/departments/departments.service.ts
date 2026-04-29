import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { DepartmentDto } from './dto/department.dto';
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
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
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


  async findAll(): Promise<DepartmentDto[]> {
    const timestamp = this.getMoscowTime();

    try {
      const departments = await this.departmentRepository.find();

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/departments',
        action: 'получение справочника отделов',
        status: 'success',
        statusCode: 200,
        message: 'Справочник отделов успешно получен',
      });

      return departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        isActive: dept.isActive,
      }));

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ошибка сервера при получении справочника отделов';

      await this.writeLog({
        timestamp,
        type: 'GET',
        url: '/departments',
        action: 'получение справочника отделов',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      console.error('Ошибка при получении справочника отделов:', error);

      throw new HttpException(
        'Ошибка сервера при получении справочника отделов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}