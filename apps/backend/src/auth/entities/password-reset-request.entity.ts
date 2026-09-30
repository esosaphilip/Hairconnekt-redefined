import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../entities/user.entity';

@Entity('password_reset_requests')
export class PasswordResetRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  otpHash: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  resetTokenHash: string | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  otpVerifiedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
