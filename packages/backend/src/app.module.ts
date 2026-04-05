import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { FavouritesModule } from './favourites/favourites.module';
import { ProvidersModule } from './providers/providers.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ServicesModule } from './services/services.module';
import { AvailabilityModule } from './availability/availability.module';
import { StorageModule } from './common/storage/storage.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      synchronize: false, // Disable auto-sync in production
      logging: ['error'],
      retryAttempts: 5,
      retryDelay: 3000,
    }),
    AuthModule,
    BookingsModule,
    ReviewsModule,
    UsersModule,
    FavouritesModule,
    ProvidersModule,
    ChatModule,
    NotificationsModule,
    PortfolioModule,
    ServicesModule,
    AvailabilityModule,
    StorageModule,
    AdminModule,
  ],
})
export class AppModule {}

