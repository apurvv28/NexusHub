import { SetMetadata } from '@nestjs/common';

export type UserRole =
  | 'WorkspaceAdmin'
  | 'ChannelAdmin'
  | 'Member'
  | 'SingleChannelGuest'
  | 'MultiChannelGuest';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
