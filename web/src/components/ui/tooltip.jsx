import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
  (
    {
      className,
      children,
      side = 'top',
      sideOffset = 6,
      showArrow = true,
      ...props
    },
    ref
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-xs rounded-md px-3 py-1.5',
          'bg-text-primary text-text-inverse text-xs leading-normal',
          'shadow-md',
          'select-none',
          'data-[state=delayed-open]:animate-fade-in',
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
          <TooltipPrimitive.Arrow
            className="fill-text-primary"
            width={10}
            height={5}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
);
TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
