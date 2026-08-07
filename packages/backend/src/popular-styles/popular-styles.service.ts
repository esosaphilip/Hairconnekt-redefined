import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PopularStyle } from '../entities/popular-style.entity';
import { R2Service } from '../common/storage/r2.service';
import {
  CreatePopularStyleDto,
  PopularStyleAdminDto,
  PopularStylePublicDto,
  ReorderPopularStylesDto,
  UpdatePopularStyleDto,
} from './dto/popular-style.dto';

@Injectable()
export class PopularStylesService {
  constructor(
    @InjectRepository(PopularStyle)
    private readonly popularStyleRepo: Repository<PopularStyle>,
    private readonly r2Service: R2Service,
    private readonly dataSource: DataSource,
  ) {}

  async getPublicStyles(): Promise<PopularStylePublicDto[]> {
    const styles = await this.popularStyleRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return styles.map(PopularStylePublicDto.fromEntity);
  }

  async getAdminStyles(): Promise<PopularStyleAdminDto[]> {
    const styles = await this.popularStyleRepo.find({
      order: { sortOrder: 'ASC' },
    });
    return styles.map(PopularStyleAdminDto.fromEntity);
  }

  async createAdminStyle(body: CreatePopularStyleDto): Promise<PopularStyleAdminDto> {
    const sortOrder =
      typeof body.sortOrder === 'number'
        ? body.sortOrder
        : await this.nextSortOrder();

    const name = (body.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Name ist erforderlich.');
    }
    const dup = await this.popularStyleRepo.findOne({ where: { name } });
    if (dup) {
      throw new ConflictException('Style mit diesem Namen existiert bereits.');
    }

    const entity = this.popularStyleRepo.create({
      name,
      emoji: body.emoji ?? '✨',
      colorHex: body.colorHex ?? '#C8860A',
      sortOrder,
      isActive: true,
      imageUrl: null,
      imageKey: null,
    });

    let saved: PopularStyle;
    try {
      saved = await this.popularStyleRepo.save(entity);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Style mit diesem Namen existiert bereits.');
      }
      throw err;
    }
    return PopularStyleAdminDto.fromEntity(saved);
  }

  async updateAdminStyle(id: string, body: UpdatePopularStyleDto): Promise<PopularStyleAdminDto> {
    const style = await this.popularStyleRepo.findOne({ where: { id } });
    if (!style) throw new NotFoundException('Popular style not found');

    const nextName = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (typeof nextName === 'string') {
      if (nextName.length === 0) throw new BadRequestException('Name ist erforderlich.');
      const dup = await this.popularStyleRepo.findOne({ where: { name: nextName } });
      if (dup && dup.id !== id) {
        throw new ConflictException('Style mit diesem Namen existiert bereits.');
      }
    }

    if (nextName !== undefined) style.name = nextName;
    if (typeof body.emoji === 'string') style.emoji = body.emoji;
    if (typeof body.colorHex === 'string') style.colorHex = body.colorHex;
    if (typeof body.sortOrder === 'number') style.sortOrder = body.sortOrder;
    if (typeof body.isActive === 'boolean') style.isActive = body.isActive;

    let saved: PopularStyle;
    try {
      saved = await this.popularStyleRepo.save(style);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Style mit diesem Namen existiert bereits.');
      }
      throw err;
    }
    return PopularStyleAdminDto.fromEntity(saved);
  }

  async deleteAdminStyle(id: string): Promise<void> {
    const style = await this.popularStyleRepo.findOne({ where: { id } });
    if (!style) throw new NotFoundException('Popular style not found');

    if (style.imageKey) {
      await this.r2Service.deleteByKey(style.imageKey);
    }

    await this.popularStyleRepo.delete(id);
  }

  async reorderAdminStyles(body: ReorderPopularStylesDto): Promise<{ success: true }> {
    const existingCount = await this.popularStyleRepo.count();
    if (body.ids.length !== existingCount) {
      throw new BadRequestException('ids must contain all popular style IDs');
    }

    const uniqueIds = new Set(body.ids);
    if (uniqueIds.size !== body.ids.length) {
      throw new BadRequestException('ids must be unique');
    }

    const foundCount = await this.popularStyleRepo.count({ where: { id: In(body.ids) } });
    if (foundCount !== body.ids.length) {
      throw new BadRequestException('One or more IDs are invalid');
    }

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < body.ids.length; i += 1) {
        await manager.update(PopularStyle, { id: body.ids[i] }, { sortOrder: i + 1 });
      }
    });

    return { success: true };
  }

  async uploadAdminImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    const style = await this.popularStyleRepo.findOne({ where: { id } });
    if (!style) throw new NotFoundException('Popular style not found');

    if (!file?.buffer || !file?.mimetype) {
      throw new BadRequestException('No image uploaded');
    }

    if (style.imageKey) {
      await this.r2Service.deleteByKey(style.imageKey);
    }

    const extRaw = file.mimetype.split('/')[1] ?? 'jpg';
    const ext = extRaw.replace('jpeg', 'jpg');
    const key = `popular-styles/${id}-${Date.now()}.${ext}`;

    const imageUrl = await this.r2Service.uploadFileWithKey(file.buffer, file.mimetype, key);

    style.imageUrl = imageUrl;
    style.imageKey = key;
    await this.popularStyleRepo.save(style);

    return { imageUrl };
  }

  async deleteAdminImage(id: string): Promise<void> {
    const style = await this.popularStyleRepo.findOne({ where: { id } });
    if (!style) throw new NotFoundException('Popular style not found');

    if (style.imageKey) {
      await this.r2Service.deleteByKey(style.imageKey);
    }

    style.imageUrl = null;
    style.imageKey = null;
    await this.popularStyleRepo.save(style);
  }

  private async nextSortOrder(): Promise<number> {
    const row = await this.popularStyleRepo
      .createQueryBuilder('style')
      .select('COALESCE(MAX(style.sortOrder), 0)', 'max')
      .getRawOne<{ max: string }>();

    const max = Number(row?.max ?? 0);
    return (Number.isFinite(max) ? max : 0) + 1;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; driverError?: { code?: string } };
  const code = e.code ?? e.driverError?.code;
  if (typeof code === 'string') {
    return code === '23505' || code === 'ER_DUP_ENTRY' || code.startsWith('SQLITE_CONSTRAINT_UNIQUE');
  }
  if (typeof e.message === 'string') {
    return /duplicate key|unique constraint|already exists/i.test(e.message);
  }
  return false;
}
