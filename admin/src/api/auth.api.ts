import { apiClient } from './client';
import type { AdminUser } from '@/types/domain.types';

interface LoginResponse {
  user: AdminUser;
  access_token: string;
  token_type: 'Bearer';
}

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<unknown, LoginResponse>('/admin/auth/login', credentials),
};
