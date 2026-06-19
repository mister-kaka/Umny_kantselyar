import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { Document } from '../entities/document.entity';
import { User } from '../entities/user.entity';
import { DepartmentDto } from './dto/department.dto';
import { DepartmentStatsDto } from './dto/department-stats.dto';
import { DepartmentDetailDto, DepartmentEmployeeDto } from './dto/department-detail.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { transliterate } from '../utils/transliterate';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: AppLoggerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(showArchived?: boolean): Promise<DepartmentDto[]> {
    try {
      const where: any = {};

      if (showArchived) {
        where.isActive = false;
      } else {
        where.isActive = true;
      }

      const departments = await this.departmentRepository.find({ where });

      await this.logger.log({
        module: 'Departments',
        type: 'GET',
        url: '/departments',
        action: 'получение справочника отделов',
        status: 'success',
        statusCode: 200,
        message: `Справочник отделов успешно получен (${departments.length} шт.)`,
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

      throw new HttpException(
        'Ошибка сервера при получении справочника отделов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(name: string, userId: number): Promise<DepartmentDto> {
    try {
      const existingByName = await this.departmentRepository.findOne({ where: { name } });
      if (existingByName) {
        if (existingByName.isActive) {
          throw new HttpException('Отдел с таким названием уже существует', HttpStatus.CONFLICT);
        } else {
          throw new HttpException('Отдел с таким названием уже существует, разархивируйте его', HttpStatus.CONFLICT);
        }
      }

      const code = transliterate(name).toLowerCase().replace(/\s+/g, '_');
      const existingByCode = await this.departmentRepository.findOne({ where: { code } });
      if (existingByCode) {
        if (existingByCode.isActive) {
          throw new HttpException('Отдел с таким кодом уже существует', HttpStatus.CONFLICT);
        } else {
          throw new HttpException('Отдел с таким кодом уже существует, разархивируйте его', HttpStatus.CONFLICT);
        }
      }

      const department = this.departmentRepository.create({
        name,
        code,
        isActive: true,
      });

      const saved = await this.departmentRepository.save(department);

      await this.logger.log({
        module: 'Departments',
        type: 'POST',
        url: '/departments',
        action: 'создание нового отдела',
        status: 'success',
        statusCode: 201,
        message: `Отдел "${name}" создан (id: ${saved.id})`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_created',
        'Справочник изменён',
        `Создан новый отдел: «${name}»`,
      );

      return {
        id: saved.id,
        name: saved.name,
        code: saved.code,
        isActive: saved.isActive,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
        type: 'POST',
        url: '/departments',
        action: 'создание нового отдела',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при создании отдела',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStats(showArchived?: boolean): Promise<DepartmentStatsDto[]> {
    try {
      const where: any = {};

      if (showArchived) {
        where.isActive = false;
      } else {
        where.isActive = true;
      }

      const departments = await this.departmentRepository.find({ where });

      const stats = await Promise.all(
        departments.map(async (dept) => {
          const routedCount = await this.documentRepository.count({
            where: {
              currentDepartmentId: dept.id,
              currentStatus: 'routed',
            },
          });

          const lastRouted = await this.documentRepository.findOne({
            where: {
              currentDepartmentId: dept.id,
              currentStatus: 'routed',
            },
            order: { routedAt: 'DESC' },
            select: ['title', 'routedAt'],
          });

          return {
            id: dept.id,
            name: dept.name,
            code: dept.code,
            routedCount,
            lastRoutedTitle: lastRouted?.title || null,
            lastRoutedAt: lastRouted?.routedAt?.toISOString() || null,
          };
        }),
      );

      await this.logger.log({
        module: 'Departments',
        type: 'GET',
        url: '/departments/stats',
        action: 'получение статистики подразделений',
        status: 'success',
        statusCode: 200,
        message: `Статистика получена для ${stats.length} отделов`,
      });

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
        type: 'GET',
        url: '/departments/stats',
        action: 'получение статистики подразделений',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при получении статистики подразделений',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDetail(
    id: number,
    page: number = 1,
    limit: number = 10,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<DepartmentDetailDto> {
    try {
      const department = await this.departmentRepository.findOne({ where: { id } });

      if (!department) {
        throw new HttpException('Отдел не найден', HttpStatus.NOT_FOUND);
      }

      const documentsRaw = await this.documentRepository
        .createQueryBuilder('doc')
        .leftJoin('doc.documentType', 'dt')
        .leftJoin('doc.creator', 'creator')
        .leftJoin('doc.documentRoutes', 'dr', 'dr.document_id = doc.id AND dr.route_status = :routeStatus', { routeStatus: 'routed' })
        .where('doc.currentDepartmentId = :id', { id })
        .andWhere('doc.currentStatus = :status', { status: 'routed' })
        .select([
          'doc.id as id',
          'doc.registrationNumber as registrationNumber',
          'doc.title as title',
          'dt.name as documentType',
          'doc.routedAt as routedAt',
          'creator.fullName as operatorName',
          'creator.avatarUrl as operatorAvatarUrl',
          'dr.routeReason as routeReason',
        ])
        .orderBy('doc.routedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getRawMany();

      const totalDocs = await this.documentRepository.count({
        where: { currentDepartmentId: id, currentStatus: 'routed' },
      });

      const employees = await this.userRepository.find({
        where: { departmentId: id },
        select: ['id', 'fullName', 'email', 'avatarUrl'],
      });

      const firstRouted = await this.documentRepository.findOne({
        where: { currentDepartmentId: id, currentStatus: 'routed' },
        order: { routedAt: 'ASC' },
        select: ['routedAt'],
      });

      const lastRouted = await this.documentRepository.findOne({
        where: { currentDepartmentId: id, currentStatus: 'routed' },
        order: { routedAt: 'DESC' },
        select: ['routedAt'],
      });

      const monthlyQuery = this.documentRepository
        .createQueryBuilder('doc')
        .select("TO_CHAR(doc.routed_at, 'YYYY-MM')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('doc.current_department_id = :id', { id })
        .andWhere('doc.current_status = :status', { status: 'routed' });

      if (dateFrom) {
        monthlyQuery.andWhere("TO_CHAR(doc.routed_at, 'YYYY-MM') >= :dateFrom", { dateFrom });
      }
      if (dateTo) {
        monthlyQuery.andWhere("TO_CHAR(doc.routed_at, 'YYYY-MM') <= :dateTo", { dateTo });
      }

      const monthlyRaw = await monthlyQuery
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const totalRouted = await this.documentRepository.count({
        where: { currentDepartmentId: id, currentStatus: 'routed' },
      });

      await this.logger.log({
        module: 'Departments',
        type: 'GET',
        url: `/departments/${id}/detail`,
        action: 'получение детализации отдела',
        status: 'success',
        statusCode: 200,
        message: `Детализация отдела "${department.name}" получена`,
      });

      return {
        id: department.id,
        name: department.name,
        code: department.code,
        isActive: department.isActive,
        totalRouted,
        firstRoutedAt: firstRouted?.routedAt?.toISOString() || null,
        lastRoutedAt: lastRouted?.routedAt?.toISOString() || null,
        employees: employees.map(e => ({
          id: e.id,
          fullName: e.fullName,
          email: e.email,
          avatarUrl: e.avatarUrl,
        })),
        documents: {
          items: documentsRaw.map(doc => ({
            id: doc.id,
            registrationNumber: doc.registrationnumber ?? doc.registrationNumber,
            title: doc.title,
            documentType: (doc.documenttype ?? doc.documentType) || null,
            routedAt: doc.routedat ?? doc.routedAt,
            operatorName: (doc.operatorname ?? doc.operatorName) || 'Неизвестно',
            operatorAvatarUrl: ((doc.operatoravatarurl ?? doc.operatorAvatarUrl) || null),
            routeReason: ((doc.routereason ?? doc.routeReason) || null),
          })),
          total: totalDocs,
          page,
          totalPages: Math.ceil(totalDocs / limit),
        },
        monthlyStats: monthlyRaw.map(m => ({
          month: m.month,
          count: Number(m.count),
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
        type: 'GET',
        url: `/departments/${id}/detail`,
        action: 'получение детализации отдела',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при получении детализации отдела',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivate(id: number, userId: number): Promise<DepartmentDto> {
    try {
      const department = await this.departmentRepository.findOne({ where: { id } });

      if (!department) {
        throw new HttpException('Отдел не найден', HttpStatus.NOT_FOUND);
      }

      if (!department.isActive) {
        throw new HttpException('Отдел уже архивирован', HttpStatus.BAD_REQUEST);
      }

      department.isActive = false;
      const saved = await this.departmentRepository.save(department);

      await this.logger.log({
        module: 'Departments',
        type: 'DELETE',
        url: `/departments/${id}`,
        action: 'архивация отдела',
        status: 'success',
        statusCode: 200,
        message: `Отдел "${saved.name}" архивирован`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_deleted',
        'Справочник изменён',
        `Архивирован отдел: «${saved.name}»`,
      );

      return {
        id: saved.id,
        name: saved.name,
        code: saved.code,
        isActive: saved.isActive,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
        type: 'DELETE',
        url: `/departments/${id}`,
        action: 'архивация отдела',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при архивации отдела',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async restore(id: number, userId: number): Promise<DepartmentDto> {
    try {
      const department = await this.departmentRepository.findOne({ where: { id } });

      if (!department) {
        throw new HttpException('Отдел не найден', HttpStatus.NOT_FOUND);
      }

      if (department.isActive) {
        throw new HttpException('Отдел уже активен', HttpStatus.BAD_REQUEST);
      }

      department.isActive = true;
      const saved = await this.departmentRepository.save(department);

      await this.logger.log({
        module: 'Departments',
        type: 'PATCH',
        url: `/departments/${id}/restore`,
        action: 'восстановление отдела',
        status: 'success',
        statusCode: 200,
        message: `Отдел "${saved.name}" восстановлен`,
      });

      await this.notificationsService.createNotification(
        userId,
        'reference_created',
        'Справочник изменён',
        `Восстановлен отдел: «${saved.name}»`,
      );

      return {
        id: saved.id,
        name: saved.name,
        code: saved.code,
        isActive: saved.isActive,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Departments',
        type: 'PATCH',
        url: `/departments/${id}/restore`,
        action: 'восстановление отдела',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при восстановлении отдела',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}