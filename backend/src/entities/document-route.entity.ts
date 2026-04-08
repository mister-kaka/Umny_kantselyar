import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_routes')
export class DocumentRoute {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name:'document_id' })
  documentId!: number;

  @Column({ name: 'department_id' })
  departmentId!: number;

  @Column({ name: 'route_status', length: 50 })
  routeStatus!: string;

  @Column({ name:'route_reason', type: 'text', nullable: true })
  routeReason!: string | null;

  @Column({ name: 'routed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  routedAt!: Date;
}

