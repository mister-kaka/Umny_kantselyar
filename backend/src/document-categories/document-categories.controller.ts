import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategoryDto } from './dto/document-category.dto';

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
}