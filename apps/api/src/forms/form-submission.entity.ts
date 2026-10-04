import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface SubmittedField {
  label: string;
  value: string;
}

/** One message sent through a contact-form block. */
@Entity('form_submissions')
@Index(['read', 'createdAt'])
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
