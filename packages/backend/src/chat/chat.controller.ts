import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Conversation } from '../entities/conversation.entity';

@Controller('chat')
export class ChatController {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
  ) {}

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@CurrentUser() user: User) {
    return this.conversationRepo.find({
      where: [
        { participant1Id: user.id },
        { participant2Id: user.id },
      ],
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }
}
