import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessService } from './access.service';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';
import { Review } from '../entities/review.entity';
import { Favourite } from '../entities/favourite.entity';
import { Conversation } from '../entities/conversation.entity';
import { Provider } from '../entities/provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Booking,
      Review,
      Favourite,
      Conversation,
      Provider,
    ]),
  ],
  providers: [AccessService],
  exports: [AccessService],
})
export class AuthorizationModule {}
