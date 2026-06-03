import { Controller, Get, Post, Delete, Query, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityService } from './security.service';
import { SessionDto } from './dto/session.dto';
import { LoginHistoryDto } from './dto/login-history.dto';
import { AuditLogDto } from './dto/audit-log.dto';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
    };
    headers: any;
}

@Controller('security')
@UseGuards(AuthGuard('jwt'))
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @Get('sessions')
    async getSessions(@Req() req: RequestWithUser): Promise<SessionDto[]> {
        const token = req.headers.authorization?.replace('Bearer ', '') || '';
        return this.securityService.getSessions(req.user.userId, token);
    }

    @Delete('sessions/:id')
    async logoutSession(
        @Req() req: RequestWithUser,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ message: string }> {
        return this.securityService.logoutSession(req.user.userId, id);
    }

    @Get('login-history')
    async getLoginHistory(
        @Req() req: RequestWithUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<{ items: LoginHistoryDto[]; total: number; page: number; totalPages: number }> {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.securityService.getLoginHistory(req.user.userId, pageNum, limitNum);
    }

    @Post('logout-all')
    async logoutAll(@Req() req: RequestWithUser): Promise<{ message: string }> {
        const token = req.headers.authorization?.replace('Bearer ', '') || '';
        return this.securityService.logoutAll(req.user.userId, token);
    }

    @Get('audit-log')
    async getAuditLog(
        @Req() req: RequestWithUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('action') action?: string,
        @Query('documentId') documentId?: string,
    ): Promise<{ items: AuditLogDto[]; total: number; page: number; totalPages: number }> {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const docId = documentId ? parseInt(documentId, 10) : undefined;
        return this.securityService.getAuditLog(req.user.userId, pageNum, limitNum, action, docId);
    }
}