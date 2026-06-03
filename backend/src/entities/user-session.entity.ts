import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ length: 500 })
    token!: string;

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress!: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent!: string | null;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}