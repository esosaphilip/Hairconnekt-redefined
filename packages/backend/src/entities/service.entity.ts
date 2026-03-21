import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

export enum ServicePriceType { FIXED = 'fixed', FROM = 'from' }

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'int' })
  durationMin: number;

  @Column({ type: 'enum', enum: ServicePriceType, default: ServicePriceType.FIXED })
  priceType: ServicePriceType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
