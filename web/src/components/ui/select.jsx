import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../../lib/cn';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(
  ({ className, children, label, error, id: idProp, ...props }, ref) => {
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
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2',
            'bg-surface text-text-primary font-sans text-sm',
            'border rounded-lg px-3 py-2',
            'transition-colors duration-150',
            'placeholder:text-text-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError
              ? 'border-danger focus-visible:ring-danger/30'
              : 'border-border',
            className
          )}
          aria-invalid={hasError}
          {...props}
        >
          {children}
          <SelectPrimitive.Icon asChild>
            <svg
              className='h-4 w-4 text-text-tertiary shrink-0'
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='m6 9 6 6 6-6' />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        {error && (
          <p className='text-xs text-danger' role='alert'>
            {error}
          </p>
        )}
      </div>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectScrollUpButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-text-tertiary',
        className
      )}
      {...props}
    >
      <svg
        className='h-4 w-4'
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='m18 15-6-6-6 6' />
      </svg>
    </SelectPrimitive.ScrollUpButton>
  )
);
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-text-tertiary',
        className
      )}
      {...props}
    >
      <svg
        className='h-4 w-4'
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='m6 9 6 6 6-6' />
      </svg>
    </SelectPrimitive.ScrollDownButton>
  )
);
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

const SelectContent = React.forwardRef(
  ({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-72 min-w-[8rem] overflow-hidden',
          'bg-surface text-text-primary',
          'border border-border rounded-lg shadow-lg',
          'animate-fade-in',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-text-secondary',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center',
        'rounded-md py-1.5 pl-8 pr-2 text-sm',
        'text-text-primary',
        'outline-none transition-colors duration-150',
        'focus:bg-surface-hover',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className='absolute left-2 flex h-4 w-4 items-center justify-center'>
        <SelectPrimitive.ItemIndicator>
          <svg
            className='h-4 w-4 text-accent'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M20 6 9 17l-5-5' />
          </svg>
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
);
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border-subtle', className)}
      {...props}
    />
  )
);
SelectSeparator.displayName = 'SelectSeparator';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

export default Select;
