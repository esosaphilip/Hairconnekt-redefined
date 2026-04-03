import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { Provider } from '../entities/provider.entity';
import { R2Service } from '../common/storage/r2.service';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioImage)
    private readonly portfolioRepo: Repository<PortfolioImage>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly r2: R2Service,
  ) {}

  /**
   * Get portfolio for any provider (public endpoint)
   */
  async getPortfolio(providerId: string): Promise<PortfolioImage[]> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Anbieter nicht gefunden.');

    return this.portfolioRepo.find({
      where: { providerId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get authenticated provider's portfolio
   */
  async getOwnPortfolio(userId: string): Promise<PortfolioImage[]> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) throw new NotFoundException('Anbieterprofil nicht gefunden.');
    return this.getPortfolio(provider.id);
  }

  /**
   * Upload new portfolio image
   */
  async uploadImage(
    userId: string,
    file: Express.Multer.File,
    caption?: string,
    styleTags: string[] = [],
  ): Promise<PortfolioImage> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) throw new NotFoundException('Anbieterprofil nicht gefunden.');

    if (!file || file.size === 0) {
      throw new BadRequestException('Datei ist leer.');
    }

    // Upload to R2 (will throw if fails)
    const imageUrl = await this.r2.uploadFile(
      file.buffer,
      file.mimetype,
      'portfolio',
    );

    // Get next sort order
    const count = await this.portfolioRepo.count({
      where: { providerId: provider.id },
    });

    // Create DB record
    const image = this.portfolioRepo.create({
      providerId: provider.id,
      imageUrl,
      caption: caption || null,
      styleTags: styleTags.length > 0 ? styleTags : null,
      sortOrder: count,
    });

    return this.portfolioRepo.save(image);
  }

  /**
   * Delete portfolio image
   * Ensures ownership before deletion
   * R2 error will be thrown, preventing DB delete
   */
  async deleteImage(userId: string, imageId: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) throw new NotFoundException('Anbieterprofil nicht gefunden.');

    const image = await this.portfolioRepo.findOne({
      where: { id: imageId, providerId: provider.id },
    });

    if (!image) {
      throw new ForbiddenException(
        'Dieses Bild gehört dir nicht oder existiert nicht.',
      );
    }

    // Delete from R2 first (may throw — prevents DB deletion if it fails)
    if (image.imageUrl) {
      await this.r2.deleteFile(image.imageUrl);
    }

    // Only delete from DB if R2 succeeded
    await this.portfolioRepo.remove(image);
  }

  /**
   * Reorder portfolio images (for future use)
   */
  async reorderImages(
    userId: string,
    updates: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) throw new NotFoundException('Anbieterprofil nicht gefunden.');

    for (const { id, sortOrder } of updates) {
      await this.portfolioRepo.update(
        { id, providerId: provider.id },
        { sortOrder },
      );
    }
  }
}
