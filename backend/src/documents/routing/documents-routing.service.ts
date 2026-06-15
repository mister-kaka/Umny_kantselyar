import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { User } from '../../entities/user.entity';
import { RoutingResponseDto, RoutingDocumentDto, RoutingOperatorDto, RoutingStatsDto } from '../dto/routing-response.dto';
import { RouteTemplateDto } from '../dto/route-template.dto';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class DocumentsRoutingService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly logger: AppLoggerService,
    ) {}

    async getRoutingDocuments(
        departmentId?: number,
        operatorId?: number,
        filter?: 'all' | 'matched' | 'mismatched',
        page: number = 1,
        limit: number = 10,
    ): Promise<RoutingResponseDto> {
        try {
            const where: FindOptionsWhere<Document> = {
                currentStatus: 'routed',
            };

            if (departmentId) {
                where.currentDepartmentId = departmentId;
            }

            if (operatorId) {
                where.createdBy = operatorId;
            }

            const [allDocs, totalItems] = await this.documentRepository.findAndCount({
                where,
                relations: ['currentDepartment', 'creator', 'aiResults', 'documentRoutes'],
                order: { routedAt: 'DESC' },
            });

            let filteredDocs = allDocs;

            if (filter === 'matched') {
                filteredDocs = allDocs.filter(doc => {
                    const lastAi = doc.aiResults?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                    return lastAi && doc.currentDepartment?.name === lastAi.departmentSuggested;
                });
            } else if (filter === 'mismatched') {
                filteredDocs = allDocs.filter(doc => {
                    const lastAi = doc.aiResults?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                    return lastAi && doc.currentDepartment?.name !== lastAi.departmentSuggested;
                });
            }

            const totalFiltered = filteredDocs.length;
            const pagedDocs = filteredDocs.slice((page - 1) * limit, page * limit);

            const items: RoutingDocumentDto[] = pagedDocs.map(doc => {
                const lastAi = doc.aiResults?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                const routedRoute = doc.documentRoutes?.find(dr => dr.routeStatus === 'routed');

                return {
                    id: doc.id,
                    registrationNumber: doc.registrationNumber,
                    title: doc.title,
                    currentDepartment: doc.currentDepartment?.name || '—',
                    suggestedDepartment: lastAi?.departmentSuggested || '—',
                    routeStatus: doc.currentStatus,
                    operatorName: doc.creator?.fullName || 'Неизвестно',
                    operatorAvatarUrl: doc.creator?.avatarUrl || null,
                    routedAt: doc.routedAt?.toISOString() || '',
                    routeReason: routedRoute?.routeReason || null,
                };
            });

            const stats: RoutingStatsDto = {
                total: totalItems,
                matched: allDocs.filter(doc => {
                    const lastAi = doc.aiResults?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                    return lastAi && doc.currentDepartment?.name === lastAi.departmentSuggested;
                }).length,
                mismatched: allDocs.filter(doc => {
                    const lastAi = doc.aiResults?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                    return lastAi && doc.currentDepartment?.name !== lastAi.departmentSuggested;
                }).length,
            };

            const operatorSet = new Map<number, { id: number; fullName: string }>();
            allDocs.forEach(doc => {
                if (doc.creator && !operatorSet.has(doc.creator.id)) {
                    operatorSet.set(doc.creator.id, {
                        id: doc.creator.id,
                        fullName: doc.creator.fullName,
                    });
                }
            });
            const operators: RoutingOperatorDto[] = Array.from(operatorSet.values());

            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'GET',
                url: '/documents/routing',
                action: 'получение списка маршрутизации',
                status: 'success',
                statusCode: 200,
                message: `Найдено ${totalFiltered} документов`,
            });

            return {
                stats,
                items,
                operators,
                page,
                totalPages: Math.ceil(totalFiltered / limit),
                totalItems: totalFiltered,
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'DocumentsRouting',
                type: 'GET',
                url: '/documents/routing',
                action: 'получение списка маршрутизации',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка получения списка документов для маршрутизации',
                HttpStatus.INTERNAL_SERVER_ERROR,
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