import { type ReactElement, type ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';

import { createTestQueryClient } from './queryClient';

const MOCK_SAFE_AREA = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, right: 0, bottom: 34, left: 0 },
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Wrap in a NavigationContainer. Default true — most components depend on it. */
  withNavigation?: boolean;
  /** Provide an existing QueryClient so tests can share cache state. */
  queryClient?: QueryClient;
}

/**
 * Custom render that wires up every Provider the app needs at runtime:
 *   - SafeAreaProvider (mocked insets so layouts don't collapse)
 *   - QueryClientProvider (fresh, retry-disabled client per render)
 *   - NavigationContainer (opt-out for pure component tests)
 *
 * Returns the QueryClient alongside the standard RTL result so tests can
 * pre-seed cache or assert on it.
 */
export function render(
  ui: ReactElement,
  { withNavigation = true, queryClient, ...options }: CustomRenderOptions = {},
) {
  const client = queryClient ?? createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const tree = withNavigation ? (
      <NavigationContainer>{children}</NavigationContainer>
    ) : (
      children
    );
    return (
      <SafeAreaProvider initialMetrics={MOCK_SAFE_AREA}>
        <QueryClientProvider client={client}>{tree}</QueryClientProvider>
      </SafeAreaProvider>
    );
  };

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
    queryClient: client,
  };
}

export * from '@testing-library/react-native';
