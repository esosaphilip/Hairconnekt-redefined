import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from './user.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: { to: (v: string) => v?.toLowerCase(), from: (v) => v },
  })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    enumName: 'invitation_status_enum',
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'uuid' })
  @Index()
  invitedBy: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
