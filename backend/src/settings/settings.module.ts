import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AiSetting } from '../entities/ai-setting.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { UserInterfaceSettings } from '../entities/user-interface-settings.entity';
import { Document } from '../entities/document.entity';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { DocumentRoute } from '../entities/document-route.entity';
import { DocumentSource } from '../entities/document-source.entity';
import { DocumentFile } from '../entities/document-file.entity';
import { OcrResult } from '../entities/ocr-result.entity';
import { DocumentClassification } from '../entities/document-classification.entity';
import { DocumentAiResult } from '../entities/document-ai-result.entity';
import { DocumentComment } from '../entities/document-comment.entity';
import { Notification } from '../entities/notification.entity';
import { RouteTemplate } from '../entities/route-template.entity';
import { SystemSettings } from '../entities/system-settings.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { UserSession } from '../entities/user-session.entity';
import { LoggerModule } from '../logger/logger.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiSetting,
      UserNotificationSettings,
      UserInterfaceSettings,
      Document,
      DocumentType,
      DocumentCategory,
      Department,
      User,
      DocumentRoute,
      DocumentSource,
      DocumentFile,
      OcrResult,
      DocumentClassification,
      DocumentAiResult,
      DocumentComment,
      Notification,
      RouteTemplate,
      SystemSettings,
      LoginHistory,
      AuditLog,
      UserSession,
    ]),
    LoggerModule,
    AuditLogModule,
    NotificationsModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}