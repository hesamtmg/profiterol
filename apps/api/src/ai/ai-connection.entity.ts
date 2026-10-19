import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Site } from '../sites/site.entity';
import { User } from '../users/user.entity';
import type { AiProviderName } from './providers';

/**
 * One AI model an admin connected for the block builder: their own provider account, key and model, on one site.
 * Each admin keeps their own (as many models as they like) on each site they work on; nobody else sees or uses them.
 */
@Entity('ai_connections')
@Index('IDX_ai_connections_site_user', ['siteId', 'userId'])
export class AiConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** The admin's own name for it, e.g. "Claude Opus (work account)". */
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  provider: AiProviderName;

  @Column({ type: 'varchar', length: 120 })
  model: string;

  /** The API key, encrypted (see crypto.ts). Never sent to the browser. */
  @Column({ type: 'text' })
  apiKeyEnc: string;

  /** The key's last 4 characters, so the admin can tell which key is saved. */
  @Column({ type: 'varchar', length: 8, default: '' })
  keyHint: string;

  /** Only for OpenAI-compatible services (or a proxy in front of the others). */
  @Column({ type: 'varchar', length: 300, default: '' })
  baseUrl: string;

  /** The one the builder picks first. */
  @Column({ default: false })
  isDefault: boolean;

  /** Requests allowed per day (UTC), to keep the bill predictable. */
  @Column({ type: 'int', default: 50 })
  dailyLimit: number;

  /** How long one answer may take (each fix round waits this long again); slow or far-away services need more. */
  @Column({ type: 'int', default: 600 })
  timeoutSeconds: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  usage: { day?: string; count?: number };

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
