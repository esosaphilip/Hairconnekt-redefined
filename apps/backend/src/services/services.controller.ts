import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * GET /services/categories
   * Returns all service categories (for provider registration step 3)
   */
  @Get('categories')
  async getCategories() {
    return this.categoriesService.getCategories();
  }
}
