import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favourite } from '../entities/favourite.entity';

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favourite)
    private favouriteRepository: Repository<Favourite>,
  ) {}

  async getFavourites(userId: string) {
    const favourites = await this.favouriteRepository.find({
      where: { clientId: userId },
      relations: ['provider', 'provider.user'],
    });

    return favourites.map((fav) => {
      const p = fav.provider;
      const u = p.user;

      // Ensure proper DB return type
      // Mapped exactly to ProviderSummaryDto shape derived from C-04
      return {
        id: p.id,
        businessName: p.businessName,
        firstName: u?.firstName,
        lastName: u?.lastName,
        avatarUrl: u?.avatarUrl,
        avgRating: Number(p.avgRating) || 0,
        totalReviews: p.totalReviews || 0,
        startingPrice: 0, // Fallback if no services loaded right now
        city: p.city,
        postalCode: p.postalCode,
        isFavourite: true, // It's in the favourites list
      };
    });
  }

  async addFavourite(userId: string, providerId: string): Promise<void> {
    // Check if already favourited
    const existing = await this.favouriteRepository.findOne({
      where: { clientId: userId, providerId }
    });
    
    if (existing) {
      throw new ConflictException('Provider already favourited');
    }

    // Add new favourite
    const favourite = this.favouriteRepository.create({
      clientId: userId,
      providerId
    });
    
    await this.favouriteRepository.save(favourite);
  }

  async removeFavourite(userId: string, providerId: string): Promise<void> {
    const result = await this.favouriteRepository.delete({ clientId: userId, providerId });
    if (result.affected === 0) {
      throw new NotFoundException('Favourite not found');
    }
  }
}
