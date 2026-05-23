import { apiClient } from './client';
import type { User, UserRole, UserStatus } from '@/types/domain.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface UsersListQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export const usersApi = {
  list: (params: UsersListQuery) =>
    apiClient.get<unknown, PaginatedResponse<User>>('/admin/users', { params }),

  get: (id: string) =>
    apiClient.get<unknown, { user: User }>(`/admin/users/${id}`),

  suspend: (id: string, reason: string) =>
    apiClient.patch<unknown, { user: User }>(`/admin/users/${id}/suspend`, { reason }),
};
