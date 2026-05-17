import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { UploadDocumentResponseDto } from './dto/upload-document.dto';
import { ExtractTextResponseDto } from './dto/extract-text-response.dto';
import { AppLoggerService } from '../logger/app-logger.service';

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
        private readonly logger: AppLoggerService,
    ) {}

    // GET /documents - список документов 
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

    // GET /documents/:id - карточка документа
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

    // GET /documents/search?q=... - поиск по документам
    async search(q: string): Promise<DocumentListItemDto[]> {
        try {
            if (!q || q.trim().length === 0) {
                throw new HttpException('Параметр поиска "q" обязателен', HttpStatus.BAD_REQUEST);
            }

            const query = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoinAndSelect('doc.documentType', 'documentType')
                .leftJoinAndSelect('doc.category', 'category')
                .leftJoinAndSelect(
                    'doc.documentRoutes',
                    'route',
                    'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                )
                .leftJoinAndSelect('route.department', 'department')
                .where('doc.registrationNumber ILIKE :q', { q: `%${q.trim()}%` })
                .orWhere('doc.title ILIKE :q', { q: `%${q.trim()}%` })
                .orWhere('doc.senderName ILIKE :q', { q: `%${q.trim()}%` })
                .orderBy('doc.receivedDate', 'DESC')
                .take(10);

            const documents = await query.getMany();

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

            const count = await this.documentRepository.count();
            const registrationNumber = `ВХ-2026-${String(count + 1).padStart(3, '0')}`;

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
}