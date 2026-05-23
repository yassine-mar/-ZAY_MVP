import { authApi } from '@/api/auth.api';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/services/storage.service';
import { queryClient } from '@/lib/queryClient';
import type {
  LoginInput,
  RegisterCustomerInput,
  RegisterSellerInput,
} from '@/types/domain.types';

/**
 * Orchestration layer that combines:
 *   - the api/* modules (pure HTTP)
 *   - the auth store (in-memory state)
 *   - tokenStorage (SecureStore persistence)
 *   - the React Query cache (must be cleared on logout)
 *
 * Screens never call api/auth.api.ts directly for auth lifecycle events —
 * they call this service so all three side effects happen atomically.
 */
export const authService = {
  /**
   * App launch: read the persisted token (if any), validate it by calling
   * /users/me, and populate the auth store. Always resolves — never throws.
   */
  async hydrate(): Promise<void> {
    try {
      const token = await tokenStorage.get();
      if (!token) {
        useAuthStore.getState().setHydrated();
        return;
      }

      // Put the token into the store BEFORE the request so the interceptor
      // can attach it as the Bearer header.
      useAuthStore.setState({ token });

      const { user } = await usersApi.getMe();
      useAuthStore.getState().setAuth(user, token);
    } catch {
      // Token was rejected (401 already cleared it via the interceptor) or
      // network failed during cold start — treat as logged out.
      await tokenStorage.delete();
      useAuthStore.getState().reset();
    } finally {
      useAuthStore.getState().setHydrated();
    }
  },

  async login(input: LoginInput): Promise<void> {
    const { user, access_token } = await authApi.login(input);
    await tokenStorage.set(access_token);
    useAuthStore.getState().setAuth(user, access_token);
  },

  async registerCustomer(input: RegisterCustomerInput): Promise<void> {
    const { user, access_token } = await authApi.registerCustomer(input);
    await tokenStorage.set(access_token);
    useAuthStore.getState().setAuth(user, access_token);
  },

  async registerSeller(input: RegisterSellerInput): Promise<void> {
    const { user, access_token } = await authApi.registerSeller(input);
    await tokenStorage.set(access_token);
    useAuthStore.getState().setAuth(user, access_token);
  },

  async logout(): Promise<void> {
    // Fire the server logout but don't block on it — token is invalidated
    // locally regardless. (Server-side logout is for FCM token cleanup.)
    void authApi.logout();
    await tokenStorage.delete();
    queryClient.clear();
    useAuthStore.getState().reset();
  },
};
