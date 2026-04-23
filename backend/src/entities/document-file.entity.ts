import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_files')
export class DocumentFile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'file_name', length: 255 })
  fileName!: string;

  @Column({ name: 'file_type', length: 50 })
  fileType!: string;

  @Column({ name: 'file_path', length: 500 })
  filePath!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt!: Date;

  @Column({ name: 'document_id' })
  documentId!: number;
    
  @ManyToOne(() => Document, (document) => document.files)
  @JoinColumn({ name: 'document_id' })
  document!: Document;
}