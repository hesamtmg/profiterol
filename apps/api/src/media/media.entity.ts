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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
