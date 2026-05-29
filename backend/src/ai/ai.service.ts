import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { AiSetting } from '../entities/ai-setting.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { Document } from '../entities/document.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { Department } from '../entities/department.entity';
import { DocumentClassification } from '../entities/document-classification.entity';
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
    date: string | null;
    sender: string | null;
    amount: number | null;
    counterparty: string | null;
    keyPhrases: string[] | null;
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

        @InjectRepository(DocumentType)
        private readonly documentTypeRepository: Repository<DocumentType>,

        @InjectRepository(DocumentCategory)
        private readonly documentCategoryRepository: Repository<DocumentCategory>,

        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,

        @InjectRepository(DocumentClassification)
        private readonly classificationRepository: Repository<DocumentClassification>,

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

            // Мок-режим
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
                await this.updateDocumentFields(document, {
                    documentType: 'Договор',
                    category: 'Финансовые документы',
                    department: 'Юридический отдел',
                    confidence: 85,
                    summary: 'Мок-анализ документа',
                    date: null,
                    sender: null,
                    amount: null,
                    counterparty: null,
                    keyPhrases: null,
                });
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
                extractedDate: aiResponse.date ? new Date(aiResponse.date) : null,
                extractedAmount: aiResponse.amount,
                extractedCounterparty: aiResponse.counterparty,
                keyPhrases: aiResponse.keyPhrases,
            });

            const savedResult = await this.aiResultRepository.save(aiResult);

            // Автообновление полей документа
            await this.updateDocumentFields(document, aiResponse);

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

    // ========================================================================
    // Автообновление полей документа после AI-анализа
    // ========================================================================
    private async updateDocumentFields(
        document: Document,
        aiResponse: ParsedAiResponse,
    ): Promise<void> {
        try {
            // Обновляем тип документа
            if (aiResponse.documentType) {
                const type = await this.documentTypeRepository.findOne({
                    where: { name: ILike(aiResponse.documentType) },
                });
                if (type) {
                    document.documentTypeId = type.id;
                }
            }

            // Обновляем категорию
            if (aiResponse.category) {
                const category = await this.documentCategoryRepository.findOne({
                    where: { name: ILike(aiResponse.category) },
                });
                if (category) {
                    document.categoryId = category.id;
                }
            }

            // Обновляем подразделение
            if (aiResponse.department) {
                const department = await this.departmentRepository.findOne({
                    where: { name: ILike(aiResponse.department) },
                });
                if (department) {
                    document.currentDepartmentId = department.id;
                }
            }

            // Обновляем отправителя
            if (aiResponse.sender) {
                document.senderName = aiResponse.sender;
            }

            // Обновляем дату документа
            if (aiResponse.date && !isNaN(Date.parse(aiResponse.date))) {
                document.receivedDate = new Date(aiResponse.date);
            }

            // Вычисляем общую уверенность
            const ocrConf = document.ocrResult?.ocrConfidence
                ? Number(document.ocrResult.ocrConfidence)
                : 0;
            const aiConf = aiResponse.confidence ?? 0;
            const totalConfidence = Math.round(ocrConf * 0.2 + aiConf * 0.8);
            document.confidenceScore = totalConfidence;

            // Меняем статус
            document.currentStatus = 'pending_verification';

            await this.documentRepository.save(document);

            // Сохраняем классификацию
            if (aiResponse.documentType || aiResponse.category) {
                const classification = this.classificationRepository.create({
                    documentId: document.id,
                    typeId: document.documentTypeId,
                    categoryId: document.categoryId,
                    typeConfidence: aiResponse.confidence,
                    categoryConfidence: aiResponse.confidence,
                    isVerified: false,
                });
                await this.classificationRepository.save(classification);
            }

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${document.id}/analyze-ai`,
                action: 'автообновление полей документа',
                status: 'success',
                statusCode: 200,
                message: `Поля обновлены. Тип: ${aiResponse.documentType}, Категория: ${aiResponse.category}, Отправитель: ${aiResponse.sender}, Дата: ${aiResponse.date}`,
            });

        } catch (error) {
            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${document.id}/analyze-ai`,
                action: 'автообновление полей документа',
                status: 'error',
                statusCode: 500,
                message: error instanceof Error ? error.message : 'Ошибка обновления полей',
            });
        }
    }

    // ========================================================================
    // Промпт
    // ========================================================================
    private buildPrompt(documentText: string, documentTitle: string): string {
        return `Проанализируй входящий документ транспортной компании. Определи тип, категорию, сделай сводку, предложи отдел, извлеки дату, отправителя, сумму и контрагента. Все ответы должны быть на русском языке, даже если документ на другом языке.

Название документа: ${documentTitle}

Верни результат строго в формате JSON:
{
  "documentType": "тип (Договор, Письмо, Обращение, Уведомление, Счёт, Акт, Соглашение, Счёт-фактура, Предписание, Заявление, Приказ, Служебная записка, Протокол, Доверенность, Акт сверки или другой)",
  "category": "категория (Кадровые вопросы, Техническое обслуживание, Поставка оборудования, Административная переписка, Юридические документы, Финансовые документы, Транспорт, Логистика, Безопасность, Хозяйственная деятельность или другая)",
  "summary": "краткая сводка (1-2 предложения, суть документа)",
  "department": "подразделение (Управление, Технический отдел, Бухгалтерия, Отдел закупок, Юридический отдел, Отдел кадров, Отдел логистики, Хозяйственный отдел, Служба безопасности или другое)",
  "confidence": число 0-100 (уверенность в правильности анализа),
  "date": "дата документа в формате YYYY-MM-DD, извлечённая из текста",
  "sender": "отправитель (организация или ФИО)",
  "amount": число (сумма из документа, если указана),
  "counterparty": "контрагент (вторая сторона договора/акта)",
  "keyPhrases": ["массив ключевых фраз для поиска"]
}

Если не можешь определить — оставь поле пустым, не придумывай.

Текст документа:
${documentText.substring(0, MAX_TEXT_LENGTH)}`;
    }

    // ========================================================================
    // Вызов DeepSeek
    // ========================================================================
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

    // ========================================================================
    // Парсинг ответа AI
    // ========================================================================
    private parseContent(content: string): ParsedAiResponse {
        try {
            const parsed = JSON.parse(content.trim());
            return {
                documentType: parsed.documentType || null,
                category: parsed.category || null,
                summary: parsed.summary || null,
                department: parsed.department || null,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
                date: parsed.date || null,
                sender: parsed.sender || null,
                amount: typeof parsed.amount === 'number' ? parsed.amount : null,
                counterparty: parsed.counterparty || null,
                keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : null,
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
                    date: parsed.date || null,
                    sender: parsed.sender || null,
                    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
                    counterparty: parsed.counterparty || null,
                    keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : null,
                };
            } catch (secondError) {
                throw new HttpException(
                    'AI вернул ответ в неверном формате. Попробуйте повторить анализ.',
                    HttpStatus.BAD_GATEWAY,
                );
            }
        }
    }

    // ========================================================================
    // Маппинг в DTO
    // ========================================================================
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
            extractedDate: result.extractedDate || null,
            extractedAmount: result.extractedAmount ? Number(result.extractedAmount) : null,
            extractedCounterparty: result.extractedCounterparty || null,
            keyPhrases: result.keyPhrases || null,
        };
    }
}