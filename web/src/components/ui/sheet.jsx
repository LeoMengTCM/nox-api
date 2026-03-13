import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/cn';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetPortal = SheetPrimitive.Portal;

const SheetClose = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Close
    ref={ref}
    className={cn(
      'rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className
    )}
    {...props}
  />
));
SheetClose.displayName = 'SheetClose';

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const sheetVariants = {
  right: {
    position: 'fixed inset-y-0 right-0 z-50 h-full w-3/4 sm:max-w-sm',
    open: 'data-[state=open]:animate-slide-in-right',
    closed: 'data-[state=closed]:animate-slide-out-right',
    border: 'border-l border-border-subtle',
  },
  left: {
    position: 'fixed inset-y-0 left-0 z-50 h-full w-3/4 sm:max-w-sm',
    open: 'data-[state=open]:animate-slide-in-left',
    closed: 'data-[state=closed]:animate-slide-out-left',
    border: 'border-r border-border-subtle',
  },
  top: {
    position: 'fixed inset-x-0 top-0 z-50 w-full',
    open: 'data-[state=open]:animate-slide-in-top',
    closed: 'data-[state=closed]:animate-slide-out-top',
    border: 'border-b border-border-subtle',
  },
  bottom: {
    position: 'fixed inset-x-0 bottom-0 z-50 w-full',
    open: 'data-[state=open]:animate-slide-in-bottom',
    closed: 'data-[state=closed]:animate-slide-out-bottom',
    border: 'border-t border-border-subtle',
  },
};

const SheetContent = React.forwardRef(
  ({ className, children, side = 'right', showClose = true, ...props }, ref) => {
    const variant = sheetVariants[side] || sheetVariants.right;

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            variant.position,
            variant.border,
            'bg-surface shadow-xl',
            'p-6',
            variant.open,
            variant.closed,
            'focus-visible:outline-none',
            className
          )}
          {...props}
        >
          {children}
          {showClose && (
            <SheetPrimitive.Close
              className={cn(
                'absolute right-4 top-4 rounded-md p-1.5',
                'text-text-tertiary transition-colors hover:text-text-primary hover:bg-surface-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'
              )}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col gap-1.5 pb-4', className)}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold text-text-primary leading-tight',
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-secondary leading-relaxed', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
};
