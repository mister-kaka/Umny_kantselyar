import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { RoutingDocumentDto } from '../dto/routing-document.dto';
import { RouteTemplateDto } from '../dto/route-template.dto';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class DocumentsRoutingService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        private readonly logger: AppLoggerService,
    ) {}

    async getRoutingDocuments(departmentId?: number): Promise<RoutingDocumentDto[]> {
        try {
            const query = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoin('doc.currentDepartment', 'currentDept')
                .leftJoin('doc.aiResults', 'ai', 'ai.id = (SELECT id FROM document_ai_results WHERE document_id = doc.id ORDER BY created_at DESC LIMIT 1)')
                .where('doc.currentStatus = :status', { status: 'routed' })
                .select([
                    'doc.id as id',
                    'doc.registrationNumber as registrationNumber',
                    'doc.title as title',
                    'currentDept.name as currentDepartment',
                    'ai.departmentSuggested as suggestedDepartment',
                    'doc.currentStatus as routeStatus'
                ]);

            if (departmentId) {
                query.andWhere('doc.currentDepartmentId = :departmentId', { departmentId });
            }

            const results = await query.getRawMany();

            return results.map(row => ({
                id: row.id,
                registrationNumber: row.registrationNumber,
                title: row.title,
                currentDepartment: row.currentDepartment,
                suggestedDepartment: row.suggestedDepartment,
                routeStatus: row.routeStatus,
            }));
        } catch (error) {
            throw new HttpException(
                'Ошибка получения списка документов для маршрутизации',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async updateRouteStatus(id: number, status: string): Promise<{ message: string }> {
        try {
            const route = await this.documentRouteRepository.findOne({ where: { id } });
            if (!route) {
                throw new HttpException('Маршрут не найден', HttpStatus.NOT_FOUND);
            }

            route.routeStatus = status;
            await this.documentRouteRepository.save(route);

            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'PUT',
                url: `/document-routes/${id}/status`,
                action: 'обновление статуса маршрута',
                status: 'success',
                statusCode: 200,
                message: `Статус маршрута обновлён на ${status}`,
            });

            return { message: 'Статус маршрута обновлён' };
        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'PUT',
                url: `/document-routes/${id}/status`,
                action: 'обновление статуса маршрута',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при обновлении статуса маршрута',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getRouteTemplates(): Promise<RouteTemplateDto[]> {
        try {
            const templates = await this.documentRepository.manager
                .createQueryBuilder()
                .select('*')
                .from('route_templates', 'rt')
                .where('rt.is_active = :isActive', { isActive: true })
                .orderBy('rt.name', 'ASC')
                .getRawMany();

            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'GET',
                url: '/route-templates',
                action: 'получение шаблонов маршрутизации',
                status: 'success',
                statusCode: 200,
                message: `Получено ${templates.length} шаблонов`,
            });

            return templates.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                departmentIds: t.department_ids || [],
                isActive: t.is_active,
            }));
        } catch (error) {
            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'GET',
                url: '/route-templates',
                action: 'получение шаблонов маршрутизации',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении шаблонов маршрутизации',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}