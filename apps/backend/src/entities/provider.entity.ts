import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ProviderType { FREELANCER = 'freelancer', SALON = 'salon', MOBILE = 'mobile', BARBER = 'barber' }
export enum CancellationPolicy { H24 = '24h', H48 = '48h', H72 = '72h' }
export enum ProviderStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected', SUSPENDED = 'suspended' }

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ProviderType, enumName: 'provider_type_enum' })
  providerType: ProviderType;

  @Column({ type: 'varchar' })
  businessName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar' })
  street: string;

  @Column({ type: 'varchar' })
  houseNumber: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar' })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ type: 'int', default: 25 })
  serviceRadius: number;

  @Column({ type: 'varchar', array: true, nullable: true })
  languages: string[];

  @Column({ type: 'enum', enum: CancellationPolicy, default: CancellationPolicy.H24, enumName: 'cancellation_policy_enum' })
  cancellationPolicy: CancellationPolicy;

  @Column({ type: 'enum', enum: ProviderStatus, default: ProviderStatus.PENDING, enumName: 'provider_status_enum' })
  status: ProviderStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'int', default: 0 })
  bufferMinutes: number;

  @Column({ type: 'int', nullable: true })
  experienceYears: number;

  @Column({ type: 'varchar', nullable: true })
  idDocumentUrl: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column({ type: 'boolean', default: false })
  portfolioMarketingConsent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  portfolioMarketingConsentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
