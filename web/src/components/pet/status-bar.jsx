import * as React from 'react';
import { cn } from '../../lib/cn';

export function StatusBar({ label, icon: Icon, value = 0, max = 100, color = '#58D68D', className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isLow = value < 30;
  const barColor = isLow ? '#C75450' : color;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Icon && (
        <Icon
          className={cn('shrink-0', isLow ? 'text-danger' : 'text-text-tertiary')}
          size={14}
        />
      )}
      {label && (
        <span className="shrink-0 text-xs text-text-secondary w-8">{label}</span>
      )}
      <div className="relative flex-1 h-2 rounded-full bg-surface-active overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className={cn('shrink-0 text-xs tabular-nums w-8 text-right', isLow ? 'text-danger font-medium' : 'text-text-secondary')}>
        {value}
      </span>
    </div>
  );
}
