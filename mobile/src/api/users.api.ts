import { apiClient } from './client';
import type { User } from '@/types/domain.types';

export const usersApi = {
  getMe: () => apiClient.get<unknown, { user: User }>('/users/me'),

  updateMe: (input: Partial<Pick<User, 'name' | 'phone'>>) =>
    apiClient.patch<unknown, { user: User }>('/users/me', input),

  setFcmToken: (fcm_token: string) =>
    apiClient.patch<unknown, { ok: true }>('/users/me/fcm-token', { fcm_token }),
};
