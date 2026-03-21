import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles decorator — pair with RolesGuard.
 * Usage: @Roles(UserRole.CLIENT) or @Roles(UserRole.PROVIDER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
