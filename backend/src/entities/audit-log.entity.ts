import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

@Entity('audit_log')
export class AuditLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ length: 100 })
    action!: string;

    @Column({ name: 'document_id', nullable: true })
    documentId!: number | null;

    @Column({ type: 'jsonb', default: '{}' })
    details!: Record<string, any>;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @ManyToOne(() => Document)
    @JoinColumn({ name: 'document_id' })
    document!: Document | null;
}