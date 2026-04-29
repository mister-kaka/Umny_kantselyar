import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryDto } from '../document-categories/dto/document-category.dto';

@Injectable()
export class DocumentCategoriesService {
    constructor(
    @InjectRepository(DocumentCategory)
    private documentCategoryRepository: Repository<DocumentCategory>,
    ) {}
  
    async findAll(): Promise<DocumentCategoryDto[]> {
        const categories = await this.documentCategoryRepository.find();
        return categories.map(category => ({
            id: category.id,
            name: category.name,
            code: category.code,
            description: category.description,
        }));
    }
}
