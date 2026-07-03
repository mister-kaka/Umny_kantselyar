import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Document } from '../entities/document.entity';
import { Department } from '../entities/department.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentSource } from '../entities/document-source.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { DocumentClassification } from '../entities/document-classification.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { DocumentComment } from '../entities/document-comment.entity';
import { Notification } from '../entities/notification.entity';
import { AiSetting } from '../entities/ai-setting.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { UserSession } from '../entities/user-session.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { UserInterfaceSettings } from '../entities/user-interface-settings.entity';
import { SystemSettings } from '../entities/system-settings.entity';
import { AppLoggerService } from '../logger/app-logger.service';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityService } from '../security/security.service';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        @InjectRepository(Document) private documentRepository: Repository<Document>,
        @InjectRepository(Department) private departmentRepository: Repository<Department>,
        @InjectRepository(DocumentType) private documentTypeRepository: Repository<DocumentType>,
        @InjectRepository(DocumentCategory) private documentCategoryRepository: Repository<DocumentCategory>,
        @InjectRepository(DocumentRoute) private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(DocumentSource) private documentSourceRepository: Repository<DocumentSource>,
        @InjectRepository(DocumentFile) private documentFileRepository: Repository<DocumentFile>,
        @InjectRepository(OcrResult) private ocrResultRepository: Repository<OcrResult>,
        @InjectRepository(DocumentClassification) private classificationRepository: Repository<DocumentClassification>,
        @InjectRepository(DocumentAiResult) private aiResultRepository: Repository<DocumentAiResult>,
        @InjectRepository(DocumentComment) private commentRepository: Repository<DocumentComment>,
        @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
        @InjectRepository(AiSetting) private aiSettingRepository: Repository<AiSetting>,
        @InjectRepository(AuditLog) private auditLogRepository: Repository<AuditLog>,
        @InjectRepository(LoginHistory) private loginHistoryRepository: Repository<LoginHistory>,
        @InjectRepository(UserSession) private userSessionRepository: Repository<UserSession>,
        @InjectRepository(UserNotificationSettings) private userNotificationSettingsRepository: Repository<UserNotificationSettings>,
        @InjectRepository(UserInterfaceSettings) private userInterfaceSettingsRepository: Repository<UserInterfaceSettings>,
        @InjectRepository(SystemSettings) private systemSettingsRepository: Repository<SystemSettings>,
        private readonly logger: AppLoggerService,
        private readonly auditLogService: AuditLogService,
        private readonly notificationsService: NotificationsService,
        private readonly securityService: SecurityService,
    ) {}

    private getMoscowTime(): string {
        return new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    }

    async getAuditLog(
        page: number, limit: number, userId?: number,
        action?: string, dateFrom?: string, dateTo?: string,
        userName?: string,
    ) {
        try {
            const query = this.auditLogRepository.createQueryBuilder('log');

            if (userId) query.andWhere('log.user_id = :userId', { userId });
            if (action) query.andWhere('log.action = :action', { action });
            if (dateFrom) query.andWhere('log.created_at >= :dateFrom', { dateFrom });
            if (dateTo) query.andWhere('log.created_at <= :dateTo', { dateTo: dateTo + 'T23:59:59.999Z' });

            if (userName) {
                query.andWhere(
                    'log.user_id IN (SELECT u.id FROM users u WHERE u.full_name ILIKE :search OR u.email ILIKE :search)',
                    { search: `%${userName}%` }
                );
            }

            const [items, total] = await query
                .orderBy('log.created_at', 'DESC')
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();

            const userIds = [...new Set(items.map(item => item.userId))];
            let userMap = new Map<number, any>();
            if (userIds.length > 0) {
                const users = await this.userRepository
                    .createQueryBuilder('user')
                    .where('user.id IN (:...ids)', { ids: userIds })
                    .select(['user.id', 'user.fullName', 'user.avatarUrl'])
                    .getMany();
                userMap = new Map(users.map(u => [u.id, u]));
            }

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
                total, page, totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new HttpException('Ошибка получения журнала', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getUsers() {
        try {
            const users = await this.userRepository.find({
                relations: ['role'],
                select: ['id', 'fullName', 'email', 'roleId', 'isBlocked', 'avatarUrl', 'departmentId', 'createdAt'],
            });
            return users.map(user => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role?.code || 'operator',
                isBlocked: user.isBlocked,
                avatarUrl: user.avatarUrl,
                departmentId: user.departmentId,
                createdAt: user.createdAt,
            }));
        } catch (error) {
            throw new HttpException('Ошибка получения пользователей', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getUserStats(userId: number) {
        try {
            const [docCount, commentCount, sessionCount] = await Promise.all([
                this.documentRepository.count({ where: { createdBy: userId } }),
                this.commentRepository.count({ where: { userId } }),
                this.userSessionRepository.count({ where: { userId } }),
            ]);
            return { documentCount: docCount, commentCount, sessionCount };
        } catch (error) {
            throw new HttpException('Ошибка получения статистики', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateUserRole(id: number, role: string, adminId: number) {
        try {
            if (!['admin', 'operator'].includes(role)) {
                throw new HttpException('Неверная роль', HttpStatus.BAD_REQUEST);
            }

            const roleEntity = await this.roleRepository.findOne({ where: { code: role } });
            if (!roleEntity) {
                throw new HttpException('Роль не найдена', HttpStatus.NOT_FOUND);
            }

            const user = await this.userRepository.findOne({ where: { id } });
            if (!user) throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);

            user.roleId = roleEntity.id;
            await this.userRepository.save(user);

            await this.auditLogService.log(adminId, 'user_role_change', null, { targetUserId: id, newRole: role });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();
            const roleName = role === 'admin' ? 'Администратор' : 'Оператор';

            await this.notificationsService.createNotification(
                id,
                'settings_changed',
                'Роль изменена',
                `Администратор изменил вашу роль в системе.\n\nНовая роль: ${roleName}\nАдминистратор: ${adminName}\nВремя: ${now}`,
            );

            return { message: 'Роль обновлена' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка обновления роли', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async toggleUserBlock(id: number, isBlocked: boolean, adminId: number) {
        try {
            const user = await this.userRepository.findOne({ where: { id } });
            if (!user) throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);

            user.isBlocked = isBlocked;
            await this.userRepository.save(user);

            if (isBlocked) {
                await this.userSessionRepository.delete({ userId: id });
            }

            await this.auditLogService.log(adminId, isBlocked ? 'user_blocked' : 'user_unblocked', null, { targetUserId: id });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            if (isBlocked) {
                await this.notificationsService.createNotification(
                    id,
                    'settings_changed',
                    'Учётная запись заблокирована',
                    `Ваша учётная запись была заблокирована администратором.\n\nАдминистратор: ${adminName}\nВремя: ${now}\n\nДля выяснения причин обратитесь к администратору системы.`,
                );
            } else {
                await this.notificationsService.createNotification(
                    id,
                    'settings_changed',
                    'Учётная запись разблокирована',
                    `Ваша учётная запись была разблокирована.\n\nАдминистратор: ${adminName}\nВремя: ${now}`,
                );
            }

            return { message: isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка блокировки', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createUser(dto: { fullName: string; email: string; password: string; role: string; departmentId?: number }, adminId: number) {
        try {
            const existing = await this.userRepository.findOne({ where: { email: dto.email } });
            if (existing) throw new HttpException('Пользователь с таким email уже существует', HttpStatus.CONFLICT);

            const roleEntity = await this.roleRepository.findOne({ where: { code: dto.role || 'operator' } });
            if (!roleEntity) throw new HttpException('Роль не найдена', HttpStatus.NOT_FOUND);

            const passwordHash = await bcrypt.hash(dto.password, 10);
            const user = this.userRepository.create({
                fullName: dto.fullName,
                email: dto.email,
                passwordHash,
                roleId: roleEntity.id,
                departmentId: dto.departmentId || null,
                isBlocked: false,
            });
            const saved = await this.userRepository.save(user);

            await this.userNotificationSettingsRepository.save(
                this.userNotificationSettingsRepository.create({ userId: saved.id })
            );
            await this.userInterfaceSettingsRepository.save(
                this.userInterfaceSettingsRepository.create({ userId: saved.id })
            );

            await this.auditLogService.log(adminId, 'user_created', null, { targetUserId: saved.id, email: dto.email, role: dto.role });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();
            const roleName = dto.role === 'admin' ? 'Администратор' : 'Оператор';

            await this.notificationsService.createNotification(
                saved.id,
                'settings_changed',
                'Учётная запись создана',
                `Администратор создал для вас учётную запись в системе «Умный Канцеляр».\n\nEmail: ${dto.email}\nРоль: ${roleName}\nАдминистратор: ${adminName}\nВремя: ${now}\n\nИспользуйте указанный email и пароль для входа в систему.`,
            );

            return { id: saved.id, fullName: saved.fullName, email: saved.email, role: dto.role };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка создания пользователя', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async resetUserPassword(id: number, newPassword: string, adminId: number) {
        try {
            const user = await this.userRepository.findOne({ where: { id } });
            if (!user) throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
            if (newPassword.length < 6) throw new HttpException('Пароль должен быть не менее 6 символов', HttpStatus.BAD_REQUEST);

            user.passwordHash = await bcrypt.hash(newPassword, 10);
            await this.userRepository.save(user);

            await this.userSessionRepository.delete({ userId: id });
            await this.auditLogService.log(adminId, 'user_password_reset', null, { targetUserId: id });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            await this.notificationsService.createNotification(
                id,
                'password_changed',
                'Пароль сброшен администратором',
                `Администратор сбросил пароль для вашей учётной записи.\n\nАдминистратор: ${adminName}\nВремя: ${now}\n\nИспользуйте новый пароль для входа в систему. Если это были не вы - немедленно обратитесь к администратору.`,
            );

            return { message: 'Пароль сброшен' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка сброса пароля', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteUser(id: number, adminId: number) {
        try {
            const user = await this.userRepository.findOne({ where: { id } });
            if (!user) throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
            if (user.id === adminId) throw new HttpException('Нельзя удалить самого себя', HttpStatus.BAD_REQUEST);

            const userEmail = user.email;
            const userFullName = user.fullName;

            await this.userSessionRepository.delete({ userId: id });
            await this.loginHistoryRepository.delete({ userId: id });
            await this.notificationRepository.delete({ userId: id });
            await this.userNotificationSettingsRepository.delete({ userId: id });
            await this.userInterfaceSettingsRepository.delete({ userId: id });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            await this.notificationsService.createNotification(
                id,
                'settings_changed',
                'Учётная запись удалена',
                `Ваша учётная запись была удалена из системы «Умный Канцеляр».\n\nАдминистратор: ${adminName}\nВремя: ${now}\n\nДля выяснения причин обратитесь к администратору системы.`,
            );

            await this.userRepository.remove(user);

            await this.auditLogService.log(adminId, 'user_deleted', null, { targetUserId: id, email: userEmail });
            return { message: 'Пользователь удалён' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка удаления пользователя', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getSystemSettings() {
        try {
            const settings = await this.systemSettingsRepository.find();
            const result: any = {};
            settings.forEach(s => { result[s.key] = s.value; });
            return result;
        } catch (error) {
            throw new HttpException('Ошибка получения настроек', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateSystemSettings(dto: any, adminId: number) {
        try {
            const changedKeys: string[] = [];

            for (const [key, value] of Object.entries(dto)) {
                let setting = await this.systemSettingsRepository.findOne({ where: { key } });
                if (setting) {
                    setting.value = value;
                    changedKeys.push(key);
                } else {
                    setting = this.systemSettingsRepository.create({ key, value });
                    changedKeys.push(key);
                }
                await this.systemSettingsRepository.save(setting);
            }

            await this.auditLogService.log(adminId, 'system_settings_update', null, { settings: dto });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            const allUsers = await this.userRepository.find({ select: ['id'] });

            for (const user of allUsers) {
                await this.notificationsService.createNotification(
                    user.id,
                    'admin_message',
                    'Системные настройки изменены',
                    `Администратор изменил системные настройки.\n\nИзменённые параметры: ${changedKeys.join(', ')}\nАдминистратор: ${adminName}\nВремя: ${now}`,
                );
            }

            return { message: 'Настройки сохранены' };
        } catch (error) {
            throw new HttpException('Ошибка сохранения настроек', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async cleanup(dto: { type: string; olderThanMonths: number }, adminId: number) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - dto.olderThanMonths);
            let count = 0;

            if (dto.type === 'documents') {
                const oldDocs = await this.documentRepository.find({
                    where: { createdAt: LessThan(cutoffDate) },
                    select: ['id'],
                });
                const ids = oldDocs.map(d => d.id);
                if (ids.length > 0) {
                    await this.documentRepository.delete(ids);
                    count = ids.length;
                }
            } else if (dto.type === 'notifications') {
                const result = await this.notificationRepository.delete({
                    isRead: true,
                    createdAt: LessThan(cutoffDate),
                });
                count = result.affected || 0;
            } else if (dto.type === 'audit') {
                const result = await this.auditLogRepository.delete({
                    createdAt: LessThan(cutoffDate),
                });
                count = result.affected || 0;
            }

            await this.auditLogService.log(adminId, 'cleanup', null, { type: dto.type, olderThanMonths: dto.olderThanMonths, deletedCount: count });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();
            const typeName = dto.type === 'documents' ? 'документов' : dto.type === 'notifications' ? 'уведомлений' : 'записей журнала';

            const adminRole = await this.roleRepository.findOne({ where: { code: 'admin' } });
            if (adminRole) {
                const admins = await this.userRepository.find({
                    where: { roleId: adminRole.id },
                    select: ['id'],
                });

                for (const adminUser of admins) {
                    await this.notificationsService.createNotification(
                        adminUser.id,
                        'admin_message',
                        'Выполнена очистка данных',
                        `Администратор выполнил очистку данных.\n\nТип: ${typeName}\nСтарше: ${dto.olderThanMonths} месяцев\nУдалено записей: ${count}\nАдминистратор: ${adminName}\nВремя: ${now}`,
                    );
                }
            }

            return { message: `Удалено ${count} записей` };
        } catch (error) {
            throw new HttpException('Ошибка очистки', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getLogs(date?: string, from?: string, to?: string): Promise<string> {
        try {
            const logsDir = path.join(process.cwd(), 'logs');

            if (date) {
                const filePath = path.join(logsDir, `logs-${date}.json`);
                if (!fs.existsSync(filePath)) throw new HttpException('Логи за указанную дату не найдены', HttpStatus.NOT_FOUND);
                return filePath;
            }

            if (from && to) {
                return logsDir;
            }

            const today = new Date().toISOString().split('T')[0];
            return path.join(logsDir, `logs-${today}.json`);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка получения логов', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async exportSelected(sections: string[], adminId: number) {
        try {
            const data: any = { version: '1.5.0', exportedAt: new Date().toISOString(), exportedBy: adminId };

            for (const section of sections) {
                switch (section) {
                    case 'documents': data.documents = await this.documentRepository.find(); break;
                    case 'references':
                        data.documentTypes = await this.documentTypeRepository.find();
                        data.documentCategories = await this.documentCategoryRepository.find();
                        data.departments = await this.departmentRepository.find();
                        break;
                    case 'users':
                        const users = await this.userRepository.find({
                            relations: ['role'],
                            select: ['id', 'fullName', 'email', 'roleId', 'departmentId', 'avatarUrl', 'createdAt'],
                        });
                        data.users = users.map(u => ({
                            id: u.id,
                            fullName: u.fullName,
                            email: u.email,
                            role: u.role?.code,
                            roleId: u.roleId,
                            departmentId: u.departmentId,
                            avatarUrl: u.avatarUrl,
                            createdAt: u.createdAt,
                        }));
                        break;
                    case 'settings':
                        data.aiSettings = await this.aiSettingRepository.find();
                        data.systemSettings = await this.systemSettingsRepository.find();
                        break;
                    case 'routes': data.documentRoutes = await this.documentRouteRepository.find(); break;
                    case 'audit': data.auditLog = await this.auditLogRepository.find(); break;
                }
            }

            await this.auditLogService.log(adminId, 'export_data', null, { sections });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            await this.notificationsService.createNotification(
                adminId,
                'admin_message',
                'Экспорт данных выполнен',
                `Выполнен экспорт данных системы.\n\nРазделы: ${sections.join(', ')}\nАдминистратор: ${adminName}\nВремя: ${now}`,
            );

            return data;
        } catch (error) {
            throw new HttpException('Ошибка экспорта', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async importSelected(data: any, sections: string[], adminId: number) {
        try {
            const counts: any = {};

            for (const section of sections) {
                switch (section) {
                    case 'documents':
                        if (data.documents) {
                            await this.documentRouteRepository.createQueryBuilder().delete().execute();
                            await this.documentSourceRepository.createQueryBuilder().delete().execute();
                            await this.documentFileRepository.createQueryBuilder().delete().execute();
                            await this.ocrResultRepository.createQueryBuilder().delete().execute();
                            await this.classificationRepository.createQueryBuilder().delete().execute();
                            await this.aiResultRepository.createQueryBuilder().delete().execute();
                            await this.commentRepository.createQueryBuilder().delete().execute();
                            await this.documentRepository.createQueryBuilder().delete().execute();
                            await this.documentRepository.save(data.documents);
                            counts.documents = data.documents.length;
                        }
                        break;
                    case 'references':
                        if (data.documentTypes) {
                            await this.documentTypeRepository.createQueryBuilder().delete().execute();
                            await this.documentTypeRepository.save(data.documentTypes);
                            counts.documentTypes = data.documentTypes.length;
                        }
                        if (data.documentCategories) {
                            await this.documentCategoryRepository.createQueryBuilder().delete().execute();
                            await this.documentCategoryRepository.save(data.documentCategories);
                            counts.documentCategories = data.documentCategories.length;
                        }
                        if (data.departments) {
                            await this.departmentRepository.createQueryBuilder().delete().execute();
                            await this.departmentRepository.save(data.departments);
                            counts.departments = data.departments.length;
                        }
                        break;
                    case 'users':
                        if (data.users) {
                            const currentUser = await this.userRepository.findOne({ where: { id: adminId } });
                            await this.userSessionRepository.createQueryBuilder().delete().execute();
                            await this.loginHistoryRepository.createQueryBuilder().delete().execute();
                            await this.notificationRepository.createQueryBuilder().delete().execute();
                            await this.userNotificationSettingsRepository.createQueryBuilder().delete().execute();
                            await this.userInterfaceSettingsRepository.createQueryBuilder().delete().execute();
                            await this.userRepository.createQueryBuilder().delete().execute();
                            if (currentUser) {
                                await this.userRepository.save(currentUser);
                            }
                            const usersToSave = data.users.filter((u: any) => u.id !== adminId);
                            if (usersToSave.length > 0) {
                                await this.userRepository.save(usersToSave);
                            }
                            counts.users = data.users.length;
                        }
                        break;
                    case 'settings':
                        if (data.aiSettings) {
                            await this.aiSettingRepository.createQueryBuilder().delete().execute();
                            await this.aiSettingRepository.save(data.aiSettings);
                            counts.aiSettings = data.aiSettings.length;
                        }
                        if (data.systemSettings) {
                            await this.systemSettingsRepository.createQueryBuilder().delete().execute();
                            await this.systemSettingsRepository.save(data.systemSettings);
                            counts.systemSettings = data.systemSettings.length;
                        }
                        break;
                    case 'routes':
                        if (data.documentRoutes) {
                            await this.documentRouteRepository.createQueryBuilder().delete().execute();
                            await this.documentRouteRepository.save(data.documentRoutes);
                            counts.documentRoutes = data.documentRoutes.length;
                        }
                        break;
                    case 'audit':
                        if (data.auditLog) {
                            await this.auditLogRepository.createQueryBuilder().delete().execute();
                            await this.auditLogRepository.save(data.auditLog);
                            counts.auditLog = data.auditLog.length;
                        }
                        break;
                }
            }

            await this.auditLogService.log(adminId, 'import_data', null, { sections, counts });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            const allUsers = await this.userRepository.find({ select: ['id'] });

            for (const user of allUsers) {
                await this.notificationsService.createNotification(
                    user.id,
                    'admin_message',
                    'Импорт данных выполнен',
                    `Выполнен импорт данных системы.\n\nРазделы: ${sections.join(', ')}\nАдминистратор: ${adminName}\nВремя: ${now}`,
                );
            }

            return { message: 'Данные импортированы', counts };
        } catch (error) {
            console.log('=== IMPORT ERROR ===');
            console.log(error);
            throw new HttpException('Ошибка импорта', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getBackupStatus() {
        try {
            const enabled = await this.systemSettingsRepository.findOne({ where: { key: 'auto_backup_enabled' } });
            const time = await this.systemSettingsRepository.findOne({ where: { key: 'auto_backup_time' } });
            const keepCount = await this.systemSettingsRepository.findOne({ where: { key: 'auto_backup_keep_count' } });
            const lastBackup = await this.systemSettingsRepository.findOne({ where: { key: 'last_backup_info' } });

            return {
                enabled: enabled?.value || false,
                time: time?.value || '03:00',
                keepCount: keepCount?.value || 7,
                lastBackup: lastBackup?.value || null,
            };
        } catch (error) {
            throw new HttpException('Ошибка получения статуса бэкапа', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateBackupConfig(dto: { enabled: boolean; time: string; keepCount: number }, adminId: number) {
        try {
            await this.updateSystemSettings(
                { auto_backup_enabled: dto.enabled, auto_backup_time: dto.time, auto_backup_keep_count: dto.keepCount },
                adminId
            );

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            const adminRole = await this.roleRepository.findOne({ where: { code: 'admin' } });
            if (adminRole) {
                const admins = await this.userRepository.find({
                    where: { roleId: adminRole.id },
                    select: ['id'],
                });

                for (const adminUser of admins) {
                    await this.notificationsService.createNotification(
                        adminUser.id,
                        'admin_message',
                        'Настройки бэкапа изменены',
                        `Администратор изменил настройки автоматического резервного копирования.\n\nАвто-бэкап: ${dto.enabled ? 'включён' : 'выключен'}\nВремя запуска: ${dto.time}\nХранить копий: ${dto.keepCount}\nАдминистратор: ${adminName}\nВремя: ${now}`,
                    );
                }
            }

            return { message: 'Настройки бэкапа сохранены' };
        } catch (error) {
            throw new HttpException('Ошибка сохранения настроек бэкапа', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async restoreFromBackup(adminId: number) {
        try {
            const backupDir = path.join(process.cwd(), 'backups');
            if (!fs.existsSync(backupDir)) throw new HttpException('Папка с бэкапами не найдена', HttpStatus.NOT_FOUND);

            const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
            if (files.length === 0) throw new HttpException('Бэкапы не найдены', HttpStatus.NOT_FOUND);

            const content = fs.readFileSync(path.join(backupDir, files[0]), 'utf-8');
            const data = JSON.parse(content);

            return this.importSelected(data, ['documents', 'references', 'settings', 'routes'], adminId);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Ошибка восстановления из бэкапа', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getStats() {
        try {
            const [totalDocs, totalUsers, avgConf, routes] = await Promise.all([
                this.documentRepository.count(),
                this.userRepository.count(),
                this.documentRepository.createQueryBuilder('doc').select('AVG(doc.confidenceScore)', 'avg').getRawOne(),
                this.documentRouteRepository.count(),
            ]);

            const statusStats = await this.documentRepository
                .createQueryBuilder('doc')
                .select('doc.currentStatus', 'status')
                .addSelect('COUNT(*)', 'count')
                .groupBy('doc.currentStatus')
                .getRawMany();

            const userActivity = await this.auditLogRepository
                .createQueryBuilder('log')
                .select('log.userId', 'userId')
                .addSelect('COUNT(*)', 'count')
                .groupBy('log.userId')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany();

            const userIds = userActivity.map((u: any) => u.userId);
            const users = userIds.length > 0
                ? await this.userRepository.createQueryBuilder('user').where('user.id IN (:...ids)', { ids: userIds }).select(['user.id', 'user.fullName']).getMany()
                : [];
            const userMap = new Map(users.map(u => [u.id, u.fullName]));

            return {
                totalDocuments: totalDocs,
                totalUsers,
                averageConfidence: Math.round((avgConf?.avg || 0) * 100),
                totalRoutes: routes,
                statusStats: statusStats.map((s: any) => ({ status: s.status, count: Number(s.count) })),
                userActivity: userActivity.map((u: any) => ({ userId: u.userId, userName: userMap.get(Number(u.userId)) || 'Неизвестно', count: Number(u.count) })),
            };
        } catch (error) {
            throw new HttpException('Ошибка получения статистики', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async sendMassNotification(dto: { target: string; userIds?: number[]; title: string; message: string }, adminId: number) {
        try {
            let recipients: number[] = [];

            if (dto.target === 'all') {
                const users = await this.userRepository.find({ select: ['id'] });
                recipients = users.map(u => u.id);
            } else if (dto.target === 'admins') {
                const adminRole = await this.roleRepository.findOne({ where: { code: 'admin' } });
                if (adminRole) {
                    const admins = await this.userRepository.find({ where: { roleId: adminRole.id }, select: ['id'] });
                    recipients = admins.map(u => u.id);
                }
            } else if (dto.target === 'operators') {
                const operatorRole = await this.roleRepository.findOne({ where: { code: 'operator' } });
                if (operatorRole) {
                    const operators = await this.userRepository.find({ where: { roleId: operatorRole.id }, select: ['id'] });
                    recipients = operators.map(u => u.id);
                }
            } else if (dto.target === 'selected' && dto.userIds) {
                recipients = dto.userIds;
            }

            for (const userId of recipients) {
                await this.notificationsService.createNotification(userId, 'admin_message', dto.title, dto.message);
            }

            await this.auditLogService.log(adminId, 'mass_notification', null, { target: dto.target, recipientsCount: recipients.length, title: dto.title });

            const admin = await this.userRepository.findOne({ where: { id: adminId }, select: ['fullName'] });
            const adminName = admin?.fullName || 'Администратор';
            const now = this.getMoscowTime();

            await this.notificationsService.createNotification(
                adminId,
                'admin_message',
                'Рассылка выполнена',
                `Выполнена рассылка уведомления.\n\nЗаголовок: ${dto.title}\nПолучателей: ${recipients.length}\nАдминистратор: ${adminName}\nВремя: ${now}`,
            );

            return { message: `Отправлено ${recipients.length} получателям` };
        } catch (error) {
            throw new HttpException('Ошибка отправки уведомлений', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getNotificationHistory(page: number, limit: number) {
        try {
            const [items, total] = await this.auditLogRepository.findAndCount({
                where: { action: 'mass_notification' },
                order: { createdAt: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });
            return { items, total, page, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            throw new HttpException('Ошибка получения истории', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}