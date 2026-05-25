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
  Notifications: undefined;
};

/* ── Seller (authenticated, approved) navigation tree ─────────────────── */

export type SellerOrdersStackParamList = {
  IncomingOrders: undefined;
  SellerOrderDetail: { orderId: string };
};

export type SellerMenuStackParamList = {
  MenuList: undefined;
  AddEditMenu: { menuId?: string };
  AddEditItem: { menuId: string; itemId?: string };
};

export type SellerProfileStackParamList = {
  SellerProfile: undefined;
  EditSellerProfile: undefined;
};

export type SellerTabsParamList = {
  DashboardTab: undefined;
  SellerOrdersTab: undefined;
  SellerMenuTab: undefined;
  SellerProfileTab: undefined;
};

export type SellerRootParamList = {
  Tabs: undefined;
  Notifications: undefined;
};

export type PendingSellerStackParamList = {
  PendingApproval: undefined;
};

/* Composite props for typed nested navigation. */

export type SellerOrdersScreenProps<T extends keyof SellerOrdersStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SellerOrdersStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<SellerTabsParamList>,
      NativeStackScreenProps<SellerRootParamList>
    >
  >;

export type SellerMenuScreenProps<T extends keyof SellerMenuStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SellerMenuStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<SellerTabsParamList>,
      NativeStackScreenProps<SellerRootParamList>
    >
  >;

export type SellerProfileScreenProps<T extends keyof SellerProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SellerProfileStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<SellerTabsParamList>,
      NativeStackScreenProps<SellerRootParamList>
    >
  >;

export type SellerTabsScreenProps<T extends keyof SellerTabsParamList> =
  BottomTabScreenProps<SellerTabsParamList, T>;

export type PendingSellerScreenProps<T extends keyof PendingSellerStackParamList> =
  NativeStackScreenProps<PendingSellerStackParamList, T>;

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
