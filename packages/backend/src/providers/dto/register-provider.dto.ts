import { IsString, IsInt, IsArray, IsEnum, IsOptional,
         Min, Max, MaxLength, Matches, IsUUID } from 'class-validator';

export enum ProviderType {
  FREELANCER = 'freelancer',
  SALON = 'salon',
  MOBILE = 'mobile',
  BARBER = 'barber',
}

export enum CancellationPolicy {
  H24 = '24h', H48 = '48h', H72 = '72h',
}

export class RegisterProviderDto {
  @IsEnum(ProviderType) providerType: ProviderType;
  @IsString() @MaxLength(100) businessName: string;
  @IsString() @MaxLength(200) street: string;
  @IsString() @MaxLength(20) houseNumber: string;
  @IsString() @MaxLength(100) city: string;
  @IsString() @Matches(/^\d{4,6}$/) postalCode: string;
  @IsInt() @Min(1) @Max(100) serviceRadius: number;
  @IsArray() @IsUUID('all', { each: true }) serviceIds: string[];
  @IsInt() @Min(0) @Max(50) experienceYears: number;
  @IsArray() @IsString({ each: true }) languages: string[];
  @IsEnum(CancellationPolicy) cancellationPolicy: CancellationPolicy;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}
