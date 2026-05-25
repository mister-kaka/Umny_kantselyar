import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { Department } from './department.entity';
import { Document } from './document.entity';
import { DocumentComment } from './document-comment.entity';
import { UserNotificationSettings } from './user-notification-settings.entity';
import { UserInterfaceSettings } from './user-interface-settings.entity';
import { LoginHistory } from './login-history.entity';
import { AuditLog } from './audit-log.entity';
import { Notification } from './notification.entity';

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

  @OneToMany(() => DocumentComment, (comment) => comment.user)
  comments!: DocumentComment[];

  @OneToOne(() => UserNotificationSettings, (settings) => settings.user)
  notificationSettings!: UserNotificationSettings | null;

  @OneToOne(() => UserInterfaceSettings, (settings) => settings.user)
  interfaceSettings!: UserInterfaceSettings | null;

  @OneToMany(() => LoginHistory, (history) => history.user)
  loginHistory!: LoginHistory[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs!: AuditLog[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}