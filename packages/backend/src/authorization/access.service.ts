import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Review } from '../entities/review.entity';
import { Favourite } from '../entities/favourite.entity';
import { Conversation } from '../entities/conversation.entity';
import { Provider } from '../entities/provider.entity';

export type BookingAction =
  | 'booking:read'
  | 'booking:create'
  | 'booking:cancel'
  | 'booking:accept'
  | 'booking:decline'
  | 'booking:start'
  | 'booking:complete'
  | 'booking:update';

export type ReviewAction = 'review:create' | 'review:respond';

export type FavouriteAction =
  | 'favourite:read'
  | 'favourite:add'
  | 'favourite:remove';

export type ConversationAction =
  | 'conversation:read'
  | 'conversation:message';

export interface Actor {
  id: string;
  role: UserRole;
}

interface RawUser {
  sub?: string;
  id?: string;
  role?: UserRole;
}

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Favourite)
    private readonly favouriteRepo: Repository<Favourite>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  ensureAuthenticatedActor(user: RawUser): Actor {
    const id = user?.sub || user?.id;
    const role = user?.role;

    if (!id || typeof id !== 'string') {
      throw new UnauthorizedException('Nicht authentifiziert.');
    }

    if (!role || !Object.values(UserRole).includes(role)) {
      throw new UnauthorizedException('Nicht authentifiziert.');
    }

    return { id, role };
  }

  private static forbidden(): never {
    throw new ForbiddenException('Nicht autorisiert.');
  }

  private static isAdmin(actor: Actor): boolean {
    return actor.role === UserRole.ADMIN;
  }

  async authorizeBooking(
    actor: Actor,
    action: BookingAction,
    bookingId?: string,
    createBookingContext?: { clientId?: string; providerId?: string },
  ): Promise<void | Booking> {
    if (AccessService.isAdmin(actor)) {
      if (bookingId) {
        const booking = await this.bookingRepo.findOne({
          where: { id: bookingId },
        });
        if (!booking) {
          throw new NotFoundException('Booking not found');
        }
        return booking;
      }
      return;
    }

    switch (action) {
      case 'booking:create': {
        if (actor.role !== UserRole.CLIENT) {
          AccessService.forbidden();
        }
        const ctxClientId = createBookingContext?.clientId;
        if (!ctxClientId || actor.id !== ctxClientId) {
          AccessService.forbidden();
        }
        return;
      }

      case 'booking:read':
      case 'booking:cancel':
      case 'booking:accept':
      case 'booking:decline':
      case 'booking:start':
      case 'booking:complete':
      case 'booking:update': {
        if (!bookingId) {
          throw new NotFoundException('Booking not found');
        }

        const booking = await this.bookingRepo.findOne({
          where: { id: bookingId },
        });
        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        if (action === 'booking:read') {
          if (actor.id === booking.clientId) {
            return booking;
          }
          const provider = await this.providerRepo.findOne({
            where: { userId: actor.id },
          });
          if (provider && provider.id === booking.providerId) {
            return booking;
          }
          AccessService.forbidden();
        }

        if (action === 'booking:cancel') {
          if (actor.id === booking.clientId) {
            return booking;
          }
          const provider = await this.providerRepo.findOne({
            where: { userId: actor.id },
          });
          if (provider && provider.id === booking.providerId) {
            return booking;
          }
          AccessService.forbidden();
        }

        if (
          action === 'booking:accept' ||
          action === 'booking:decline' ||
          action === 'booking:start' ||
          action === 'booking:complete' ||
          action === 'booking:update'
        ) {
          const provider = await this.providerRepo.findOne({
            where: { userId: actor.id },
          });
          if (!provider || provider.id !== booking.providerId) {
            AccessService.forbidden();
          }
          return booking;
        }

        return booking;
      }
    }
  }

  async authorizeReview(
    actor: Actor,
    action: ReviewAction,
    reviewId?: string,
    createReviewContext?: { bookingId?: string },
  ): Promise<void> {
    if (AccessService.isAdmin(actor)) {
      return;
    }

    switch (action) {
      case 'review:create': {
        if (actor.role !== UserRole.CLIENT) {
          AccessService.forbidden();
        }
        const ctxBookingId = createReviewContext?.bookingId;
        if (!ctxBookingId) {
          AccessService.forbidden();
        }
        const booking = await this.bookingRepo.findOne({
          where: { id: ctxBookingId },
        });
        if (!booking) {
          AccessService.forbidden();
        }
        if (booking.clientId !== actor.id) {
          AccessService.forbidden();
        }
        if (booking.status !== BookingStatus.COMPLETED) {
          AccessService.forbidden();
        }
        return;
      }

      case 'review:respond': {
        if (actor.role !== UserRole.PROVIDER) {
          AccessService.forbidden();
        }
        if (!reviewId) {
          AccessService.forbidden();
        }
        const review = await this.reviewRepo.findOne({
          where: { id: reviewId },
        });
        if (!review) {
          AccessService.forbidden();
        }
        const provider = await this.providerRepo.findOne({
          where: { userId: actor.id },
        });
        if (!provider || provider.id !== review.providerId) {
          AccessService.forbidden();
        }
        return;
      }
    }
  }

  async authorizeFavourite(
    actor: Actor,
    action: FavouriteAction,
    favouriteIdOrContext: { providerId?: string; clientId?: string },
  ): Promise<void> {
    if (AccessService.isAdmin(actor)) {
      return;
    }

    if (actor.role !== UserRole.CLIENT) {
      AccessService.forbidden();
    }

    const ctxClientId = favouriteIdOrContext?.clientId;
    if (!ctxClientId || actor.id !== ctxClientId) {
      AccessService.forbidden();
    }

    return;
  }

  async authorizeConversation(
    actor: Actor,
    action: ConversationAction,
    conversationId: string,
  ): Promise<void | Conversation> {
    if (!conversationId) {
      throw new NotFoundException('Konversation nicht gefunden.');
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Konversation nicht gefunden.');
    }

    if (AccessService.isAdmin(actor)) {
      return conversation;
    }

    if (
      action === 'conversation:read' ||
      action === 'conversation:message'
    ) {
      if (
        actor.id === conversation.participant1Id ||
        actor.id === conversation.participant2Id
      ) {
        return conversation;
      }
      AccessService.forbidden();
    }
  }
}
