import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_types')
export class DocumentType {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 100 })
    name!: string;

    @Column({ length: 50, unique: true})
    code!: string;

    @Column({ name: 'description', type: 'text', nullable: true})
    description!: string | null;

    @OneToMany(() => Document, (doc) => doc.documentType)
    documents!: Document[];
}