import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
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
    if (data.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const row = this.addressRepository.create({
      userId,
      label: data.label ?? null,
      street: data.street as string,
      houseNumber: data.houseNumber as string,
      city: data.city as string,
      postalCode: data.postalCode as string,
      isDefault: data.isDefault ?? false,
    });
    return this.addressRepository.save(row);
  }

  async updateAddress(userId: string, addressId: string, data: Partial<Address>): Promise<Address> {
    const existing = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundException('Adresse nicht gefunden.');
    if (data.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const patch: Partial<Address> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.street !== undefined) patch.street = data.street;
    if (data.houseNumber !== undefined) patch.houseNumber = data.houseNumber;
    if (data.city !== undefined) patch.city = data.city;
    if (data.postalCode !== undefined) patch.postalCode = data.postalCode;
    if (data.isDefault !== undefined) patch.isDefault = data.isDefault;
    await this.addressRepository.update({ id: addressId, userId }, patch);
    const updated = await this.addressRepository.findOne({ where: { id: addressId } });
    if (!updated) throw new NotFoundException('Adresse nicht gefunden.');
    return updated;
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ deleted: boolean }> {
    const res = await this.addressRepository.delete({ id: addressId, userId });
    if (!res.affected) throw new NotFoundException('Adresse nicht gefunden.');
    return { deleted: true };
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
}
