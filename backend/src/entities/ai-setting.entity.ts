import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_settings')
export class AiSetting {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'provider_code', length: 50 })
    providerCode!: string;

    @Column({ name: 'model_name', length: 100 })
    modelName!: string;

    @Column({ name: 'api_key', length: 500 })
    apiKey!: string;

    @Column({ name: 'base_url', length: 500, nullable: true })
    baseUrl!: string | null;

    @Column({ name: 'is_active', default: false })
    isActive!: boolean;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}