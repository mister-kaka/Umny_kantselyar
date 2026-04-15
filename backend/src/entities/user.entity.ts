import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { Department } from './department.entity';
import { Document } from './document.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'full_name', length: 200})
  fullName!: string;

  @Column({ unique: true, length: 100 })
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ name: 'role_id' })
  roleId!: number;

  @Column({ name: 'department_id',  type: 'integer', nullable: true })
  departmentId!: number | null;  

  @Column({ default: 'active', length: 20 })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @OneToMany(() => Document, (doc) => doc.creator)
  createdDocuments!: Document[];
}