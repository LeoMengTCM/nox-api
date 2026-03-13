import * as React from 'react';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const tagVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent-subtle text-accent',
        accent: 'bg-accent text-text-inverse',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Tag = React.forwardRef(
  ({ className, variant, icon, onClose, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(tagVariants({ variant }), 'px-2.5 py-0.5', className)}
      {...props}
    >
      {icon && <span className='flex shrink-0 items-center'>{icon}</span>}
      <span>{children}</span>
      {onClose && (
        <button
          type='button'
          onClick={onClose}
          className='ml-0.5 flex shrink-0 items-center rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none'
          aria-label='Remove'
        >
          <X className='h-3 w-3' />
        </button>
      )}
    </span>
  )
);
Tag.displayName = 'Tag';

export { Tag, tagVariants };
