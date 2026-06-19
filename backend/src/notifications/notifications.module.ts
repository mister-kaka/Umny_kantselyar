import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, UserNotificationSettings]),
        AuditLogModule,
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}