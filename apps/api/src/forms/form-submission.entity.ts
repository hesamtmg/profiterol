import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Site } from '../sites/site.entity';

export interface SubmittedField {
  label: string;
  value: string;
}

/** One message sent through a contact-form block. */
@Entity('form_submissions')
@Index(['siteId', 'read', 'createdAt'])
export class FormSubmission {
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

  @Column({ default: '' })
  formTitle: string;

  @Column({ length: 8 })
  locale: string;

  /** The answers, in the order the form showed them. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  data: SubmittedField[];

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
