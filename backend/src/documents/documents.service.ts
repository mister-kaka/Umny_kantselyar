import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsListResponseDto, DocumentListItemDto } from './dto/document-list.dto';
import { DocumentCardDto } from './dto/document-card.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        private readonly logger: AppLoggerService,
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

            console.error('Ошибка при получении списка документов:', error);
            throw new HttpException(
                'Ошибка сервера при получении списка документов',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

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

            const result: DocumentCardDto = {
                id: document.id,
                registrationNumber: document.registrationNumber,
                title: document.title,
                senderName: document.senderName,
                receivedDate: document.receivedDate,
                currentStatus: document.currentStatus,
                confidenceScore: document.confidenceScore,
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
                    ocrConfidence: document.ocrResult.ocrConfidence,
                    processedAt: document.ocrResult.processedAt,
                } : null,
                classification: document.classifications?.[0] ? {
                    id: document.classifications[0].id,
                    type: document.classifications[0].documentType?.name || null,
                    category: document.classifications[0].documentCategory?.name || null,
                    typeConfidence: document.classifications[0].typeConfidence,
                    categoryConfidence: document.classifications[0].categoryConfidence,
                    isVerified: document.classifications[0].isVerified,
                    createdAt: document.classifications[0].createdAt,
                } : null,
                routes: document.documentRoutes?.map(r => ({
                    departmentName: r.department?.name || 'Не указан',
                    routeStatus: r.routeStatus,
                    routeReason: r.routeReason,
                    routedAt: r.routedAt,
                })) || [],
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
}