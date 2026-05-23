import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { queryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 5000 }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
