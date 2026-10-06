import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-150',
              'bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500',
              'shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/40 text-red-900 dark:text-red-200'
                : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-slate-400 dark:focus:border-neutral-500',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
