import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  variant?: 'default' | 'elevated' | 'interactive' | 'inset';
}

export const Card: React.FC<CardProps> = ({
  className,
  elevated = false,
  variant,
  children,
  ...props
}) => {
  const resolvedVariant =
    variant || (elevated ? 'elevated' : props.onClick ? 'interactive' : 'default');

  const baseStyles =
    'rounded-2xl border transition-all duration-200 text-neutral-900 dark:text-neutral-100';

  const variants = {
    default:
      'bg-white dark:bg-[#1a1e28] border-slate-200/80 dark:border-white/10 shadow-clay-card',
    elevated:
      'bg-white dark:bg-[#1a1e28] border-slate-200/90 dark:border-white/15 shadow-clay-card hover:shadow-clay-card-hover',
    interactive:
      'bg-white dark:bg-[#1a1e28] border-slate-200/80 dark:border-white/10 shadow-clay-card hover:shadow-clay-card-hover hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] cursor-pointer',
    inset:
      'bg-[#e7ecf3] dark:bg-[#131720] border-slate-200/60 dark:border-white/5 shadow-clay-inset',
  };

  return (
    <div
      className={twMerge(
        clsx(
          baseStyles,
          variants[resolvedVariant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
