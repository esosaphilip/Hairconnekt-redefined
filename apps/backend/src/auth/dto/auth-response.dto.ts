import { User } from '../../entities/user.entity';

export class AuthUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
}

/**
 * AuthResponseDto — the EXACT shape returned by all /auth endpoints.
 * Field names mirror DOC 08 Section 1 exactly.
 */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;

  static fromUser(user: User, accessToken: string, refreshToken: string): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.accessToken = accessToken;
    dto.refreshToken = refreshToken;
    dto.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? undefined,
      role: user.role,
      avatarUrl: user.avatarUrl ?? undefined,
    };
    return dto;
  }
}
