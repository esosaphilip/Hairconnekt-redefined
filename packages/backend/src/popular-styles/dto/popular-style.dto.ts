import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PopularStyle } from '../../entities/popular-style.entity';

export class PopularStylePublicDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl: string | null;

  @IsString()
  @MaxLength(4)
  emoji: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorHex: string;

  @IsInt()
  @Min(0)
  sortOrder: number;

  static fromEntity(entity: PopularStyle): PopularStylePublicDto {
    const dto = new PopularStylePublicDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.imageUrl = entity.imageUrl ?? null;
    dto.emoji = entity.emoji;
    dto.colorHex = entity.colorHex;
    dto.sortOrder = entity.sortOrder;
    return dto;
  }
}

export class PopularStyleAdminDto extends PopularStylePublicDto {
  @IsBoolean()
  isActive: boolean;

  static fromEntity(entity: PopularStyle): PopularStyleAdminDto {
    const dto = new PopularStyleAdminDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.imageUrl = entity.imageUrl ?? null;
    dto.emoji = entity.emoji;
    dto.colorHex = entity.colorHex;
    dto.sortOrder = entity.sortOrder;
    dto.isActive = entity.isActive;
    return dto;
  }
}

export class CreatePopularStyleDto {
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  emoji?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorHex?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePopularStyleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  emoji?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorHex?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderPopularStylesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
