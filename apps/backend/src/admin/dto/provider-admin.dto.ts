import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ProviderStatus, ProviderType } from '../../entities/provider.entity';

export class ProviderAdminUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone: string | null;

  @IsBoolean()
  isEmailVerified: boolean;
}

export class ProviderAdminDto {
  @IsUUID()
  id: string;

  @IsString()
  businessName: string;

  @IsString()
  providerType: ProviderType;

  @IsString()
  status: ProviderStatus;

  @IsString()
  city: string;

  @IsBoolean()
  hasIdDocument: boolean;

  @IsOptional()
  @IsString()
  avatarUrl: string | null;

  @IsBoolean()
  isEmailVerified: boolean;

  user: ProviderAdminUserDto;

  @IsInt()
  @Min(0)
  servicesCount: number;

  @IsString()
  createdAt: string;

  static fromRaw(row: any): ProviderAdminDto {
    const dto = new ProviderAdminDto();
    dto.id = row.id;
    dto.businessName = row.businessName;
    dto.providerType = row.providerType;
    dto.status = row.status;
    dto.city = row.city;
    dto.hasIdDocument = Boolean(row.idDocumentUrl);
    dto.avatarUrl = row.avatarUrl ?? null;
    dto.isEmailVerified = Boolean(row.userIsEmailVerified);
    dto.servicesCount = Number(row.servicesCount ?? 0);
    dto.createdAt = new Date(row.createdAt).toISOString();

    const user = new ProviderAdminUserDto();
    user.firstName = row.userFirstName;
    user.lastName = row.userLastName;
    user.email = row.userEmail;
    user.phone = row.userPhone ?? null;
    user.isEmailVerified = Boolean(row.userIsEmailVerified);

    dto.user = user;
    return dto;
  }
}
