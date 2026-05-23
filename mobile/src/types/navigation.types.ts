import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Auth flow parameter list. Each screen gets a typed `route.params` and
 * `navigation.navigate()` via `AuthScreenProps<'ScreenName'>`.
 */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: { prefilledEmail?: string } | undefined;
  Register: { initialRole?: 'customer' | 'seller' } | undefined;
  ForgotPassword: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

/**
 * Root navigator — RootNavigator branches between Splash / Auth / Authenticated
 * by re-mounting the right child, not via params.
 */
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Authenticated: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
