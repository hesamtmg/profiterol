import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Site } from '../sites/site.entity';

/**
 * - new: just sent, nobody has called yet
 * - called: someone called the visitor back
 * - production: confirmed and being printed
 * - done / cancelled: finished either way
 */
export const designStatuses = ['new', 'called', 'production', 'done', 'cancelled'] as const;
export type DesignStatus = (typeof designStatuses)[number];

/** What the visitor put on the product, kept so the admin can read texts and fonts without opening the file. */
export interface DesignDetails {
  /** Size of the printed area in centimetres, and of the print file in pixels. */
  printCm: [number, number];
  printPx: [number, number];
  /** One line per layer, e.g. "Photo: holiday.jpg (repeat: grid)" or "Text: “Hello” (Vazirmatn, #ff0000)". */
  layers: string[];
  background: string;
}

/**
 * A design sent from a sublimation designer block. The preview (the product with the design on it) and the
 * print file are kept in the database, not under /uploads, so only the site's admins can open them.
 */
@Entity('design_requests')
@Index('IDX_design_requests_site_status', ['siteId', 'status', 'createdAt'])
@Index('IDX_design_requests_visitor', ['siteId', 'visitorKey'])
@Index('IDX_design_requests_phone', ['siteId', 'phoneKey'])
export class DesignRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  @Column({ type: 'uuid' })
  siteId: string;

  @Column({ type: 'uuid', nullable: true })
  pageId: string | null;

  @Column({ default: '' })
  pageTitle: string;

  @Column({ length: 40 })
  blockId: string;

  @Column({ length: 8 })
  locale: string;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: DesignStatus;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  phone: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  email: string;

  /** The phone number's last ten digits (Persian digits turned Latin), so one person is counted once however they type it. */
  @Column({ type: 'varchar', length: 20, default: '' })
  phoneKey: string;

  /**
   * SHA-256 of the random key the visitor's browser keeps for this site. Lets the visitor list their own designs
   * ("My designs") without an account; the key itself is never stored.
   */
  @Column({ type: 'varchar', length: 64, default: '' })
  visitorKey: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  /** The product's name as the block showed it, and its shape (see printSurfaces). */
  @Column({ type: 'varchar', length: 120 })
  product: string;

  @Column({ type: 'varchar', length: 32 })
  surface: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  color: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  material: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  size: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'jsonb' })
  details: DesignDetails;

  /** Notes the admins keep for themselves (e.g. what was agreed on the phone). */
  @Column({ type: 'text', default: '' })
  adminNote: string;

  @Column({ type: 'bytea', select: false })
  preview?: Buffer;

  @Column({ type: 'varchar', length: 32 })
  previewType: string;

  @Column({ type: 'bytea', select: false })
  printFile?: Buffer;

  @Column({ type: 'varchar', length: 32 })
  printType: string;

  @Column({ type: 'integer' })
  printBytes: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
