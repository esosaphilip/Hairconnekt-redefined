import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Provider } from './provider.entity';
import { Service } from './service.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus { PENDING = 'pending', PAID = 'paid' }
export enum CancelledBy { CLIENT = 'client', PROVIDER = 'provider', SYSTEM = 'system' }

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  bookingNumber: string; // HC-YYYYMMDD-XXXX format

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @ManyToMany(() => Service)
  @JoinTable({ name: 'booking_services' })
  services: Service[];

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'date' })
  scheduledDate: string;

  @Column({ type: 'time' })
  scheduledTime: string;

  @Column({ type: 'boolean', default: false })
  isMobile: boolean;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  clientNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'varchar', default: 'CASH' })
  paymentMethod: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  platformFeePercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFeeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  providerPayout: number;

  // Address snapshot — NOT a FK. Preserved if client deletes address.
  @Column({ type: 'varchar', nullable: true })
  addressStreet: string;

  @Column({ type: 'varchar', nullable: true })
  addressHouseNumber: string;

  @Column({ type: 'varchar', nullable: true })
  addressCity: string;

  @Column({ type: 'varchar', nullable: true })
  addressPostalCode: string;

  @Column({ type: 'enum', enum: CancelledBy, nullable: true })
  cancelledBy: CancelledBy;

  @Column({ type: 'varchar', nullable: true })
  cancellationReason: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
