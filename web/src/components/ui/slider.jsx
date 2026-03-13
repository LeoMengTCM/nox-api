import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../lib/cn';

const Slider = React.forwardRef(
  (
    {
      className,
      label,
      showValue = false,
      disabled,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      onValueChange,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;

    const displayValue = value ?? defaultValue ?? [min];

    return (
      <div className='flex flex-col gap-2 w-full'>
        {(label || showValue) && (
          <div className='flex items-center justify-between'>
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'text-sm font-medium text-text-primary select-none',
                  disabled && 'opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {showValue && (
              <span
                className={cn(
                  'text-sm tabular-nums text-text-secondary font-mono',
                  disabled && 'opacity-50'
                )}
              >
                {Array.isArray(displayValue)
                  ? displayValue.join(' - ')
                  : displayValue}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          id={id}
          className={cn(
            'relative flex w-full touch-none select-none items-center',
            disabled && 'opacity-50 pointer-events-none',
            className
          )}
          min={min}
          max={max}
          step={step}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
          {...props}
        >
          <SliderPrimitive.Track
            className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-border'
          >
            <SliderPrimitive.Range
              className='absolute h-full bg-accent rounded-full'
            />
          </SliderPrimitive.Track>
          {(value ?? defaultValue ?? [0]).map((_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              className={cn(
                'block h-4 w-4 rounded-full',
                'bg-white dark:bg-surface border-2 border-accent',
                'shadow-sm',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
                'hover:border-accent-hover',
                'active:border-accent-active'
              )}
            />
          ))}
        </SliderPrimitive.Root>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
export default Slider;
