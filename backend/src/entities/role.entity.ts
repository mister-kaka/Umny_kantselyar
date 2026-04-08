import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number; // ! - тут для того, чтобы TypeScript не ругался, потому что значение будет, но придёт из бд

  @Column({ length: 100 })
  name!: string;  

  @Column({ length: 50, unique: true })
  code!: string;  
}