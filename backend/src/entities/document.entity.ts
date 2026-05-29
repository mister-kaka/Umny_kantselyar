import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { DocumentType } from './document-type.entity';
import { DocumentCategory } from './document-category.entity';
import { User } from './user.entity';
import { Department } from './department.entity';
import { DocumentRoute } from './document-route.entity';
import { DocumentFile } from './document-file.entity';
import { DocumentClassification } from './document-classification.entity';
import { DocumentSource } from './document-source.entity';
import { OcrResult } from './ocr-result.entity';
import { DocumentAiResult } from './document-ai-result.entity';
import { DocumentComment } from './document-comment.entity';

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name:'registration_number', length: 50, unique: true})
    registrationNumber!: string;

    @Column({ name: 'title', length: 255 })
    title!: string;

    @Column({ name: 'received_date', type: 'date', nullable: true })
    receivedDate!: Date | null;

    @Column({ name: 'document_type_id' })
    documentTypeId!: number;

    @Column({ name: 'category_id', type: 'integer', nullable: true })
    categoryId!: number | null;

    @Column({ name: 'sender_name', length: 200 })
    senderName!: string;

    @Column({ name: 'current_status', length: 50, default: 'in_review' })
    currentStatus!: string;
    
    @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true})
    confidenceScore!: number | null;

    @Column({ name: 'created_by' })
    createdBy!: number;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
    verifiedAt!: Date | null;

    @Column({ name: 'routed_at', type: 'timestamp', nullable: true })
    routedAt!: Date | null;

    @Column({ name: 'current_department_id', type: 'integer', nullable: true })
    currentDepartmentId!: number | null;

    @Column({ type: 'vector', nullable: true })
    embedding!: number[];

    @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    uploadedAt!: Date;

    @ManyToOne(() => DocumentType)
    @JoinColumn({ name: 'document_type_id' })
    documentType!: DocumentType;

    @ManyToOne(() => DocumentCategory)
    @JoinColumn({ name: 'category_id' })
    category!: DocumentCategory | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator!: User;

    @ManyToOne(() => Department)
    @JoinColumn({ name: 'current_department_id' })
    currentDepartment!: Department | null;

    @OneToMany(() => DocumentRoute, (route) => route.document)
    documentRoutes!: DocumentRoute[];

    @OneToMany(() => DocumentFile, (file) => file.document)
    files!: DocumentFile[];

    @OneToMany(() => DocumentClassification, (classification) => classification.document)
    classifications!: DocumentClassification[];

    @OneToMany(() => DocumentSource, (source) => source.document)
    sources!: DocumentSource[];

    @OneToOne(() => OcrResult, (ocr) => ocr.document)
    ocrResult!: OcrResult | null;

    @OneToMany(() => DocumentAiResult, (aiResult) => aiResult.document)
    aiResults!: DocumentAiResult[];

    @OneToMany(() => DocumentComment, (comment) => comment.document)
    comments!: DocumentComment[];

}