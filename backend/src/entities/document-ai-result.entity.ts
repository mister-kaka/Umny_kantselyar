import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_ai_results')
export class DocumentAiResult {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'document_id' })
    documentId!: number;

    @Column({ name: 'document_type_suggested', type: 'varchar', length: 200, nullable: true })
    documentTypeSuggested!: string | null;

    @Column({ name: 'category_suggested', type: 'varchar', length: 200, nullable: true })
    categorySuggested!: string | null;

    @Column({ name: 'summary_text', type: 'text', nullable: true })
    summaryText!: string | null;

    @Column({ name: 'department_suggested', type: 'varchar', length: 200, nullable: true })
    departmentSuggested!: string | null;

    @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    confidenceScore!: number | null;

    @Column({ name: 'provider_code', type: 'varchar', length: 50 })
    providerCode!: string;

    @Column({ name: 'model_name', type: 'varchar', length: 100 })
    modelName!: string;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => Document, (document) => document.aiResults)
    @JoinColumn({ name: 'document_id' })
    document!: Document;
}