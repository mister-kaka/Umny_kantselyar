import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { Document } from '../../entities/document.entity';
import { AiSetting } from '../../entities/ai-setting.entity';
import { GetDocumentsDto } from '../dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from '../dto/document-list.dto';
import { AppLoggerService } from '../../logger/app-logger.service';
import { decrypt } from '../../ai/ai-key.util';
import { AuditLogService } from '../../audit/audit-log.service';

@Injectable()
export class DocumentsListService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(AiSetting)
        private aiSettingRepository: Repository<AiSetting>,
        private readonly httpService: HttpService,
        private readonly logger: AppLoggerService,
        private readonly auditLogService: AuditLogService,
    ) {}

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
                .leftJoinAndSelect('route.department', 'department')
                .leftJoin('doc.files', 'file')
                .leftJoin('doc.currentDepartment', 'currentDept')
                .leftJoin('doc.sources', 'source')
                .leftJoin('doc.comments', 'comment')
                .leftJoin('doc.ocrResult', 'ocr_rank');

            if (filters.typeId) query.andWhere('doc.documentTypeId = :typeId', { typeId: filters.typeId });
            if (filters.categoryId) query.andWhere('doc.categoryId = :categoryId', { categoryId: filters.categoryId });
            if (filters.status) query.andWhere('doc.currentStatus = :status', { status: filters.status });

            const dateField = filters.dateField || 'document';

            if (filters.dateFrom) {
                if (dateField === 'upload') {
                    query.andWhere('doc.uploadedAt >= :dateFrom', { dateFrom: filters.dateFrom + ' 00:00:00' });
                } else {
                    query.andWhere('doc.receivedDate >= :dateFrom', { dateFrom: filters.dateFrom });
                }
            }
            if (filters.dateTo) {
                if (dateField === 'upload') {
                    query.andWhere('doc.uploadedAt <= :dateTo', { dateTo: filters.dateTo + ' 23:59:59' });
                } else {
                    query.andWhere('doc.receivedDate <= :dateTo', { dateTo: filters.dateTo });
                }
            }

            if (filters.departmentId) {
                query.andWhere(`(
                    currentDept.id = :deptId 
                    OR EXISTS (
                        SELECT 1 FROM document_routes dr_dept 
                        WHERE dr_dept.document_id = doc.id 
                        AND dr_dept.department_id = :deptId
                    )
                    OR EXISTS (
                        SELECT 1 FROM document_ai_results ai_dept 
                        WHERE ai_dept.document_id = doc.id 
                        AND ai_dept.department_suggested IS NOT NULL
                        AND ai_dept.department_suggested ILIKE '%' || (SELECT name FROM departments WHERE id = :deptId) || '%'
                    )
                )`, { deptId: filters.departmentId });
            }

            if (filters.senderQuery) {
                const senderPattern = `%${filters.senderQuery.replace(/'/g, "''")}%`;
                query.andWhere(
                    '(doc.senderName ILIKE :senderPattern OR source.organization_name ILIKE :senderPattern OR source.sender_name ILIKE :senderPattern)',
                    { senderPattern }
                );
            }

            let hasSearch = false;
            let ftsWords = '';
            let exactPhrase = '';

            if (filters.searchQuery) {
                exactPhrase = filters.searchQuery.trim();
                ftsWords = exactPhrase
                    .replace(/[:&|!()]/g, ' ')
                    .split(/\s+/)
                    .filter(w => w.length > 0)
                    .map(w => w + ':*')
                    .join(' | ');

                if (ftsWords.length > 0) {
                    hasSearch = true;

                    query.andWhere(`(
                        doc.search_vector @@ to_tsquery('russian', :ftsWords)
                        OR doc.title ILIKE :exactPhrase
                        OR doc.senderName ILIKE :exactPhrase
                        OR doc.registrationNumber ILIKE :likeQuery
                        OR file.fileName ILIKE :exactPhrase
                        OR source.organization_name ILIKE :exactPhrase
                        OR source.sender_name ILIKE :exactPhrase
                        OR comment.text ILIKE :exactPhrase
                        OR currentDept.name ILIKE :likeQuery
                        OR department.name ILIKE :likeQuery
                        OR EXISTS (
                            SELECT 1 FROM ocr_results ocr
                            WHERE ocr.document_id = doc.id
                            AND (ocr.search_vector @@ to_tsquery('russian', :ftsWords) OR ocr.normalized_text ILIKE :exactPhrase)
                        )
                        OR EXISTS (
                            SELECT 1 FROM document_ai_results ai
                            WHERE ai.document_id = doc.id
                            AND to_tsvector('russian', coalesce(ai.summary_text, '')) @@ to_tsquery('russian', :ftsWords)
                        )
                    )`, { ftsWords, exactPhrase: `%${exactPhrase}%`, likeQuery: `%${exactPhrase}%` });
                }
            }

            if (hasSearch) {
                const senderBoost = filters.senderQuery
                    ? `+ CASE WHEN doc.senderName ILIKE '%${filters.senderQuery.replace(/'/g, "''")}%' THEN 200 ELSE 0 END`
                    : `+ CASE WHEN doc.senderName ILIKE :exactPhrase THEN 30 ELSE 0 END`;

                query.addSelect(`
                    CASE WHEN doc.registrationNumber ILIKE :exactPhrase THEN 100 ELSE 0 END
                    + CASE WHEN doc.title ILIKE :exactPhrase THEN 50 ELSE 0 END
                    ${senderBoost}
                    + CASE WHEN file.fileName ILIKE :exactPhrase THEN 20 ELSE 0 END
                    + CASE WHEN source.organization_name ILIKE :exactPhrase THEN 10 ELSE 0 END
                    + CASE WHEN source.sender_name ILIKE :exactPhrase THEN 10 ELSE 0 END
                `, 'boost_score');

                query.addSelect(`
                    ts_rank(doc.search_vector, to_tsquery('russian', :ftsWords)) 
                    + COALESCE(ts_rank(ocr_rank.search_vector, to_tsquery('russian', :ftsWords)), 0)
                `, 'fts_rank');

                query.orderBy('boost_score', 'DESC');
                query.addOrderBy('fts_rank', 'DESC');
                query.addOrderBy('doc.receivedDate', 'DESC');
            } else {
                query.orderBy('doc.id', 'DESC');
            }
            query.addOrderBy('doc.id', 'DESC');

            let [documents, total] = await query.skip(skip).take(limit).getManyAndCount();

            if (total === 0 && filters.searchQuery) {
                const fallbackQuery = this.documentRepository
                    .createQueryBuilder('doc')
                    .leftJoinAndSelect('doc.documentType', 'documentType')
                    .leftJoinAndSelect('doc.category', 'category')
                    .leftJoinAndSelect(
                        'doc.documentRoutes', 'route',
                        'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                    )
                    .leftJoinAndSelect('route.department', 'department')
                    .leftJoin('doc.currentDepartment', 'currentDept');

                if (filters.typeId) fallbackQuery.andWhere('doc.documentTypeId = :typeId', { typeId: filters.typeId });
                if (filters.categoryId) fallbackQuery.andWhere('doc.categoryId = :categoryId', { categoryId: filters.categoryId });
                if (filters.status) fallbackQuery.andWhere('doc.currentStatus = :status', { status: filters.status });
                if (filters.dateFrom) {
                    if (dateField === 'upload') {
                        fallbackQuery.andWhere('doc.uploadedAt >= :dateFrom', { dateFrom: filters.dateFrom + ' 00:00:00' });
                    } else {
                        fallbackQuery.andWhere('doc.receivedDate >= :dateFrom', { dateFrom: filters.dateFrom });
                    }
                }
                if (filters.dateTo) {
                    if (dateField === 'upload') {
                        fallbackQuery.andWhere('doc.uploadedAt <= :dateTo', { dateTo: filters.dateTo + ' 23:59:59' });
                    } else {
                        fallbackQuery.andWhere('doc.receivedDate <= :dateTo', { dateTo: filters.dateTo });
                    }
                }
                if (filters.departmentId) {
                    fallbackQuery.andWhere(`(
                        currentDept.id = :deptId 
                        OR EXISTS (
                            SELECT 1 FROM document_routes dr_dept 
                            WHERE dr_dept.document_id = doc.id 
                            AND dr_dept.department_id = :deptId
                        )
                        OR EXISTS (
                            SELECT 1 FROM document_ai_results ai_dept 
                            WHERE ai_dept.document_id = doc.id 
                            AND ai_dept.department_suggested IS NOT NULL
                            AND ai_dept.department_suggested ILIKE '%' || (SELECT name FROM departments WHERE id = :deptId) || '%'
                        )
                    )`, { deptId: filters.departmentId });
                }
                if (filters.senderQuery) {
                    fallbackQuery.andWhere('doc.senderName ILIKE :senderPattern', {
                        senderPattern: `%${filters.senderQuery.replace(/'/g, "''")}%`
                    });
                }

                fallbackQuery.andWhere(
                    '(similarity(doc.title, :rawQuery) > 0.2 OR similarity(currentDept.name, :rawQuery) > 0.2)',
                    { rawQuery: filters.searchQuery }
                );
                fallbackQuery.addSelect('similarity(doc.title, :rawQuery)', 'trgm_score');
                fallbackQuery.orderBy('doc.id', 'DESC');
                fallbackQuery.addOrderBy('doc.receivedDate', 'DESC');

                [documents, total] = await fallbackQuery.skip(skip).take(limit).getManyAndCount();
            }

            if (total === 0 && filters.searchQuery && filters.useSemanticSearch !== false) {
                [documents, total] = await this.semanticSearch(filters, skip, limit);
            }

            const items: DocumentListItemDto[] = documents.map(doc => ({
                id: doc.id, registrationNumber: doc.registrationNumber,
                title: doc.title, senderName: doc.senderName,
                receivedDate: doc.receivedDate,
                uploadedAt: doc.uploadedAt,
                documentType: doc.documentType?.name ?? 'Не указан',
                category: doc.category?.name ?? null,
                currentStatus: doc.currentStatus,
                department: doc.documentRoutes?.[0]?.department?.name ?? null,
                confidenceScore: doc.confidenceScore ? Number(doc.confidenceScore) : null,
            }));

            if (filters.searchQuery) {
                await this.logSearch(filters.searchQuery, total, 'fast');
            }

            await this.logger.log({
                module: 'Documents', type: 'GET', url: '/documents',
                action: 'получение списка документов', status: 'success', statusCode: 200,
                message: `Найдено документов: ${total}`,
            });

            return { items, total, page, limit, totalPages: Math.ceil(total / limit) };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents', type: 'GET', url: '/documents',
                action: 'получение списка документов', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при получении списка документов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getEmbedding(text: string): Promise<number[] | null> {
        try {
            const settings = await this.aiSettingRepository.findOne({ where: { isActive: true } });
            if (!settings) return null;

            let apiKey: string;
            try { apiKey = decrypt(settings.apiKey); } catch { return null; }

            const truncatedText = text.substring(0, 8000);
            const url = `${settings.baseUrl}/embeddings`;

            const response = await firstValueFrom(
                this.httpService.post(url, {
                    model: 'openai/text-embedding-3-small',
                    input: truncatedText,
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                }),
            );

            return response.data?.data?.[0]?.embedding || null;
        } catch {
            return null;
        }
    }

    private async semanticSearch(
        filters: GetDocumentsDto,
        skip: number,
        limit: number,
    ): Promise<[Document[], number]> {
        try {
            const queryEmbedding = await this.getEmbedding(filters.searchQuery!);
            if (!queryEmbedding) return [[], 0];

            const vectorStr = `[${queryEmbedding.join(',')}]`;

            const vectorQuery = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoinAndSelect('doc.documentType', 'documentType')
                .leftJoinAndSelect('doc.category', 'category')
                .leftJoinAndSelect(
                    'doc.documentRoutes', 'route',
                    'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                )
                .leftJoinAndSelect('route.department', 'department')
                .where('doc.embedding IS NOT NULL')
                .orderBy(`doc.embedding <=> '${vectorStr}'::vector`, 'ASC');

            if (filters.typeId) vectorQuery.andWhere('doc.documentTypeId = :typeId', { typeId: filters.typeId });
            if (filters.categoryId) vectorQuery.andWhere('doc.categoryId = :categoryId', { categoryId: filters.categoryId });
            if (filters.status) vectorQuery.andWhere('doc.currentStatus = :status', { status: filters.status });
            if (filters.dateFrom) vectorQuery.andWhere('doc.receivedDate >= :dateFrom', { dateFrom: filters.dateFrom });
            if (filters.dateTo) vectorQuery.andWhere('doc.receivedDate <= :dateTo', { dateTo: filters.dateTo });

            return await vectorQuery.skip(skip).take(limit).getManyAndCount();
        } catch {
            return [[], 0];
        }
    }

    private async logSearch(query: string, resultsCount: number, source: string): Promise<void> {
        try {
            await this.documentRepository.manager.query(
                `INSERT INTO search_log (query, results_count, source) VALUES ($1, $2, $3)`,
                [query, resultsCount, source]
            );
        } catch { }
    }

    async exportToExcel(filters: GetDocumentsDto, userId?: number): Promise<Buffer> {
        const { items } = await this.findAll({ ...filters, limit: 10000, page: 1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Документы');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Рег. номер', key: 'registrationNumber', width: 20 },
            { header: 'Название', key: 'title', width: 40 },
            { header: 'Отправитель', key: 'senderName', width: 30 },
            { header: 'Дата загрузки', key: 'uploadedAt', width: 15 },
            { header: 'Тип', key: 'documentType', width: 20 },
            { header: 'Категория', key: 'category', width: 20 },
            { header: 'Статус', key: 'currentStatus', width: 20 },
            { header: 'Отдел', key: 'department', width: 20 },
        ];

        items.forEach(doc => {
            worksheet.addRow({
                id: doc.id,
                registrationNumber: doc.registrationNumber,
                title: doc.title,
                senderName: doc.senderName,
                uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('ru-RU') : '',
                documentType: doc.documentType,
                category: doc.category || '',
                currentStatus: doc.currentStatus,
                department: doc.department || '',
            });
        });

        if (userId) {
            await this.auditLogService.log(
                userId,
                'export_excel',
                null,
                { 
                    filters: {
                        typeId: filters.typeId,
                        categoryId: filters.categoryId,
                        status: filters.status,
                        dateFrom: filters.dateFrom,
                        dateTo: filters.dateTo,
                        searchQuery: filters.searchQuery,
                    },
                    recordsCount: items.length 
                }
            );
        }

        await this.logger.log({
            module: 'Documents',
            type: 'GET',
            url: '/documents/export',
            action: 'экспорт документов в Excel',
            status: 'success',
            statusCode: 200,
            message: `Экспортировано ${items.length} документов`,
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer as unknown as Buffer;
    }
}