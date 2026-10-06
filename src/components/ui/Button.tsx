import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:opacity-50 disabled:pointer-events-none rounded-md select-none';

    const variants = {
      primary:
        'bg-neutral-900 text-neutral-50 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-clay-btn hover:shadow-clay-btn-hover active:shadow-clay-btn-active hover:-translate-y-0.5 active:translate-y-0',
      secondary:
        'bg-white/90 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-700/80 border border-slate-200/80 dark:border-white/10 shadow-clay-sm hover:shadow-clay-card hover:-translate-y-0.5 active:translate-y-0',
      outline:
        'border border-slate-300/80 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 text-neutral-900 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-800 hover:-translate-y-0.5 active:translate-y-0 shadow-clay-sm',
      subtle:
        'bg-transparent text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0',
      danger:
        'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 shadow-clay-btn hover:shadow-clay-btn-hover active:shadow-clay-btn-active hover:-translate-y-0.5 active:translate-y-0',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
