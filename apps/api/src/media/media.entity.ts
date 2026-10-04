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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
