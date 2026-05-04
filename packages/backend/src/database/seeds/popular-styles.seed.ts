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
    const styles: Array<Partial<PopularStyle>> = [
      { name: 'Knotless Braids', emoji: '✨', colorHex: '#C8860A', sortOrder: 1, imageUrl: null, imageKey: null },
      { name: 'Box Braids', emoji: '💫', colorHex: '#8B4513', sortOrder: 2, imageUrl: null, imageKey: null },
      { name: 'Cornrows', emoji: '🌿', colorHex: '#1A8C85', sortOrder: 3, imageUrl: null, imageKey: null },
      { name: 'Goddess Locs', emoji: '👑', colorHex: '#E05A4E', sortOrder: 4, imageUrl: null, imageKey: null },
      { name: 'Twists', emoji: '🌀', colorHex: '#5C2D00', sortOrder: 5, imageUrl: null, imageKey: null },
      { name: 'Fades', emoji: '✂️', colorHex: '#2E7D32', sortOrder: 6, imageUrl: null, imageKey: null },
      { name: 'Fulani Braids', emoji: '🌸', colorHex: '#8B4513', sortOrder: 7, imageUrl: null, imageKey: null },
      { name: 'Feed-in Braids', emoji: '⭐', colorHex: '#1A8C85', sortOrder: 8, imageUrl: null, imageKey: null },
      { name: 'Butterfly Locs', emoji: '🦋', colorHex: '#E05A4E', sortOrder: 9, imageUrl: null, imageKey: null },
      { name: 'Passion Twists', emoji: '💜', colorHex: '#5C2D00', sortOrder: 10, imageUrl: null, imageKey: null },
    ];

    try {
      await this.popularStyleRepo.upsert(styles, { conflictPaths: ['name'] });
      this.logger.log(`Seeded popular styles: ${styles.length}`);
    } catch (err: any) {
      this.logger.warn(`Could not seed popular styles: ${err?.message ?? String(err)}`);
    }
  }
}
