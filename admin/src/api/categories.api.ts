import { apiClient } from './client';
import type { Category } from '@/types/domain.types';

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export const categoriesApi = {
  list: () =>
    apiClient.get<unknown, { categories: Category[] }>('/admin/categories'),

  create: (input: CreateCategoryInput) =>
    apiClient.post<unknown, { category: Category }>('/admin/categories', input),

  update: (id: string, input: UpdateCategoryInput) =>
    apiClient.put<unknown, { category: Category }>(`/admin/categories/${id}`, input),

  deactivate: (id: string) =>
    apiClient.delete<unknown, { category: Category }>(`/admin/categories/${id}`),
};
