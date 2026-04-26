import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @UseGuards(AuthGuard('jwt'))  
    @Get('data')
    async getDashboardData(): Promise<DashboardResponseDto> {
        return this.dashboardService.getDashboardData();
    }
}
