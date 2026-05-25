import { apiClient } from './client';
import type {
  CreateItemInput,
  MenuItem,
  PickedImage,
  UpdateItemInput,
} from '@/types/domain.types';

export const itemsApi = {
  create: (input: CreateItemInput) =>
    apiClient.post<unknown, { item: MenuItem }>('/items', input),

  update: (id: string, input: UpdateItemInput) =>
    apiClient.patch<unknown, { item: MenuItem }>(`/items/${id}`, input),

  delete: (id: string) =>
    apiClient.delete<unknown, { ok: true }>(`/items/${id}`),

  /**
   * Multipart image upload. `onProgress(0-100)` lets the form render a
   * progress bar — critical on slow Moroccan 3G where uploads can take
   * 6+ seconds (Critique #5).
   */
  uploadImage: (
    id: string,
    image: PickedImage,
    onProgress?: (pct: number) => void,
  ) => {
    const formData = new FormData();
    formData.append('image', {
      // @ts-expect-error — RN's typing of FormData differs from DOM
      uri: image.uri,
      name: image.fileName ?? 'item.jpg',
      type: image.mimeType,
    });
    return apiClient.post<unknown, { item: MenuItem }>(
      `/items/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      },
    );
  },

  /** Quick toggle without opening the full edit form. */
  setAvailability: (id: string, is_available: boolean) =>
    apiClient.patch<unknown, { item: MenuItem }>(`/items/${id}`, { is_available }),
};
