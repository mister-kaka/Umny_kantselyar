import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSetting } from '../entities/ai-setting.entity';
import { AiSettingsResponseDto } from './dto/ai-settings-response.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiProviderDto } from './dto/ai-provider.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { encrypt, maskApiKey } from '../ai/ai-key.util';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AiSetting)
    private readonly aiSettingRepository: Repository<AiSetting>,
    private readonly logger: AppLoggerService,
  ) {}

//    GET /settings/ai    <--    возвращает активную запись из ai_settings
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

//    PUT /settings/ai    <--    cохраняет или обновляет настройки AI
  async updateAiSettings(dto: UpdateAiSettingsDto): Promise<AiSettingsResponseDto> {
    try {
      let settings = await this.aiSettingRepository.findOne({
        where: { isActive: true },
      });

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

//      GET /settings/ai/providers    <--    возвращает список доступных AI-провайдеров и их моделей
    async getAiProviders(): Promise<AiProviderDto[]> {
    try {
        const providers: AiProviderDto[] = [
        {
            providerCode: 'deepseek',
            providerName: 'DeepSeek',
            models: [
                { modelCode: 'deepseek-4-flash', modelName: 'DeepSeek 4 Flash' },
                { modelCode: 'deepseek-chat', modelName: 'DeepSeek Chat' },
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
}