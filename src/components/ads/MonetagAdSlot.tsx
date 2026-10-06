import React from 'react';
import { ADS_ENABLED, triggerMonetagClick } from '../../lib/ads/monetag';

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
  if (!ADS_ENABLED) {
    return null;
  }

  const config = SLOT_CONFIGS[type];
  const slotId = id || `monetag-slot-${type}`;

  const handleClick = (e: React.MouseEvent) => {
    triggerMonetagClick(e);
  };

  return (
    <div
      id={slotId}
      onClick={handleClick}
      className={`cursor-pointer group ${config.widthClass} ${config.minHeight} rounded-md border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-900/40 p-3 flex flex-col items-center justify-center text-center transition-all ${className}`}
      title="Sponsored Space • Click to interact"
    >
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors">
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
