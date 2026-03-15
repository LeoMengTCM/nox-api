import * as React from 'react';
import { cn } from '../../lib/cn';

const RARITY_CONFIG = {
  N: {
    label: 'N',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  R: {
    label: 'R',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  },
  SR: {
    label: 'SR',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  },
  SSR: {
    label: 'SSR',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    shimmer: true,
  },
};

export function RarityBadge({ rarity, className }) {
  const config = RARITY_CONFIG[rarity];
  if (!config) {
    return (
      <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded bg-border/50 text-text-secondary', className)}>
        {rarity || '?'}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide',
        config.className,
        config.shimmer && 'ssr-shimmer',
        className
      )}
    >
      {config.label}
      {config.shimmer && (
        <style>{`
          @keyframes ssr-shimmer-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          .ssr-shimmer {
            position: relative;
            overflow: hidden;
          }
          .ssr-shimmer::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 50%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: ssr-shimmer-sweep 2.5s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .ssr-shimmer::after { animation: none; }
          }
        `}</style>
      )}
    </span>
  );
}
