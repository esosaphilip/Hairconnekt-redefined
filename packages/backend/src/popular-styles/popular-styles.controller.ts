import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PopularStylesService } from './popular-styles.service';
import {
  CreatePopularStyleDto,
  PopularStyleAdminDto,
  PopularStylePublicDto,
  ReorderPopularStylesDto,
  UpdatePopularStyleDto,
} from './dto/popular-style.dto';

@Controller('popular-styles')
export class PopularStylesController {
  constructor(private readonly popularStylesService: PopularStylesService) {}

  @Get()
  async getPopularStyles(): Promise<PopularStylePublicDto[]> {
    return this.popularStylesService.getPublicStyles();
  }
}

@Controller('admin/popular-styles')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPopularStylesController {
  constructor(private readonly popularStylesService: PopularStylesService) {}

  @Get()
  async getAll(): Promise<PopularStyleAdminDto[]> {
    return this.popularStylesService.getAdminStyles();
  }

  @Post()
  async create(@Body() body: CreatePopularStyleDto): Promise<PopularStyleAdminDto> {
    return this.popularStylesService.createAdminStyle(body);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('styleImage', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    return this.popularStylesService.uploadAdminImage(id, file);
  }

  @Delete(':id/image')
  @HttpCode(204)
  async deleteImage(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.popularStylesService.deleteAdminImage(id);
  }

  @Patch('reorder')
  async reorder(@Body() body: ReorderPopularStylesDto): Promise<{ success: true }> {
    return this.popularStylesService.reorderAdminStyles(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePopularStyleDto,
  ): Promise<PopularStyleAdminDto> {
    return this.popularStylesService.updateAdminStyle(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.popularStylesService.deleteAdminStyle(id);
  }
}
