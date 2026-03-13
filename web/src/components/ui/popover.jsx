import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/cn';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverClose = React.forwardRef(({ className, ...props }, ref) => (
  <PopoverPrimitive.Close
    ref={ref}
    className={cn(
      'rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className
    )}
    {...props}
  />
));
PopoverClose.displayName = 'PopoverClose';

const PopoverContent = React.forwardRef(
  (
    {
      className,
      children,
      align = 'center',
      side = 'bottom',
      sideOffset = 6,
      showArrow = true,
      ...props
    },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-lg',
          'outline-none',
          'data-[state=open]:animate-fade-in data-[state=open]:animate-slide-in-top',
          'data-[state=closed]:animate-fade-out',
          'data-[side=bottom]:animate-slide-in-top',
          'data-[side=top]:animate-slide-in-bottom',
          'data-[side=left]:animate-slide-in-right',
          'data-[side=right]:animate-slide-in-left',
          className
        )}
        {...props}
      >
        {children}
        {showArrow && (
          <PopoverPrimitive.Arrow
            className="fill-surface drop-shadow-sm"
            width={12}
            height={6}
          />
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverAnchor };
