import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DocumentRoute } from './document-route.entity';
import { User } from './user.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 50, unique: true})
  code!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => DocumentRoute, (documentRoute) => documentRoute.department)
  documentRoutes!: DocumentRoute[];

  @OneToMany(() => User, (user) => user.department)
  users!: User[];
}