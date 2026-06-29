import { Controller, Get, Post, Delete, Patch, Param, Query, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DepartmentsService } from './departments.service';
import { DepartmentDto } from './dto/department.dto';
import { DepartmentStatsDto } from './dto/department-stats.dto';
import { DepartmentDetailDto } from './dto/department-detail.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
        role: string;
    };
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getStats(@Query('showArchived') showArchived?: string): Promise<DepartmentStatsDto[]> {
    return this.departmentsService.getStats(showArchived === 'true');
  }

  @Get(':id/detail')
  @UseGuards(AuthGuard('jwt'))
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<DepartmentDetailDto> {
    return this.departmentsService.getDetail(id, page ?? 1, limit ?? 10, dateFrom, dateTo);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('showArchived') showArchived?: string): Promise<DepartmentDto[]> {
    return this.departmentsService.findAll(showArchived === 'true');
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentsService.create(dto.name, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<DepartmentDto> {
    return this.departmentsService.deactivate(id, req.user.userId);
  }

  @Patch(':id/restore')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<DepartmentDto> {
    return this.departmentsService.restore(id, req.user.userId);
  }
}