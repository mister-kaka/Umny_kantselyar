import {
    Controller, Get, Post, Put, Delete, Param, Query, Body,
    UseGuards, Req, Res, ParseIntPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
        role: string;
    };
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('audit-log')
    async getAuditLog(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.adminService.getAuditLog(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20,
            userId ? parseInt(userId, 10) : undefined,
            action,
            dateFrom,
            dateTo,
        );
    }

    @Get('users')
    async getUsers() {
        return this.adminService.getUsers();
    }

    @Get('users/:id/stats')
    async getUserStats(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getUserStats(id);
    }

    @Put('users/:id/role')
    async updateUserRole(
        @Param('id', ParseIntPipe) id: number,
        @Body('role') role: string,
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.updateUserRole(id, role, req.user.userId);
    }

    @Put('users/:id/block')
    async toggleUserBlock(
        @Param('id', ParseIntPipe) id: number,
        @Body('isBlocked') isBlocked: boolean,
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.toggleUserBlock(id, isBlocked, req.user.userId);
    }

    @Post('users')
    async createUser(
        @Body() dto: {
            fullName: string;
            email: string;
            password: string;
            role: string;
            departmentId?: number;
        },
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.createUser(dto, req.user.userId);
    }

    @Post('users/:id/reset-password')
    async resetUserPassword(
        @Param('id', ParseIntPipe) id: number,
        @Body('newPassword') newPassword: string,
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.resetUserPassword(id, newPassword, req.user.userId);
    }

    @Delete('users/:id')
    async deleteUser(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.deleteUser(id, req.user.userId);
    }

    @Get('system-settings')
    async getSystemSettings() {
        return this.adminService.getSystemSettings();
    }

    @Put('system-settings')
    async updateSystemSettings(
        @Body() dto: any,
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.updateSystemSettings(dto, req.user.userId);
    }

    @Post('cleanup')
    async cleanup(
        @Body() dto: { type: string; olderThanMonths: number },
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.cleanup(dto, req.user.userId);
    }

    @Get('logs')
    async getLogs(
        @Query('date') date?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Res() res?: Response,
    ) {
        const filePath = await this.adminService.getLogs(date, from, to);
        if (res) {
            res.download(filePath);
        }
    }

    @Post('export')
    async exportData(
        @Body() dto: { sections: string[] },
        @Req() req: RequestWithUser,
        @Res() res: Response,
    ) {
        const data = await this.adminService.exportSelected(dto.sections, req.user.userId);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=umny-kan-backup.json');
        res.send(JSON.stringify(data, null, 2));
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importData(
        @UploadedFile() file: Express.Multer.File,
        @Body('sections') sections: string,
        @Req() req: RequestWithUser,
    ) {
        if (!file) {
            return { message: 'Файл обязателен', statusCode: 400 };
        }
        try {
            const data = JSON.parse(file.buffer.toString());
            const sectionsList = sections ? JSON.parse(sections) : [];
            return this.adminService.importSelected(data, sectionsList, req.user.userId);
        } catch (error) {
            return { message: 'Неверный формат файла. Ожидается JSON.', statusCode: 400 };
        }
    }

    @Get('backup-status')
    async getBackupStatus() {
        return this.adminService.getBackupStatus();
    }

    @Put('backup-config')
    async updateBackupConfig(
        @Body() dto: { enabled: boolean; time: string; keepCount: number },
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.updateBackupConfig(dto, req.user.userId);
    }

    @Post('backup/restore')
    async restoreBackup(@Req() req: RequestWithUser) {
        return this.adminService.restoreFromBackup(req.user.userId);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    @Post('notifications/send')
    async sendNotification(
        @Body() dto: {
            target: string;
            userIds?: number[];
            title: string;
            message: string;
        },
        @Req() req: RequestWithUser,
    ) {
        return this.adminService.sendMassNotification(dto, req.user.userId);
    }

    @Get('notifications/history')
    async getNotificationHistory(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminService.getNotificationHistory(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }
}