import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../src/entities/user.entity';
import { Provider, ProviderStatus, ProviderType, CancellationPolicy } from '../src/entities/provider.entity';
import { Service } from '../src/entities/service.entity';
import { ServiceCategory } from '../src/entities/service-category.entity';
import { AvailabilitySchedule } from '../src/entities/availability-schedule.entity';
import { Booking, BookingStatus } from '../src/entities/booking.entity';
import { JwtService } from '@nestjs/jwt';

export const TEST_PASSWORD = 'TestPassword123!';

export async function hashPassword(plain = TEST_PASSWORD): Promise<string> {
  return bcrypt.hash(plain, 4); // fast rounds for tests
}

export function generateTestEmail(prefix = 'user'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}@example.test`;
}

export function signTestToken(
  user: { id: string; email: string; role: string },
  expiresIn = '1h',
  onboarding = false,
): string {
  const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      onboarding,
    },
    { expiresIn: expiresIn as any },
  );
}

export async function createTestClient(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<{ user: User; password: string; token: string }> {
  const userRepo = dataSource.getRepository(User);
  const password = TEST_PASSWORD;
  const passwordHash = await hashPassword(password);
  const email = overrides.email ?? generateTestEmail('client');

  const user = userRepo.create({
    firstName: 'Test',
    lastName: 'Client',
    email,
    passwordHash,
    role: UserRole.CLIENT,
    isEmailVerified: true,
    isActive: true,
    ...overrides,
  });

  const savedUser = await userRepo.save(user);
  const token = signTestToken(savedUser);

  return { user: savedUser, password, token };
}

export async function createTestAdmin(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<{ user: User; password: string; token: string }> {
  const userRepo = dataSource.getRepository(User);
  const password = TEST_PASSWORD;
  const passwordHash = await hashPassword(password);
  const email = overrides.email ?? generateTestEmail('admin');

  const user = userRepo.create({
    firstName: 'System',
    lastName: 'Admin',
    email,
    passwordHash,
    role: UserRole.ADMIN,
    isEmailVerified: true,
    isActive: true,
    ...overrides,
  });

  const savedUser = await userRepo.save(user);
  const token = signTestToken(savedUser);

  return { user: savedUser, password, token };
}

export async function createTestProvider(
  dataSource: DataSource,
  options: {
    userOverrides?: Partial<User>;
    providerOverrides?: Partial<Provider>;
    serviceCount?: number;
  } = {},
): Promise<{
  user: User;
  provider: Provider;
  services: Service[];
  password: string;
  token: string;
}> {
  const userRepo = dataSource.getRepository(User);
  const providerRepo = dataSource.getRepository(Provider);
  const serviceRepo = dataSource.getRepository(Service);
  const categoryRepo = dataSource.getRepository(ServiceCategory);
  const availRepo = dataSource.getRepository(AvailabilitySchedule);

  const password = TEST_PASSWORD;
  const passwordHash = await hashPassword(password);
  const email = options.userOverrides?.email ?? generateTestEmail('provider');

  const user = await userRepo.save(
    userRepo.create({
      firstName: 'Test',
      lastName: 'Provider',
      email,
      passwordHash,
      role: UserRole.PROVIDER,
      isEmailVerified: true,
      isActive: true,
      ...options.userOverrides,
    }),
  );

  const provider = await providerRepo.save(
    providerRepo.create({
      userId: user.id,
      providerType: ProviderType.SALON,
      businessName: 'Studio HairConnekt',
      bio: 'Professional braiding studio',
      street: 'Alexanderplatz',
      houseNumber: '1',
      city: 'Berlin',
      postalCode: '10178',
      lat: 52.5219,
      lng: 13.4132,
      serviceRadius: 30,
      languages: ['de', 'en'],
      cancellationPolicy: CancellationPolicy.H24,
      status: ProviderStatus.APPROVED,
      isOnline: true,
      experienceYears: 5,
      ...options.providerOverrides,
    }),
  );

  // Seven days availability
  const schedules: AvailabilitySchedule[] = [];
  for (let day = 0; day <= 6; day++) {
    schedules.push(
      availRepo.create({
        providerId: provider.id,
        dayOfWeek: day,
        isOpen: true,
        openTime: '08:00',
        closeTime: '20:00',
      }),
    );
  }
  await availRepo.save(schedules);

  // Add default service
  const categories = await categoryRepo.find();
  const category = categories[0] ?? (await categoryRepo.save(
    categoryRepo.create({
      name: 'Flechten',
      iconName: 'braids',
      isActive: true,
      sortOrder: 1,
    }),
  ));

  const count = options.serviceCount ?? 1;
  const services: Service[] = [];
  for (let i = 0; i < count; i++) {
    const s = serviceRepo.create({
      providerId: provider.id,
      categoryId: category.id,
      name: `Standard Service ${i + 1}`,
      description: 'High quality hair styling service',
      price: 60 + i * 20,
      durationMin: 60,
    });
    services.push(await serviceRepo.save(s));
  }

  const token = signTestToken(user);
  return { user, provider, services, password, token };
}

export async function createTestBooking(
  dataSource: DataSource,
  options: {
    client: User;
    provider: Provider;
    services: Service[];
    status?: BookingStatus;
    scheduledDate?: string;
    scheduledTime?: string;
  },
): Promise<Booking> {
  const bookingRepo = dataSource.getRepository(Booking);
  const dateStr = options.scheduledDate ?? '2026-10-15';
  const timeStr = options.scheduledTime ?? '10:00';
  const compactDate = dateStr.replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingNumber = `HC-${compactDate}-${randomSuffix}`;

  const totalPrice = options.services.reduce((sum, s) => sum + Number(s.price), 0);

  const booking = bookingRepo.create({
    bookingNumber,
    clientId: options.client.id,
    providerId: options.provider.id,
    status: options.status ?? BookingStatus.PENDING,
    scheduledDate: dateStr,
    scheduledTime: timeStr,
    totalPrice,
    services: options.services,
    isMobile: false,
  });

  return bookingRepo.save(booking);
}
