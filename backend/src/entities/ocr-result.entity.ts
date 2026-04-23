import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('ocr_results')
export class OcrResult {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'document_id', unique: true })
    documentId!: number;

    @Column({ name: 'raw_text', type: 'text', nullable: true })
    rawText!: string | null;

    @Column({ name: 'normalized_text', type: 'text', nullable: true })
    normalizedText!: string | null;

    @Column({ length: 10, default: 'ru' })
    language!: string;

    @Column({ name: 'ocr_confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
    ocrConfidence!: number | null;

    @Column({ name: 'processed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    processedAt!: Date;

    @OneToOne(() => Document, (document) => document.ocrResult)
    @JoinColumn({ name: 'document_id' })
    document!: Document;
  
}