import { apiClient } from './client';
import type { User } from '@/types/domain.types';

export const usersApi = {
  getMe: () => apiClient.get<unknown, { user: User }>('/users/me'),

  updateMe: (input: Partial<Pick<User, 'name' | 'phone'>>) =>
    apiClient.patch<unknown, { user: User }>('/users/me', input),

  setFcmToken: (fcm_token: string) =>
    apiClient.patch<unknown, { ok: true }>('/users/me/fcm-token', { fcm_token }),

  /**
   * Best-effort: clears the FCM token server-side so this device stops
   * receiving pushes after logout. Swallows errors — the local session
   * tears down regardless.
   */
  clearFcmToken: () =>
    apiClient
      .delete<unknown, { ok: true }>('/users/me/fcm-token')
      .catch(() => ({ ok: true as const })),
};
