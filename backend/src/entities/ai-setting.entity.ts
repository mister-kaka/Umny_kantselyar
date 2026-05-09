import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_settings')
export class AiSetting {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'provider_code', type: 'varchar', length: 50 })
    providerCode!: string;

    @Column({ name: 'model_name', type: 'varchar', length: 100 })
    modelName!: string;

    @Column({ name: 'api_key', type: 'varchar', length: 500 })
    apiKey!: string;

    @Column({ name: 'base_url', type: 'varchar', length: 500, nullable: true })
    baseUrl!: string | null;

    @Column({ name: 'is_active', default: false })
    isActive!: boolean;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}