import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_categories')
export class DocumentCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ name: 'text', nullable: true })
  description!: string | null;
}