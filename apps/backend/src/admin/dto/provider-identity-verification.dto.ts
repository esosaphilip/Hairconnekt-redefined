import { IsIn } from 'class-validator';

export const IDENTITY_VERIFICATION_METHODS = ['video_call', 'id_upload'] as const;

export type IdentityVerificationMethod = (typeof IDENTITY_VERIFICATION_METHODS)[number];

export class ProviderIdentityVerificationDto {
  @IsIn(IDENTITY_VERIFICATION_METHODS)
  method: IdentityVerificationMethod;
}
