import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('login_history')
export class LoginHistory {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress!: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent!: string | null;

    @Column({ name: 'login_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    loginTime!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}