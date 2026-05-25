import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ length: 50 })
    type!: string;

    @Column({ length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    message!: string | null;

    @Column({ name: 'document_id', nullable: true })
    documentId!: number | null;

    @Column({ name: 'is_read', default: false })
    isRead!: boolean;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @ManyToOne(() => Document)
    @JoinColumn({ name: 'document_id' })
    document!: Document | null;
}