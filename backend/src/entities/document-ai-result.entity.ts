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

    @Column({ type: 'vector', nullable: true })
    embedding!: number[];

    @Column({ name: 'extracted_date', type: 'date', nullable: true })
    extractedDate!: Date | null;

    @Column({ name: 'extracted_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    extractedAmount!: number | null;

    @Column({ name: 'extracted_counterparty', type: 'varchar', length: 200, nullable: true })
    extractedCounterparty!: string | null;

    @Column({ name: 'key_phrases', type: 'text', array: true, nullable: true })
    keyPhrases!: string[] | null;

    @Column({ name: 'source_type_suggested', type: 'varchar', length: 50, nullable: true })
    sourceTypeSuggested!: string | null;

    @Column({ name: 'source_organization_suggested', type: 'varchar', length: 200, nullable: true })
    sourceOrganizationSuggested!: string | null;

    @Column({ name: 'source_sender_suggested', type: 'varchar', length: 200, nullable: true })
    sourceSenderSuggested!: string | null;

    @Column({ name: 'source_contact_suggested', type: 'varchar', length: 500, nullable: true })
    sourceContactSuggested!: string | null;

    @ManyToOne(() => Document, (document) => document.aiResults)
    @JoinColumn({ name: 'document_id' })
    document!: Document;
}