import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type Role = 'admin' | 'editor';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: '' })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'editor' })
  role: Role;

  /** Deactivated users cannot sign in, and their open sessions stop working at once. */
  @Column({ default: true })
  active: boolean;

  /** Wrong passwords in a row; the account is locked for a while after too many. */
  @Column({ type: 'int', default: 0 })
  failedLogins: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  /** Part of every session token; raising it signs the user out everywhere (password change, deactivation). */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  /** SHA-256 of the current password-reset (or invitation) link's secret. */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  resetTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetExpires: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
