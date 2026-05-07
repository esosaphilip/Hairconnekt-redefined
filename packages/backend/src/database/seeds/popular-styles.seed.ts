import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PopularStyle } from '../../entities/popular-style.entity';

@Injectable()
export class PopularStylesSeedService implements OnModuleInit {
  private readonly logger = new Logger(PopularStylesSeedService.name);

  constructor(
    @InjectRepository(PopularStyle)
    private readonly popularStyleRepo: Repository<PopularStyle>,
  ) {}

  async onModuleInit() {
    const existingCount = await this.popularStyleRepo.count();
    if (existingCount > 0) {
      this.logger.log(`Skipping popular styles seed (existing: ${existingCount})`);
      return;
    }

    const styles: Array<Partial<PopularStyle>> = [
      { name: 'Knotless Braids', emoji: '✨', colorHex: '#C8860A', sortOrder: 1 },
      { name: 'Box Braids', emoji: '💫', colorHex: '#8B4513', sortOrder: 2 },
      { name: 'Cornrows', emoji: '🌿', colorHex: '#1A8C85', sortOrder: 3 },
      { name: 'Goddess Locs', emoji: '👑', colorHex: '#E05A4E', sortOrder: 4 },
      { name: 'Twists', emoji: '🌀', colorHex: '#5C2D00', sortOrder: 5 },
      { name: 'Fades', emoji: '✂️', colorHex: '#2E7D32', sortOrder: 6 },
      { name: 'Fulani Braids', emoji: '🌸', colorHex: '#8B4513', sortOrder: 7 },
      { name: 'Feed-in Braids', emoji: '⭐', colorHex: '#1A8C85', sortOrder: 8 },
      { name: 'Butterfly Locs', emoji: '🦋', colorHex: '#E05A4E', sortOrder: 9 },
      { name: 'Passion Twists', emoji: '💜', colorHex: '#5C2D00', sortOrder: 10 },
    ];

    try {
      await this.popularStyleRepo.insert(
        styles.map((s) => ({
          ...s,
          isActive: true,
          imageUrl: null,
          imageKey: null,
        })),
      );
      this.logger.log(`Seeded popular styles: inserted ${styles.length}`);
    } catch (err: any) {
      this.logger.warn(`Could not seed popular styles: ${err?.message ?? String(err)}`);
    }
  }
}
