import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string; // Flechten, Pflege, Styling, Goddess, Locs, Twists

  @Column({ type: 'varchar', nullable: true })
  iconName: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
