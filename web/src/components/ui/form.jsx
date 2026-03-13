import * as React from 'react';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ */
/*  Layout Components                                                  */
/* ------------------------------------------------------------------ */

const FormField = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1.5', className)}
    {...props}
  />
));
FormField.displayName = 'FormField';

const FormLabel = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium text-text-primary', className)}
    {...props}
  >
    {children}
    {required && (
      <span className='ml-0.5 text-danger' aria-hidden='true'>
        *
      </span>
    )}
  </label>
));
FormLabel.displayName = 'FormLabel';

const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role='alert'
      className={cn('text-xs text-danger', className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

const FormDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-text-tertiary', className)}
    {...props}
  />
));
FormDescription.displayName = 'FormDescription';

/* ------------------------------------------------------------------ */
/*  useFormState Hook                                                  */
/* ------------------------------------------------------------------ */

/**
 * Lightweight form state manager.
 *
 * @param {Object} initialValues  - default values keyed by field name
 * @param {Object} validationRules - optional validation functions keyed by field name.
 *   Each function receives (value, allValues) and should return an error string or
 *   undefined/null/"" if valid.
 *
 * @returns {{ values, errors, touched, setValue, setError, setTouched, validate, reset }}
 */
function useFormState(initialValues = {}, validationRules = {}) {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const setValue = React.useCallback(
    (name, value) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };

        // Clear error for the field when value changes
        setErrors((prevErrors) => {
          if (!prevErrors[name]) return prevErrors;
          const { [name]: _, ...rest } = prevErrors;
          return rest;
        });

        return next;
      });
    },
    []
  );

  const setError = React.useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const setFieldTouched = React.useCallback((name, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  const validate = React.useCallback(() => {
    const newErrors = {};
    let isValid = true;

    for (const [name, rule] of Object.entries(validationRules)) {
      const error = rule(values[name], values);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    // Mark all fields as touched on validate
    const allTouched = {};
    for (const name of Object.keys(validationRules)) {
      allTouched[name] = true;
    }
    setTouched((prev) => ({ ...prev, ...allTouched }));

    return isValid;
  }, [values, validationRules]);

  const reset = React.useCallback(
    (nextValues) => {
      setValues(nextValues ?? initialValues);
      setErrors({});
      setTouched({});
    },
    [initialValues]
  );

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched: setFieldTouched,
    validate,
    reset,
  };
}

export { FormField, FormLabel, FormMessage, FormDescription, useFormState };
