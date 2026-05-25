import { apiClient } from './client';
import type {
  CreateMenuInput,
  Menu,
  UpdateMenuInput,
} from '@/types/domain.types';

export const menusApi = {
  /** All menus owned by the authenticated seller. */
  list: () => apiClient.get<unknown, { menus: Menu[] }>('/menus'),

  get: (id: string) => apiClient.get<unknown, { menu: Menu }>(`/menus/${id}`),

  create: (input: CreateMenuInput) =>
    apiClient.post<unknown, { menu: Menu }>('/menus', input),

  update: (id: string, input: UpdateMenuInput) =>
    apiClient.patch<unknown, { menu: Menu }>(`/menus/${id}`, input),

  delete: (id: string) =>
    apiClient.delete<unknown, { ok: true }>(`/menus/${id}`),
};
