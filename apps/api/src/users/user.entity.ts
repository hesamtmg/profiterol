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

  @CreateDateColumn()
  createdAt: Date;
}
