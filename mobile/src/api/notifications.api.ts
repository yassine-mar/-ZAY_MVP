import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/api.types';
import type { Notification } from '@/constants/notificationTypes';

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
}

export const notificationsApi = {
  list: (query: ListNotificationsQuery = {}) =>
    apiClient.get<unknown, PaginatedResponse<Notification>>('/notifications', {
      params: query,
    }),

  unreadCount: () =>
    apiClient.get<unknown, { unread_count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<unknown, { ok: true }>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch<unknown, { marked_read_count: number }>('/notifications/read-all'),
};
