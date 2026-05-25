/**
 * Loaded after the test framework. Matchers, per-test resets, console hygiene.
 */
import '@testing-library/jest-native/extend-expect';

/**
 * Silence noisy expected warnings in tests (e.g. async-update warnings from
 * RN that don't reflect real bugs in well-written tests). We intentionally
 * keep all errors visible.
 */
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('useNativeDriver')) return;
    if (msg.includes('Animated:')) return;
    originalWarn(...(args as Parameters<typeof console.warn>));
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
