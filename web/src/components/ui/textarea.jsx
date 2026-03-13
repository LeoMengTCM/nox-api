import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const textareaVariants = cva(
  [
    'flex w-full bg-surface text-text-primary font-sans text-sm',
    'border border-border rounded-lg',
    'placeholder:text-text-tertiary',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'resize-vertical',
  ],
  {
    variants: {
      textareaSize: {
        sm: 'px-3 py-2 text-xs rounded-md min-h-[60px]',
        default: 'px-3 py-2 text-sm min-h-[80px]',
        lg: 'px-4 py-3 text-base min-h-[120px]',
      },
      hasError: {
        true: 'border-danger focus-visible:ring-danger/30',
        false: '',
      },
    },
    defaultVariants: {
      textareaSize: 'default',
      hasError: false,
    },
  }
);

const Textarea = React.forwardRef(
  (
    {
      className,
      textareaSize,
      label,
      error,
      autoResize = false,
      disabled,
      id: idProp,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;
    const hasError = !!error;
    const internalRef = React.useRef(null);

    const combinedRef = React.useCallback(
      (node) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const adjustHeight = React.useCallback(() => {
      const el = internalRef.current;
      if (!el || !autoResize) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [autoResize]);

    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);

    const handleChange = React.useCallback(
      (e) => {
        onChange?.(e);
        adjustHeight();
      },
      [onChange, adjustHeight]
    );

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
        <textarea
          id={id}
          className={cn(
            textareaVariants({ textareaSize, hasError }),
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          ref={combinedRef}
          disabled={disabled}
          onChange={handleChange}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
export default Textarea;
