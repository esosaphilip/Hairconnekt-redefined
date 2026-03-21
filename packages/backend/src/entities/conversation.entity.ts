import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  participant1Id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'participant1Id' })
  participant1: User;

  @Column({ type: 'uuid' })
  participant2Id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'participant2Id' })
  participant2: User;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'varchar', nullable: true })
  lastMessagePreview: string;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
