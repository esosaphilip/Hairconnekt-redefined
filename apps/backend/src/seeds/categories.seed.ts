import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from '../entities/service-category.entity';

@Injectable()
export class CategoriesSeedService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesSeedService.name);

  constructor(
    @InjectRepository(ServiceCategory)
    private categoryRepo: Repository<ServiceCategory>,
  ) {}

  async onModuleInit() {
    try {
      const existingCount = await this.categoryRepo.count();
      if (existingCount > 0) {
        this.logger.log(`Skipping categories seed (existing: ${existingCount})`);
        return;
      }

      const categories: Array<Partial<ServiceCategory>> = [
        {
          name: 'Flechten',
          iconName: 'braids',
          description: 'Braids, Cornrows, Knotless, Feed-in',
          sortOrder: 1,
          isActive: true,
        },
        {
          name: 'Locs',
          iconName: 'locs',
          description: 'Locs & Dreadlocks, Retwist',
          sortOrder: 2,
          isActive: true,
        },
        {
          name: 'Twists',
          iconName: 'twists',
          description: 'Passion Twists, Senegalese Twists',
          sortOrder: 3,
          isActive: true,
        },
        {
          name: 'Goddess',
          iconName: 'goddess',
          description: 'Goddess Styles',
          sortOrder: 4,
          isActive: true,
        },
        {
          name: 'Styling',
          iconName: 'styling',
          description: 'Styling & Finish',
          sortOrder: 5,
          isActive: true,
        },
        {
          name: 'Pflege',
          iconName: 'care',
          description: 'Care & Treatment',
          sortOrder: 6,
          isActive: true,
        },
      ];

      await this.categoryRepo.insert(categories);
      this.logger.log(`Seeded categories: inserted ${categories.length}`);
    } catch (err: any) {
      this.logger.warn(
        `Could not seed categories: ${err?.message ?? String(err)}`,
      );
    }
  }
}
