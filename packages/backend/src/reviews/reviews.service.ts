import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Provider } from '../entities/provider.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
  ) {}

  async createReview(user: any, dto: CreateReviewDto) {
    const userId = user.sub || user.id;

    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['provider'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { bookingId: dto.bookingId },
    });

    if (existingReview) {
      throw new ConflictException('Du hast diesen Termin bereits bewertet.');
    }

    const review = this.reviewRepository.create({
      clientId: userId,
      providerId: booking.providerId,
      bookingId: booking.id,
      rating: dto.rating,
      comment: dto.comment,
    });

    await this.reviewRepository.save(review);
    
    // Update Provider aggregates
    const providerId = booking.providerId;
    const providerReviews = await this.reviewRepository.find({ where: { providerId } });
    
    const totalReviews = providerReviews.length;
    const ratingSum = providerReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

    await this.providerRepository.update(providerId, {
      totalReviews,
      avgRating: Number(averageRating.toFixed(1)),
    });

    return review;
  }
}
