import * as SecureStore from 'expo-secure-store';
import { TOKEN_STORAGE_KEY } from '@/constants/api';

/**
 * Token storage uses the OS-level keystore (Keychain / Keystore) via
 * expo-secure-store — NEVER AsyncStorage. AsyncStorage stores plaintext
 * in the app sandbox and is readable on rooted devices.
 *
 * AsyncStorage helpers for non-sensitive data (cart, prefs, fcm token)
 * are added in companion files as those features ship.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    } catch {
      // SecureStore can throw on devices without a passcode set —
      // treat that as "no token" rather than crashing.
      return null;
    }
  },

  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async delete(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    } catch {
      // Swallow — nothing to delete is the same as success.
    }
  },
};
