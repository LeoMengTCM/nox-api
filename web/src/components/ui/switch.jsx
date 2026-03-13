import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/cn';

const Switch = React.forwardRef(
  (
    {
      className,
      label,
      description,
      disabled,
      checked,
      onCheckedChange,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;

    const switchElement = (
      <SwitchPrimitive.Root
        ref={ref}
        id={id}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
          'rounded-full border-2 border-transparent',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=unchecked]:bg-border-strong',
          'data-[state=checked]:bg-accent',
          className
        )}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white dark:bg-text-primary shadow-sm',
            'ring-0 transition-transform duration-150',
            'data-[state=unchecked]:translate-x-0',
            'data-[state=checked]:translate-x-4'
          )}
        />
      </SwitchPrimitive.Root>
    );

    if (!label && !description) {
      return switchElement;
    }

    return (
      <div className='flex items-start gap-2.5'>
        {switchElement}
        <div className='flex flex-col gap-0.5 select-none'>
          {label && (
            <label
              htmlFor={id}
              className={cn(
                'text-sm font-medium leading-tight text-text-primary cursor-pointer',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              className={cn(
                'text-xs text-text-secondary leading-snug',
                disabled && 'opacity-50'
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
export default Switch;
