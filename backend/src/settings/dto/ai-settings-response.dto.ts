export class AiSettingsResponseDto {
  id!: number;
  providerCode!: string;
  modelName!: string;
  apiKey!: string;          // Скрываемое поле для API ключа
  baseUrl!: string | null;
  isActive!: boolean;
  updatedAt!: Date;
}