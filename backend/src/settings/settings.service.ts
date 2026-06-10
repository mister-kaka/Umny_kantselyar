import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSetting } from '../entities/ai-setting.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { UserInterfaceSettings } from '../entities/user-interface-settings.entity';
import { AiSettingsResponseDto } from './dto/ai-settings-response.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiProviderDto } from './dto/ai-provider.dto';
import { NotificationSettingsResponseDto } from './dto/notification-settings-response.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { InterfaceSettingsResponseDto } from './dto/interface-settings-response.dto';
import { UpdateInterfaceSettingsDto } from './dto/update-interface-settings.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { encrypt, maskApiKey, decrypt } from '../ai/ai-key.util';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AiSetting)
    private readonly aiSettingRepository: Repository<AiSetting>,
    @InjectRepository(UserNotificationSettings)
    private readonly userNotificationSettingsRepository: Repository<UserNotificationSettings>,
    @InjectRepository(UserInterfaceSettings)
    private readonly userInterfaceSettingsRepository: Repository<UserInterfaceSettings>,
    private readonly logger: AppLoggerService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAiSettings(): Promise<AiSettingsResponseDto> {
    try {
      const settings = await this.aiSettingRepository.findOne({
        where: { isActive: true },
      });

      if (!settings) {
        throw new HttpException('Настройки AI не найдены', HttpStatus.NOT_FOUND);
      }

      const result: AiSettingsResponseDto = {
        id: settings.id,
        providerCode: settings.providerCode,
        modelName: settings.modelName,
        apiKey: maskApiKey(settings.apiKey),
        baseUrl: settings.baseUrl,
        isActive: settings.isActive,
        updatedAt: settings.updatedAt,
      };

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/ai',
        action: 'получение настроек AI',
        status: 'success',
        statusCode: 200,
        message: 'Настройки AI получены',
      });

      return result;

    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/ai',
        action: 'получение настроек AI',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при получении настроек AI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAiSettings(dto: UpdateAiSettingsDto, userId?: number): Promise<AiSettingsResponseDto> {
    try {
      let settings = await this.aiSettingRepository.findOne({
        where: { isActive: true },
      });

      const oldValues = settings ? {
        providerCode: settings.providerCode,
        modelName: settings.modelName,
        baseUrl: settings.baseUrl,
        isActive: settings.isActive,
      } : null;

      if (settings) {
        settings.providerCode = dto.providerCode;
        settings.modelName = dto.modelName;
        settings.apiKey = encrypt(dto.apiKey);
        if (dto.baseUrl !== undefined) {
          settings.baseUrl = dto.baseUrl;
        }
        if (dto.isActive !== undefined) {
          settings.isActive = dto.isActive;
        }
      } else {
        settings = this.aiSettingRepository.create({
          providerCode: dto.providerCode,
          modelName: dto.modelName,
          apiKey: encrypt(dto.apiKey),
          baseUrl: dto.baseUrl ?? null,
          isActive: dto.isActive ?? true,
        });
      }

      const saved = await this.aiSettingRepository.save(settings);

      const result: AiSettingsResponseDto = {
        id: saved.id,
        providerCode: saved.providerCode,
        modelName: saved.modelName,
        apiKey: maskApiKey(saved.apiKey),
        baseUrl: saved.baseUrl,
        isActive: saved.isActive,
        updatedAt: saved.updatedAt,
      };

      if (userId) {
        await this.auditLogService.log(
          userId,
          'settings_update_ai',
          null,
          {
            oldValues,
            newValues: {
              providerCode: dto.providerCode,
              modelName: dto.modelName,
              baseUrl: dto.baseUrl,
              isActive: dto.isActive,
            },
          }
        );

        const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

        await this.notificationsService.createNotification(
          userId,
          'settings_changed',
          'Настройки изменены',
          `Настройки системы были изменены.\n\nРаздел: AI-провайдер\nВремя: ${now}`,
        );
      }

      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/ai',
        action: 'сохранение настроек AI',
        status: 'success',
        statusCode: 200,
        message: 'Настройки AI сохранены',
      });

      return result;

    } catch (error) {
      if (error instanceof HttpException) throw error;

      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/ai',
        action: 'сохранение настроек AI',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при сохранении настроек AI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAiProviders(): Promise<AiProviderDto[]> {
    try {
      const providers: AiProviderDto[] = [
        {
          providerCode: 'deepseek',
          providerName: 'DeepSeek',
          models: [
            { modelCode: 'deepseek-4-flash', modelName: 'DeepSeek 4 Flash' },
            { modelCode: 'deepseek/deepseek-chat', modelName: 'DeepSeek Chat' },
            { modelCode: 'deepseek-reasoner', modelName: 'DeepSeek Reasoner' },
          ],
        },
      ];

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/ai/providers',
        action: 'получение списка провайдеров AI',
        status: 'success',
        statusCode: 200,
        message: `Отдано провайдеров: ${providers.length}`,
      });

      return providers;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/ai/providers',
        action: 'получение списка провайдеров AI',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });

      throw new HttpException(
        'Ошибка сервера при получении списка провайдеров AI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async testConnection(dto: UpdateAiSettingsDto): Promise<{ status: string; message: string }> {
    try {
      const url = `${dto.baseUrl || 'https://api.deepseek.com'}/chat/completions`;

      let apiKey = dto.apiKey;
      if (apiKey.includes(':')) {
        try {
          apiKey = decrypt(apiKey);
        } catch (e) {
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: dto.modelName,
          messages: [{ role: 'user', content: 'тест' }],
          max_tokens: 5,
        }),
      });

      if (response.ok || response.status === 401) {
        await this.logger.log({
          module: 'Settings',
          type: 'POST',
          url: '/settings/ai/test-connection',
          action: 'проверка подключения к AI',
          status: 'success',
          statusCode: 200,
          message: 'Подключение успешно',
        });
        return { status: 'success', message: 'Подключение успешно' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Ошибка ${response.status}`;

        await this.logger.log({
          module: 'Settings',
          type: 'POST',
          url: '/settings/ai/test-connection',
          action: 'проверка подключения к AI',
          status: 'error',
          statusCode: response.status,
          message,
        });
        return { status: 'error', message };
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Сервер недоступен';

      await this.logger.log({
        module: 'Settings',
        type: 'POST',
        url: '/settings/ai/test-connection',
        action: 'проверка подключения к AI',
        status: 'error',
        statusCode: HttpStatus.BAD_GATEWAY,
        message: errorMessage,
      });
      return { status: 'error', message: 'Сервер недоступен' };
    }
  }

  async getNotificationSettings(userId: number): Promise<NotificationSettingsResponseDto> {
    try {
      let settings = await this.userNotificationSettingsRepository.findOne({
        where: { userId },
      });

      if (!settings) {
        settings = this.userNotificationSettingsRepository.create({
          userId,
          newDocument: true,
          documentReady: true,
          extractError: true,
          pendingVerification: true,
          routedToDepartment: true,
          rejected: true,
          verified: true,
          lowConfidence: false,
          passwordChanged: true,
          profileUpdated: true,
          settingsChanged: false,
          newLogin: true,
          commentAdded: true,
          documentDeleted: false,
        });
        settings = await this.userNotificationSettingsRepository.save(settings);
      }

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/notifications',
        action: 'получение настроек уведомлений',
        status: 'success',
        statusCode: 200,
        message: `Настройки уведомлений для пользователя ${userId} получены`,
      });

      return {
        id: settings.id,
        userId: settings.userId,
        newDocument: settings.newDocument,
        documentReady: settings.documentReady,
        extractError: settings.extractError,
        pendingVerification: settings.pendingVerification,
        routedToDepartment: settings.routedToDepartment,
        rejected: settings.rejected,
        verified: settings.verified,
        lowConfidence: settings.lowConfidence,
        passwordChanged: settings.passwordChanged,
        profileUpdated: settings.profileUpdated,
        settingsChanged: settings.settingsChanged,
        newLogin: settings.newLogin,
        commentAdded: settings.commentAdded,
        documentDeleted: settings.documentDeleted,
        updatedAt: settings.updatedAt,
      };

    } catch (error) {
      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/notifications',
        action: 'получение настроек уведомлений',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при получении настроек уведомлений',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateNotificationSettings(
    userId: number,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsResponseDto> {
    try {
      let settings = await this.userNotificationSettingsRepository.findOne({
        where: { userId },
      });

      if (!settings) {
        settings = this.userNotificationSettingsRepository.create({ userId });
      }

      if (dto.newDocument !== undefined) settings.newDocument = dto.newDocument;
      if (dto.documentReady !== undefined) settings.documentReady = dto.documentReady;
      if (dto.extractError !== undefined) settings.extractError = dto.extractError;
      if (dto.pendingVerification !== undefined) settings.pendingVerification = dto.pendingVerification;
      if (dto.routedToDepartment !== undefined) settings.routedToDepartment = dto.routedToDepartment;
      if (dto.rejected !== undefined) settings.rejected = dto.rejected;
      if (dto.verified !== undefined) settings.verified = dto.verified;
      if (dto.lowConfidence !== undefined) settings.lowConfidence = dto.lowConfidence;
      if (dto.passwordChanged !== undefined) settings.passwordChanged = dto.passwordChanged;
      if (dto.profileUpdated !== undefined) settings.profileUpdated = dto.profileUpdated;
      if (dto.settingsChanged !== undefined) settings.settingsChanged = dto.settingsChanged;
      if (dto.newLogin !== undefined) settings.newLogin = dto.newLogin;
      if (dto.commentAdded !== undefined) settings.commentAdded = dto.commentAdded;
      if (dto.documentDeleted !== undefined) settings.documentDeleted = dto.documentDeleted;

      settings.updatedAt = new Date();
      const saved = await this.userNotificationSettingsRepository.save(settings);

      const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

      await this.notificationsService.createNotification(
        userId,
        'settings_changed',
        'Настройки изменены',
        `Настройки системы были изменены.\n\nРаздел: Уведомления\nВремя: ${now}`,
      );

      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/notifications',
        action: 'обновление настроек уведомлений',
        status: 'success',
        statusCode: 200,
        message: `Настройки уведомлений для пользователя ${userId} обновлены`,
      });

      return {
        id: saved.id,
        userId: saved.userId,
        newDocument: saved.newDocument,
        documentReady: saved.documentReady,
        extractError: saved.extractError,
        pendingVerification: saved.pendingVerification,
        routedToDepartment: saved.routedToDepartment,
        rejected: saved.rejected,
        verified: saved.verified,
        lowConfidence: saved.lowConfidence,
        passwordChanged: saved.passwordChanged,
        profileUpdated: saved.profileUpdated,
        settingsChanged: saved.settingsChanged,
        newLogin: saved.newLogin,
        commentAdded: saved.commentAdded,
        documentDeleted: saved.documentDeleted,
        updatedAt: saved.updatedAt,
      };

    } catch (error) {
      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/notifications',
        action: 'обновление настроек уведомлений',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при обновлении настроек уведомлений',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateInterfaceSettings(
    userId: number,
    dto: UpdateInterfaceSettingsDto,
  ): Promise<InterfaceSettingsResponseDto> {
    try {
      let settings = await this.userInterfaceSettingsRepository.findOne({
        where: { userId },
      });

      if (!settings) {
        settings = this.userInterfaceSettingsRepository.create({ userId });
      }

      if (dto.compactView !== undefined) settings.compactView = dto.compactView;
      if (dto.showConfidence !== undefined) settings.showConfidence = dto.showConfidence;
      if (dto.defaultPageLimit !== undefined) settings.defaultPageLimit = dto.defaultPageLimit;
      if (dto.theme !== undefined) settings.theme = dto.theme;

      settings.updatedAt = new Date();
      const saved = await this.userInterfaceSettingsRepository.save(settings);

      const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

      await this.notificationsService.createNotification(
        userId,
        'settings_changed',
        'Настройки изменены',
        `Настройки системы были изменены.\n\nРаздел: Интерфейс\nВремя: ${now}`,
      );

      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/interface',
        action: 'обновление настроек интерфейса',
        status: 'success',
        statusCode: 200,
        message: `Настройки интерфейса для пользователя ${userId} обновлены`,
      });

      return {
        id: saved.id,
        userId: saved.userId,
        compactView: saved.compactView,
        showConfidence: saved.showConfidence,
        defaultPageLimit: saved.defaultPageLimit,
        theme: saved.theme,
        updatedAt: saved.updatedAt,
      };

    } catch (error) {
      await this.logger.log({
        module: 'Settings',
        type: 'PUT',
        url: '/settings/interface',
        action: 'обновление настроек интерфейса',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при обновлении настроек интерфейса',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getInterfaceSettings(userId: number): Promise<InterfaceSettingsResponseDto> {
    try {
      let settings = await this.userInterfaceSettingsRepository.findOne({
        where: { userId },
      });

      if (!settings) {
        settings = this.userInterfaceSettingsRepository.create({
          userId,
          compactView: false,
          showConfidence: true,
          defaultPageLimit: 10,
          theme: 'light',
        });
        settings = await this.userInterfaceSettingsRepository.save(settings);
      }

      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/interface',
        action: 'получение настроек интерфейса',
        status: 'success',
        statusCode: 200,
        message: `Настройки интерфейса для пользователя ${userId} получены`,
      });

      return {
        id: settings.id,
        userId: settings.userId,
        compactView: settings.compactView,
        showConfidence: settings.showConfidence,
        defaultPageLimit: settings.defaultPageLimit,
        theme: settings.theme,
        updatedAt: settings.updatedAt,
      };

    } catch (error) {
      await this.logger.log({
        module: 'Settings',
        type: 'GET',
        url: '/settings/interface',
        action: 'получение настроек интерфейса',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при получении настроек интерфейса',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}