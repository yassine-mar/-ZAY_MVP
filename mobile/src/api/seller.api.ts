import { apiClient } from './client';
import type {
  SellerAnalytics,
  SellerProfile,
  UpdateSellerProfileInput,
} from '@/types/domain.types';

export const sellerApi = {
  /** Seller's own profile (mirrors what /users/me returns under seller_profile). */
  getProfile: () =>
    apiClient.get<unknown, { profile: SellerProfile }>('/seller/profile'),

  updateProfile: (input: UpdateSellerProfileInput) =>
    apiClient.patch<unknown, { profile: SellerProfile }>('/seller/profile', input),

  /** Open/closed toggle — sellers can pause incoming orders mid-day. */
  setAvailability: (is_open: boolean) =>
    apiClient.patch<unknown, { profile: SellerProfile }>('/seller/profile/availability', {
      is_open,
    }),

  analytics: () =>
    apiClient.get<unknown, { analytics: SellerAnalytics }>('/seller/analytics'),

  /**
   * Upload / replace the seller avatar.
   * `image` is a local URI (file:// or content://); the function builds the
   * multipart body and Content-Type header.
   */
  uploadAvatar: (image: { uri: string; mimeType: string; fileName?: string }) => {
    const formData = new FormData();
    formData.append('image', {
      // React Native FormData appends URI references this way — fully supported.
      // @ts-expect-error — RN's typing of FormData differs from DOM
      uri: image.uri,
      name: image.fileName ?? 'avatar.jpg',
      type: image.mimeType,
    });
    return apiClient.post<unknown, { profile: SellerProfile }>(
      '/seller/profile/avatar',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
