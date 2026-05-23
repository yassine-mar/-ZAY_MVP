import axios, { type AxiosInstance } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { API_URL, API_TIMEOUT_MS } from '@/constants/api';

/**
 * Single axios instance shared by every api module.
 *
 * Request interceptor: attach the in-memory admin token from Zustand.
 *   (The token is not persisted — refresh kills the session by design.)
 *
 * Response interceptor: unwrap the backend's `{ success, message, data }`
 * envelope so callers receive `data` directly. 401 triggers session reset.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isHandling401 = false;

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap envelope. Some endpoints return a non-envelope body (e.g., /health);
    // in that case keep the original response.
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;
      useAuthStore.getState().reset();
      toast.error('Your session has expired. Please log in again.');
      // Reset the lock after the navigate-to-login cycle settles.
      setTimeout(() => {
        isHandling401 = false;
      }, 1500);
    }
    return Promise.reject(error);
  }
);
