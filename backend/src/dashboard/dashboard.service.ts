import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DashboardResponseDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
    ) {}

    async getDashboardData(): Promise<DashboardResponseDto> {

        const totalDocuments = await this.documentRepository.count();  // общее количество документов

        const inProgress = await this.documentRepository.count({   // количество документов в обработке
            where: { currentStatus: 'in_review' },
        });

        const recentDocumentsRaw = await this.documentRepository.find({  // последние 5 документов 
            order: { receivedDate: 'DESC' },
            take: 5,
            select: ['id', 'title', 'currentStatus', 'receivedDate'],
        });

        const recentDocuments = recentDocumentsRaw.map(doc => ({
            id: doc.id,
            title: doc.title,
            status: doc.currentStatus,
            date: doc.receivedDate,
        }));

        return {
            totalDocuments,
            inProgress,
            recentDocuments,
        };
     }
}
