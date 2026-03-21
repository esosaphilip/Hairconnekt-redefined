import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('availability_schedules')
@Unique(['providerId', 'dayOfWeek'])
export class AvailabilitySchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ type: 'int' }) // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayOfWeek: number;

  @Column({ type: 'boolean', default: false })
  isOpen: boolean;

  @Column({ type: 'time', nullable: true })
  openTime: string; // HH:mm

  @Column({ type: 'time', nullable: true })
  closeTime: string; // HH:mm
}
