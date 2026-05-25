/**
 * Navigation test — asserts RootNavigator branches into the right child
 * tree for every auth state combination.
 *
 * The child stacks are replaced with lightweight "fingerprint" components
 * so the test isn't pulling in the entire CustomerTabs / SellerTabs trees
 * (which would need extra mocks and slow the suite).
 */
import { Text } from 'react-native';
import { render } from '@/test-utils/render';
import { useAuthStore } from '@/store/auth.store';
import { buildUser, buildSellerProfile } from '@/test-utils/factories';

/* ── Replace heavy child stacks with named fingerprints ───────────────── */

jest.mock('./AuthStack', () => ({
  AuthStack: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-auth">AuthStack</Text>;
  },
}));

jest.mock('./CustomerRoot', () => ({
  CustomerRoot: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-customer">CustomerRoot</Text>;
  },
}));

jest.mock('./SellerRoot', () => ({
  SellerRoot: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-seller">SellerRoot</Text>;
  },
}));

jest.mock('./PendingSellerStack', () => ({
  PendingSellerStack: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-pending">PendingSellerStack</Text>;
  },
}));

jest.mock('@/screens/shared/SplashScreen', () => ({
  SplashScreen: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-splash">SplashScreen</Text>;
  },
}));

jest.mock('@/screens/seller/RejectedScreen', () => ({
  RejectedScreen: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-rejected">RejectedScreen</Text>;
  },
}));

jest.mock('@/screens/seller/SuspendedScreen', () => ({
  SuspendedScreen: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="branch-suspended">SuspendedScreen</Text>;
  },
}));

/* Imports must come AFTER the mocks above. */
import { RootNavigator } from './RootNavigator';

/* ── State helpers ────────────────────────────────────────────────────── */

const setAuth = (partial: Parameters<typeof useAuthStore.setState>[0]) => {
  useAuthStore.setState(partial);
};

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isHydrated: false,
  });
});

describe('<RootNavigator />', () => {
  it('shows SplashScreen while auth is hydrating', () => {
    setAuth({ isHydrated: false });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-splash')).toBeOnTheScreen();
  });

  it('shows AuthStack when hydrated and not authenticated', () => {
    setAuth({ isHydrated: true, isAuthenticated: false });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-auth')).toBeOnTheScreen();
  });

  it('shows CustomerRoot for an active customer', () => {
    setAuth({
      isHydrated: true,
      isAuthenticated: true,
      user: buildUser({ role: 'customer', status: 'active' }),
    });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-customer')).toBeOnTheScreen();
  });

  it('shows SuspendedScreen when status === suspended (regardless of role)', () => {
    setAuth({
      isHydrated: true,
      isAuthenticated: true,
      user: buildUser({ role: 'customer', status: 'suspended' }),
    });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-suspended')).toBeOnTheScreen();
  });

  it('shows PendingSellerStack for a seller with status=pending', () => {
    setAuth({
      isHydrated: true,
      isAuthenticated: true,
      user: buildUser({
        role: 'seller',
        seller_profile: buildSellerProfile({ status: 'pending' }),
      }),
    });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-pending')).toBeOnTheScreen();
  });

  it('shows RejectedScreen for a seller with status=rejected', () => {
    setAuth({
      isHydrated: true,
      isAuthenticated: true,
      user: buildUser({
        role: 'seller',
        seller_profile: buildSellerProfile({ status: 'rejected' }),
      }),
    });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-rejected')).toBeOnTheScreen();
  });

  it('shows SellerRoot for an approved seller', () => {
    setAuth({
      isHydrated: true,
      isAuthenticated: true,
      user: buildUser({
        role: 'seller',
        seller_profile: buildSellerProfile({ status: 'approved' }),
      }),
    });
    const { getByTestId } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-seller')).toBeOnTheScreen();
  });

  it('re-renders into the new branch when the auth store updates', () => {
    setAuth({ isHydrated: true, isAuthenticated: false });
    const { getByTestId, rerender } = render(<RootNavigator />, { withNavigation: false });
    expect(getByTestId('branch-auth')).toBeOnTheScreen();

    // Simulate a successful login.
    setAuth({
      isAuthenticated: true,
      user: buildUser({ role: 'customer' }),
    });
    rerender(<RootNavigator />);
    expect(getByTestId('branch-customer')).toBeOnTheScreen();
  });
});

// Silence "Text imported but not used" — kept for the comment showing how
// jest.requireActual('react-native').Text bypasses our top-level mock.
void Text;
