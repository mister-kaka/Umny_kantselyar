import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentTypeDto } from './dto/document-type.dto';
import { DocumentCategoryDto } from './dto/document-category.dto';
@Injectable()
export class DocumentsService {
    constructor(
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,

    @InjectRepository(DocumentCategory)
    private documentCategoryRepository: Repository<DocumentCategory>,
    ) {}
    
    async findAllDocumentTypes(): Promise<DocumentTypeDto[]> {
        const types = await this.documentTypeRepository.find();
        return types.map(type => ({
            id: type.id,
            name: type.name,
            code: type.code,
            description: type.description,
        }));
    }

  
    async findAllDocumentCategories(): Promise<DocumentCategoryDto[]> {
        const categories = await this.documentCategoryRepository.find();
        return categories.map(category => ({
            id: category.id,
            name: category.name,
            code: category.code,
            description: category.description,
        }));
    }
}
