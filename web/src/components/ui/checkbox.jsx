import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../../lib/cn';

const Checkbox = React.forwardRef(
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

    const isIndeterminate = checked === 'indeterminate';

    return (
      <div className='flex items-start gap-2.5'>
        <CheckboxPrimitive.Root
          ref={ref}
          id={id}
          className={cn(
            'peer h-4 w-4 shrink-0 mt-0.5',
            'rounded-[4px] border border-border-strong',
            'bg-surface',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-text-inverse',
            'data-[state=indeterminate]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:text-text-inverse',
            className
          )}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          {...props}
        >
          <CheckboxPrimitive.Indicator
            className='flex items-center justify-center text-current'
          >
            {isIndeterminate ? (
              <svg
                className='h-3 w-3'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M5 12h14' />
              </svg>
            ) : (
              <svg
                className='h-3 w-3'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M20 6 9 17l-5-5' />
              </svg>
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {(label || description) && (
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
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;
