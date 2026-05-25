/**
 * API/hook test — exercises a TanStack Query hook in isolation.
 *
 * Mocks the api module at the boundary (the hook never knows about axios
 * directly), then drives the auth store to verify gating behavior.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/queryClient';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/api/notifications.api', () => ({
  notificationsApi: {
    unreadCount: jest.fn(),
  },
}));
import { notificationsApi } from '@/api/notifications.api';
import { useUnreadNotifications } from './useUnreadNotifications';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  useAuthStore.setState({
    user: null, token: null, isAuthenticated: false, isHydrated: true,
  });
});

describe('useUnreadNotifications', () => {
  it('returns 0 and skips the fetch when not authenticated', async () => {
    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    // No network call should be made.
    expect(notificationsApi.unreadCount).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches the count when authenticated and exposes the value', async () => {
    (notificationsApi.unreadCount as jest.Mock).mockResolvedValue({ unread_count: 4 });
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.count).toBe(4);
    });
    expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(1);
  });

  it('falls back to 0 when the request fails — badge never throws', async () => {
    (notificationsApi.unreadCount as jest.Mock).mockRejectedValue(new Error('offline'));
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    await waitFor(() => {
      // result.current.isLoading flips false once the query settles.
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.count).toBe(0);
  });

  it('starts fetching after the user logs in (enabled flips true)', async () => {
    (notificationsApi.unreadCount as jest.Mock).mockResolvedValue({ unread_count: 2 });

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });
    expect(notificationsApi.unreadCount).not.toHaveBeenCalled();

    act(() => { useAuthStore.setState({ isAuthenticated: true }); });

    await waitFor(() => {
      expect(notificationsApi.unreadCount).toHaveBeenCalled();
      expect(result.current.count).toBe(2);
    });
  });
});
