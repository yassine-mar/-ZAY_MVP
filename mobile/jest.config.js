/**
 * Jest config for the @ZAY mobile app.
 *
 * `jest-expo` ships the correct transformer + transformIgnorePatterns for
 * the Expo SDK 50 ecosystem (RN itself, react-navigation, expo-* modules).
 * We extend the ignore list to pick up packages it doesn't cover by default
 * (lucide-react-native, @expo-google-fonts/*, socket.io-client).
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest-setup.ts'],
  setupFiles: ['<rootDir>/jest-setup.fakes.ts'],

  // RN / Expo modules ship as untranspiled ESM. Jest needs them passed
  // through Babel — every entry below is a real-world gotcha for this app.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'jest-)?react-native|' +
      '@react-native(-community)?|' +
      'expo(nent)?|@expo(nent)?/.*|' +
      '@expo-google-fonts/.*|' +
      'react-navigation|@react-navigation/.*|' +
      'react-native-reanimated|' +
      'react-native-gesture-handler|' +
      'react-native-safe-area-context|' +
      'react-native-svg|' +
      'lucide-react-native|' +
      'react-native-toast-message|' +
      'socket.io-client' +
    ')',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**',
    '!src/theme/**',           // pure tokens, no logic
    '!src/types/**',           // type-only
    '!src/constants/**',       // pure constants
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
    // Critical: the auth pipeline and error normalizer should be near-100%.
    './src/services/auth.service.ts':  { lines: 90, branches: 85 },
    './src/utils/error.ts':            { lines: 100, branches: 90 },
  },

  testTimeout: 10_000,
  clearMocks: true,
  restoreMocks: true,
};
