import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { PushTokenDto } from './dto/push-token.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private notificationsService: NotificationsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser() user: User,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, Number(pageStr ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(limitStr ?? '20') || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        hasNextPage: skip + data.length < total,
      },
    };
  }

  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  async registerPushToken(@CurrentUser() user: User, @Body() body: PushTokenDto) {
    await this.notificationsService.savePushToken(user.id, body.token);
    return { success: true };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notificationsService.markRead(user.id, id);
    return { success: true };
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@CurrentUser() user: User) {
    await this.notificationsService.markAllRead(user.id);
    return { success: true };
  }
}
