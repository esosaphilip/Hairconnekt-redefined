import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('portfolio_images')
export class PortfolioImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  caption: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  styleTags: string[];

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
