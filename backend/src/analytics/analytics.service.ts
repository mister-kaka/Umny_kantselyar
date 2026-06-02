import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Document } from '../entities/document.entity';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        private readonly logger: AppLoggerService,
    ) {}

    async getAnalyticsData(): Promise<AnalyticsResponseDto> {
        try {
            const totalDocuments = await this.documentRepository.count();

            const avgConfidenceResult = await this.documentRepository
                .createQueryBuilder('doc')
                .select('AVG(doc.confidenceScore)', 'avg')
                .where('doc.confidenceScore IS NOT NULL')
                .getRawOne();

            const rejectedCount = await this.documentRepository.count({
                where: { currentStatus: 'rejected' },
            });

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const last7Days = await this.documentRepository.count({
                where: {
                    uploadedAt: MoreThan(sevenDaysAgo),
                },
            });

            const pendingVerificationCount = await this.documentRepository.count({
                where: { currentStatus: 'pending_verification' },
            });

            const aiProcessedCount = await this.documentRepository.count({
                where: { confidenceScore: MoreThan(0) },
            });

            await this.logger.log({
                module: 'Analytics',
                type: 'GET',
                url: '/analytics/data',
                action: 'получение данных аналитики',
                status: 'success',
                statusCode: 200,
                message: 'Данные аналитики успешно получены',
            });

            return {
                totalDocuments,
                avgConfidence: Math.round((avgConfidenceResult?.avg || 0) * 100),
                rejectedCount,
                last7Days,
                pendingVerificationCount,
                aiProcessedCount,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';

            await this.logger.log({
                module: 'Analytics',
                type: 'GET',
                url: '/analytics/data',
                action: 'получение данных аналитики',
                status: 'error',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorMessage,
            });

            throw new HttpException(
                'Ошибка сервера при получении данных аналитики',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}