import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';
import { Favourite } from '../entities/favourite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address, Favourite])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
