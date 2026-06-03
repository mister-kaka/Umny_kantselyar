import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from '../../entities/document.entity';
import { DocumentRoute } from '../../entities/document-route.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { OcrResult } from '../../entities/ocr-result.entity';
import { DocumentSource } from '../../entities/document-source.entity';
import { DocumentClassification } from '../../entities/document-classification.entity';
import { DocumentComment } from '../../entities/document-comment.entity';
import { DocumentAiResult } from '../../entities/document-ai-result.entity';
import { User } from '../../entities/user.entity';
import { DocumentCardDto } from '../dto/document-card.dto';
import { UploadDocumentResponseDto } from '../dto/upload-document.dto';
import { VerifyDocumentDto } from '../dto/verify-document.dto';
import { RouteDocumentDto } from '../dto/route-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { UpdateDocumentResponseDto } from '../dto/update-document-response.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { AppLoggerService } from '../../logger/app-logger.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditLogService } from '../../audit/audit-log.service';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];

@Injectable()
export class DocumentsCrudService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentRoute)
        private documentRouteRepository: Repository<DocumentRoute>,
        @InjectRepository(DocumentFile)
        private documentFileRepository: Repository<DocumentFile>,
        @InjectRepository(OcrResult)
        private ocrResultRepository: Repository<OcrResult>,
        @InjectRepository(DocumentSource)
        private documentSourceRepository: Repository<DocumentSource>,
        @InjectRepository(DocumentClassification)
        private classificationRepository: Repository<DocumentClassification>,
        @InjectRepository(DocumentComment)
        private documentCommentRepository: Repository<DocumentComment>,
        @InjectRepository(DocumentAiResult)
        private documentAiResultRepository: Repository<DocumentAiResult>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly logger: AppLoggerService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogService: AuditLogService,
    ) {}

    // GET /documents/:id - карточка документа
    async findOne(id: number): Promise<DocumentCardDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id },
                relations: [
                    'documentType', 'category', 'creator', 'files',
                    'ocrResult', 'classifications', 'classifications.documentType',
                    'classifications.documentCategory', 'documentRoutes',
                    'documentRoutes.department', 'sources', 'aiResults',
                    'currentDepartment',
                ],
            });

            if (!document) {
                await this.logger.log({
                    module: 'Documents', type: 'GET', url: `/documents/${id}`,
                    action: 'получение карточки документа', status: 'error', statusCode: 404,
                    message: `Документ с id ${id} не найден`,
                });
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            document.classifications?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            document.aiResults?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            const result: DocumentCardDto = {
                id: document.id,
                registrationNumber: document.registrationNumber,
                title: document.title,
                senderName: document.senderName,
                receivedDate: document.receivedDate,
                uploadedAt: document.uploadedAt,
                currentStatus: document.currentStatus,
                confidenceScore: document.confidenceScore ? Number(document.confidenceScore) : null,
                documentType: document.documentType?.name || null,
                category: document.category?.name || null,
                createdBy: document.creator?.fullName || 'Неизвестно',
                createdAt: document.createdAt,
                currentDepartment: document.currentDepartment?.name || null,
                rejectedAt: document.rejectedAt,
                files: document.files?.map(f => ({
                    id: f.id, fileName: f.fileName, fileType: f.fileType,
                    filePath: f.filePath, fileSize: f.fileSize, uploadedAt: f.uploadedAt,
                })) || [],
                ocrResult: document.ocrResult ? {
                    id: document.ocrResult.id,
                    rawText: document.ocrResult.rawText,
                    normalizedText: document.ocrResult.normalizedText,
                    language: document.ocrResult.language,
                    ocrConfidence: document.ocrResult.ocrConfidence ? Number(document.ocrResult.ocrConfidence) : null,
                    processedAt: document.ocrResult.processedAt,
                } : null,
                classification: document.classifications?.[0] ? {
                    id: document.classifications[0].id,
                    type: document.classifications[0].documentType?.name || null,
                    category: document.classifications[0].documentCategory?.name || null,
                    typeConfidence: document.classifications[0].typeConfidence ? Number(document.classifications[0].typeConfidence) : null,
                    categoryConfidence: document.classifications[0].categoryConfidence ? Number(document.classifications[0].categoryConfidence) : null,
                    isVerified: document.classifications[0].isVerified,
                    createdAt: document.classifications[0].createdAt,
                } : null,
                routes: document.documentRoutes?.map(r => ({
                    departmentName: r.department?.name || 'Не указан',
                    routeStatus: r.routeStatus, routeReason: r.routeReason, routedAt: r.routedAt,
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
                    confidenceScore: document.aiResults[0].confidenceScore ? Number(document.aiResults[0].confidenceScore) : null,
                    providerCode: document.aiResults[0].providerCode,
                    modelName: document.aiResults[0].modelName,
                    createdAt: document.aiResults[0].createdAt,
                    extractedDate: document.aiResults[0].extractedDate,
                    extractedAmount: document.aiResults[0].extractedAmount ? Number(document.aiResults[0].extractedAmount) : null,
                    extractedCounterparty: document.aiResults[0].extractedCounterparty,
                    keyPhrases: document.aiResults[0].keyPhrases,
                } : null,
            };

            await this.logger.log({
                module: 'Documents', type: 'GET', url: `/documents/${id}`,
                action: 'получение карточки документа', status: 'success', statusCode: 200,
                message: 'Документ получен',
            });

            return result;

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents', type: 'GET', url: `/documents/${id}`,
                action: 'получение карточки документа', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении карточки документа',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // DELETE /documents/:id - удаление документа
    async delete(id: number, userId: number): Promise<void> {
        try {
            const document = await this.documentRepository.findOne({ where: { id } });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const registrationNumber = document.registrationNumber;
            const title = document.title;

            const docDir = path.join(process.cwd(), 'uploads', 'documents', String(id));
            if (fs.existsSync(docDir)) {
                fs.rmSync(docDir, { recursive: true, force: true });
            }

            await this.documentRepository.remove(document);

            await this.auditLogService.log(
                userId,
                'document_delete',
                id,
                { registrationNumber, title }
            );

            await this.logger.log({
                module: 'Documents', type: 'DELETE', url: `/documents/${id}`,
                action: 'удаление документа', status: 'success', statusCode: 200,
                message: `Документ ${registrationNumber} удалён`,
            });

        } catch (error) {
            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents', type: 'DELETE', url: `/documents/${id}`,
                action: 'удаление документа', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при удалении документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/upload - загрузка файла и создание документа
    async uploadDocument(file: Express.Multer.File, createdBy: number): Promise<UploadDocumentResponseDto> {
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

            const sourceRecord = this.documentSourceRepository.create({
                documentId: savedDocument.id,
                sourceType: 'scan',
                organizationName: null,
                senderName: 'Загружен через сканирование',
                contactInfo: null,
            });
            await this.documentSourceRepository.save(sourceRecord);

            await this.auditLogService.log(
                createdBy,
                'document_upload',
                savedDocument.id,
                { fileName: safeFileName, fileSize: file.size, fileType: fileExtension, registrationNumber }
            );

            await this.notificationsService.createNotification(
                createdBy,
                'new_document',
                'Новый документ',
                `Поступил новый документ «${safeFileName}» от Загружен через сканирование (№${registrationNumber})`,
                savedDocument.id,
            );

            await this.logger.log({
                module: 'Documents', type: 'POST', url: '/documents/upload',
                action: 'загрузка документа', status: 'success', statusCode: 201,
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
                module: 'Documents', type: 'POST', url: '/documents/upload',
                action: 'загрузка документа', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при загрузке документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // PUT /documents/:id/verify - подтверждение оператором
    async verifyDocument(id: number, dto: VerifyDocumentDto, userId: number): Promise<{ message: string }> {
        try {
            const document = await this.documentRepository.findOne({ where: { id } });
            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const changes: Record<string, any> = {};

            if (dto.typeId) {
                changes.typeId = dto.typeId;
                document.documentTypeId = dto.typeId;
            }
            if (dto.categoryId) {
                changes.categoryId = dto.categoryId;
                document.categoryId = dto.categoryId;
            }
            if (dto.departmentId) {
                changes.departmentId = dto.departmentId;
                document.currentDepartmentId = dto.departmentId;
            }
            if (dto.receivedDate) {
                changes.receivedDate = dto.receivedDate;
                document.receivedDate = new Date(dto.receivedDate);
            }
            if (dto.senderName) {
                changes.senderName = dto.senderName;
                document.senderName = dto.senderName;
            }

            document.currentStatus = 'verified';
            document.verifiedAt = new Date();

            await this.documentRepository.save(document);

            const classification = await this.classificationRepository.findOne({
                where: { documentId: id },
                order: { createdAt: 'DESC' },
            });
            if (classification) {
                classification.isVerified = true;
                await this.classificationRepository.save(classification);
            }

            await this.auditLogService.log(
                userId,
                'document_verify',
                id,
                { changes, registrationNumber: document.registrationNumber }
            );

            await this.notificationsService.createNotification(
                document.createdBy,
                'verified',
                'Документ проверен',
                `Документ «${document.title}» проверен оператором (№${document.registrationNumber})`,
                document.id,
            );

            await this.logger.log({
                module: 'Documents',
                type: 'PUT',
                url: `/documents/${id}/verify`,
                action: 'подтверждение документа оператором',
                status: 'success',
                statusCode: 200,
                message: `Документ ${document.registrationNumber} проверен`,
            });

            return { message: 'Документ проверен' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'PUT',
                url: `/documents/${id}/verify`,
                action: 'подтверждение документа оператором',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при проверке документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/:id/route - направление в отдел
    async routeDocument(id: number, dto: RouteDocumentDto, userId: number): Promise<{ message: string }> {
        try {
            const document = await this.documentRepository.findOne({ where: { id } });
            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const route = this.documentRouteRepository.create({
                documentId: id,
                departmentId: dto.departmentId,
                routeStatus: 'routed',
                routeReason: dto.comment || 'Направлен оператором',
                routedAt: new Date(),
            });
            await this.documentRouteRepository.save(route);

            document.currentDepartmentId = dto.departmentId;
            document.currentStatus = 'routed';
            document.routedAt = new Date();
            await this.documentRepository.save(document);

            const department = await this.documentRepository.manager
                .createQueryBuilder()
                .select('d.name')
                .from('departments', 'd')
                .where('d.id = :id', { id: dto.departmentId })
                .getRawOne();
            const departmentName = department?.d_name || 'отдел';

            await this.auditLogService.log(
                userId,
                'document_route',
                id,
                { departmentId: dto.departmentId, departmentName, comment: dto.comment, registrationNumber: document.registrationNumber }
            );

            await this.notificationsService.createNotification(
                document.createdBy,
                'routed',
                'Направлен в отдел',
                `Документ «${document.title}» направлен в отдел ${departmentName} (№${document.registrationNumber})`,
                document.id,
            );

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/route`,
                action: 'направление документа в отдел',
                status: 'success',
                statusCode: 201,
                message: `Документ ${document.registrationNumber} направлен в отдел ${dto.departmentId}`,
            });

            return { message: 'Документ направлен в отдел' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/route`,
                action: 'направление документа в отдел',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при направлении документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/:id/reject - отклонение документа
    async rejectDocument(id: number, comment?: string, userId?: number): Promise<{ message: string }> {
        try {
            const document = await this.documentRepository.findOne({ where: { id } });
            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            if (document.currentStatus === 'routed' || document.currentStatus === 'rejected') {
                throw new HttpException(
                    'Документ уже обработан и не может быть отклонён',
                    HttpStatus.BAD_REQUEST
                );
            }

            document.currentStatus = 'rejected';
            document.rejectedAt = new Date();
            document.currentDepartmentId = null;

            await this.documentRepository.save(document);

            const route = this.documentRouteRepository.create({
                documentId: id,
                departmentId: document.currentDepartmentId ?? undefined,
                routeStatus: 'rejected',
                routeReason: comment || 'Документ отклонён оператором',
                routedAt: new Date(),
            });
            await this.documentRouteRepository.save(route);

            if (userId) {
                await this.auditLogService.log(
                    userId,
                    'document_reject',
                    id,
                    { comment, registrationNumber: document.registrationNumber, title: document.title }
                );
            }

            await this.notificationsService.createNotification(
                document.createdBy,
                'rejected',
                'Документ отклонён',
                `Документ «${document.title}» отклонён${comment ? `: ${comment}` : ''} (№${document.registrationNumber})`,
                document.id,
            );

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/reject`,
                action: 'отклонение документа',
                status: 'success',
                statusCode: 200,
                message: `Документ ${document.registrationNumber} отклонён${comment ? `: ${comment}` : ''}`,
            });

            return { message: 'Документ отклонён' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${id}/reject`,
                action: 'отклонение документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при отклонении документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async updateDocument(
        id: number,
        userId: number,
        dto: UpdateDocumentDto,
    ): Promise<UpdateDocumentResponseDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id },
                relations: ['creator'],
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const updatedFields: string[] = [];

            if (dto.title !== undefined && dto.title !== document.title) {
                document.title = dto.title;
                updatedFields.push('title');
            }
            if (dto.senderName !== undefined && dto.senderName !== document.senderName) {
                document.senderName = dto.senderName;
                updatedFields.push('senderName');
            }
            if (dto.documentTypeId !== undefined && dto.documentTypeId !== document.documentTypeId) {
                document.documentTypeId = dto.documentTypeId;
                updatedFields.push('documentTypeId');
            }
            if (dto.categoryId !== undefined && dto.categoryId !== document.categoryId) {
                document.categoryId = dto.categoryId;
                updatedFields.push('categoryId');
            }
            if (dto.receivedDate !== undefined) {
                document.receivedDate = new Date(dto.receivedDate);
                updatedFields.push('receivedDate');
            }

            await this.documentRepository.save(document);

            const hasAiFields = dto.extractedAmount !== undefined ||
                dto.extractedDate !== undefined ||
                dto.extractedCounterparty !== undefined ||
                dto.sourceTypeSuggested !== undefined ||
                dto.sourceOrganizationSuggested !== undefined ||
                dto.sourceSenderSuggested !== undefined ||
                dto.sourceContactSuggested !== undefined ||
                dto.keyPhrases !== undefined;

            if (hasAiFields) {
                let aiResult = await this.documentAiResultRepository.findOne({
                    where: { documentId: id },
                    order: { createdAt: 'DESC' },
                });

                if (!aiResult) {
                    aiResult = this.documentAiResultRepository.create({
                        documentId: id,
                        providerCode: 'manual',
                        modelName: 'manual_edit',
                    });
                }

                if (dto.extractedAmount !== undefined) {
                    aiResult.extractedAmount = dto.extractedAmount;
                    updatedFields.push('extractedAmount');
                }
                if (dto.extractedDate !== undefined) {
                    aiResult.extractedDate = new Date(dto.extractedDate);
                    updatedFields.push('extractedDate');
                }
                if (dto.extractedCounterparty !== undefined) {
                    aiResult.extractedCounterparty = dto.extractedCounterparty;
                    updatedFields.push('extractedCounterparty');
                }
                if (dto.sourceTypeSuggested !== undefined) {
                    aiResult.sourceTypeSuggested = dto.sourceTypeSuggested;
                    updatedFields.push('sourceTypeSuggested');
                }
                if (dto.sourceOrganizationSuggested !== undefined) {
                    aiResult.sourceOrganizationSuggested = dto.sourceOrganizationSuggested;
                    updatedFields.push('sourceOrganizationSuggested');
                }
                if (dto.sourceSenderSuggested !== undefined) {
                    aiResult.sourceSenderSuggested = dto.sourceSenderSuggested;
                    updatedFields.push('sourceSenderSuggested');
                }
                if (dto.sourceContactSuggested !== undefined) {
                    aiResult.sourceContactSuggested = dto.sourceContactSuggested;
                    updatedFields.push('sourceContactSuggested');
                }
                if (dto.keyPhrases !== undefined) {
                    aiResult.keyPhrases = dto.keyPhrases;
                    updatedFields.push('keyPhrases');
                }

                await this.documentAiResultRepository.save(aiResult);
            }

            if (updatedFields.length > 0) {
                await this.auditLogService.log(
                    userId,
                    'document_update',
                    id,
                    { updatedFields, registrationNumber: document.registrationNumber }
                );
            }

            await this.logger.log({
                module: 'Documents',
                type: 'PUT',
                url: `/documents/${id}`,
                action: 'редактирование документа',
                status: 'success',
                statusCode: 200,
                message: `Документ ${document.registrationNumber} обновлён пользователем ${userId}`,
            });

            const updatedAiResult = await this.documentAiResultRepository.findOne({
                where: { documentId: id },
                order: { createdAt: 'DESC' },
            });

            return {
                id: document.id,
                registrationNumber: document.registrationNumber,
                title: document.title,
                senderName: document.senderName,
                receivedDate: document.receivedDate,
                documentTypeId: document.documentTypeId,
                categoryId: document.categoryId,
                extractedAmount: updatedAiResult?.extractedAmount || null,
                extractedDate: updatedAiResult?.extractedDate || null,
                extractedCounterparty: updatedAiResult?.extractedCounterparty || null,
                sourceTypeSuggested: updatedAiResult?.sourceTypeSuggested || null,
                sourceOrganizationSuggested: updatedAiResult?.sourceOrganizationSuggested || null,
                sourceSenderSuggested: updatedAiResult?.sourceSenderSuggested || null,
                sourceContactSuggested: updatedAiResult?.sourceContactSuggested || null,
                keyPhrases: updatedAiResult?.keyPhrases || null,
                updatedAt: new Date(),
            };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'PUT',
                url: `/documents/${id}`,
                action: 'редактирование документа',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при обновлении документа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getComments(documentId: number): Promise<CommentResponseDto[]> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const comments = await this.documentCommentRepository.find({
                where: { documentId },
                relations: ['user'],
                order: { createdAt: 'ASC' },
            });

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/${documentId}/comments`,
                action: 'получение комментариев',
                status: 'success',
                statusCode: 200,
                message: `Получено ${comments.length} комментариев для документа ${documentId}`,
            });

            return comments.map(comment => ({
                id: comment.id,
                documentId: comment.documentId,
                userId: comment.userId,
                userName: comment.user?.fullName || 'Неизвестный',
                text: comment.text,
                createdAt: comment.createdAt,
            }));

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'GET',
                url: `/documents/${documentId}/comments`,
                action: 'получение комментариев',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при получении комментариев',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async addComment(
        documentId: number,
        userId: number,
        dto: AddCommentDto,
    ): Promise<CommentResponseDto> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const user = await this.userRepository.findOne({
                where: { id: userId },
                select: ['fullName'],
            });

            const userName = user?.fullName || 'Пользователь';

            const comment = this.documentCommentRepository.create({
                documentId,
                userId,
                text: dto.text,
            });

            const saved = await this.documentCommentRepository.save(comment);

            await this.auditLogService.log(
                userId,
                'comment_added',
                documentId,
                { commentId: saved.id, textPreview: dto.text.substring(0, 100) }
            );

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${documentId}/comments`,
                action: 'добавление комментария',
                status: 'success',
                statusCode: 201,
                message: `Комментарий добавлен к документу ${documentId} пользователем ${userName}`,
            });

            if (document.createdBy !== userId) {
                await this.notificationsService.createNotification(
                    document.createdBy,
                    'comment_added',
                    'Новый комментарий',
                    `Пользователь ${userName} оставил комментарий к документу «${document.title}»`,
                    documentId,
                );
            }

            return {
                id: saved.id,
                documentId: saved.documentId,
                userId: saved.userId,
                userName: userName,
                text: saved.text,
                createdAt: saved.createdAt,
            };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'POST',
                url: `/documents/${documentId}/comments`,
                action: 'добавление комментария',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при добавлении комментария',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async deleteComment(
        documentId: number,
        commentId: number,
        userId: number,
    ): Promise<{ message: string }> {
        try {
            const document = await this.documentRepository.findOne({
                where: { id: documentId },
            });

            if (!document) {
                throw new HttpException('Документ не найден', HttpStatus.NOT_FOUND);
            }

            const comment = await this.documentCommentRepository.findOne({
                where: { id: commentId, documentId },
            });

            if (!comment) {
                throw new HttpException('Комментарий не найден', HttpStatus.NOT_FOUND);
            }

            if (comment.userId !== userId) {
                const user = await this.userRepository.findOne({
                    where: { id: userId },
                    select: ['roleId'],
                });

                if (user?.roleId !== 1) {
                    throw new HttpException('Нет прав для удаления комментария', HttpStatus.FORBIDDEN);
                }
            }

            await this.documentCommentRepository.remove(comment);

            await this.auditLogService.log(
                userId,
                'comment_deleted',
                documentId,
                { commentId, commentText: comment.text.substring(0, 100) }
            );

            await this.logger.log({
                module: 'Documents',
                type: 'DELETE',
                url: `/documents/${documentId}/comments/${commentId}`,
                action: 'удаление комментария',
                status: 'success',
                statusCode: 200,
                message: `Комментарий ${commentId} удалён`,
            });

            return { message: 'Комментарий удалён' };

        } catch (error) {
            if (error instanceof HttpException) throw error;

            await this.logger.log({
                module: 'Documents',
                type: 'DELETE',
                url: `/documents/${documentId}/comments/${commentId}`,
                action: 'удаление комментария',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error instanceof Error ? error.message : 'Ошибка сервера',
            });

            throw new HttpException(
                'Ошибка сервера при удалении комментария',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}