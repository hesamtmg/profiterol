import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Site } from '../sites/site.entity';

/** Owners run every site (Admin → Sites) and are admins on each; admins and editors belong to one site. */
export type Role = 'owner' | 'admin' | 'editor';

@Entity('users')
// An email can have one account per site, plus one owner account (which has no site).
@Index(['siteId', 'email'], { unique: true })
@Index(['email'], { unique: true, where: '"siteId" IS NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The site this account edits; null for owners. */
  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  @Column({ type: 'uuid', nullable: true })
  siteId: string | null;

  @Column()
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
