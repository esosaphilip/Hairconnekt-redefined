import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@CurrentUser() user: User) {
    return this.chatService.listConversationsForUser(user.id);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getConversation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.getConversationDetail(user.id, id);
  }

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createConversation(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.chatService.createOrGetConversation(user.id, dto.recipientId);
  }

  @Post('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, id, dto.content);
  }
}
