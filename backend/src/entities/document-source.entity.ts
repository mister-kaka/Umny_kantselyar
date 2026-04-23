import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_sources')
export class DocumentSource {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'document_id' })
    documentId!: number;

    @Column({ name: 'source_type', length: 50 })
    sourceType!: string; 

    @Column({ name: 'organization_name', length: 200, nullable: true, type: 'varchar' })
    organizationName!: string | null;

    @Column({ name: 'sender_name', length: 200, nullable: true, type: 'varchar' })
    senderName!: string | null;

    @Column({ name: 'contact_info', length: 255, nullable: true, type: 'varchar' })
    contactInfo!: string | null;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => Document, (document) => document.sources)
    @JoinColumn({ name: 'document_id' })
    document!: Document;

 
}