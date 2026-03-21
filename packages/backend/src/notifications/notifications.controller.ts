import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(@CurrentUser() user: User) {
    return this.notificationRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
