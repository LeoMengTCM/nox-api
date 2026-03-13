import * as React from 'react';
import { cn } from '../../lib/cn';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './table';
import { Checkbox } from './checkbox';
import { Pagination } from './pagination';

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/** Resolve column identifier: supports key, accessorKey, id */
function getColKey(col) {
  return col.key || col.accessorKey || col.id;
}

/** Render cell content — supports both render(row, idx) and cell({ row: { original } }) */
function renderCell(col, row, rowIdx) {
  if (col.render) {
    // render(rowData, rowIndex) — pass full row as first arg
    return col.render(row, rowIdx);
  }
  if (col.cell) {
    // TanStack-style: cell({ row: { original }, getValue })
    const colKey = getColKey(col);
    return col.cell({
      row: { original: row },
      getValue: () => (colKey != null ? row[colKey] : undefined),
    });
  }
  // Fallback: plain value
  const colKey = getColKey(col);
  return colKey != null ? row[colKey] : null;
}

/* ------------------------------------------------------------------ */
/*  Internal: sort indicator                                           */
/* ------------------------------------------------------------------ */

function SortIcon({ direction }) {
  return (
    <span className='ml-1 inline-flex flex-col text-text-tertiary'>
      <svg
        width='8'
        height='5'
        viewBox='0 0 8 5'
        fill='none'
        className={cn(
          '-mb-px transition-colors',
          direction === 'asc' ? 'text-accent' : 'text-border-strong'
        )}
      >
        <path d='M4 0L7.5 4.5H0.5L4 0Z' fill='currentColor' />
      </svg>
      <svg
        width='8'
        height='5'
        viewBox='0 0 8 5'
        fill='none'
        className={cn(
          'transition-colors',
          direction === 'desc' ? 'text-accent' : 'text-border-strong'
        )}
      >
        <path d='M4 5L0.5 0.5L7.5 0.5L4 5Z' fill='currentColor' />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: skeleton rows for loading state                          */
/* ------------------------------------------------------------------ */

function SkeletonRow({ colCount }) {
  return (
    <TableRow className='pointer-events-none'>
      {Array.from({ length: colCount }).map((_, i) => (
        <TableCell key={i}>
          <div className='h-4 w-3/4 animate-pulse rounded bg-surface-active' />
        </TableCell>
      ))}
    </TableRow>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: empty state                                              */
/* ------------------------------------------------------------------ */

function EmptyState({ message, colCount }) {
  return (
    <TableRow className='hover:bg-transparent'>
      <TableCell colSpan={colCount} className='h-32 text-center'>
        <div className='flex flex-col items-center justify-center gap-2 text-text-tertiary'>
          <svg
            width='40'
            height='40'
            viewBox='0 0 24 24'
            fill='none'
            className='opacity-40'
          >
            <path
              d='M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
          </svg>
          <span className='text-sm'>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ------------------------------------------------------------------ */
/*  DataTable                                                          */
/* ------------------------------------------------------------------ */

function DataTable({
  columns,
  data: dataProp,
  loading = false,
  emptyMessage,
  noDataText,
  selectable = false,
  selectedRows,
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  pagination,
  rowKey = 'id',
  striped = false,
  className,
}) {
  const data = Array.isArray(dataProp) ? dataProp : [];
  const emptyMsg = emptyMessage || noDataText || '暂无数据';

  // Total visible column count (for colSpan on empty / loading states)
  const visibleColCount = columns.length + (selectable ? 1 : 0);

  // Selection helpers
  const allKeys = React.useMemo(
    () => data.map((row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey])),
    [data, rowKey]
  );

  const allSelected =
    selectable && allKeys.length > 0 && allKeys.every((k) => selectedRows?.has(k));

  const someSelected =
    selectable && !allSelected && allKeys.some((k) => selectedRows?.has(k));

  function handleSelectAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  }

  function handleSelectRow(key) {
    if (!onSelectionChange || !selectedRows) return;
    const next = new Set(selectedRows);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  }

  function handleSort(col) {
    const colKey = getColKey(col);
    if (!col.sortable || !onSort) return;
    if (sortColumn === colKey) {
      onSort(colKey, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(colKey, 'asc');
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className='overflow-hidden rounded-lg border border-border'>
        <Table>
          {/* Header */}
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              {selectable && (
                <TableHead className='w-10'>
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                    aria-label='Select all rows'
                  />
                </TableHead>
              )}

              {columns.map((col, colIdx) => {
                const colKey = getColKey(col);
                return (
                  <TableHead
                    key={colKey || colIdx}
                    style={
                      col.width || col.size
                        ? { width: col.width || col.size }
                        : undefined
                    }
                    className={cn(
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.sortable && 'cursor-pointer select-none'
                    )}
                    onClick={() => handleSort(col)}
                  >
                    <span className='inline-flex items-center gap-0.5'>
                      {col.header}
                      {col.sortable && (
                        <SortIcon
                          direction={sortColumn === colKey ? sortDirection : null}
                        />
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          {/* Body */}
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} colCount={visibleColCount} />
              ))
            ) : data.length === 0 ? (
              <EmptyState message={emptyMsg} colCount={visibleColCount} />
            ) : (
              data.map((row, rowIdx) => {
                const key =
                  typeof rowKey === 'function' ? rowKey(row) : row[rowKey];
                const isSelected = selectable && selectedRows?.has(key);

                return (
                  <TableRow
                    key={key ?? rowIdx}
                    className={cn(
                      isSelected && 'bg-accent-subtle',
                      striped && 'even:bg-surface-hover/50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(key)}
                          aria-label={`Select row ${rowIdx + 1}`}
                        />
                      </TableCell>
                    )}

                    {columns.map((col, colIdx) => {
                      const colKey = getColKey(col);
                      return (
                        <TableCell
                          key={colKey || colIdx}
                          className={cn(
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right'
                          )}
                        >
                          {renderCell(col, row, rowIdx)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  );
}

export { DataTable };
