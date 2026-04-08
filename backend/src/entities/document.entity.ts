import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name:'registration_number', length: 50, unique: true})
    registrationNumber!: string;

    @Column({ name: 'title', length: 255 })
    title!: string;

    @Column({ name: 'received_date', type: 'date' })
    receivedDate!: Date;

    @Column({ name: 'document_type_id' })
    documentTypeId!: number;

    @Column({ name: 'category_id', nullable: true })
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
}