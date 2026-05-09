import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { Provider } from '../entities/provider.entity';
import { Booking } from '../entities/booking.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatPresenceService } from './chat-presence.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User, Provider, Booking]), AuthModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatPresenceService],
})
export class ChatModule {}
