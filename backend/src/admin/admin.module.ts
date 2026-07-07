import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Document } from '../entities/document.entity';
import { Department } from '../entities/department.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentSource } from '../entities/document-source.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { DocumentClassification } from '../entities/document-classification.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { DocumentComment } from '../entities/document-comment.entity';
import { Notification } from '../entities/notification.entity';
import { AiSetting } from '../entities/ai-setting.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { UserSession } from '../entities/user-session.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { UserInterfaceSettings } from '../entities/user-interface-settings.entity';
import { SystemSettings } from '../entities/system-settings.entity';
import { LoggerModule } from '../logger/logger.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityModule } from '../security/security.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User, Role, Document, Department, DocumentType, DocumentCategory,
            DocumentRoute, DocumentSource, DocumentFile, OcrResult,
            DocumentClassification, DocumentAiResult, DocumentComment,
            Notification, AiSetting, AuditLog, LoginHistory, UserSession,
            UserNotificationSettings, UserInterfaceSettings, SystemSettings,
        ]),
        LoggerModule,
        AuditLogModule,
        NotificationsModule,
        SecurityModule,
    ],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule {}