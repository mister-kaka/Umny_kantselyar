import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('route_templates')
export class RouteTemplate {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 200 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ name: 'department_ids', type: 'int', array: true, default: '{}' })
    departmentIds!: number[];

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;
}