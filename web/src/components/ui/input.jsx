import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const inputVariants = cva(
  [
    'flex w-full bg-surface text-text-primary font-sans text-sm',
    'border border-border rounded-lg',
    'placeholder:text-text-tertiary',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      inputSize: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-9 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
      hasError: {
        true: 'border-danger focus-visible:ring-danger/30',
        false: '',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      hasError: false,
    },
  }
);

const Input = React.forwardRef(
  (
    {
      className,
      type = 'text',
      inputSize,
      label,
      error,
      prefixIcon,
      suffixIcon,
      disabled,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;
    const hasError = !!error;

    return (
      <div className='flex flex-col gap-1.5 w-full'>
        {label && (
          <label
            htmlFor={id}
            className='text-sm font-medium text-text-primary select-none'
          >
            {label}
          </label>
        )}
        <div className='relative flex items-center'>
          {prefixIcon && (
            <span className='absolute left-3 flex items-center text-text-tertiary pointer-events-none'>
              {prefixIcon}
            </span>
          )}
          <input
            id={id}
            type={type}
            className={cn(
              inputVariants({ inputSize, hasError }),
              prefixIcon && 'pl-9',
              suffixIcon && 'pr-9',
              className
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            {...props}
          />
          {suffixIcon && (
            <span className='absolute right-3 flex items-center text-text-tertiary pointer-events-none'>
              {suffixIcon}
            </span>
          )}
        </div>
        {error && (
          <p
            id={`${id}-error`}
            className='text-xs text-danger'
            role='alert'
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
export default Input;
