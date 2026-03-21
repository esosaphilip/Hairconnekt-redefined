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
    const categories = [
      { name: 'Flechten', nameEn: 'Braiding' },
      { name: 'Pflege', nameEn: 'Care & Treatment' },
      { name: 'Styling', nameEn: 'Styling' },
      { name: 'Goddess', nameEn: 'Goddess Styles' },
      { name: 'Locs', nameEn: 'Locs & Dreadlocks' },
      { name: 'Twists', nameEn: 'Twists' },
    ];

    for (const cat of categories) {
      const exists = await this.categoryRepo.findOne({ where: { name: cat.name } });
      if (!exists) {
        await this.categoryRepo.save(this.categoryRepo.create(cat));
        this.logger.log(`Seeded category: ${cat.name}`);
      }
    }
  }
}
