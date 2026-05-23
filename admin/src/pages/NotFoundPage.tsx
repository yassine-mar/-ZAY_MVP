import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-serif text-6xl font-bold text-primary">404</h1>
        <p className="text-base text-muted-foreground">
          That page doesn't exist or has moved.
        </p>
        <Button asChild>
          <Link to={PATHS.DASHBOARD}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
