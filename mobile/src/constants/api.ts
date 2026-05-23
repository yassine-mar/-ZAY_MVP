export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export const API_TIMEOUT_MS = 15_000;

/** Token storage key in expo-secure-store. */
export const TOKEN_STORAGE_KEY = '@zay/token';

/** FCM device token storage key (AsyncStorage). */
export const FCM_TOKEN_STORAGE_KEY = '@zay/fcm-token';
