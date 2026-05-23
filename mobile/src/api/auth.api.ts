import { apiClient } from './client';
import type {
  AuthResponse,
  LoginInput,
  PasswordResetRequestInput,
  RegisterCustomerInput,
  RegisterSellerInput,
} from '@/types/domain.types';

export const authApi = {
  login: (input: LoginInput) =>
    apiClient.post<unknown, AuthResponse>('/auth/login', input),

  registerCustomer: (input: RegisterCustomerInput) =>
    apiClient.post<unknown, AuthResponse>('/auth/register', input),

  registerSeller: (input: RegisterSellerInput) =>
    apiClient.post<unknown, AuthResponse>('/auth/register/seller', input),

  logout: () =>
    apiClient.post<unknown, { ok: true }>('/auth/logout').catch(() => {
      // Logout is best-effort — server may already consider the token invalid.
      // We still wipe local state regardless of the server's reply.
      return { ok: true as const };
    }),

  /**
   * NOTE: Password reset is documented as Phase 2 in 06_MOBILE_ARCHITECTURE.md.
   * The endpoint below is the proposed contract; backend implementation pending.
   * The mobile UI uses it today and surfaces a neutral "if it exists..." copy
   * so we never leak whether an account is registered.
   */
  requestPasswordReset: (input: PasswordResetRequestInput) =>
    apiClient.post<unknown, { ok: true }>('/auth/password-reset/request', input),
};
