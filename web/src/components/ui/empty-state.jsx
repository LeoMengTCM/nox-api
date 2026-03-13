import * as React from 'react';
import { cn } from '../../lib/cn';

const EmptyState = React.forwardRef(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className='mb-4'>
          <Icon className='h-10 w-10 text-text-tertiary' strokeWidth={1.5} />
        </div>
      )}
      {title && (
        <h3 className='font-heading text-lg font-semibold text-text-primary'>
          {title}
        </h3>
      )}
      {description && (
        <p className='mt-1.5 max-w-sm text-sm text-text-secondary'>
          {description}
        </p>
      )}
      {action && <div className='mt-5'>{action}</div>}
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
