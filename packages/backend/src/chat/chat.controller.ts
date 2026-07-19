import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../auth/guards/user-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ensureAllowedChatMediaUpload } from '../common/files/file-validation';

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

  @Post('conversations/:id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markConversationRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.markConversationRead(user.id, id);
  }

  @Post('conversations')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 * 60 } })
  @HttpCode(HttpStatus.CREATED)
  async createConversation(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.chatService.createOrGetConversation(user.id, dto.recipientId);
  }

  @Post('conversations/:id/messages')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, id, dto.content);
  }

  @Post('conversations/:id/messages/media')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @UseInterceptors(
    FileInterceptor('chatMedia', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async sendMedia(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|png|webp)|application\/pdf)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Keine Datei hochgeladen.');
    ensureAllowedChatMediaUpload(file);
    return this.chatService.sendMediaMessage(user.id, id, file);
  }
}
