import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { PortfolioService } from './portfolio.service';
import { ensureAllowedImageUpload } from '../common/files/file-validation';
import { UploadPortfolioImageDto } from './upload-portfolio-image.dto';

@Controller('providers')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * PRIVATE: Get authenticated provider's portfolio
   * GET /providers/me/portfolio
   */
  @Get('me/portfolio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async getOwnPortfolio(@CurrentUser() user: User) {
    return this.portfolioService.getOwnPortfolio(user.id);
  }

  /**
   * PUBLIC: Get provider portfolio (no auth required)
   * GET /providers/:providerId/portfolio
   */
  @Get(':providerId/portfolio')
  async getPublicPortfolio(@Param('providerId') providerId: string) {
    return this.portfolioService.getPortfolio(providerId);
  }

  /**
   * PRIVATE: Upload portfolio image
   * POST /providers/me/portfolio
   */
  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @UseInterceptors(
    FileInterceptor('portfolio', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadPortfolioImage(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadPortfolioImageDto,
  ) {
    if (!file) throw new BadRequestException('Kein Bild hochgeladen.');
    ensureAllowedImageUpload(file);

    return this.portfolioService.uploadImage(
      user.id,
      file,
      body.caption?.trim(),
      body.styleTags ?? [],
    );
  }

  /**
   * PRIVATE: Delete portfolio image
   * DELETE /providers/me/portfolio/:imageId
   */
  @Delete('me/portfolio/:imageId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async deletePortfolioImage(
    @CurrentUser() user: User,
    @Param('imageId') imageId: string,
  ) {
    await this.portfolioService.deleteImage(user.id, imageId);
  }
}
