import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { Document } from '../../entities/document.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { OcrResult } from '../../entities/ocr-result.entity';
import { ExtractTextResponseDto } from '../dto/extract-text-response.dto';
import { AppLoggerService } from '../../logger/app-logger.service';
import { ImageProcessorService } from '../../image-processor/image-processor.service';
import { DocumentsSearchService } from '../search/documents-search.service';
import { NotificationsService } from '../../notifications/notifications.service';

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');

@Injectable()
export class TextExtractionService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentFile)
        private documentFileRepository: Repository<DocumentFile>,
        @InjectRepository(OcrResult)
        private ocrResultRepository: Repository<OcrResult>,
        private readonly imageProcessor: ImageProcessorService,
        private readonly searchService: DocumentsSearchService,
        private readonly logger: AppLoggerService,
        private readonly notificationsService: NotificationsService,
    ) {}

    // POST /documents/:id/extract-text - извлечение текста из файла
    async extractText(id: number): Promise<ExtractTextResponseDto> {
        try {
            const document = await this.documentRepository.findOne({ where: { id }, relations: ['files', 'ocrResult'] });

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
                try {
                    let imageForOcr = filePath;

                    if (fileExtension === 'tiff' || fileExtension === 'tif') {
                        const pngPath = filePath.replace(/\.(tiff|tif)$/i, '.png');
                        await sharp(filePath).png().toFile(pngPath);
                        imageForOcr = pngPath;
                    }

                    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
                        const pngPath = filePath.replace(/\.(jpg|jpeg)$/i, '.png');
                        await sharp(filePath).png().toFile(pngPath);
                        imageForOcr = pngPath;
                    }

                    const processedPath = await this.imageProcessor.process(imageForOcr);
                    const { data: { text, confidence } } = await Tesseract.recognize(processedPath, 'rus+eng');
                    extractedText = text;
                    ocrConfidence = Math.round(confidence);

                    if (processedPath !== imageForOcr && fs.existsSync(processedPath)) {
                        const processedFileName = path.basename(processedPath);
                        const processedFileRecord = this.documentFileRepository.create({
                            documentId: id,
                            fileName: processedFileName,
                            fileType: path.extname(processedPath).replace('.', ''),
                            filePath: `/uploads/documents/${id}/${processedFileName}`,
                            fileSize: fs.statSync(processedPath).size,
                        });
                        await this.documentFileRepository.save(processedFileRecord);
                    }
                } catch (ocrError) {
                    console.error('OCR error:', ocrError);
                    throw new HttpException(
                        'Не удалось распознать изображение. Используйте PNG формат.',
                        HttpStatus.BAD_REQUEST
                    );
                }
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
            ocrResult.ocrConfidence = ocrConfidence / 100;
            ocrResult.processedAt = new Date();
            await this.ocrResultRepository.save(ocrResult);

            try {
                const embedding = await this.searchService.getEmbedding(
                    `Название: ${document.title}. Содержание: ${extractedText.trim().substring(0, 7000)}`
                );
                if (embedding) {
                    const vectorStr = `[${embedding.join(',')}]`;
                    await this.documentRepository.createQueryBuilder().update(Document)
                        .set({ embedding: () => `'${vectorStr}'::vector` }).where('id = :id', { id }).execute();
                }
            } catch (e) { }

            await this.logger.log({
                module: 'Documents', type: 'POST', url: `/documents/${id}/extract-text`,
                action: 'извлечение текста', status: 'success', statusCode: 200,
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

            if (error instanceof HttpException && error.getStatus() !== HttpStatus.NOT_FOUND) {
                try {
                    const document = await this.documentRepository.findOne({ where: { id } });
                    const file = document?.files?.[0];
                    if (document && file) {
                        await this.notificationsService.createNotification(
                            document.createdBy,
                            'extract_error',
                            'Ошибка извлечения',
                            `Не удалось распознать текст в файле «${file.fileName}» (№${document.registrationNumber})`,
                            document.id,
                        );
                    }
                } catch (notifError) {
                    console.error('Ошибка при создании уведомления:', notifError);
                }
            }

            if (error instanceof HttpException) throw error;

            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Documents', type: 'POST', url: `/documents/${id}/extract-text`,
                action: 'извлечение текста', status: 'error', statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при извлечении текста',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // POST /documents/generate-embeddings - генерация векторов
    async generateEmbeddings(): Promise<{ message: string; count: number }> {
        const documents = await this.documentRepository.find({
            where: { embedding: IsNull() }, relations: ['ocrResult'],
        });
        let count = 0;
        for (const doc of documents) {
            const text = doc.ocrResult?.normalizedText || doc.title;
            const embedding = await this.searchService.getEmbedding(
                `Название: ${doc.title}. Содержание: ${text.substring(0, 7000)}`
            );
            if (embedding) {
                const vectorStr = `[${embedding.join(',')}]`;
                await this.documentRepository.createQueryBuilder().update(Document)
                    .set({ embedding: () => `'${vectorStr}'::vector` }).where('id = :id', { id: doc.id }).execute();
                count++;
            }
        }
        return { message: `Сгенерировано embeddings: ${count} из ${documents.length}`, count };
    }
}