import * as React from 'react';
import { cn } from '../../lib/cn';

export function StarDisplay({ star = 0, maxStars = 5, size = 'md', className }) {
  const sizePx = size === 'sm' ? 12 : 16;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${star} out of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }, (_, i) => (
        <span
          key={i}
          style={{ fontSize: sizePx, lineHeight: 1 }}
          className={cn(
            i < star ? 'text-[#FFD700]' : 'text-slate-300 dark:text-slate-600'
          )}
        >
          {i < star ? '\u2605' : '\u2606'}
        </span>
      ))}
    </span>
  );
}
