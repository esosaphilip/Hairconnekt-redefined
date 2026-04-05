import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from '../entities/service-category.entity';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCategoriesController {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
  ) {}

  // GET /admin/categories — list all (including inactive)
  @Get()
  async findAll() {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  // POST /admin/categories — create new category
  @Post()
  async create(@Body() body: {
    name: string;
    description?: string;
    iconName?: string;
    sortOrder?: number;
  }) {
    if (!body.name?.trim()) {
      throw new Error('Name ist erforderlich.');
    }
    const existing = await this.categoryRepo.findOne({
      where: { name: body.name.trim() }
    });
    if (existing) {
      throw new Error('Kategorie mit diesem Namen existiert bereits.');
    }
    const category = this.categoryRepo.create({
      name: body.name.trim(),
      description: body.description?.trim(),
      iconName: body.iconName?.trim(),
      sortOrder: body.sortOrder ?? 0,
      isActive: true,
    });
    return this.categoryRepo.save(category);
  }

  // PATCH /admin/categories/:id — update category
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      name?: string;
      description?: string;
      iconName?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new Error('Kategorie nicht gefunden.');
    Object.assign(category, body);
    return this.categoryRepo.save(category);
  }

  // DELETE /admin/categories/:id — delete category
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new Error('Kategorie nicht gefunden.');
    await this.categoryRepo.remove(category);
  }
}
