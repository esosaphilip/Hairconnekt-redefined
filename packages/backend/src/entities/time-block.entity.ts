import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('time_blocks')
export class TimeBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', nullable: true })
  reason: string; // Urlaub | Krank | Pause | Sonstiges

  @CreateDateColumn()
  createdAt: Date;
}
