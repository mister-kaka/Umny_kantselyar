import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number; // ! - тут для того, чтобы TypeScript не ругался, потому что значение будет, но придёт из бд

  @Column({ length: 100 })
  name!: string;  

  @Column({ length: 50, unique: true })
  code!: string;  

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}