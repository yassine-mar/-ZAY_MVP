/**
 * Async-storage wrapper.
 *
 * We don't take the @react-native-async-storage/async-storage dependency
 * for the auth scaffold — it gets pulled in here. Persisted data:
 *   - cart (Zustand persist middleware reads/writes through this)
 *   - UI prefs (onboarding flag, language) in the future
 *
 * NEVER store the JWT here — that goes through SecureStore via
 * services/storage.service.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
