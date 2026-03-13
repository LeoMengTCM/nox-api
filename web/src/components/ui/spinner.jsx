import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-accent border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const Spinner = React.forwardRef(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    role='status'
    aria-label='Loading'
    className={cn(spinnerVariants({ size }), className)}
    {...props}
  >
    <span className='sr-only'>Loading...</span>
  </div>
));
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
