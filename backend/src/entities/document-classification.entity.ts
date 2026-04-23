import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { DocumentType } from './document-type.entity';
import { DocumentCategory } from './document-category.entity';

@Entity('document_classifications')
export class DocumentClassification {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'document_id' })
    documentId!: number;

    @Column({ name: 'type_id', nullable: true })
    typeId!: number | null;

    @Column({ name: 'category_id', nullable: true })
    categoryId!: number | null;

    @Column({ name: 'type_confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
    typeConfidence!: number | null;

    @Column({ name: 'category_confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
    categoryConfidence!: number | null;

    @Column({ name: 'is_verified', default: false })
    isVerified!: boolean;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => Document, (document) => document.classifications)
    @JoinColumn({ name: 'document_id' })
    document!: Document;

    @ManyToOne(() => DocumentType)
    @JoinColumn({ name: 'type_id' })
    documentType!: DocumentType;
 
    @ManyToOne(() => DocumentCategory)
    @JoinColumn({ name: 'category_id' })
    documentCategory!: DocumentCategory;

}