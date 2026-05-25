import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { AiSetting } from '../entities/ai-setting.entity';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { UploadDocumentResponseDto } from './dto/upload-document.dto';
import { ExtractTextResponseDto } from './dto/extract-text-response.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { decrypt } from '../ai/ai-key.util';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(DocumentFile)
        private documentFileRepository: Repository<DocumentFile>,
        @InjectRepository(OcrResult)
        private ocrResultRepository: Repository<OcrResult>,
        @InjectRepository(AiSetting)
        private aiSettingRepository: Repository<AiSetting>,
        private readonly httpService: HttpService,
        private readonly logger: AppLoggerService,
    ) {}

    // ========================================================================
    // GET /documents — список документов с фильтрацией и поиском
    // ========================================================================
    async findAll(filters: GetDocumentsDto): Promise<DocumentsListResponseDto> {
        try {
            const page = filters.page ?? 1;
            const limit = filters.limit ?? 10;
            const skip = (page - 1) * limit;

            const query = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoinAndSelect('doc.documentType', 'documentType')
                .leftJoinAndSelect('doc.category', 'category')
                .leftJoinAndSelect(
                    'doc.documentRoutes',
                    'route',
                    'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                )
                .leftJoinAndSelect('route.department', 'department');

            if (filters.typeId) {
                query.andWhere('doc.documentTypeId = :typeId', { typeId: filters.typeId });
            }
            if (filters.categoryId) {
                query.andWhere('doc.categoryId = :categoryId', { categoryId: filters.categoryId });
            }
            if (filters.status) {
                query.andWhere('doc.currentStatus = :status', { status: filters.status });
            }
            if (filters.dateFrom) {
                query.andWhere('doc.receivedDate >= :dateFrom', { dateFrom: filters.dateFrom });
            }
            if (filters.dateTo) {
                query.andWhere('doc.receivedDate <= :dateTo', { dateTo: filters.dateTo });
            }

            // Полнотекстовый поиск через tsvector — ищет по заголовку, отправителю, OCR и AI-сводке
            // Морфология работает автоматически: "договоры" найдёт "договор"
            if (filters.searchQuery) {
                const words = filters.searchQuery
                    .trim()
                    .split(/\s+/)
                    .filter(w => w.length > 0)
                    .map(w => w + ':*')
                    .join(' & ');

                if (words.length > 0) {
                    const tsQuery = `(
                        doc.search_vector @@ to_tsquery('russian', :words)
                        OR EXISTS (
                            SELECT 1 FROM ocr_results ocr
                            WHERE ocr.document_id = doc.id
                            AND ocr.search_vector @@ to_tsquery('russian', :words)
                        )
                        OR EXISTS (
                            SELECT 1 FROM document_ai_results ai
                            WHERE ai.document_id = doc.id
                            AND to_tsvector('russian', coalesce(ai.summary_text, '')) @@ to_tsquery('russian', :words)
                        )
                        OR doc.title ILIKE :likeQuery
                        OR doc.senderName ILIKE :likeQuery
                        OR doc.registrationNumber ILIKE :likeQuery
                        OR EXISTS (
                            SELECT 1 FROM ocr_results ocr2
                            WHERE ocr2.document_id = doc.id
                            AND ocr2.normalized_text ILIKE :likeQuery
                        )
                    )`;
                    
                    query.andWhere(tsQuery, { 
                        words,
                        likeQuery: `%${filters.searchQuery.trim()}%`
                    });
                }
            }

            const [documents, total] = await query
                .orderBy('doc.receivedDate', 'DESC')
                .addOrderBy('doc.id', 'DESC')
                .skip(skip)
                .take(limit)
                .getManyAndCount();

            const items: DocumentListItemDto[] = documents.map(doc => ({
                id: doc.id,
                registrationNumber: doc.registrationNumber,
                title: doc.title,
                senderName: doc.senderName,
                receivedDate: doc.receivedDate,
                documentType: doc.documentType?.name ?? 'Не указан',
                category: doc.category?.name ?? null,
                currentStatus: doc.currentStatus,
                department: doc.documentRoutes?.[0]?.department?.name ?? null,
            }));

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: '/documents',
                action: 'получение списка документов',
                status: 'success',
                statusCode: 200,
                message: `Найдено документов: ${total}`,
            });

            return { items, total, page, limit, totalPages: Math.ceil(total / limit) };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: '/documents',
                action: 'получение списка документов',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при получении списка документов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ========================================================================
    // GET /documents/:id — карточка документа
    // ========================================================================
    async findOne(id: number): Promise<DocumentCardDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id },
                relations: [
                    'documentType',
                    'category',
                    'creator',
                    'files',
                    'ocrResult',
                    'classifications',
                    'classifications.documentType',
                    'classifications.documentCategory',
                    'documentRoutes',
                    'documentRoutes.department',
                    'sources',
                    'aiResults'
                ],
            });

            if (!document) {
                await this.logger.log({
                    module: 'Documents',
                    type: 'GET',
                    url: `/documents/${id}`,
                    action: 'получение карточки документа',
                    status: 'error',
                    statusCode: 404,
                    message: `Документ с id ${id} не найден`,
                });
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            document.classifications?.sort((a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
            );

            document.aiResults?.sort((a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
            );

            const result: DocumentCardDto = {
                id: document.id,
                registrationNumber: document.registrationNumber,
                title: document.title,
                senderName: document.senderName,
                receivedDate: document.receivedDate,
                currentStatus: document.currentStatus,
                confidenceScore: document.confidenceScore
                    ? Number(document.confidenceScore)
                    : null,
                documentType: document.documentType?.name || null,
                category: document.category?.name || null,
                createdBy: document.creator?.fullName || 'Неизвестно',
                createdAt: document.createdAt,
                files: document.files?.map(f => ({
                    id: f.id,
                    fileName: f.fileName,
                    fileType: f.fileType,
                    filePath: f.filePath,
                    fileSize: f.fileSize,
                    uploadedAt: f.uploadedAt,
                })) || [],
                ocrResult: document.ocrResult ? {
                    id: document.ocrResult.id,
                    rawText: document.ocrResult.rawText,
                    normalizedText: document.ocrResult.normalizedText,
                    language: document.ocrResult.language,
                    ocrConfidence: document.ocrResult.ocrConfidence
                        ? Number(document.ocrResult.ocrConfidence)
                        : null,
                    processedAt: document.ocrResult.processedAt,
                } : null,
                classification: document.classifications?.[0] ? {
                    id: document.classifications[0].id,
                    type: document.classifications[0].documentType?.name || null,
                    category: document.classifications[0].documentCategory?.name || null,
                    typeConfidence: document.classifications[0].typeConfidence
                        ? Number(document.classifications[0].typeConfidence)
                        : null,
                    categoryConfidence: document.classifications[0].categoryConfidence
                        ? Number(document.classifications[0].categoryConfidence)
                        : null,
                    isVerified: document.classifications[0].isVerified,
                    createdAt: document.classifications[0].createdAt,
                } : null,
                routes: document.documentRoutes?.map(r => ({
                    departmentName: r.department?.name || 'Не указан',
                    routeStatus: r.routeStatus,
                    routeReason: r.routeReason,
                    routedAt: r.routedAt,
                })) || [],

                source: document.sources?.[0] ? {
                    sourceType: document.sources[0].sourceType,
                    organizationName: document.sources[0].organizationName,
                    senderName: document.sources[0].senderName,
                    contactInfo: document.sources[0].contactInfo,
                } : null,

                aiResult: document.aiResults?.[0] ? {
                    id: document.aiResults[0].id,
                    documentId: document.aiResults[0].documentId,
                    documentTypeSuggested: document.aiResults[0].documentTypeSuggested,
                    categorySuggested: document.aiResults[0].categorySuggested,
                    summaryText: document.aiResults[0].summaryText,
                    departmentSuggested: document.aiResults[0].departmentSuggested,
                    confidenceScore: document.aiResults[0].confidenceScore
                        ? Number(document.aiResults[0].confidenceScore)
                        : null,
                    providerCode: document.aiResults[0].providerCode,
                    modelName: document.aiResults[0].modelName,
                    createdAt: document.aiResults[0].createdAt,
                } : null,
            };

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/${id}`,
                action: 'получение карточки документа',
                status: 'success',
                statusCode: 200,
                message: 'Документ получен',
            });

            return result;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/${id}`,
                action: 'получение карточки документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении карточки документа',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ========================================================================
    // GET /documents/search?q=... — быстрый поиск по документам (без AI)
    // ========================================================================
    async search(q: string): Promise<DocumentListItemDto[]> {
        try {
            if (!q || q.trim().length === 0) {
                throw new HttpException('Параметр поиска "q" обязателен', HttpStatus.BAD_REQUEST);
            }

            // Разбиваем на слова, убираем короткие, добавляем префиксный поиск
            const words = q
                .trim()
                .split(/\s+/)
                .filter(w => w.length > 0)
                .map(w => w + ':*')
                .join(' & ');

            const query = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoinAndSelect('doc.documentType', 'documentType')
                .leftJoinAndSelect('doc.category', 'category')
                .leftJoinAndSelect(
                    'doc.documentRoutes',
                    'route',
                    'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                )
                .leftJoinAndSelect('route.department', 'department');

            if (words.length > 0) {
                query.andWhere(`(
                    doc.search_vector @@ to_tsquery('russian', :words)
                    OR EXISTS (
                        SELECT 1 FROM ocr_results ocr
                        WHERE ocr.document_id = doc.id
                        AND ocr.search_vector @@ to_tsquery('russian', :words)
                    )
                    OR EXISTS (
                        SELECT 1 FROM document_ai_results ai
                        WHERE ai.document_id = doc.id
                        AND to_tsvector('russian', coalesce(ai.summary_text, '')) @@ to_tsquery('russian', :words)
                    )
                )`, { words });
            }

            const documents = await query
                .orderBy('doc.receivedDate', 'DESC')
                .take(10)
                .getMany();

            const items: DocumentListItemDto[] = documents.map(doc => ({
                id: doc.id,
                registrationNumber: doc.registrationNumber,
                title: doc.title,
                senderName: doc.senderName,
                receivedDate: doc.receivedDate,
                documentType: doc.documentType?.name ?? 'Не указан',
                category: doc.category?.name ?? null,
                currentStatus: doc.currentStatus,
                department: doc.documentRoutes?.[0]?.department?.name ?? null,
            }));

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/search?q=${encodeURIComponent(q)}`,
                action: 'поиск документов',
                status: 'success',
                statusCode: 200,
                message: `Найдено документов: ${items.length}`,
            });

            return items;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: '/documents/search',
                action: 'поиск документов',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при поиске документов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ========================================================================
    // GET /documents/search/ai?q=... — умный поиск через AI
    // ========================================================================
    async searchAi(q: string): Promise<DocumentsListResponseDto> {
        try {
            if (!q || q.trim().length < 3) {
                throw new HttpException(
                    'Введите хотя бы 3 символа для умного поиска',
                    HttpStatus.BAD_REQUEST,
                );
            }

            // Рег. номер — сразу в обычный поиск без AI
            if (/^[А-Яа-яA-Za-z]+-\d+-\d+$/i.test(q.trim())) {
                return this.findAll({ searchQuery: q.trim(), page: 1, limit: 20 });
            }

            // Предобработка запроса до отправки в AI:
            // - исправление раскладки клавиатуры (латиница → кириллица)
            // - удаление стоп-слов ("найди", "покажи", "все")
            // - нормализация пробелов
            const cleanQuery = this.preprocessQuery(q);

            // Короткий запрос (1-2 слова) — обычный поиск без AI
            if (cleanQuery.split(/\s+/).filter(w => w.length > 0).length < 3) {
                return this.findAll({ searchQuery: cleanQuery, page: 1, limit: 20 });
            }

            const aiFilters = await this.parseSearchQueryWithAi(cleanQuery, q);

            const filters: GetDocumentsDto = {
                typeId: aiFilters.typeId ?? undefined,
                categoryId: aiFilters.categoryId ?? undefined,
                status: aiFilters.status ?? undefined,
                dateFrom: aiFilters.dateFrom ?? undefined,
                dateTo: aiFilters.dateTo ?? undefined,
                searchQuery: aiFilters.searchQuery ?? undefined,
                page: 1,
                limit: 20,
            };

            const result = await this.findAll(filters);

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                action: 'умный поиск через AI',
                status: 'success',
                statusCode: 200,
                message: `Запрос: "${q}". Найдено: ${result.total}. Фильтры: ${JSON.stringify(aiFilters)}`,
            });

            return result;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: '/documents/search/ai',
                action: 'умный поиск через AI',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при умном поиске',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // DELETE /documents/:id - удаление документа
    async delete(id: number): Promise<void> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id },
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const docDir = path.join(process.cwd(), 'uploads', 'documents', String(id));
            if (fs.existsSync(docDir)) {
                fs.rmSync(docDir, { recursive: true, force: true });
            }

            await this.documentRepository.remove(document);

            await this.logger.log({
                module: 'Documents',
                type: 'DELETE',
                url: `/documents/${id}`,
                action: 'удаление документа',
                status: 'success',
                statusCode: 200,
                message: `Документ ${document.registrationNumber} удалён`,
            });

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents',
                type: 'DELETE',
                url: `/documents/${id}`,
                action: 'удаление документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при удалении документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/upload - загрузка файла и создание документа
    async uploadDocument(
        file: Express.Multer.File,
        createdBy: number,
    ): Promise<UploadDocumentResponseDto> {
        try {
            const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
            if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                throw new HttpException(
                    `Неподдерживаемый формат файла: .${fileExtension}. Поддерживаемые: ${ALLOWED_EXTENSIONS.join(', ')}`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            const safeFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

            const maxResult = await this.documentRepository
                .createQueryBuilder('doc')
                .select('MAX(doc.id)', 'maxId')
                .getRawOne();

            const nextNumber = (maxResult?.maxId || 0) + 1;
            const registrationNumber = `ВХ-2026-${String(nextNumber).padStart(3, '0')}`;

            const document = this.documentRepository.create({
                registrationNumber,
                title: safeFileName,
                receivedDate: new Date(),
                senderName: 'Загружен через сканирование',
                currentStatus: 'in_review',
                createdBy,
            });

            const savedDocument = await this.documentRepository.save(document);

            const docDir = path.join(process.cwd(), 'uploads', 'documents', String(savedDocument.id));
            if (!fs.existsSync(docDir)) {
                fs.mkdirSync(docDir, { recursive: true });
            }
            const newPath = path.join(docDir, safeFileName);
            fs.writeFileSync(newPath, file.buffer);

            const fileRecord = this.documentFileRepository.create({
                documentId: savedDocument.id,
                fileName: safeFileName,
                fileType: fileExtension,
                filePath: `/uploads/documents/${savedDocument.id}/${safeFileName}`,
                fileSize: file.size,
            });

            await this.documentFileRepository.save(fileRecord);

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: '/documents/upload',
                action: 'загрузка документа',
                status: 'success',
                statusCode: 201,
                message: `Документ ${registrationNumber} создан`,
            });

            return {
                id: savedDocument.id,
                registrationNumber: savedDocument.registrationNumber,
                fileName: safeFileName,
                fileSize: file.size,
                filePath: `/uploads/documents/${savedDocument.id}/${safeFileName}`,
                uploadedAt: new Date(),
            };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: '/documents/upload',
                action: 'загрузка документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при загрузке документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/:id/extract-text - извлечение текста из файла
    async extractText(id: number): Promise<ExtractTextResponseDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id },
                relations: ['files', 'ocrResult'],
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const file = document.files?.[0];
            if (!file) {
                throw new HttpException('Файл не найден', HttpStatus.NOT_FOUND);
            }

            const fileName = file.fileName.split('/').pop() || file.fileName;
            const filePath = path.join(process.cwd(), 'uploads', 'documents', String(document.id), fileName);

            if (!fs.existsSync(filePath)) {
                throw new HttpException('Файл не найден на диске', HttpStatus.NOT_FOUND);
            }

            let extractedText = '';
            let ocrConfidence = 99;
            const fileExtension: string = file.fileName.split('.').pop()?.toLowerCase() || '';

            if (fileExtension === 'pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                extractedText = data.text;
            } else if (fileExtension === 'docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                extractedText = result.value;
            } else if (fileExtension === 'txt') {
                extractedText = fs.readFileSync(filePath, 'utf8');
            } else if (fileExtension === 'xlsx') {
                const workbook = XLSX.readFile(filePath);
                extractedText = '';
                workbook.SheetNames.forEach((sheetName: string) => {
                    const sheet = workbook.Sheets[sheetName];
                    extractedText += XLSX.utils.sheet_to_csv(sheet) + '\n';
                });
            } else if (['jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(fileExtension)) {
                const { data: { text, confidence } } = await Tesseract.recognize(filePath, 'rus+eng');
                extractedText = text;
                ocrConfidence = Math.round(confidence);
            } else {
                throw new HttpException('Неподдерживаемый формат файла', HttpStatus.BAD_REQUEST);
            }

            if (!extractedText.trim()) {
                throw new HttpException('Не удалось извлечь текст', HttpStatus.BAD_REQUEST);
            }

            let ocrResult = document.ocrResult;
            if (!ocrResult) {
                ocrResult = this.ocrResultRepository.create({ documentId: id });
            }
            ocrResult.rawText = extractedText;
            ocrResult.normalizedText = extractedText.trim();
            ocrResult.language = 'ru';
            ocrResult.ocrConfidence = ocrConfidence;
            ocrResult.processedAt = new Date();
            await this.ocrResultRepository.save(ocrResult);

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/extract-text`,
                action: 'извлечение текста',
                status: 'success',
                statusCode: 200,
                message: `Текст извлечён, символов: ${extractedText.length}`,
            });

            return {
                id: ocrResult.id,
                documentId: id,
                rawText: extractedText,
                normalizedText: extractedText.trim(),
                ocrConfidence: ocrResult.ocrConfidence ? Number(ocrResult.ocrConfidence) : null,
                language: ocrResult.language,
                processedAt: ocrResult.processedAt,
            };

        } catch (error) {
            console.error('extractText error:', error);
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/extract-text`,
                action: 'извлечение текста',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при извлечении текста',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ========================================================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ========================================================================

    // Предобработка поискового запроса до отправки в AI
    // Правила: исправление раскладки клавиатуры, удаление стоп-слов, нормализация
    private preprocessQuery(raw: string): string {
        let q = raw.trim();

        // 1. Исправление неверной раскладки клавиатуры (латиница → кириллица)
        q = this.fixKeyboardLayout(q);

        // 2. Удаление стоп-слов (правила 13, 16)
        const stopWords = /\b(найди|покажи|все|документы|где|какие|есть|мне|нужны|хочу|дай|выведи|список|открой|ищи|ищу|посмотри|там|типа|вроде|этот|эта|это|который)\b/gi;
        q = q.replace(stopWords, '');

        // 3. Удаление эмодзи
        q = q.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');

        // 4. Нормализация пробелов
        q = q.replace(/\s+/g, ' ').trim();

        // Если после чистки почти ничего не осталось — возвращаем оригинал
        return q.length >= 3 ? q : raw.trim();
    }

    // Исправление неверной раскладки клавиатуры
    private fixKeyboardLayout(text: string): string {
        const latinChars = text.match(/[a-zA-Z]/g);
        const cyrillicChars = text.match(/[а-яА-ЯёЁ]/g);

        // Если в тексте много латиницы и почти нет кириллицы — похоже на неверную раскладку
        if (latinChars && latinChars.length > text.length * 0.5 && (!cyrillicChars || cyrillicChars.length < text.length * 0.2)) {
            const layoutMap: Record<string, string> = {
                'a': 'ф', 'b': 'и', 'c': 'с', 'd': 'в', 'e': 'у', 'f': 'а',
                'g': 'п', 'h': 'р', 'i': 'ш', 'j': 'о', 'k': 'л', 'l': 'д',
                'm': 'ь', 'n': 'т', 'o': 'щ', 'p': 'з', 'q': 'й', 'r': 'к',
                's': 'ы', 't': 'е', 'u': 'г', 'v': 'м', 'w': 'ц', 'x': 'ч',
                'y': 'н', 'z': 'я',
                'A': 'Ф', 'B': 'И', 'C': 'С', 'D': 'В', 'E': 'У', 'F': 'А',
                'G': 'П', 'H': 'Р', 'I': 'Ш', 'J': 'О', 'K': 'Л', 'L': 'Д',
                'M': 'Ь', 'N': 'Т', 'O': 'Щ', 'P': 'З', 'Q': 'Й', 'R': 'К',
                'S': 'Ы', 'T': 'Е', 'U': 'Г', 'V': 'М', 'W': 'Ц', 'X': 'Ч',
                'Y': 'Н', 'Z': 'Я',
                '[': 'х', '{': 'Х', ']': 'ъ', '}': 'Ъ', ';': 'ж', ':': 'Ж',
                "'": 'э', '"': 'Э', ',': 'б', '<': 'Б', '.': 'ю', '>': 'Ю',
                '/': '.', '?': ',', '`': 'ё', '~': 'Ё'
            };
            return text.split('').map(ch => layoutMap[ch] || ch).join('');
        }

        return text;
    }

    // Получение справочников для промпта
    private async getTypesAndCategoriesForPrompt(): Promise<{
        types: string;
        categories: string;
    }> {
        const types = await this.documentRepository.manager
            .createQueryBuilder()
            .select('dt.id', 'id')
            .addSelect('dt.name', 'name')
            .from('document_types', 'dt')
            .getRawMany();

        const categories = await this.documentRepository.manager
            .createQueryBuilder()
            .select('dc.id', 'id')
            .addSelect('dc.name', 'name')
            .from('document_categories', 'dc')
            .getRawMany();

        const typesStr = types.map((t: any) => `${t.id} - ${t.name}`).join(', ');
        const categoriesStr = categories.map((c: any) => `${c.id} - ${c.name}`).join(', ');

        return { types: typesStr, categories: categoriesStr };
    }

    // Разбор запроса через AI — извлечение фильтров и нормализация searchQuery
    // AI делает только семантику: фильтры, даты, опечатки, сленг, аббревиатуры
    // Морфологию и поиск по тексту делает PostgreSQL через tsvector
    private async parseSearchQueryWithAi(cleanQuery: string, originalQuery: string): Promise<{
        typeId: number | null;
        categoryId: number | null;
        status: string | null;
        dateFrom: string | null;
        dateTo: string | null;
        searchQuery: string | null;
    }> {
        try {
            const settings = await this.aiSettingRepository.findOne({
                where: { isActive: true },
            });

            if (!settings) {
                return this.fallbackParse(cleanQuery);
            }

            let apiKey: string;
            try {
                apiKey = decrypt(settings.apiKey);
            } catch {
                return this.fallbackParse(cleanQuery);
            }

            const { types, categories } = await this.getTypesAndCategoriesForPrompt();
            const today = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

            // Промпт разбит на два чётких блока — фильтры и ключевые слова
            // Правила сведены к минимуму для стабильности модели
            const prompt = `Ты — поисковый ассистент. Переведи запрос в JSON.

Сегодня: ${today}

СПРАВОЧНИКИ:
Типы: ${types}
Категории: ${categories}
Статусы: in_review, approved, completed, sent, pending, pending_verification, routed

ЗАПРОС: "${cleanQuery}"

ОТВЕТЬ СТРОГО JSON:
{"typeId":null,"categoryId":null,"status":null,"dateFrom":null,"dateTo":null,"searchQuery":"ключевые слова"}

ПРАВИЛА:
- typeId/categoryId/status — ставь значение ТОЛЬКО если пользователь ЯВНО ограничивает словами "только", "лишь", "исключительно". Иначе null.
- dateFrom/dateTo в формате YYYY-MM-DD. "за неделю" = последние 7 дней, "за месяц" = 30 дней, "в апреле" = весь апрель.
- searchQuery — ВСЕГДА заполняй. Исправляй опечатки. Переводи сленг ("первичка"→"первичный документ"). Расшифровывай аббревиатуры ("МЧС"→"мчс министерство"). Оставляй имена, рег.номера, цифры. Убирай предлоги и союзы. Английские слова переводи на русский.`;

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: '/documents/search/ai',
                action: 'запрос к AI для поиска',
                status: 'success',
                statusCode: 200,
                message: `Поисковый запрос: "${originalQuery}" → "${cleanQuery}"`,
            });

            const url = `${settings.baseUrl}/chat/completions`;

            const response = await firstValueFrom(
                this.httpService.post(url, {
                    model: settings.modelName,
                    messages: [
                        {
                            role: 'system',
                            content: 'Ты — поисковый ассистент. Отвечай строго в формате JSON без лишнего текста.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 500,
                    temperature: 0.1,
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 8000,
                }),
            );

            const content = response.data.choices?.[0]?.message?.content;
            if (!content) {
                return this.fallbackParse(cleanQuery);
            }

            // Безопасный парсинг — модель иногда оборачивает JSON в ```json ... ```
            let parsed: any;
            try {
                const cleanContent = content
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .trim();
                parsed = JSON.parse(cleanContent);
            } catch {
                await this.logger.log({
                    module: 'AI',
                    type: 'POST',
                    url: '/documents/search/ai',
                    action: 'парсинг ответа AI',
                    status: 'error',
                    statusCode: 500,
                    message: `Невалидный JSON от AI, используем fallback. Ответ: ${content}`,
                });
                return this.fallbackParse(cleanQuery);
            }

            await this.logger.log({
                module: 'AI',
                type: 'POST',
                url: '/documents/search/ai',
                action: 'ответ от AI для поиска',
                status: 'success',
                statusCode: 200,
                message: `Фильтры: ${JSON.stringify(parsed)}`,
            });

            return {
                typeId: typeof parsed.typeId === 'number' ? parsed.typeId : null,
                categoryId: typeof parsed.categoryId === 'number' ? parsed.categoryId : null,
                status: typeof parsed.status === 'string' ? parsed.status : null,
                dateFrom: typeof parsed.dateFrom === 'string' ? parsed.dateFrom : null,
                dateTo: typeof parsed.dateTo === 'string' ? parsed.dateTo : null,
                searchQuery: typeof parsed.searchQuery === 'string' && parsed.searchQuery.length > 0
                    ? parsed.searchQuery
                    : cleanQuery,
            };

        } catch {
            return this.fallbackParse(cleanQuery);
        }
    }

    // Fallback-разбор без AI — по ключевым словам
    private fallbackParse(q: string): {
        typeId: number | null;
        categoryId: number | null;
        status: string | null;
        dateFrom: string | null;
        dateTo: string | null;
        searchQuery: string | null;
    } {
        const query = q.toLowerCase();

        const typeMap: Record<string, number> = {
            'договор': 1, 'письм': 2, 'обращен': 3, 'уведомлен': 4,
            'счёт': 5, 'счет': 5, 'акт': 6, 'соглашен': 7,
            'счёт-фактур': 8, 'счет-фактур': 8, 'предписан': 9,
        };

        const categoryMap: Record<string, number> = {
            'кадр': 1, 'техническ': 2, 'обслуживан': 2, 'поставк': 3,
            'оборудован': 3, 'административ': 4, 'переписк': 4,
            'юридическ': 5, 'финанс': 6, 'оплат': 6,
        };

        const statusMap: Record<string, string> = {
            'просроч': 'pending', 'проверк': 'pending_verification',
            'одобрен': 'approved', 'завершён': 'completed', 'завершен': 'completed',
            'отправлен': 'sent', 'маршрут': 'routed', 'ожида': 'pending',
        };

        let typeId: number | null = null;
        let categoryId: number | null = null;
        let status: string | null = null;

        for (const [key, value] of Object.entries(typeMap)) {
            if (query.includes(key)) { typeId = value; break; }
        }
        for (const [key, value] of Object.entries(categoryMap)) {
            if (query.includes(key)) { categoryId = value; break; }
        }
        for (const [key, value] of Object.entries(statusMap)) {
            if (query.includes(key)) { status = value; break; }
        }

        return {
            typeId,
            categoryId,
            status,
            dateFrom: null,
            dateTo: null,
            searchQuery: q.length > 0 ? q : null,
        };
    }
}