import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategoryDto } from './dto/document-category.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
        role: string;
    };
}

@Controller('document-categories')
export class DocumentCategoriesController {
    constructor(
        private readonly documentCategoriesService: DocumentCategoriesService,
    ) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(): Promise<DocumentCategoryDto[]> {
        return this.documentCategoriesService.findAll();
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(
        @Req() req: RequestWithUser,
        @Body('name') name: string,
    ): Promise<DocumentCategoryDto> {
        return this.documentCategoriesService.create(name, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('admin')
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: RequestWithUser,
    ): Promise<{ message: string }> {
        await this.documentCategoriesService.delete(id, req.user.userId);
        return { message: 'Категория удалена' };
    }
}