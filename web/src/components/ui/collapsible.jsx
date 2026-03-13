import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { cn } from '../../lib/cn';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      className={cn(
        'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-text-primary',
        'transition-colors hover:bg-surface-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className
      )}
      {...props}
    >
      {children}
      <svg
        width='16'
        height='16'
        viewBox='0 0 16 16'
        fill='none'
        className={cn(
          'shrink-0 text-text-tertiary transition-transform duration-200',
          'group-data-[state=open]:rotate-180'
        )}
        aria-hidden='true'
      >
        <path
          d='M4 6L8 10L12 6'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </CollapsiblePrimitive.Trigger>
  )
);
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

const CollapsibleContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <CollapsiblePrimitive.Content
      ref={ref}
      className={cn(
        'overflow-hidden transition-all',
        'data-[state=open]:animate-collapsible-open data-[state=closed]:animate-collapsible-closed',
        className
      )}
      {...props}
    >
      <div className='pb-1 pt-1'>{children}</div>
    </CollapsiblePrimitive.Content>
  )
);
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
