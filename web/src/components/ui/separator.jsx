import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../../lib/cn';

const Separator = React.forwardRef(
  (
    {
      className,
      orientation = 'horizontal',
      decorative = true,
      label,
      ...props
    },
    ref
  ) => {
    if (label) {
      return (
        <div
          className={cn(
            'flex items-center',
            orientation === 'vertical' ? 'flex-col' : 'flex-row',
            className
          )}
          role={decorative ? 'none' : 'separator'}
          aria-orientation={decorative ? undefined : orientation}
        >
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              'shrink-0 bg-border',
              orientation === 'horizontal' ? 'h-[1px] flex-1' : 'w-[1px] flex-1'
            )}
            {...props}
          />
          <span className='shrink-0 px-3 text-xs text-text-tertiary'>
            {label}
          </span>
          <SeparatorPrimitive.Root
            decorative={decorative}
            orientation={orientation}
            className={cn(
              'shrink-0 bg-border',
              orientation === 'horizontal' ? 'h-[1px] flex-1' : 'w-[1px] flex-1'
            )}
          />
        </div>
      );
    }

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        {...props}
      />
    );
  }
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
