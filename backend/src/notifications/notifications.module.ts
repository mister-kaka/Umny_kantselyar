import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        AuditLogModule,
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}