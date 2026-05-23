import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { PATHS } from './paths';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SellersListPage } from '@/pages/sellers/SellersListPage';
import { SellerDetailPage } from '@/pages/sellers/SellerDetailPage';
import { UsersListPage } from '@/pages/users/UsersListPage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { OrdersListPage } from '@/pages/orders/OrdersListPage';
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage';
import { CategoriesPage } from '@/pages/categories/CategoriesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

export const router = createBrowserRouter([
  {
    path: PATHS.LOGIN,
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Navigate to={PATHS.DASHBOARD} replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'sellers', element: <SellersListPage /> },
      { path: 'sellers/:id', element: <SellerDetailPage /> },
      { path: 'users', element: <UsersListPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'orders', element: <OrdersListPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
