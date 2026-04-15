import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { Department } from '../entities/department.entity';
import { DashboardResponseDto } from './dto/dashboard.dto';

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
            console.error('Ошибка при получении данных дашборда:', error);
            throw new HttpException(
                'Ошибка сервера при получении данных',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    private async getTotalDocuments(): Promise<number> {  // общее количество документов
        return this.documentRepository.count();
    }  

    private async getInProgressCount(): Promise<number> {   // количество документов в обработке
        return this.documentRepository.count({
            where: { currentStatus: 'in_review' },
        });
    }

    private async getPendingCheckCount(): Promise<number> { // rоличество документов, требующих проверки
        return this.documentRepository.count({
            where: { currentStatus: 'pending' },
        });
    }

    private async getRecentDocuments(): Promise<Document[]> {  // последние 5 документов 
        return this.documentRepository.find({
            order: { receivedDate: 'DESC' },
            take: 5,
            select: ['id', 'title', 'currentStatus', 'receivedDate'],
        });
    }

     private async getDepartmentRouteStatuses(): Promise<any[]> {  // cтатусы маршрутов по отделам
        return this.documentRouteRepository.query(this.departmentRoutesSQL);
    }
}
