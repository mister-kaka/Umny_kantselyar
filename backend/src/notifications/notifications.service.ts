import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotificationListResponseDto, UnreadCountDto, NotificationFilterDto } from './dto/notification.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        private readonly logger: AppLoggerService,
        private readonly auditLogService: AuditLogService,
        private readonly notificationsGateway: NotificationsGateway,
    ) {}

    private getMoscowDate(): Date {
        const mskString = new Date().toLocaleString('en-US', {
            timeZone: 'Europe/Moscow',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        return new Date(mskString);
    }

    async createNotification(
        userId: number,
        type: NotificationType,
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
            createdAt: this.getMoscowDate(),
        });
        await this.notificationRepository.save(notification);
        this.notificationsGateway.sendUnreadCountUpdate(userId);
    }

    async upsertDocumentNotification(
        userId: number,
        documentId: number,
        type: NotificationType,
        title: string,
        message: string,
    ): Promise<void> {
        const existing = await this.notificationRepository.findOne({
            where: {
                userId,
                documentId,
                isRead: false,
            },
            order: { createdAt: 'DESC' },
        });

        if (existing) {
            existing.type = type;
            existing.title = title;
            existing.message = message;
            existing.createdAt = this.getMoscowDate();

            await this.notificationRepository.save(existing);

            await this.logger.log({
                module: 'Notifications',
                type: 'UPDATE',
                url: '/notifications (internal)',
                action: 'объединение уведомлений по документу',
                status: 'success',
                statusCode: 200,
                message: `Уведомление ${existing.id} обновлено до типа ${type} (документ: ${documentId})`,
            });

            this.notificationsGateway.sendUnreadCountUpdate(userId);
        } else {
            await this.createNotification(userId, type, title, message, documentId);

            await this.logger.log({
                module: 'Notifications',
                type: 'CREATE',
                url: '/notifications (internal)',
                action: 'создание уведомления по документу',
                status: 'success',
                statusCode: 201,
                message: `Создано уведомление типа ${type} (документ: ${documentId})`,
            });
        }
    }

    async findAll(
        userId: number,
        page: number = 1,
        limit: number = 10,
        filter?: NotificationFilterDto,
    ): Promise<NotificationListResponseDto> {
        try {
            const skip = (page - 1) * limit;

            const where: any = { userId };

            if (filter?.type) {
                where.type = filter.type;
            }

            if (filter?.isRead !== undefined) {
                where.isRead = filter.isRead;
            }

            if (filter?.dateFrom || filter?.dateTo) {
                const now = new Date();
                let dateFrom: Date | undefined;
                let dateTo: Date | undefined;

                if (filter.dateFrom) {
                    dateFrom = new Date(filter.dateFrom);
                    dateFrom.setHours(0, 0, 0, 0);
                }
                if (filter.dateTo) {
                    dateTo = new Date(filter.dateTo);
                    dateTo.setHours(23, 59, 59, 999);
                }

                if (dateFrom && dateTo) {
                    where.createdAt = Between(dateFrom, dateTo);
                } else if (dateFrom) {
                    where.createdAt = MoreThanOrEqual(dateFrom);
                } else if (dateTo) {
                    where.createdAt = LessThanOrEqual(dateTo);
                }
            }

            const [items, total] = await this.notificationRepository.findAndCount({
                where,
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
                documentReady: all.filter(n => n.type === 'document_ready').length,
                extractError: all.filter(n => n.type === 'extract_error').length,
                pendingVerification: all.filter(n => n.type === 'pending_verification').length,
                routedToDepartment: all.filter(n => n.type === 'routed').length,
                rejected: all.filter(n => n.type === 'rejected').length,
                verified: all.filter(n => n.type === 'verified').length,
                lowConfidence: all.filter(n => n.type === 'low_confidence').length,
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

            await this.auditLogService.log(
                userId,
                'notification_mark_read',
                notification.documentId || null,
                { notificationId: id, notificationType: notification.type, notificationTitle: notification.title }
            );

            await this.logger.log({
                module: 'Notifications',
                type: 'PUT',
                url: `/notifications/${id}/read`,
                action: 'отметка уведомления как прочитанного',
                status: 'success',
                statusCode: 200,
                message: `Уведомление ${id} отмечено как прочитанное`,
            });

            this.notificationsGateway.sendUnreadCountUpdate(userId);

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
            const result = await this.notificationRepository.update(
                { userId, isRead: false },
                { isRead: true },
            );

            await this.auditLogService.log(
                userId,
                'notification_mark_all_read',
                null,
                { affectedCount: result.affected || 0 }
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

            this.notificationsGateway.sendUnreadCountUpdate(userId);

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

    async deleteNotification(userId: number, id: number): Promise<{ message: string }> {
        try {
            const notification = await this.notificationRepository.findOne({
                where: { id, userId },
            });

            if (!notification) {
                throw new HttpException('Уведомление не найдено', HttpStatus.NOT_FOUND);
            }

            await this.notificationRepository.remove(notification);

            await this.auditLogService.log(
                userId,
                'notification_delete',
                notification.documentId || null,
                { notificationId: id, notificationType: notification.type, notificationTitle: notification.title }
            );

            await this.logger.log({
                module: 'Notifications',
                type: 'DELETE',
                url: `/notifications/${id}`,
                action: 'удаление уведомления',
                status: 'success',
                statusCode: 200,
                message: `Уведомление ${id} удалено`,
            });

            this.notificationsGateway.sendUnreadCountUpdate(userId);

            return { message: 'Уведомление удалено' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'DELETE',
                url: `/notifications/${id}`,
                action: 'удаление уведомления',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при удалении уведомления',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async deleteAllRead(userId: number): Promise<{ message: string; deletedCount: number }> {
        try {
            const notifications = await this.notificationRepository.find({
                where: { userId, isRead: true },
            });

            const deletedCount = notifications.length;

            if (deletedCount > 0) {
                await this.notificationRepository.remove(notifications);
            }

            await this.auditLogService.log(
                userId,
                'notification_delete_all_read',
                null,
                { deletedCount }
            );

            await this.logger.log({
                module: 'Notifications',
                type: 'DELETE',
                url: '/notifications/read',
                action: 'удаление всех прочитанных уведомлений',
                status: 'success',
                statusCode: 200,
                message: `Удалено ${deletedCount} прочитанных уведомлений`,
            });

            this.notificationsGateway.sendUnreadCountUpdate(userId);

            return { message: 'Прочитанные уведомления удалены', deletedCount };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Notifications',
                type: 'DELETE',
                url: '/notifications/read',
                action: 'удаление всех прочитанных уведомлений',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при удалении уведомлений',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}