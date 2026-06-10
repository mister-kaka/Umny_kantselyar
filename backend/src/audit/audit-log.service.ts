import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) {}

    async log(
        userId: number,
        action: string,
        documentId: number | null = null,
        details: Record<string, any> = {},
    ): Promise<void> {
        await this.auditLogRepository.save({
            userId,
            action,
            documentId,
            details,
        });
    }
}