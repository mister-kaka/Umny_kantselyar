import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { Department } from '../entities/department.entity';
import { DashboardResponseDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(Department)    
        private departmentRepository: Repository<Department>,
    ) {}

    async getDashboardData(): Promise<DashboardResponseDto> {

        const totalDocuments = await this.documentRepository.count();  // общее количество документов

        const inProgress = await this.documentRepository.count({   // количество документов в обработке
            where: { currentStatus: 'in_review' },
        });

        const pendingCheck = await this.documentRepository.count({ // rоличество документов, требующих проверки
            where: { currentStatus: 'pending' },
        });

        const recentDocumentsRaw = await this.documentRepository.find({  // последние 5 документов 
            order: { receivedDate: 'DESC' },
            take: 5,
            select: ['id', 'title', 'currentStatus', 'receivedDate'],
        });

        const recentDocuments = recentDocumentsRaw.map(doc => ({
            id: doc.id,
            title: doc.title,
            status: doc.currentStatus,
            date: doc.receivedDate,
        }));

        const departmentRouteStatusesRaw = await this.documentRouteRepository  // cтатусы маршрутов по отделам
            .query(`
                SELECT 
                    d.id as "departmentId",
                    d.name as "departmentName",
                    dr.route_status as "routeStatus",
                    COUNT(dr.id) as count
                FROM document_routes dr
                INNER JOIN departments d ON d.id = dr.department_id
                GROUP BY d.id, d.name, dr.route_status
                ORDER BY d.name ASC, dr.route_status ASC
        `);

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
     }
}
