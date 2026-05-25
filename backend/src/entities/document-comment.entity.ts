import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { User } from './user.entity';

@Entity('document_comments')
export class DocumentComment {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'document_id' })
    documentId!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ type: 'text' })
    text!: string;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => Document)
    @JoinColumn({ name: 'document_id' })
    document!: Document;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}