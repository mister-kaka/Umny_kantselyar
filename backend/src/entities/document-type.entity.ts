import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_types')
export class DocumentType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 50, unique: true})
  code!: string;

  @Column({ name: 'text', nullable: true})
  description!: string | null;
}