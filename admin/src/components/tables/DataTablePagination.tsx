import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api.types';

interface Props {
  pagination?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({ pagination, onPageChange }: Props) {
  if (!pagination) return null;
  const { page, totalPages, total, hasNext, hasPrev } = pagination;

  return (
    <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-muted-foreground">
      <div>
        Showing page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{Math.max(totalPages, 1)}</span>
        <span className="ml-2">({total} total)</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
