import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotificationListResponseDto, UnreadCountDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        private readonly logger: AppLoggerService,
    ) {}

    async createNotification(
        userId: number,
        type: string,
        title: string,
        message: string,
        documentId?: number,
    ): Promise<void> {
        const notification = this.notificationRepository.create({
            userId,
            type,
            title,
            message,
            documentId,
            isRead: false,
        });
        await this.notificationRepository.save(notification);
    }

    async findAll(userId: number, page: number = 1, limit: number = 20): Promise<NotificationListResponseDto> {
        try {
            const skip = (page - 1) * limit;

            const [items, total] = await this.notificationRepository.findAndCount({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
            });

            await this.logger.log({
                module: 'Notifications',
                type: 'GET',
                url: '/notifications',
                action: 'получение списка уведомлений',
                status: 'success',
                statusCode: 200,
                message: `Найдено уведомлений: ${total}`,
            });

            return {
                items: items.map(item => ({
                    id: item.id,
                    type: item.type,
                    title: item.title,
                    message: item.message,
                    documentId: item.documentId,
                    isRead: item.isRead,
                    createdAt: item.createdAt,
                })),
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'GET',
                url: '/notifications',
                action: 'получение списка уведомлений',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при получении уведомлений',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getUnreadCount(userId: number): Promise<UnreadCountDto> {
        try {
            const all = await this.notificationRepository.find({
                where: { userId, isRead: false },
            });

            const counts: UnreadCountDto = {
                total: all.length,
                newDocument: all.filter(n => n.type === 'new_document').length,
                aiComplete: all.filter(n => n.type === 'ai_complete').length,
                extractError: all.filter(n => n.type === 'extract_error').length,
                pendingVerification: all.filter(n => n.type === 'pending_verification').length,
                routedToDepartment: all.filter(n => n.type === 'routed').length,
                lowConfidence: all.filter(n => n.type === 'low_confidence').length,
                routeError: all.filter(n => n.type === 'route_error').length,
                overdueVerification: all.filter(n => n.type === 'overdue').length,
            };

            await this.logger.log({
                module: 'Notifications',
                type: 'GET',
                url: '/notifications/unread-count',
                action: 'получение количества непрочитанных уведомлений',
                status: 'success',
                statusCode: 200,
                message: `Непрочитанных: ${counts.total}`,
            });

            return counts;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'GET',
                url: '/notifications/unread-count',
                action: 'получение количества непрочитанных уведомлений',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при получении счётчика уведомлений',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async markAsRead(userId: number, id: number): Promise<void> {
        try {
            const notification = await this.notificationRepository.findOne({
                where: { id, userId },
            });

            if (!notification) {
                throw new HttpException('Уведомление не найдено', HttpStatus.NOT_FOUND);
            }

            notification.isRead = true;
            await this.notificationRepository.save(notification);

            await this.logger.log({
                module: 'Notifications',
                type: 'PUT',
                url: `/notifications/${id}/read`,
                action: 'отметка уведомления как прочитанного',
                status: 'success',
                statusCode: 200,
                message: `Уведомление ${id} отмечено как прочитанное`,
            });

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'PUT',
                url: `/notifications/${id}/read`,
                action: 'отметка уведомления как прочитанного',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при обновлении уведомления',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async markAllAsRead(userId: number): Promise<void> {
        try {
            await this.notificationRepository.update(
                { userId, isRead: false },
                { isRead: true },
            );

            await this.logger.log({
                module: 'Notifications',
                type: 'PUT',
                url: '/notifications/read-all',
                action: 'отметка всех уведомлений как прочитанных',
                status: 'success',
                statusCode: 200,
                message: 'Все уведомления отмечены как прочитанные',
            });

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'PUT',
                url: '/notifications/read-all',
                action: 'отметка всех уведомлений как прочитанных',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при обновлении уведомлений',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}