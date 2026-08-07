import {
  BadRequestException,
  ConflictException,
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe, HttpCode, Req, NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from '../entities/service-category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-admin.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import type { Request } from 'express';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCategoriesController {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
    private readonly auditService: AuditService,
  ) {}

  // GET /admin/categories — list all (including inactive)
  @Get()
  async findAll() {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  // POST /admin/categories — create new category
  @Post()
  async create(
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() body: CreateCategoryDto,
  ) {
    if (!body.name?.trim()) {
      throw new BadRequestException('Name ist erforderlich.');
    }
    const name = body.name.trim();
    const existing = await this.categoryRepo.findOne({
      where: { name }
    });
    if (existing) {
      throw new ConflictException('Kategorie mit diesem Namen existiert bereits.');
    }
    const category = this.categoryRepo.create({
      name,
      description: body.description?.trim(),
      iconName: body.iconName?.trim(),
      sortOrder: body.sortOrder ?? 0,
      isActive: true,
    });
    let saved: ServiceCategory;
    try {
      saved = await this.categoryRepo.save(category);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Kategorie mit diesem Namen existiert bereits.');
      }
      throw err;
    }
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'category.created',
      targetType: 'category',
      targetId: saved.id,
      request: req,
      afterState: {
        name: saved.name,
        description: saved.description,
        iconName: saved.iconName,
        sortOrder: saved.sortOrder,
        isActive: saved.isActive,
      },
    });
    return saved;
  }

  // PATCH /admin/categories/:id — update category
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
    @Body() body: UpdateCategoryDto,
  ) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategorie nicht gefunden.');
    const beforeState = {
      name: category.name,
      description: category.description,
      iconName: category.iconName,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };
    const nextName = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (typeof nextName === 'string') {
      if (nextName.length === 0) throw new BadRequestException('Name ist erforderlich.');
      const dup = await this.categoryRepo.findOne({ where: { name: nextName } });
      if (dup && dup.id !== id) {
        throw new ConflictException('Kategorie mit diesem Namen existiert bereits.');
      }
    }
    Object.assign(category, body, nextName !== undefined ? { name: nextName } : {});
    let saved: ServiceCategory;
    try {
      saved = await this.categoryRepo.save(category);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Kategorie mit diesem Namen existiert bereits.');
      }
      throw err;
    }
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'category.updated',
      targetType: 'category',
      targetId: saved.id,
      request: req,
      beforeState,
      afterState: {
        name: saved.name,
        description: saved.description,
        iconName: saved.iconName,
        sortOrder: saved.sortOrder,
        isActive: saved.isActive,
      },
    });
    return saved;
  }

  // DELETE /admin/categories/:id — delete category
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategorie nicht gefunden.');
    const beforeState = {
      name: category.name,
      description: category.description,
      iconName: category.iconName,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };
    await this.categoryRepo.remove(category);
    await this.auditService.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: 'category.deleted',
      targetType: 'category',
      targetId: id,
      request: req,
      beforeState,
    });
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; driverError?: { code?: string } };
  const code = e.code ?? e.driverError?.code;
  if (typeof code === 'string') {
    // PostgreSQL: 23505 = unique_violation; MySQL/SQLite: ER_DUP_ENTRY / SQLITE_CONSTRAINT_UNIQUE
    return code === '23505' || code === 'ER_DUP_ENTRY' || code.startsWith('SQLITE_CONSTRAINT_UNIQUE');
  }
  if (typeof e.message === 'string') {
    return /duplicate key|unique constraint|already exists/i.test(e.message);
  }
  return false;
}
