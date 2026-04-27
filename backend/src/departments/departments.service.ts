import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { DepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<DepartmentDto[]> {
    const departments = await this.departmentRepository.find();
    return departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      isActive: dept.isActive,
    }));
  }
}
