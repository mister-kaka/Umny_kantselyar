import { Controller, Get, Put, Post, Body, UseGuards, Req, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SettingsService } from './settings.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateInterfaceSettingsDto } from './dto/update-interface-settings.dto';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('ai')
  async getAiSettings() {
    return this.settingsService.getAiSettings();
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('ai')
  async updateAiSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.settingsService.updateAiSettings(dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('ai/providers')
  async getAiProviders() {
    return this.settingsService.getAiProviders();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('ai/test-connection')
  async testConnection(@Body() dto: UpdateAiSettingsDto) {
    return this.settingsService.testConnection(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('notifications')
  async getNotificationSettings(@Req() req: RequestWithUser) {
    return this.settingsService.getNotificationSettings(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('notifications')
  async updateNotificationSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('interface')
  async getInterfaceSettings(@Req() req: RequestWithUser) {
    return this.settingsService.getInterfaceSettings(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('interface')
  async updateInterfaceSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateInterfaceSettingsDto,
  ) {
    return this.settingsService.updateInterfaceSettings(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('export')
  async exportData(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const data = await this.settingsService.exportData(req.user.userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=umny-kan-backup.json');
    res.send(JSON.stringify(data, null, 2));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      return { message: 'Файл обязателен', statusCode: 400 };
    }

    try {
      const data = JSON.parse(file.buffer.toString());
      return this.settingsService.importData(data, req.user.userId);
    } catch (error) {
      return { message: 'Неверный формат файла. Ожидается JSON.', statusCode: 400 };
    }
  }

  @Get('about')
  async getAbout() {
    return this.settingsService.getAbout();
  }
}