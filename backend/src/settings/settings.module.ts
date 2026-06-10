import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AiSetting } from '../entities/ai-setting.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { UserInterfaceSettings } from '../entities/user-interface-settings.entity';
import { LoggerModule } from '../logger/logger.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiSetting, UserNotificationSettings, UserInterfaceSettings]),
    LoggerModule,
    AuditLogModule,
    NotificationsModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}