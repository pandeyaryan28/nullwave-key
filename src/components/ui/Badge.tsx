import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const variants = {
    neutral:
      'bg-slate-100/90 text-neutral-800 border-slate-200/90 dark:bg-neutral-800/90 dark:text-neutral-200 dark:border-white/10 shadow-clay-sm',
    success:
      'bg-emerald-50/90 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80 shadow-clay-sm',
    warning:
      'bg-amber-50/90 text-amber-800 border-amber-200/90 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80 shadow-clay-sm',
    error:
      'bg-red-50/90 text-red-800 border-red-200/90 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/80 shadow-clay-sm',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border tracking-wide uppercase transition-all duration-150',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
