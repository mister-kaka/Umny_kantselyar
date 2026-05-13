import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { AiSetting } from '../entities/ai-setting.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { Document } from '../entities/document.entity';
import { AppLoggerService } from '../logger/app-logger.service';
import { AnalyzeAiResponseDto } from './dto/analyze-ai.dto';
import { AiResultResponseDto } from './dto/ai-result.dto';
import { decrypt } from './ai-key.util';

const MAX_TEXT_LENGTH = 3000;
const AI_TIMEOUT = 30000;
const AI_TEMPERATURE = 0.1;
const AI_MAX_TOKENS = 500;

interface DeepSeekResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

interface ParsedAiResponse {
    documentType: string | null;
    category: string | null;
    summary: string | null;
    department: string | null;
    confidence: number | null;
}

@Injectable()
export class AiService {
    constructor(
        @InjectRepository(AiSetting)
        private readonly aiSettingRepository: Repository<AiSetting>,

        @InjectRepository(DocumentAiResult)
        private readonly aiResultRepository: Repository<DocumentAiResult>,

        @InjectRepository(Document)
        private readonly documentRepository: Repository<Document>,

        private readonly httpService: HttpService,
        private readonly logger: AppLoggerService,
    ) {}

    async getActiveSettings(): Promise<AiSetting> {
        const settings = await this.aiSettingRepository.findOne({
            where: { isActive: true },
        });

        if (!settings) {
            throw new HttpException(
                'Активный AI-провайдер не найден. Настройте провайдера в /settings/ai',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        return settings;
    }

    async analyzeDocument(documentId: number): Promise<AnalyzeAiResponseDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
                relations: ['ocrResult'],
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const textToAnalyze = document.ocrResult?.normalizedText || document.ocrResult?.rawText;

            if (!textToAnalyze) {
                throw new HttpException(
                    'У документа нет OCR-текста для анализа. Сначала выполните распознавание.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            // Проверка 
            if (process.env.AI_MOCK_MODE === 'true') {
                const mockResult = this.aiResultRepository.create({
                    documentId: documentId,
                    documentTypeSuggested: 'Договор (мок)',
                    categorySuggested: 'Финансовые документы (мок)',
                    summaryText: `Мок-анализ документа: ${document.title}. Текст содержит ${textToAnalyze.length} символов.`,
                    departmentSuggested: 'Юридический отдел (мок)',
                    confidenceScore: 85,
                    providerCode: 'mock',
                    modelName: 'mock-model',
                });
                const saved = await this.aiResultRepository.save(mockResult);
                return this.mapToDto(saved);
            }

            const settings = await this.getActiveSettings();

            let apiKey: string;
            try {
                apiKey = decrypt(settings.apiKey);
            } catch (e) {
                throw new HttpException(
                    'Ошибка расшифровки API key. Проверьте настройки шифрования.',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            const prompt = this.buildPrompt(textToAnalyze, document.title);
            const aiResponse = await this.callDeepSeek(prompt, settings, apiKey, documentId);

            const aiResult = this.aiResultRepository.create({
                documentId: documentId,
                documentTypeSuggested: aiResponse.documentType,
                categorySuggested: aiResponse.category,
                summaryText: aiResponse.summary,
                departmentSuggested: aiResponse.department,
                confidenceScore: aiResponse.confidence,
                providerCode: settings.providerCode,
                modelName: settings.modelName,
            });

            const savedResult = await this.aiResultRepository.save(aiResult);

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${documentId}/analyze-ai`,
                action: 'AI-анализ документа',
                status: 'success',
                statusCode: 201,
                message: `AI-анализ выполнен. Тип: ${aiResponse.documentType}, Категория: ${aiResponse.category}, Провайдер: ${settings.providerCode}`,
            });

            return this.mapToDto(savedResult);

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${documentId}/analyze-ai`,
                action: 'AI-анализ документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при AI-анализе документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getAiResult(documentId: number): Promise<AiResultResponseDto | null> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const result = await this.aiResultRepository.findOne({
                where: { documentId },
                order: { createdAt: 'DESC' },
            });

            if (!result) {
                return null;
            }

            await this.logger.log({
                module: 'AI',
                type: 'GET',
                url: `/documents/${documentId}/ai-result`,
                action: 'получение AI-результата',
                status: 'success',
                statusCode: 200,
                message: 'AI-результат получен',
            });

            return this.mapToDto(result);

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'AI',
                type: 'GET',
                url: `/documents/${documentId}/ai-result`,
                action: 'получение AI-результата',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении AI-результата',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private buildPrompt(documentText: string, documentTitle: string): string {
        return `Ты - помощник для анализа входящих документов транспортной компании. Отвечай строго в формате JSON без лишнего текста.

Проанализируй следующий документ. Определи тип документа, категорию, сделай краткую сводку и предложи подразделение для маршрутизации.

Название документа: ${documentTitle}

Верни результат строго в формате JSON:
{
  "documentType": "определи тип документа (например: Договор, Письмо, Обращение, Уведомление, Счёт, Акт, Соглашение, Счёт-фактура, Предписание, Заявление, Приказ, Служебная записка, Протокол, Доверенность, Акт сверки или другой)",
  "category": "определи тематическую категорию (например: Кадровые вопросы, Техническое обслуживание, Поставка оборудования, Административная переписка, Юридические документы, Финансовые документы, Транспорт, Логистика, Безопасность, Хозяйственная деятельность или другая)",
  "summary": "краткая сводка документа (1-2 предложения, суть документа)",
  "department": "предложи подразделение для маршрутизации (например: Управление, Технический отдел, Бухгалтерия, Отдел закупок, Юридический отдел, Отдел кадров, Отдел логистики, Хозяйственный отдел, Служба безопасности или другое)",
  "confidence": число от 0 до 100 (насколько ты уверен в правильности анализа)
}

Текст документа:
${documentText.substring(0, MAX_TEXT_LENGTH)}`;
    }

    private async callDeepSeek(
        prompt: string,
        settings: AiSetting,
        apiKey: string,
        documentId: number,
    ): Promise<ParsedAiResponse> {
        const url = `${settings.baseUrl}/chat/completions`;

        try {
            const response = await firstValueFrom(
                this.httpService.post<DeepSeekResponse>(url, {
                    model: settings.modelName,
                    messages: [
                        {
                            role: 'system',
                            content: 'Ты - помощник для анализа входящих документов транспортной компании. Отвечай строго в формате JSON без лишнего текста.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: AI_MAX_TOKENS,
                    temperature: AI_TEMPERATURE,
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: AI_TIMEOUT,
                }),
            );

            const content = response.data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('AI вернул пустой ответ');
            }

            return this.parseContent(content);

        } catch (error) {
            if (error instanceof HttpException) throw error;

            console.error('OpenRouter error:', error);

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${documentId}/analyze-ai`,
                action: 'запрос к AI-провайдеру',
                status: 'error',
                statusCode: HttpStatus.BAD_GATEWAY,
                message: error instanceof Error ? error.message : 'Ошибка при запросе к AI',
            });

            throw new HttpException(
                'Ошибка при обращении к AI-провайдеру. Попробуйте позже.',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    private parseContent(content: string): ParsedAiResponse {
        try {
            const parsed = JSON.parse(content.trim());
            return {
                documentType: parsed.documentType || null,
                category: parsed.category || null,
                summary: parsed.summary || null,
                department: parsed.department || null,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
            };
        } catch (firstError) {
            try {
                let cleaned = content.trim();
                if (cleaned.startsWith('```json')) {
                    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                } else if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/```\s*/g, '');
                }

                const parsed = JSON.parse(cleaned);
                return {
                    documentType: parsed.documentType || null,
                    category: parsed.category || null,
                    summary: parsed.summary || null,
                    department: parsed.department || null,
                    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
                };
            } catch (secondError) {
                throw new HttpException(
                    'AI вернул ответ в неверном формате. Попробуйте повторить анализ.',
                    HttpStatus.BAD_GATEWAY,
                );
            }
        }
    }

    private mapToDto(
        result: DocumentAiResult,
    ): AnalyzeAiResponseDto | AiResultResponseDto {
        return {
            id: result.id,
            documentId: result.documentId,
            documentTypeSuggested: result.documentTypeSuggested,
            categorySuggested: result.categorySuggested,
            summaryText: result.summaryText,
            departmentSuggested: result.departmentSuggested,
            confidenceScore: result.confidenceScore
                ? Number(result.confidenceScore)
                : null,
            providerCode: result.providerCode,
            modelName: result.modelName,
            createdAt: result.createdAt,
        };
    }
}