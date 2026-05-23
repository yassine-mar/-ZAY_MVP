import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { PATHS } from './paths';
import type { ReactNode } from 'react';

/**
 * Bounces already-authenticated admins away from the login page.
 * (Standard UX — no point letting them see /login if they're logged in.)
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }
  return <>{children}</>;
}
