import { ReviewsController } from '../src/reviews/reviews.controller';
import { ReviewsService } from '../src/reviews/reviews.service';
import { UserRole } from '../src/entities/user.entity';

describe('ReviewsService - getClientReviews & ReviewsController - getMyReviews', () => {
  let reviewsService: ReviewsService;
  let reviewsController: ReviewsController;
  let mockReviewRepo: any;
  let mockBookingRepo: any;
  let mockProviderRepo: any;
  let mockUserRepo: any;
  let mockNotificationsService: any;
  let mockAccessService: any;

  beforeEach(() => {
    mockReviewRepo = {
      find: jest.fn(),
    };
    mockBookingRepo = {};
    mockProviderRepo = {};
    mockUserRepo = {};
    mockNotificationsService = {};
    mockAccessService = {
      ensureAuthenticatedActor: jest.fn((user: any) => ({
        id: user.id || user.sub,
        role: user.role || UserRole.CLIENT,
      })),
    };

    reviewsService = new ReviewsService(
      mockReviewRepo,
      mockBookingRepo,
      mockProviderRepo,
      mockUserRepo,
      mockNotificationsService,
      mockAccessService,
    );

    reviewsController = new ReviewsController(reviewsService);
  });

  it('returns client reviews correctly scoped to authenticated clientId with proper shape', async () => {
    const clientId = 'client-uuid-1';
    const mockDbReviews = [
      {
        id: 'review-1',
        rating: 5,
        comment: 'Fantastic haircut!',
        createdAt: new Date('2026-09-30T12:00:00.000Z'),
        providerResponse: 'Thank you!',
        respondedAt: new Date('2026-09-30T14:00:00.000Z'),
        bookingId: 'booking-1',
        provider: {
          businessName: 'Julz Hair Professionals',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        booking: {
          services: [{ name: 'Haircut' }, { name: 'Wash' }],
        },
      },
    ];

    mockReviewRepo.find.mockResolvedValue(mockDbReviews);

    const result = await reviewsService.getClientReviews({ id: clientId, role: UserRole.CLIENT });

    expect(mockAccessService.ensureAuthenticatedActor).toHaveBeenCalledWith({
      id: clientId,
      role: UserRole.CLIENT,
    });
    expect(mockReviewRepo.find).toHaveBeenCalledWith({
      where: { clientId },
      relations: ['provider', 'provider.user', 'booking', 'booking.services'],
      order: { createdAt: 'DESC' },
    });

    expect(result).toEqual({
      data: [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Fantastic haircut!',
          createdAt: '2026-09-30T12:00:00.000Z',
          serviceName: 'Haircut, Wash',
          provider: {
            businessName: 'Julz Hair Professionals',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
          response: 'Thank you!',
          providerResponse: 'Thank you!',
          respondedAt: '2026-09-30T14:00:00.000Z',
          bookingId: 'booking-1',
        },
      ],
    });
  });

  it('returns an empty array when client has no reviews', async () => {
    const clientId = 'client-uuid-empty';
    mockReviewRepo.find.mockResolvedValue([]);

    const result = await reviewsService.getClientReviews({ id: clientId, role: UserRole.CLIENT });

    expect(mockReviewRepo.find).toHaveBeenCalledWith({
      where: { clientId },
      relations: ['provider', 'provider.user', 'booking', 'booking.services'],
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual({ data: [] });
  });

  it('delegates to getClientReviews in controller getMyReviews', async () => {
    const spy = jest.spyOn(reviewsService, 'getClientReviews').mockResolvedValue({ data: [] });
    const req = { user: { id: 'client-1', role: UserRole.CLIENT } } as any;

    const res = await reviewsController.getMyReviews(req);

    expect(spy).toHaveBeenCalledWith(req.user);
    expect(res).toEqual({ data: [] });
  });
});
