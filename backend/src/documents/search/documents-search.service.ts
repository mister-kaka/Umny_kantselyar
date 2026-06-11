import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Document } from '../../entities/document.entity';
import { AiSetting } from '../../entities/ai-setting.entity';
import { GetDocumentsDto } from '../dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from '../dto/document-list.dto';
import { AppLoggerService } from '../../logger/app-logger.service';
import { decrypt } from '../../ai/ai-key.util';
import { DocumentsListService } from '../list/documents-list.service';

@Injectable()
export class DocumentsSearchService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(AiSetting)
        private aiSettingRepository: Repository<AiSetting>,
        private readonly listService: DocumentsListService,
        private readonly httpService: HttpService,
        private readonly logger: AppLoggerService,
    ) {}

    // GET /documents/search?q=... - быстрый поиск
    async search(q: string): Promise<DocumentListItemDto[]> {
        try {
            if (!q || q.trim().length === 0) {
                throw new HttpException('Параметр поиска "q" обязателен', HttpStatus.BAD_REQUEST);
            }

            const exactPhrase = q.trim();
            const ftsWords = exactPhrase
                .replace(/[:&|!()]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 0)
                .map(w => w + ':*')
                .join(' | ');

            const query = this.documentRepository
                .createQueryBuilder('doc')
                .leftJoinAndSelect('doc.documentType', 'documentType')
                .leftJoinAndSelect('doc.category', 'category')
                .leftJoinAndSelect(
                    'doc.documentRoutes', 'route',
                    'route.id = (SELECT dr.id FROM document_routes dr WHERE dr.document_id = doc.id ORDER BY dr.routed_at DESC LIMIT 1)'
                )
                .leftJoinAndSelect('route.department', 'department')
                .leftJoin('doc.files', 'file')
                .leftJoin('doc.currentDepartment', 'currentDept')
                .leftJoin('doc.sources', 'source')
                .leftJoin('doc.comments', 'comment')
                .leftJoin('doc.ocrResult', 'ocr_rank');

            if (ftsWords.length > 0) {
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

                query.addSelect(`
                    CASE WHEN doc.registrationNumber ILIKE :exactPhrase THEN 100 ELSE 0 END
                    + CASE WHEN doc.title ILIKE :exactPhrase THEN 50 ELSE 0 END
                    + CASE WHEN doc.senderName ILIKE :exactPhrase THEN 30 ELSE 0 END
                `, 'boost_score');

                query.addSelect(`
                    ts_rank(doc.search_vector, to_tsquery('russian', :ftsWords)) 
                    + COALESCE(ts_rank(ocr_rank.search_vector, to_tsquery('russian', :ftsWords)), 0)
                `, 'fts_rank');

                query.orderBy('boost_score', 'DESC');
                query.addOrderBy('fts_rank', 'DESC');
                query.addOrderBy('doc.receivedDate', 'DESC');
            } else {
                query.orderBy('doc.receivedDate', 'DESC');
            }

            const documents = await query.take(10).getMany();

            const items: DocumentListItemDto[] = documents.map(doc => ({
                id: doc.id, registrationNumber: doc.registrationNumber,
                title: doc.title, senderName: doc.senderName,
                receivedDate: doc.receivedDate,
                uploadedAt: doc.uploadedAt,
                documentType: doc.documentType?.name ?? 'Не указан',
                category: doc.category?.name ?? null,
                currentStatus: doc.currentStatus,
                department: doc.documentRoutes?.[0]?.department?.name ?? null,
            }));

            await this.logger.log({
                module: 'Documents', type: 'GET', url: `/documents/search?q=${encodeURIComponent(q)}`,
                action: 'поиск документов', status: 'success', statusCode: 200,
                message: `Найдено документов: ${items.length}`,
            });

            return items;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents', type: 'GET', url: '/documents/search',
                action: 'поиск документов', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при поиске документов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // GET /documents/search/ai?q=... - умный поиск через AI (в 5 шагов)
    async searchAi(q: string): Promise<DocumentsListResponseDto> {
        try {
            if (!q || q.trim().length < 1) {
                throw new HttpException('Введите поисковый запрос', HttpStatus.BAD_REQUEST);
            }

            const looksLikeFileName = /^[a-zA-Z0-9_\.-]+$/.test(q.trim()) && (q.includes('.') || q.length > 5);
            const fixedQuery = looksLikeFileName ? q.trim() : this.fixKeyboardLayout(q.trim());

            if (/^[А-Яа-яA-Za-z]+-\d+-\d+$/i.test(fixedQuery)) {
                return this.listService.findAll({ searchQuery: fixedQuery, page: 1, limit: 20 });
            }

            const cleanQuery = this.preprocessQuery(fixedQuery);

            if (cleanQuery.trim().length < 2) {
                return this.listService.findAll({ page: 1, limit: 50 });
            }

            const departmentKeywords: Record<string, string[]> = {
                'Технический отдел': ['технический', 'техотдел', 'тех отдел'],
                'Бухгалтерия': ['бухгалтерия', 'бухгалтерии', 'бухучёт', 'финансовый отдел', 'финансы'],
                'Юридический отдел': ['юридический', 'юротдел', 'юр отдел', 'юрист'],
                'Отдел закупок': ['закупки', 'закупок', 'снабжение', 'тендер'],
                'Отдел кадров': ['кадры', 'кадров', 'персонал'],
                'Управление': ['управление', 'администрация'],
            };

            let detectedDepartmentId: number | null = null;
            const queryLower = cleanQuery.toLowerCase();

            for (const [deptName, keywords] of Object.entries(departmentKeywords)) {
                if (keywords.some(kw => queryLower.includes(kw))) {
                    const deptResult = await this.documentRepository.manager.query(
                        `SELECT id FROM departments WHERE name ILIKE $1 LIMIT 1`,
                        [`%${deptName}%`]
                    );
                    if (deptResult.length > 0) {
                        detectedDepartmentId = deptResult[0].id;
                        break;
                    }
                }
            }

            if (detectedDepartmentId) {
                await this.logger.log({
                    module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                    action: 'умный поиск — быстрый поиск по отделу', status: 'success', statusCode: 200,
                    message: `Отдел: ${detectedDepartmentId}`,
                });
                return this.listService.findAll({
                    departmentId: detectedDepartmentId,
                    searchQuery: cleanQuery,
                    page: 1, limit: 50,
                });
            }

            const expandedQuery = await this.expandWithSynonyms(cleanQuery);

            const isExactQuery = fixedQuery.includes(':') || fixedQuery.includes('"') || looksLikeFileName;

            if (isExactQuery) {
                const exactCheck = await this.documentRepository
                    .createQueryBuilder('doc_exact')
                    .select('doc_exact.id', 'id')
                    .leftJoin('doc_exact.ocrResult', 'ocr_phrase')
                    .leftJoin('doc_exact.files', 'file_exact')
                    .where(`(
                        ocr_phrase.normalized_text ILIKE :exactFull 
                        OR doc_exact.title ILIKE :exactFull 
                        OR file_exact.fileName ILIKE :exactFull
                    )`, { exactFull: `%${fixedQuery}%` });

                const exactResults = await exactCheck.getRawMany();
                const exactIds = exactResults.map((r: any) => r.id);

                if (exactIds.length > 0) {
                    const step1Result = await this.listService.findAll({
                        searchQuery: fixedQuery,
                        page: 1, limit: 50,
                    });
                    step1Result.items = step1Result.items.filter(item => exactIds.includes(item.id));
                    step1Result.total = step1Result.items.length;
                    step1Result.totalPages = Math.ceil(step1Result.total / step1Result.limit);

                    await this.logger.log({
                        module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                        action: 'умный поиск — шаг 1 (точное совпадение)', status: 'success', statusCode: 200,
                        message: `Найдено: ${step1Result.total}`,
                    });
                    return step1Result;
                }
            }

            const searchWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);
            if (searchWords.length >= 2) {
                const rootConditions = searchWords.map((_, i) => {
                    const root = searchWords[i].length >= 4
                        ? searchWords[i].substring(0, searchWords[i].length - 2)
                        : searchWords[i];
                    return `(
                        doc_exact.title ILIKE '%${root}%'
                        OR doc_exact.senderName ILIKE '%${root}%'
                        OR EXISTS (
                            SELECT 1 FROM ocr_results ocr_e
                            WHERE ocr_e.document_id = doc_exact.id
                            AND ocr_e.normalized_text ILIKE '%${root}%'
                        )
                        OR EXISTS (
                            SELECT 1 FROM document_files file_e
                            WHERE file_e.document_id = doc_exact.id
                            AND file_e.file_name ILIKE '%${root}%'
                        )
                    )`;
                }).join(' AND ');

                const step2Query = this.documentRepository
                    .createQueryBuilder('doc_exact')
                    .select('doc_exact.id', 'id')
                    .where(`(${rootConditions})`);

                const step2Results = await step2Query.getRawMany();
                const step2Ids = step2Results.map((r: any) => r.id);

                if (step2Ids.length > 0) {
                    const step2Result = await this.listService.findAll({
                        searchQuery: cleanQuery,
                        page: 1, limit: 50,
                    });
                    step2Result.items = step2Result.items.filter(item => step2Ids.includes(item.id));
                    step2Result.total = step2Result.items.length;
                    step2Result.totalPages = Math.ceil(step2Result.total / step2Result.limit);

                    await this.logger.log({
                        module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                        action: 'умный поиск — шаг 2 (корни слов)', status: 'success', statusCode: 200,
                        message: `Найдено: ${step2Result.total}`,
                    });
                    return step2Result;
                }
            }

            let aiFilters = await this.parseSearchQueryWithAi(cleanQuery, fixedQuery);

            if (!aiFilters.typeId && !aiFilters.categoryId && !aiFilters.status && !aiFilters.senderQuery && !aiFilters.departmentId) {
                aiFilters = this.fallbackParse(cleanQuery);
            }

            const hasFilters = aiFilters.typeId || aiFilters.categoryId || aiFilters.status ||
                aiFilters.senderQuery || aiFilters.dateFrom || aiFilters.dateTo || aiFilters.departmentId;

            if (hasFilters) {
                const step3Result = await this.listService.findAll({
                    typeId: aiFilters.typeId ?? undefined,
                    categoryId: aiFilters.categoryId ?? undefined,
                    status: aiFilters.status ?? undefined,
                    dateFrom: aiFilters.dateFrom ?? undefined,
                    dateTo: aiFilters.dateTo ?? undefined,
                    departmentId: aiFilters.departmentId ?? undefined,
                    senderQuery: aiFilters.senderQuery ?? undefined,
                    page: 1, limit: 50, useSemanticSearch: true,
                });

                if (step3Result.total > 0) {
                    await this.logger.log({
                        module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                        action: 'умный поиск — шаг 3 (AI-фильтры)', status: 'success', statusCode: 200,
                        message: `Найдено: ${step3Result.total}. Фильтры: ${JSON.stringify(aiFilters)}`,
                    });
                    return step3Result;
                }
            }

            const step4Result = await this.listService.findAll({
                searchQuery: expandedQuery,
                page: 1, limit: 50, useSemanticSearch: true,
            });

            if (step4Result.total > 0) {
                await this.logger.log({
                    module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                    action: 'умный поиск — шаг 4 (широкий FTS)', status: 'success', statusCode: 200,
                    message: `Найдено: ${step4Result.total}`,
                });
                return step4Result;
            }

            const step5Result = await this.listService.findAll({
                searchQuery: expandedQuery,
                page: 1, limit: 50, useSemanticSearch: false,
            });

            await this.logger.log({
                module: 'Documents', type: 'GET', url: `/documents/search/ai?q=${encodeURIComponent(q)}`,
                action: 'умный поиск — шаг 5 (триграммы)', status: 'success', statusCode: 200,
                message: `Найдено: ${step5Result.total}`,
            });

            return step5Result;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents', type: 'GET', url: '/documents/search/ai',
                action: 'умный поиск через AI', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при умном поиске',
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

    private preprocessQuery(raw: string): string {
        let q = raw.trim();
        q = q.replace(/\b(найди|покажи|все|документы|где|какие|есть|мне|нужны|хочу|дай|выведи|список|открой|ищи|ищу|посмотри|там|типа|вроде|этот|эта|это|который)\b/gi, '');
        q = q.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').replace(/\s+/g, ' ').trim();
        return q.length >= 1 ? q : raw.trim();
    }

    private fixKeyboardLayout(text: string): string {
        if (/^[a-zA-Z]+$/.test(text) || (/[a-zA-Z]/.test(text) && text.length <= 20)) {
            const layoutMap: Record<string, string> = {
                'a': 'ф', 'b': 'и', 'c': 'с', 'd': 'в', 'e': 'у', 'f': 'а', 'g': 'п', 'h': 'р', 'i': 'ш',
                'j': 'о', 'k': 'л', 'l': 'д', 'm': 'ь', 'n': 'т', 'o': 'щ', 'p': 'з', 'q': 'й', 'r': 'к',
                's': 'ы', 't': 'е', 'u': 'г', 'v': 'м', 'w': 'ц', 'x': 'ч', 'y': 'н', 'z': 'я',
                '[': 'х', ']': 'ъ', ';': 'ж', "'": 'э', ',': 'б', '.': 'ю', '/': '.', '`': 'ё',
            };
            const converted = text.split('').map(ch => layoutMap[ch.toLowerCase()] || ch).join('');
            if (/[а-яё]/.test(converted)) {
                return converted;
            }
        }
        return text;
    }

    private async expandWithSynonyms(query: string): Promise<string> {
        try {
            const words = query.trim().split(/\s+/);
            const expanded: string[] = [];
            for (const word of words) {
                expanded.push(word);
                const result = await this.documentRepository.manager.query(`
                    SELECT synonyms FROM search_synonyms 
                    WHERE $1 ILIKE term || '%' 
                       OR term ILIKE $1 || '%'
                       OR EXISTS (
                           SELECT 1 FROM unnest(synonyms) s 
                           WHERE $1 ILIKE s || '%' OR s ILIKE $1 || '%'
                       )
                    LIMIT 1
                `, [word.toLowerCase()]);
                if (result.length > 0) {
                    expanded.push(...result[0].synonyms);
                }
            }
            return [...new Set(expanded)].join(' ');
        } catch { return query; }
    }

    private async getTypesAndCategoriesForPrompt(): Promise<{ types: string; categories: string; departments: string }> {
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

        const departments = await this.documentRepository.manager
            .createQueryBuilder()
            .select('d.id', 'id')
            .addSelect('d.name', 'name')
            .from('departments', 'd')
            .getRawMany();

        return {
            types: types.map((t: any) => `${t.id} - ${t.name}`).join(', '),
            categories: categories.map((c: any) => `${c.id} - ${c.name}`).join(', '),
            departments: departments.map((d: any) => `${d.id} - ${d.name}`).join(', '),
        };
    }

    private async parseSearchQueryWithAi(cleanQuery: string, originalQuery: string): Promise<{
        typeId: number | null; categoryId: number | null; status: string | null;
        dateFrom: string | null; dateTo: string | null; departmentId: number | null;
        searchQuery: string | null; senderQuery: string | null;
    }> {
        try {
            const settings = await this.aiSettingRepository.findOne({ where: { isActive: true } });
            if (!settings) return this.fallbackParse(cleanQuery);

            let apiKey: string;
            try { apiKey = decrypt(settings.apiKey); } catch { return this.fallbackParse(cleanQuery); }

            const { types, categories, departments } = await this.getTypesAndCategoriesForPrompt();
            const today = new Date().toISOString().split('T')[0];

            const prompt = `Ты - поисковый ассистент. Переведи запрос в JSON.

Сегодня: ${today}

СПРАВОЧНИКИ:
Типы: ${types}
Категории: ${categories}
Отделы: ${departments}
Статусы: in_review, pending_verification, verified, routed, rejected

ЗАПРОС: "${cleanQuery}"

ОТВЕТЬ СТРОГО JSON:
{"typeId":null,"categoryId":null,"status":null,"dateFrom":null,"dateTo":null,"departmentId":null,"searchQuery":"ключевые слова","senderQuery":"отправитель или null"}

ПРАВИЛА:
1. searchQuery - ВСЕГДА заполняй. Слова пиши ЦЕЛИКОМ. Исправляй опечатки. Переводи сленг. Расшифровывай аббревиатуры. Английские слова переводи и добавляй оба варианта.
2. senderQuery - название организации или ФИО отправителя, если пользователь явно его указал (например: "от Лукойла" - "Лукойл"). Иначе null.
3. ДАТЫ в формате YYYY-MM-DD: "за апрель" - с 1 по 30 апреля. "за неделю" - последние 7 дней.
4. typeId/categoryId/status/departmentId = определяй если пользователь упоминает в запросе.
   Примеры:
   - "счета от лукойл" - typeId: 5, senderQuery: "лукойл"
   - "договоры с ТехноПоставкой" - typeId: 1, senderQuery: "ТехноПоставка"
   - "документы бухгалтерии" - departmentId: 3
   - "завершённые" - status: "completed"
   - "просто договоры" - typeId: 1
   Если не уверен - ставь null.`;

            const url = `${settings.baseUrl}/chat/completions`;

            const response = await firstValueFrom(
                this.httpService.post(url, {
                    model: settings.modelName,
                    messages: [
                        {
                            role: 'system',
                            content: 'Ты - поисковый ассистент. Отвечай строго в формате JSON без лишнего текста.',
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
            if (!content) return this.fallbackParse(cleanQuery);

            let parsed: any;
            try {
                parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
            } catch {
                return this.fallbackParse(cleanQuery);
            }

            if (parsed.searchQuery && parsed.searchQuery !== cleanQuery) {
                await this.saveNewSynonyms(cleanQuery, parsed.searchQuery);
            }

            return {
                typeId: typeof parsed.typeId === 'number' ? parsed.typeId : null,
                categoryId: typeof parsed.categoryId === 'number' ? parsed.categoryId : null,
                status: typeof parsed.status === 'string' ? parsed.status : null,
                dateFrom: typeof parsed.dateFrom === 'string' ? parsed.dateFrom : null,
                dateTo: typeof parsed.dateTo === 'string' ? parsed.dateTo : null,
                departmentId: typeof parsed.departmentId === 'number' ? parsed.departmentId : null,
                searchQuery: typeof parsed.searchQuery === 'string' && parsed.searchQuery.length > 0
                    ? parsed.searchQuery
                    : cleanQuery,
                senderQuery: typeof parsed.senderQuery === 'string' ? parsed.senderQuery : null,
            };

        } catch {
            return this.fallbackParse(cleanQuery);
        }
    }

    private async saveNewSynonyms(original: string, normalized: string): Promise<void> {
        try {
            const stopWords = new Set([
                'и', 'в', 'на', 'с', 'по', 'к', 'от', 'для', 'без', 'до', 'из', 'за', 'об',
                'это', 'как', 'что', 'не', 'он', 'она', 'они', 'мы', 'вы', 'ты', 'я',
            ]);

            const origWords = original.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 2 && !stopWords.has(w));

            const normWords = normalized.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 2 && !stopWords.has(w));

            for (let i = 0; i < Math.min(origWords.length, normWords.length); i++) {
                if (origWords[i] !== normWords[i]) {
                    await this.documentRepository.manager.query(`
                        INSERT INTO search_synonyms (term, synonyms, created_by)
                        VALUES ($1, ARRAY[$2], 'ai')
                        ON CONFLICT (term) DO UPDATE
                        SET synonyms = array_append(search_synonyms.synonyms, $2),
                            usage_count = search_synonyms.usage_count + 1
                    `, [origWords[i], normWords[i]]);
                }
            }
        } catch {}
    }

    private fallbackParse(q: string): {
        typeId: number | null; categoryId: number | null; status: string | null;
        dateFrom: string | null; dateTo: string | null; departmentId: number | null;
        searchQuery: string | null; senderQuery: string | null;
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
            'юридическ': 5, 'финанс': 6, 'оплат': 6, 'бухгалтер': 6,
        };

        const statusMap: Record<string, string> = {
            'просроч': 'pending', 'проверк': 'pending_verification',
            'одобрен': 'approved', 'завершён': 'completed', 'завершен': 'completed',
            'отправлен': 'sent', 'маршрут': 'routed', 'ожида': 'pending',
        };

        const departmentMap: Record<string, number> = {
            'бухгалтер': 3, 'финанс': 3,
            'техническ': 2, 'техотдел': 2,
            'юридическ': 5, 'юротдел': 5, 'правов': 5,
            'закуп': 4, 'снабжен': 4, 'тендер': 4,
            'кадр': 6, 'персонал': 6,
            'управлен': 1, 'администрац': 1,
        };

        let typeId: number | null = null;
        let categoryId: number | null = null;
        let status: string | null = null;
        let departmentId: number | null = null;

        for (const [k, v] of Object.entries(typeMap)) {
            if (query.includes(k)) { typeId = v; break; }
        }
        for (const [k, v] of Object.entries(categoryMap)) {
            if (query.includes(k)) { categoryId = v; break; }
        }
        for (const [k, v] of Object.entries(statusMap)) {
            if (query.includes(k)) { status = v; break; }
        }
        for (const [k, v] of Object.entries(departmentMap)) {
            if (query.includes(k)) { departmentId = v; break; }
        }

        return {
            typeId,
            categoryId,
            status,
            dateFrom: null,
            dateTo: null,
            departmentId,
            searchQuery: q.length > 0 ? q : null,
            senderQuery: null,
        };
    }
}