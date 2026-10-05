import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mime: string;

  @Column()
  size: number;

  @Column()
  url: string;

  /** Pixel size of photos (null for videos and fonts). */
  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  /** A tiny blurred version of opaque photos (data: URL), shown while the photo loads. */
  @Column({ type: 'text', nullable: true })
  placeholder: string | null;

  /** Description for people who cannot see the picture, per language; used when a block gives none. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  alt: Record<string, string>;

  /** A folder name to keep the library tidy ('' = no folder). */
  @Column({ default: '' })
  folder: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
