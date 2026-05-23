import axios, { type AxiosResponse } from 'axios';
import Toast from 'react-native-toast-message';
import { API_TIMEOUT_MS, API_URL } from '@/constants/api';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/services/storage.service';
import { queryClient } from '@/lib/queryClient';

/**
 * Axios instance shared by every api/*.api.ts module.
 *
 * Request:
 *   - injects Authorization: Bearer <token> from the auth store
 *
 * Response:
 *   - unwraps { success, data } envelope so screens see inner shapes
 *   - 401 → silent logout via single-flight lock, then toast
 *   - on success, returns the unwrapped data directly
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Single-flight guard for cascading 401s (e.g. 5 parallel queries all expire
// at once). Without this, every failed request would re-trigger logout.
let isHandling401 = false;

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  async (error) => {
    const status = error?.response?.status;

    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      try {
        await tokenStorage.delete();
        useAuthStore.getState().reset();
        queryClient.clear();
        Toast.show({
          type: 'error',
          text1: 'Session expired',
          text2: 'Please log in again.',
        });
      } finally {
        setTimeout(() => { isHandling401 = false; }, 1500);
      }
    }

    return Promise.reject(error);
  },
);
