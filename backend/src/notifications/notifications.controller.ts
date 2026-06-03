import { Controller, Get, Put, Delete, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { NotificationListResponseDto, UnreadCountDto } from './dto/notification.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
    };
}

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getNotifications(
        @Req() req: RequestWithUser,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<NotificationListResponseDto> {
        return this.notificationsService.findAll(req.user.userId, page ?? 1, limit ?? 20);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('unread-count')
    async getUnreadCount(@Req() req: RequestWithUser): Promise<UnreadCountDto> {
        return this.notificationsService.getUnreadCount(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Put(':id/read')
    async markAsRead(
        @Req() req: RequestWithUser,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ message: string }> {
        await this.notificationsService.markAsRead(req.user.userId, id);
        return { message: 'Уведомление отмечено как прочитанное' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('read-all')
    async markAllAsRead(@Req() req: RequestWithUser): Promise<{ message: string }> {
        await this.notificationsService.markAllAsRead(req.user.userId);
        return { message: 'Все уведомления отмечены как прочитанные' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async deleteNotification(
        @Req() req: RequestWithUser,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ message: string }> {
        return this.notificationsService.deleteNotification(req.user.userId, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('read')
    async deleteAllRead(@Req() req: RequestWithUser): Promise<{ message: string; deletedCount: number }> {
        return this.notificationsService.deleteAllRead(req.user.userId);
    }
}