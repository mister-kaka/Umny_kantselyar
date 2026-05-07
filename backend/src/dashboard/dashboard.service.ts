import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { Department } from '../entities/department.entity';
import { DashboardResponseDto } from './dto/dashboard.dto';
import { AppLoggerService } from '../logger/app-logger.service';

interface DepartmentRouteRaw {
  departmentId: string;
  departmentName: string;
  routeStatus: string;
  count: string;
}

@Injectable()
export class DashboardService {

    private readonly departmentRoutesSQL = `
        SELECT 
            d.id as "departmentId",
            d.name as "departmentName",
            dr.route_status as "routeStatus",
            COUNT(dr.id) as count
        FROM document_routes dr
        INNER JOIN departments d ON d.id = dr.department_id
        GROUP BY d.id, d.name, dr.route_status
        ORDER BY d.name ASC, dr.route_status ASC
    `;

    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(Department)
        private departmentRepository: Repository<Department>,
        private readonly logger: AppLoggerService,
    ) {}

    async getDashboardData(): Promise<DashboardResponseDto> {
        try {
            const [
                totalDocuments,
                inProgress,
                pendingCheck,
                recentDocumentsRaw,
                departmentRouteStatusesRaw
            ] = await Promise.all([
                this.getTotalDocuments(),
                this.getInProgressCount(),
                this.getPendingCheckCount(),
                this.getRecentDocuments(),
                this.getDepartmentRouteStatuses()
            ]);

            await this.logger.log({
                module: 'Dashboard',
                type: 'GET',
                url: '/dashboard/data',
                action: 'получение данных на дашборд',
                status: 'success',
                statusCode: 200,
                message: 'Данные успешно получены',
            });

            const recentDocuments = recentDocumentsRaw.map(doc => ({
                id: doc.id,
                title: doc.title,
                status: doc.currentStatus,
                date: doc.receivedDate,
            }));

            const departmentRouteStatuses = departmentRouteStatusesRaw.map(item => ({
                departmentId: Number(item.departmentId),
                departmentName: item.departmentName,
                routeStatus: item.routeStatus,
                count: Number(item.count),
            }));

            return {
                totalDocuments,
                inProgress,
                pendingCheck,
                recentDocuments,
                departmentRouteStatuses,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Dashboard',
                type: 'GET',
                url: '/dashboard/data',
                action: 'получение данных на дашборд',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            console.error('Ошибка при получении данных дашборда:', error);
            throw new HttpException(
                'Ошибка сервера при получении данных',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    private async getTotalDocuments(): Promise<number> {
        return this.documentRepository.count();
    }

    private async getInProgressCount(): Promise<number> {
        return this.documentRepository.count({
            where: { currentStatus: 'in_review' },
        });
    }

    private async getPendingCheckCount(): Promise<number> {
        return this.documentRepository.count({
            where: { currentStatus: 'pending' },
        });
    }

    private async getRecentDocuments(): Promise<Pick<Document, 'id' | 'title' | 'currentStatus' | 'receivedDate'>[]> {
        return this.documentRepository.find({
            order: { receivedDate: 'DESC', id: 'DESC' },
            take: 5,
            select: ['id', 'title', 'currentStatus', 'receivedDate'],
        }) as Promise<Pick<Document, 'id' | 'title' | 'currentStatus' | 'receivedDate'>[]>;
    }

    private async getDepartmentRouteStatuses(): Promise<DepartmentRouteRaw[]> {
        return this.documentRouteRepository.query(this.departmentRoutesSQL);
    }
}