import React from 'react';

export type AdSlotType = 'top-banner' | 'sidebar-250' | 'sidebar-600' | 'bottom-banner';

interface MonetagAdSlotProps {
  type: AdSlotType;
  className?: string;
  id?: string;
}

const SLOT_CONFIGS: Record<AdSlotType, { label: string; dimensions: string; minHeight: string; widthClass: string }> = {
  'top-banner': {
    label: 'Advertisement • Top Banner',
    dimensions: '728×90 / Responsive',
    minHeight: 'min-h-[90px]',
    widthClass: 'w-full',
  },
  'sidebar-250': {
    label: 'Advertisement',
    dimensions: '300×250',
    minHeight: 'min-h-[250px]',
    widthClass: 'w-full',
  },
  'sidebar-600': {
    label: 'Advertisement',
    dimensions: '300×600',
    minHeight: 'min-h-[400px]',
    widthClass: 'w-full',
  },
  'bottom-banner': {
    label: 'Advertisement • Bottom Banner',
    dimensions: 'Responsive Banner',
    minHeight: 'min-h-[90px]',
    widthClass: 'w-full',
  },
};

export const MonetagAdSlot: React.FC<MonetagAdSlotProps> = ({
  type,
  className = '',
  id,
}) => {
  const config = SLOT_CONFIGS[type];
  const slotId = id || `monetag-slot-${type}`;

  return (
    <div
      id={slotId}
      className={`${config.widthClass} ${config.minHeight} rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 p-3 flex flex-col items-center justify-center text-center transition-colors ${className}`}
    >
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-neutral-400 dark:text-neutral-500">
        <span>{config.label}</span>
      </div>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
        {config.dimensions}
      </span>
      {/* Container anchor where Monetag direct banners or in-page tags can inject */}
      <div className="monetag-ad-container w-full h-full empty:hidden mt-2" />
    </div>
  );
};
