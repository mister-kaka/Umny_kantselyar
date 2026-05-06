import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { DepartmentDto } from './dto/department.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly logger: AppLoggerService,
  ) {}

  async findAll(): Promise<DepartmentDto[]> {
    try {
      const departments = await this.departmentRepository.find();

      await this.logger.log({
        module: 'Departments',
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
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
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