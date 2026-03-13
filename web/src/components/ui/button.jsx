import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-medium',
    'rounded-lg transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-text-inverse hover:bg-accent-hover active:bg-accent-active shadow-sm',
        secondary:
          'bg-surface text-text-primary border border-border hover:bg-surface-hover active:bg-surface-active',
        ghost:
          'bg-transparent text-text-primary hover:bg-surface-hover active:bg-surface-active',
        danger:
          'bg-danger text-text-inverse hover:bg-danger/90 active:bg-danger/80 shadow-sm',
        outline:
          'bg-transparent text-text-primary border border-border-strong hover:bg-surface-hover active:bg-surface-active',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

const Spinner = ({ className }) => (
  <svg
    className={cn('animate-spin h-4 w-4', className)}
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
    aria-hidden='true'
  >
    <circle
      className='opacity-25'
      cx='12'
      cy='12'
      r='10'
      stroke='currentColor'
      strokeWidth='4'
    />
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
    />
  </svg>
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(buttonVariants({ variant, size }), className),
        ref,
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Spinner
            className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}
          />
        ) : leftIcon ? (
          <span className='inline-flex shrink-0'>{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && (
          <span className='inline-flex shrink-0'>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;
