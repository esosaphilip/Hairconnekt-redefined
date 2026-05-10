import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mediaType: 'image' | 'document' | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mediaFilename: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mediaKey: string | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
