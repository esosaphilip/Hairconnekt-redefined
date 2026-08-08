import type {
  UserRole as SharedUserRole,
  BookingStatus as SharedBookingStatus,
  ProviderStatus as SharedProviderStatus,
  ProviderType as SharedProviderType,
  CancellationPolicy as SharedCancellationPolicy,
  ServicePriceType as SharedServicePriceType,
  PaymentStatus as SharedPaymentStatus,
  CancelledBy as SharedCancelledBy,
  Gender as SharedGender,
} from '@hairconnekt/types';

import { UserRole, Gender } from './entities/user.entity';
import { ProviderType, CancellationPolicy, ProviderStatus } from './entities/provider.entity';
import { BookingStatus, PaymentStatus, CancelledBy } from './entities/booking.entity';
import { ServicePriceType } from './entities/service.entity';

type AssertEqual<T, U extends T> = void;

type _UserRole_Contract = AssertEqual<SharedUserRole, `${UserRole}`>;
type _Gender_Contract = AssertEqual<SharedGender, `${Gender}`>;
type _ProviderType_Contract = AssertEqual<SharedProviderType, `${ProviderType}`>;
type _CancellationPolicy_Contract = AssertEqual<SharedCancellationPolicy, `${CancellationPolicy}`>;
type _ProviderStatus_Contract = AssertEqual<SharedProviderStatus, `${ProviderStatus}`>;
type _BookingStatus_Contract = AssertEqual<SharedBookingStatus, `${BookingStatus}`>;
type _PaymentStatus_Contract = AssertEqual<SharedPaymentStatus, `${PaymentStatus}`>;
type _CancelledBy_Contract = AssertEqual<SharedCancelledBy, `${CancelledBy}`>;
type _ServicePriceType_Contract = AssertEqual<SharedServicePriceType, `${ServicePriceType}`>;
