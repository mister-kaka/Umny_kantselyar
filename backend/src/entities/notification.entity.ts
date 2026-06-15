import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

export type NotificationType = 
    | 'new_document'
    | 'document_ready'
    | 'extract_error'
    | 'pending_verification'
    | 'routed'
    | 'rejected'
    | 'verified'
    | 'low_confidence'
    | 'password_changed'
    | 'profile_updated'
    | 'settings_changed'
    | 'new_login'
    | 'comment_added'
    | 'document_deleted'
    | 'reference_created'
    | 'reference_deleted';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ 
        type: 'varchar', 
        length: 50 
    })
    type!: NotificationType;

    @Column({ length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    message!: string | null;

    @Column({ name: 'document_id', nullable: true })
    documentId!: number | null;

    @Column({ name: 'is_read', default: false })
    isRead!: boolean;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @ManyToOne(() => Document)
    @JoinColumn({ name: 'document_id' })
    document!: Document | null;
}