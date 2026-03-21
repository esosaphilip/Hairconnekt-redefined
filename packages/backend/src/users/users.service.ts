import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
