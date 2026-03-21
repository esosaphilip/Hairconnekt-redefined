import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToOne,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';
import { Provider } from './provider.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  bookingId: string;  // UNIQUE — one review per booking

  @OneToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

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

  @Column({ type: 'int' }) // 1–5
  rating: number;

  @Column({ type: 'varchar', length: 500 })
  comment: string;

  @Column({ type: 'text', nullable: true })
  providerResponse: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
