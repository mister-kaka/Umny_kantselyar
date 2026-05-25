import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_notification_settings')
export class UserNotificationSettings {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ name: 'new_document', default: true })
    newDocument!: boolean;

    @Column({ name: 'ai_complete', default: true })
    aiComplete!: boolean;

    @Column({ name: 'extract_error', default: true })
    extractError!: boolean;

    @Column({ name: 'pending_verification', default: true })
    pendingVerification!: boolean;

    @Column({ name: 'routed_to_department', default: true })
    routedToDepartment!: boolean;

    @Column({ name: 'low_confidence', default: false })
    lowConfidence!: boolean;

    @Column({ name: 'route_error', default: true })
    routeError!: boolean;

    @Column({ name: 'overdue_verification', default: false })
    overdueVerification!: boolean;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}