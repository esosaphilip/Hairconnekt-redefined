import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Provider } from './provider.entity';

@Entity('favourites')
@Unique(['clientId', 'providerId']) // UNIQUE constraint — handle 409 in service
export class Favourite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn()
  createdAt: Date;
}
