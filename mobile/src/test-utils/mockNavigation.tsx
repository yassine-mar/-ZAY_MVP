import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { type ComponentType } from 'react';

/**
 * Wrap a single screen in a minimal Stack.Navigator so React Navigation
 * hooks (useNavigation, useRoute) work. Pass `initialParams` to control
 * what `route.params` looks like at mount.
 */
export function wrapScreenInStack<P extends object = object>({
  component,
  name = 'TestScreen',
  initialParams,
}: {
  component: ComponentType<any>;
  name?: string;
  initialParams?: P;
}) {
  const Stack = createNativeStackNavigator();
  return function WrappedScreen() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name={name}
          component={component}
          initialParams={initialParams as Record<string, unknown>}
        />
      </Stack.Navigator>
    );
  };
}

/**
 * Build a typed navigation prop stub for tests that pass `navigation`
 * manually. Methods are jest mocks so you can assert on calls.
 */
export function buildNavigationStub() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })),
    addListener: jest.fn(() => () => undefined),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
  };
}

export function buildRouteStub<P extends object = object>(params?: P, name = 'TestScreen') {
  return {
    key: 'test-route',
    name,
    params: params ?? ({} as P),
  };
}
