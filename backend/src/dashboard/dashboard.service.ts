import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { Department } from '../entities/department.entity';
import { DashboardResponseDto } from './dto/dashboard.dto';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  type: string;
  url: string;
  action: string;
  status: string;
  errorCode?: number;
  errorMessage?: string;
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
            hour12: false
        });
    }

    private writeLog(logEntry: LogEntry) {
        const logFilePath = path.join(__dirname, '../../logs.json');
        let logs: LogEntry[] = [];
        
        if (fs.existsSync(logFilePath)) {
            try {
                const fileContent = fs.readFileSync(logFilePath, 'utf8');
                logs = JSON.parse(fileContent);
            } catch (e) {
                logs = [];
            }
        }
        
        logs.push(logEntry);
        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
    }

    async getDashboardData(): Promise<DashboardResponseDto> {
        const timestamp = this.getMoscowTime();
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

        this.writeLog({
                timestamp,
                type: 'GET',
                url: '/dashboard/data',
                action: 'получение данных на дашборд',
                status: 'success',
                errorCode: 200,
                errorMessage: 'Данные успешно получены',
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
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера при получении данных';
            
            this.writeLog({
                timestamp,
                type: 'GET',
                url: '/dashboard/data',
                action: 'получение данных на дашборд',
                status: 'error',
                errorCode: HttpStatus.INTERNAL_SERVER_ERROR,
                errorMessage: errorMessage,
            });

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
