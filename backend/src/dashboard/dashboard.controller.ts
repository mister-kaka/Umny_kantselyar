import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('data')
    @UseGuards(AuthGuard('jwt'))  
    async getDashboardData(): Promise<DashboardResponseDto> {
        return this.dashboardService.getDashboardData();
    }
}
