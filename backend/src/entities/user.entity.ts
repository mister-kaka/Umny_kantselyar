import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ name: 'department_id', nullable: true })
  departmentId!: number | null;  

  @Column({ default: 'active', length: 20 })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}