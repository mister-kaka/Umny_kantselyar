import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserSession } from '../entities/user-session.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { LoginHistoryDto } from './dto/login-history.dto';
import { AuditLogDto } from './dto/audit-log.dto';
import { SessionDto } from './dto/session.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class SecurityService {
    constructor(
        @InjectRepository(UserSession)
        private userSessionRepository: Repository<UserSession>,
        @InjectRepository(LoginHistory)
        private loginHistoryRepository: Repository<LoginHistory>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private readonly logger: AppLoggerService,
        private readonly auditLogService: AuditLogService,
    ) {}

    async cleanExpiredSessions(): Promise<void> {
        await this.userSessionRepository.delete({
            expiresAt: LessThan(new Date()),
        });
    }

    async saveSession(
        userId: number,
        token: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<void> {
        await this.cleanExpiredSessions();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);

        const session = this.userSessionRepository.create({
            userId,
            token,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            expiresAt,
        });

        await this.userSessionRepository.save(session);

        await this.logger.log({
            module: 'Security',
            type: 'CREATE',
            url: '/auth/login',
            action: 'создание сессии',
            status: 'success',
            statusCode: 201,
            message: `Сессия создана для пользователя ${userId}`,
        });
    }

    async getSessions(userId: number, currentToken: string): Promise<SessionDto[]> {
        try {
            await this.cleanExpiredSessions();

            const sessions = await this.userSessionRepository.find({
                where: { userId },
                order: { createdAt: 'DESC' },
            });

            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/sessions',
                action: 'получение списка сессий',
                status: 'success',
                statusCode: 200,
                message: `Получено ${sessions.length} сессий для пользователя ${userId}`,
            });

            return sessions.map(session => ({
                id: session.id,
                userId: session.userId,
                token: session.token.slice(-20) + '...',
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
            }));

        } catch (error) {
            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/sessions',
                action: 'получение списка сессий',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении сессий',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getLoginHistory(
        userId: number,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ items: LoginHistoryDto[]; total: number; page: number; totalPages: number }> {
        try {
            const [items, total] = await this.loginHistoryRepository.findAndCount({
                where: { userId },
                order: { loginTime: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });

            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/login-history',
                action: 'получение истории входов',
                status: 'success',
                statusCode: 200,
                message: `Получено ${items.length} записей истории для пользователя ${userId}`,
            });

            return {
                items: items.map(item => ({
                    id: item.id,
                    userId: item.userId,
                    ipAddress: item.ipAddress,
                    userAgent: item.userAgent,
                    loginTime: item.loginTime,
                })),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };

        } catch (error) {
            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/login-history',
                action: 'получение истории входов',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении истории входов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async logoutAll(userId: number, currentToken: string): Promise<{ message: string }> {
        try {
            const result = await this.userSessionRepository.delete({
                userId,
                token: Not(currentToken),
            });

            await this.auditLogService.log(
                userId,
                'logout_all',
                null,
                { sessionsClosed: result.affected || 0 }
            );

            await this.logger.log({
                module: 'Security',
                type: 'POST',
                url: '/security/logout-all',
                action: 'завершение всех сессий',
                status: 'success',
                statusCode: 200,
                message: `Завершено ${result.affected || 0} сессий для пользователя ${userId}`,
            });

            return { message: `Завершено ${result.affected || 0} сессий` };

        } catch (error) {
            await this.logger.log({
                module: 'Security',
                type: 'POST',
                url: '/security/logout-all',
                action: 'завершение всех сессий',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при завершении сессий',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async logoutSession(userId: number, sessionId: number): Promise<{ message: string }> {
        try {
            const session = await this.userSessionRepository.findOne({
                where: { id: sessionId, userId },
            });

            if (!session) {
                throw new HttpException('Сессия не найдена', HttpStatus.NOT_FOUND);
            }

            await this.userSessionRepository.remove(session);

            await this.auditLogService.log(
                userId,
                'logout_session',
                null,
                { sessionId, sessionToken: session.token.slice(-20) + '...' }
            );

            await this.logger.log({
                module: 'Security',
                type: 'DELETE',
                url: `/security/sessions/${sessionId}`,
                action: 'завершение сессии',
                status: 'success',
                statusCode: 200,
                message: `Сессия ${sessionId} завершена для пользователя ${userId}`,
            });

            return { message: 'Сессия завершена' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Security',
                type: 'DELETE',
                url: `/security/sessions/${sessionId}`,
                action: 'завершение сессии',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при завершении сессии',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getAuditLog(
        userId: number,
        page: number = 1,
        limit: number = 20,
        action?: string,
        documentId?: number,
    ): Promise<{ items: AuditLogDto[]; total: number; page: number; totalPages: number }> {
        try {
            const query = this.auditLogRepository
                .createQueryBuilder('log')
                .where('log.user_id = :userId', { userId });

            if (action) {
                query.andWhere('log.action = :action', { action });
            }

            if (documentId) {
                query.andWhere('log.document_id = :documentId', { documentId });
            }

            const [items, total] = await query
                .orderBy('log.created_at', 'DESC')
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();

            const userIds = [...new Set(items.map(item => item.userId))];
            let userMap = new Map<number, { fullName: string; avatarUrl: string | null }>();
            if (userIds.length > 0) {
                const users = await this.userRepository
                    .createQueryBuilder('user')
                    .where('user.id IN (:...ids)', { ids: userIds })
                    .select(['user.id', 'user.fullName', 'user.avatarUrl'])
                    .getMany();
                userMap = new Map(users.map(user => [user.id, { fullName: user.fullName, avatarUrl: user.avatarUrl }]));
            }

            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/audit-log',
                action: 'получение журнала действий',
                status: 'success',
                statusCode: 200,
                message: `Получено ${items.length} записей аудита для пользователя ${userId}`,
            });

            return {
                items: items.map(item => ({
                    id: item.id,
                    userId: item.userId,
                    userName: userMap.get(item.userId)?.fullName || 'Неизвестно',
                    userAvatarUrl: userMap.get(item.userId)?.avatarUrl || null,
                    action: item.action,
                    documentId: item.documentId,
                    details: item.details,
                    createdAt: item.createdAt,
                })),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };

        } catch (error) {
            await this.logger.log({
                module: 'Security',
                type: 'GET',
                url: '/security/audit-log',
                action: 'получение журнала действий',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении журнала действий',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async isValidToken(token: string): Promise<boolean> {
        const session = await this.userSessionRepository.findOne({
            where: { token, expiresAt: LessThan(new Date()) },
        });
        return !!session;
    }
}