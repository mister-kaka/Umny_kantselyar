import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_interface_settings')
export class UserInterfaceSettings {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id' })
    userId!: number;

    @Column({ name: 'compact_view', default: false })
    compactView!: boolean;

    @Column({ name: 'show_confidence', default: true })
    showConfidence!: boolean;

    @Column({ name: 'default_page_limit', default: 10 })
    defaultPageLimit!: number;

    @Column({ length: 20, default: 'light' })
    theme!: string;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}