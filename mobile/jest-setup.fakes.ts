/**
 * Loaded BEFORE the test framework (`setupFiles`). Use this for module-level
 * mocks that need to be in place before any `import` resolves, e.g. native
 * modules that throw at require-time.
 *
 * setupFilesAfterEach (jest-setup.ts) is for matchers and per-test helpers.
 */

/* react-native-reanimated v3 — official mock. */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

/* Suppress "Animated: `useNativeDriver` is not supported" warnings. */
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

/* Expo modules — return stubs so screens render without native bridges. */
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'wuto',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
}));

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  // expo-image accepts the same `source={{ uri }}` API — RN Image is a fine stand-in.
  return { Image };
});

/* AsyncStorage — the @testing-library team ships a Jest-friendly mock. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/* Toast root has no behavioral surface in tests — collapse to a noop. */
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: () => null,
  show: jest.fn(),
  hide: jest.fn(),
}));
