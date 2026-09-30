import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('email_verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  otpHash: string;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

