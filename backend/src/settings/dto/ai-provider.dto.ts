export class AiModelDto {
  modelCode!: string;
  modelName!: string;
}

export class AiProviderDto {
  providerCode!: string;
  providerName!: string;
  models!: AiModelDto[];
}