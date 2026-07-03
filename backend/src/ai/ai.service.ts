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
import { DocumentSource } from '../entities/document-source.entity';
import { AppLoggerService } from '../logger/app-logger.service';
import { AnalyzeAiResponseDto } from './dto/analyze-ai.dto';
import { AiResultResponseDto } from './dto/ai-result.dto';
import { decrypt } from './ai-key.util';
import { transliterate } from '../utils/transliterate';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit/audit-log.service';

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
    sourceType: string | null;
    sourceOrganizationName: string | null;
    sourceSenderName: string | null;
    sourceContactInfo: string | null;
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

        @InjectRepository(DocumentSource)
        private readonly sourceRepository: Repository<DocumentSource>,

        private readonly httpService: HttpService,
        private readonly logger: AppLoggerService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogService: AuditLogService,
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
        let savedResult: DocumentAiResult | null = null;

        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
                relations: ['ocrResult', 'creator'],
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
                savedResult = await this.aiResultRepository.save(mockResult);

                try {
                    await this.updateDocumentFields(document, {
                        documentType: 'Договор',
                        category: 'Финансовые документы',
                        summary: 'Мок-анализ',
                        department: 'Юридический отдел',
                        confidence: 85,
                        date: null,
                        sender: null,
                        amount: null,
                        counterparty: null,
                        keyPhrases: null,
                        sourceType: null,
                        sourceOrganizationName: null,
                        sourceSenderName: null,
                        sourceContactInfo: null,
                    });
                } catch (updateError) {
                    await this.aiResultRepository.remove(savedResult);
                    throw updateError;
                }

                const totalPercent = 85;

                await this.auditLogService.log(
                    document.createdBy,
                    'ai_analysis',
                    documentId,
                    { confidence: totalPercent, providerCode: 'mock', modelName: 'mock-model', isMock: true }
                );

                await this.notificationsService.upsertDocumentNotification(
                    document.createdBy,
                    document.id,
                    'document_ready',
                    'Документ обработан',
                    `Документ «${document.title}» загружен, текст распознан, AI выполнил анализ.\nУверенность: ${totalPercent}%\nТип: Договор\nКатегория: Финансовые документы\nОтдел: Юридический отдел\nРег. номер: ${document.registrationNumber}`,
                );

                const pendingVerificationMessage = `Документ «${document.title}» ожидает проверки оператором.\n\nРег. номер: ${document.registrationNumber}\nТип: Договор\nКатегория: Финансовые документы\nУверенность AI: ${totalPercent}%`;

                await this.notificationsService.createNotification(
                    document.createdBy,
                    'pending_verification',
                    'Требуется проверка',
                    pendingVerificationMessage,
                    document.id,
                );

                return this.mapToDto(savedResult);
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

            const prompt = await this.buildPrompt(textToAnalyze, document.title);
            const aiResponse = await this.callDeepSeek(prompt, settings, apiKey, documentId);

            const aiResult = this.aiResultRepository.create({
                documentId: documentId,
                documentTypeSuggested: aiResponse.documentType,
                categorySuggested: aiResponse.category,
                summaryText: aiResponse.summary,
                departmentSuggested: aiResponse.department,
                confidenceScore: (aiResponse.confidence ?? 0) / 100,
                providerCode: settings.providerCode,
                modelName: settings.modelName,
                extractedDate: aiResponse.date && !isNaN(Date.parse(aiResponse.date))
                    ? new Date(aiResponse.date)
                    : null,
                extractedAmount: aiResponse.amount,
                extractedCounterparty: aiResponse.counterparty,
                keyPhrases: aiResponse.keyPhrases,
                sourceTypeSuggested: aiResponse.sourceType,
                sourceOrganizationSuggested: aiResponse.sourceOrganizationName,
                sourceSenderSuggested: aiResponse.sourceSenderName,
                sourceContactSuggested: aiResponse.sourceContactInfo,
            });

            savedResult = await this.aiResultRepository.save(aiResult);

            try {
                await this.updateDocumentFields(document, aiResponse);
            } catch (updateError) {
                await this.aiResultRepository.remove(savedResult);
                throw updateError;
            }

            const ocrConf = document.ocrResult?.ocrConfidence ?? 0;
            const aiConf = (aiResponse.confidence ?? 0) / 100;
            const totalPercent = Math.round((ocrConf * 0.2 + aiConf * 0.8) * 100);
            document.confidenceScore = totalPercent / 100;
            await this.documentRepository.save(document);

            await this.auditLogService.log(
                document.createdBy,
                'ai_analysis',
                documentId,
                { 
                    confidence: totalPercent, 
                    providerCode: settings.providerCode, 
                    modelName: settings.modelName,
                    documentType: aiResponse.documentType,
                    category: aiResponse.category
                }
            );

            const messageParts: string[] = [];
            messageParts.push(`Документ «${document.title}» загружен, текст распознан, AI выполнил анализ.`);
            messageParts.push(`Уверенность: ${totalPercent}%`);
            if (aiResponse.documentType) messageParts.push(`Тип: ${aiResponse.documentType}`);
            if (aiResponse.category) messageParts.push(`Категория: ${aiResponse.category}`);
            if (aiResponse.department) messageParts.push(`Отдел: ${aiResponse.department}`);
            if (aiResponse.summary) messageParts.push(`Сводка: ${aiResponse.summary}`);
            if (aiResponse.sender) messageParts.push(`Отправитель: ${aiResponse.sender}`);
            messageParts.push(`Рег. номер: ${document.registrationNumber}`);

            const message = messageParts.join('\n');

            await this.notificationsService.upsertDocumentNotification(
                document.createdBy,
                document.id,
                'document_ready',
                'Документ обработан',
                message,
            );

            const pendingParts: string[] = [];
            pendingParts.push(`Документ «${document.title}» ожидает проверки оператором.`);
            pendingParts.push(`Рег. номер: ${document.registrationNumber}`);
            if (aiResponse.documentType) pendingParts.push(`Тип: ${aiResponse.documentType}`);
            if (aiResponse.category) pendingParts.push(`Категория: ${aiResponse.category}`);
            pendingParts.push(`Уверенность AI: ${totalPercent}%`);

            const pendingMessage = pendingParts.join('\n');

            await this.notificationsService.createNotification(
                document.createdBy,
                'pending_verification',
                'Требуется проверка',
                pendingMessage,
                document.id,
            );

            if (totalPercent < 50) {
                await this.notificationsService.createNotification(
                    document.createdBy,
                    'low_confidence',
                    'Низкая уверенность AI',
                    `Документ «${document.title}» распознан с низкой уверенностью (${totalPercent}%). Требуется ручная проверка.\nРег. номер: ${document.registrationNumber}`,
                    document.id,
                );
            }

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

            try {
                const document = await this.documentRepository.findOne({ where: { id: documentId } });
                if (document) {
                    await this.auditLogService.log(
                        document.createdBy,
                        'ai_analysis_error',
                        documentId,
                        { error: error instanceof Error ? error.message : 'Ошибка сервера' }
                    );

                    await this.notificationsService.upsertDocumentNotification(
                        document.createdBy,
                        document.id,
                        'document_ready',
                        'Документ загружен (без AI)',
                        `Документ «${document.title}» загружен, текст распознан.\nAI-анализ не выполнен - попробуйте позже.\nРег. номер: ${document.registrationNumber}`,
                    );
                }
            } catch (auditError) {
            }

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

            return AiResultResponseDto.fromEntity(result);

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

    private async updateDocumentFields(
        document: Document,
        aiResponse: ParsedAiResponse,
    ): Promise<void> {
        if (aiResponse.documentType) {
            let type = await this.documentTypeRepository.findOne({
                where: { name: ILike(`%${aiResponse.documentType}%`) },
            });
            if (!type) {
                type = this.documentTypeRepository.create({
                    name: aiResponse.documentType,
                    code: transliterate(aiResponse.documentType).toLowerCase().replace(/\s+/g, '_'),
                    description: 'Автоматически создан AI',
                });
                await this.documentTypeRepository.save(type);
                await this.logger.log({
                    module: 'AI',
                    type: 'POST',
                    url: `/documents/${document.id}/analyze-ai`,
                    action: 'создан новый тип документа',
                    status: 'success',
                    statusCode: 201,
                    message: `Тип "${aiResponse.documentType}" создан (id: ${type.id})`,
                });
            }
            document.documentTypeId = type.id;
        }

        if (aiResponse.category) {
            let category = await this.documentCategoryRepository.findOne({
                where: { name: ILike(`%${aiResponse.category}%`) },
            });
            if (!category) {
                category = this.documentCategoryRepository.create({
                    name: aiResponse.category,
                    code: transliterate(aiResponse.category).toLowerCase().replace(/\s+/g, '_'),
                    description: 'Автоматически создана AI',
                });
                await this.documentCategoryRepository.save(category);
                await this.logger.log({
                    module: 'AI',
                    type: 'POST',
                    url: `/documents/${document.id}/analyze-ai`,
                    action: 'создана новая категория',
                    status: 'success',
                    statusCode: 201,
                    message: `Категория "${aiResponse.category}" создана (id: ${category.id})`,
                });
            }
            document.categoryId = category.id;
        }

        if (aiResponse.sender) {
            document.senderName = aiResponse.sender;
        }

        if (aiResponse.date && !isNaN(Date.parse(aiResponse.date))) {
            document.receivedDate = new Date(aiResponse.date);
        }

        const ocrConf = document.ocrResult?.ocrConfidence ?? 0;
        const aiConf = (aiResponse.confidence ?? 0) / 100;
        const totalPercent = Math.round((ocrConf * 0.2 + aiConf * 0.8) * 100);
        document.confidenceScore = totalPercent / 100;
        document.currentStatus = 'pending_verification'; 

        await this.documentRepository.save(document);

        if (aiResponse.documentType || aiResponse.category) {
            const classification = this.classificationRepository.create({
                documentId: document.id,
                typeId: document.documentTypeId,
                categoryId: document.categoryId,
                typeConfidence: (aiResponse.confidence ?? 0) / 100,
                categoryConfidence: (aiResponse.confidence ?? 0) / 100,
                isVerified: false,
            });
            await this.classificationRepository.save(classification);
        }

        if (aiResponse.sourceType || aiResponse.sourceOrganizationName ||
            aiResponse.sourceSenderName || aiResponse.sourceContactInfo) {
            let source = await this.sourceRepository.findOne({
                where: { documentId: document.id },
            });
            if (!source) {
                source = this.sourceRepository.create({ documentId: document.id });
            }
            if (aiResponse.sourceType) source.sourceType = aiResponse.sourceType;
            if (aiResponse.sourceOrganizationName) source.organizationName = aiResponse.sourceOrganizationName;
            if (aiResponse.sourceSenderName) source.senderName = aiResponse.sourceSenderName;
            if (aiResponse.sourceContactInfo) source.contactInfo = aiResponse.sourceContactInfo;
            await this.sourceRepository.save(source);

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: `/documents/${document.id}/analyze-ai`,
                action: 'обновлён источник документа',
                status: 'success',
                statusCode: 200,
                message: `Источник: ${aiResponse.sourceType} / ${aiResponse.sourceOrganizationName} / ${aiResponse.sourceSenderName}`,
            });
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
    }

    private async buildPrompt(documentText: string, documentTitle: string): Promise<string> {
        const types = await this.documentTypeRepository.find();
        const typeList = types.map(t => t.name).join(', ');

        const categories = await this.documentCategoryRepository.find();
        const categoryList = categories.map(c => c.name).join(', ');

        const departments = await this.departmentRepository.find({
            where: { isActive: true },
        });
        const departmentList = departments.map(d => d.name).join(', ');

        return `Проанализируй входящий документ транспортной компании. Определи тип, категорию, сделай сводку, предложи отдел, извлеки дату, отправителя, сумму, контрагента и источник. Все ответы должны быть на русском языке, даже если документ на другом языке.

Название документа: ${documentTitle}

Верни результат строго в формате JSON:
{
  "documentType": "СТРОГО один из: ${typeList}. Если подходящего нет - предложи новый",
  "category": "СТРОГО один из: ${categoryList}. Если подходящего нет - предложи новый",
  "summary": "краткая сводка (1-2 предложения, суть документа)",
  "department": "СТРОГО один из: ${departmentList}. Если подходящего нет - предложи новый",
  "confidence": число 0-100 (уверенность в правильности анализа)",
  "date": "дата документа в формате YYYY-MM-DD, извлечённая из текста",
  "sender": "отправитель - КТО ПРИСЛАЛ документ извне (организация или ФИО, обычно в шапке или в поле 'От кого'). Для внутренних документов - подразделение-составитель",
  "amount": число (сумма из документа, если указана)",
  "counterparty": "контрагент (вторая сторона договора/акта)",
  "keyPhrases": ["массив ключевых фраз для поиска"],
  "sourceType": "organization, individual или department - тип источника документа",
  "sourceOrganizationName": "название организации-отправителя из шапки документа",
  "sourceSenderName": "ФИО или должность конкретного отправителя из шапки документа",
  "sourceContactInfo": "адрес, телефон, email из шапки документа"
}

Если не можешь определить - оставь поле пустым, не придумывай.

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
        let cleaned = content.trim();

        cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

        cleaned = cleaned.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

        try {
            const parsed = JSON.parse(cleaned);
            return this.normalizeParsedResponse(parsed);
        } catch {

            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return this.normalizeParsedResponse(parsed);
                } catch {}
            }
        }

        throw new HttpException(
            'AI вернул ответ в неверном формате. Попробуйте повторить анализ.',
            HttpStatus.BAD_GATEWAY,
        );
    }

    private normalizeParsedResponse(parsed: any): ParsedAiResponse {
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
            sourceType: parsed.sourceType || null,
            sourceOrganizationName: parsed.sourceOrganizationName || null,
            sourceSenderName: parsed.sourceSenderName || null,
            sourceContactInfo: parsed.sourceContactInfo || null,
        };
    }

    private mapToDto(result: DocumentAiResult): AnalyzeAiResponseDto {
        return AnalyzeAiResponseDto.fromEntity(result);
    }
}