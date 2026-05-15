import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { AiSettingsResponseDto } from './dto/ai-settings-response.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiProviderDto } from './dto/ai-provider.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('ai')
  async getAiSettings(): Promise<AiSettingsResponseDto> {
    return this.settingsService.getAiSettings();
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('ai')
  async updateAiSettings(
    @Body() dto: UpdateAiSettingsDto,
  ): Promise<AiSettingsResponseDto> {
    return this.settingsService.updateAiSettings(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('ai/providers')
  async getAiProviders(): Promise<AiProviderDto[]> {
    return this.settingsService.getAiProviders();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('ai/test-connection')
  async testConnection(@Body() dto: UpdateAiSettingsDto): Promise<{ status: string; message: string }> {
    return this.settingsService.testConnection(dto);
  }
}