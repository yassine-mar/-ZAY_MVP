import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

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

/* ── Customer (authenticated) navigation tree ─────────────────────────── */

export type HomeStackParamList = {
  Home: undefined;
  Categories: undefined;
  Search: { initialQuery?: string; categoryId?: string } | undefined;
  SellerProfile: { sellerId: string };
  FoodDetails: { itemId: string };
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderTracking: { orderId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type CustomerTabsParamList = {
  HomeTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

/** Root of the customer flow — tabs plus modal screens. */
export type CustomerRootParamList = {
  Tabs: undefined;
  Cart: undefined;
  Checkout: undefined;
};

/* ── Composite screen prop helpers ─────────────────────────────────────── */

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<CustomerTabsParamList>,
      NativeStackScreenProps<CustomerRootParamList>
    >
  >;

export type OrdersStackScreenProps<T extends keyof OrdersStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OrdersStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<CustomerTabsParamList>,
      NativeStackScreenProps<CustomerRootParamList>
    >
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<CustomerTabsParamList>,
      NativeStackScreenProps<CustomerRootParamList>
    >
  >;

export type CustomerRootScreenProps<T extends keyof CustomerRootParamList> =
  NativeStackScreenProps<CustomerRootParamList, T>;

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
