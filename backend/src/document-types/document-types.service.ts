import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentTypeDto } from '../document-types/dto/document-type.dto';

@Injectable()
export class DocumentTypesService {
    constructor(
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
    ) {}
    
    async findAll(): Promise<DocumentTypeDto[]> {
        const types = await this.documentTypeRepository.find();
        return types.map(type => ({
            id: type.id,
            name: type.name,
            code: type.code,
            description: type.description,
        }));
    }
}
