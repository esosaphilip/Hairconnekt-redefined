import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PopularStylesModule } from './popular-styles/popular-styles.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      autoLoadEntities: true,
      synchronize: false, // Disable auto-sync in production
      logging:
        (process.env.NODE_ENV ?? 'development') === 'development'
          ? 'all'
          : ['error', 'warn'],
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
    PopularStylesModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
