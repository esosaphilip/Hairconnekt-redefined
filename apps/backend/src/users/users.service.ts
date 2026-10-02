import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';
import { Provider, ProviderStatus } from '../entities/provider.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'avatarUrl', 'role', 'isEmailVerified', 'isPhoneVerified', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<User> {
    const patch: Partial<User> = {};
    if (data.firstName !== undefined) patch.firstName = data.firstName;
    if (data.lastName !== undefined) patch.lastName = data.lastName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (Object.keys(patch).length === 0) {
      return this.getMe(userId);
    }
    await this.userRepository.update(userId, patch);
    return this.getMe(userId);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async createAddress(userId: string, data: Partial<Address>): Promise<Address> {
    const existingCount = await this.addressRepository.count({ where: { userId } });
    // If user has NO other address, the new one is saved with isDefault: true, whatever the request says.
    const isDefault = existingCount === 0 ? true : Boolean(data.isDefault);

    if (isDefault && existingCount > 0) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const row = this.addressRepository.create({
      userId,
      label: data.label ?? null,
      street: data.street as string,
      houseNumber: data.houseNumber as string,
      city: data.city as string,
      postalCode: data.postalCode as string,
      isDefault,
    } as Partial<Address>);
    return this.addressRepository.save(row);
  }

  async updateAddress(userId: string, addressId: string, data: Partial<Address>): Promise<Address> {
    const existing = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundException('Adresse nicht gefunden.');

    const patch: Partial<Address> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.street !== undefined) patch.street = data.street;
    if (data.houseNumber !== undefined) patch.houseNumber = data.houseNumber;
    if (data.city !== undefined) patch.city = data.city;
    if (data.postalCode !== undefined) patch.postalCode = data.postalCode;

    if (data.isDefault === true) {
      await this.addressRepository.update({ userId }, { isDefault: false });
      patch.isDefault = true;
    } else if (data.isDefault === false) {
      // If a request would set the user's ONLY default to false while they still have addresses,
      // ignore that part (a user with addresses always has exactly one default).
      if (!existing.isDefault) {
        patch.isDefault = false;
      }
      // If existing.isDefault is true, we ignore data.isDefault: false
    }

    if (Object.keys(patch).length > 0) {
      await this.addressRepository.update({ id: addressId, userId }, patch);
    }
    const updated = await this.addressRepository.findOne({ where: { id: addressId } });
    if (!updated) throw new NotFoundException('Adresse nicht gefunden.');
    return updated;
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ deleted: boolean }> {
    return this.addressRepository.manager.transaction(async (manager) => {
      const addressRepo = manager.getRepository(Address);
      const existing = await addressRepo.findOne({
        where: { id: addressId, userId },
      });
      if (!existing) {
        throw new NotFoundException('Adresse nicht gefunden.');
      }

      await addressRepo.delete({ id: addressId, userId });

      if (existing.isDefault) {
        // If deleted address was default, promote oldest remaining address (by createdAt)
        const oldestRemaining = await addressRepo.findOne({
          where: { userId },
          order: { createdAt: 'ASC' },
        });
        if (oldestRemaining) {
          await addressRepo.update({ id: oldestRemaining.id }, { isDefault: true });
        }
      }

      return { deleted: true };
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const user = await this.getMe(userId);
    
    // In a real S3 / Backblaze environment, this URL would be from the cloud provider
    // Since we are using local disk storage as a fallback, we construct a relative or absolute URL.
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    
    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);

    return { avatarUrl };
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .andWhere('user.isActive = true')
      .getOne();

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Falsches Passwort. Bitte versuche es erneut.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Falsches Passwort. Bitte versuche es erneut.');
    }

    if (user.role === 'provider') {
      const provider = await this.providerRepository.findOne({ where: { userId } });
      if (provider) {
        await this.providerRepository.update(provider.id, {
          status: ProviderStatus.SUSPENDED,
          isOnline: false,
        });
        await this.providerRepository.softDelete(provider.id);
      }
    }

    await this.refreshTokenRepository.delete({ userId } as any);

    await this.userRepository.update(userId, { isActive: false });
    await this.userRepository.softDelete(userId);
  }
}
