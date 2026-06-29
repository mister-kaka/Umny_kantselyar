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

    @Column({ name: 'document_ready', default: true })
    documentReady!: boolean;

    @Column({ name: 'extract_error', default: true })
    extractError!: boolean;

    @Column({ name: 'pending_verification', default: true })
    pendingVerification!: boolean;

    @Column({ name: 'routed_to_department', default: true })
    routedToDepartment!: boolean;

    @Column({ name: 'rejected', default: true })
    rejected!: boolean;

    @Column({ name: 'verified', default: true })
    verified!: boolean;

    @Column({ name: 'low_confidence', default: false })
    lowConfidence!: boolean;

    @Column({ name: 'password_changed', default: true })
    passwordChanged!: boolean;

    @Column({ name: 'profile_updated', default: true })
    profileUpdated!: boolean;

    @Column({ name: 'settings_changed', default: false })
    settingsChanged!: boolean;

    @Column({ name: 'new_login', default: true })
    newLogin!: boolean;

    @Column({ name: 'comment_added', default: true })
    commentAdded!: boolean;

    @Column({ name: 'document_deleted', default: false })
    documentDeleted!: boolean;

    @Column({ name: 'reference_created', default: true })
    referenceCreated!: boolean;

    @Column({ name: 'reference_deleted', default: true })
    referenceDeleted!: boolean;

    @Column({ name: 'admin_message', default: true })
    adminMessage!: boolean;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}