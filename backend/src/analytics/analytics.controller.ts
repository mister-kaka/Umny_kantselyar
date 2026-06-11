import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('data')
    async getAnalyticsData(): Promise<AnalyticsResponseDto> {
        return this.analyticsService.getAnalyticsData();
    }
}