import * as React from 'react';
import { cn } from '../../lib/cn';

const SIBLING_COUNT = 1;

function getPageRange(page, totalPages) {
  const pages = [];
  const left = Math.max(2, page - SIBLING_COUNT);
  const right = Math.min(totalPages - 1, page + SIBLING_COUNT);

  pages.push(1);

  if (left > 2) {
    pages.push('...');
  }

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

const PageButton = React.forwardRef(
  ({ active, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        active
          ? 'bg-accent text-text-inverse'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        disabled && 'pointer-events-none opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
PageButton.displayName = 'PageButton';

/**
 * Flexible Pagination component.
 *
 * Supports multiple prop conventions:
 *   page / current / currentPage — current page (1-based)
 *   pageSize                     — items per page (default 10)
 *   total                        — total item count
 *   totalPages                   — total page count (alternative to total + pageSize)
 *   onPageChange / onChange       — callback(newPageNumber)
 *   onPageSizeChange              — callback(newPageSize)
 */
function Pagination({
  page: pageProp,
  current,
  currentPage: currentPageProp,
  pageSize: pageSizeProp,
  total: totalProp,
  totalPages: totalPagesProp,
  onPageChange: onPageChangeProp,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) {
  // Normalize current page (1-based)
  const page = pageProp ?? current ?? currentPageProp ?? 1;
  const pageSize = pageSizeProp || 10;

  // Compute total pages
  let totalPages;
  let total;
  if (totalPagesProp != null) {
    totalPages = Math.max(1, totalPagesProp);
    total = totalPages * pageSize;
  } else {
    total = totalProp ?? 0;
    totalPages = Math.max(1, Math.ceil(total / pageSize));
  }

  const pages = getPageRange(page, totalPages);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Unified callbacks — always pass plain page number
  const firePageChange = (newPage) => {
    onChange?.(newPage);
    onPageChangeProp?.(newPage);
  };

  const firePageSizeChange = (newSize) => {
    onPageSizeChange?.(newSize);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 px-1 py-3 text-sm',
        className
      )}
    >
      {/* Left: summary and page size */}
      <div className='flex items-center gap-3 text-text-tertiary'>
        <span>
          {total === 0
            ? '暂无数据'
            : `${start}-${end} / ${total}`}
        </span>

        {pageSizeOptions.length > 1 && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              firePageSizeChange(newSize);
              firePageChange(1);
            }}
            className={cn(
              'h-8 rounded-md border border-border bg-surface px-2 text-sm text-text-secondary',
              'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40',
              'transition-colors'
            )}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} 条/页
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div className='flex items-center gap-1'>
          <PageButton
            disabled={page <= 1}
            onClick={() => firePageChange(page - 1)}
            aria-label='上一页'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 16 16'
              fill='none'
              className='shrink-0'
            >
              <path
                d='M10 12L6 8L10 4'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </PageButton>

          {pages.map((p, idx) =>
            p === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className='inline-flex h-8 min-w-8 items-center justify-center text-text-tertiary'
              >
                ...
              </span>
            ) : (
              <PageButton
                key={p}
                active={p === page}
                onClick={() => firePageChange(p)}
              >
                {p}
              </PageButton>
            )
          )}

          <PageButton
            disabled={page >= totalPages}
            onClick={() => firePageChange(page + 1)}
            aria-label='下一页'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 16 16'
              fill='none'
              className='shrink-0'
            >
              <path
                d='M6 4L10 8L6 12'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </PageButton>
        </div>
      )}
    </div>
  );
}

export { Pagination };
