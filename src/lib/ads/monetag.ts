/**
 * Monetag Ad Integration Service
 * Manages service worker registration, MultiTag script loading, and ad zone configuration.
 */

export interface MonetagConfig {
  domain: string;
  zoneId: string | number;
  swPath?: string;
  scriptUrl?: string;
}

export const DEFAULT_MONETAG_CONFIG: MonetagConfig = {
  domain: '3nbf4.com',
  zoneId: '11959768',
  swPath: '/sw.js',
  scriptUrl: 'https://quge5.com/88/tag.min.js',
};

export const MONETAG_TAGS = [
  { src: 'https://5gvci.com/act/files/tag.min.js?z=11959623', zone: '11959623' },
  { src: 'https://quge5.com/88/tag.min.js', zone: '290826' },
];

/**
 * Registers the Monetag Service Worker (sw.js) required for Web Push,
 * In-Page Push notifications, and site verification.
 */
export async function registerMonetagServiceWorker(swPath: string = DEFAULT_MONETAG_CONFIG.swPath || '/sw.js'): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.debug('[Monetag] Service worker registration note:', error);
    return null;
  }
}

/**
 * Dynamically loads the Monetag Push and OnClick/Direct ad delivery scripts.
 */
export function loadMonetagScript(_config: MonetagConfig = DEFAULT_MONETAG_CONFIG): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  MONETAG_TAGS.forEach(tag => {
    const id = `monetag-tag-${tag.zone}`;
    const exists =
      document.getElementById(id) ||
      document.querySelector(`script[src*="${tag.zone}"]`) ||
      document.querySelector(`script[data-zone="${tag.zone}"]`);

    if (!exists) {
      try {
        const script = document.createElement('script');
        script.id = id;
        script.src = tag.src;
        script.setAttribute('data-zone', tag.zone);
        script.setAttribute('data-cfasync', 'false');
        script.async = true;

        const target = document.body || document.head || document.documentElement;
        target.appendChild(script);
      } catch (err) {
        console.debug('[Monetag] Tag loader note for zone', tag.zone, err);
      }
    }
  });

  return () => {};
}

/**
 * Initializes full Monetag ad delivery on the targeted page.
 * Registers the root service worker and attaches the MultiTag script.
 */
export function initMonetag(config: MonetagConfig = DEFAULT_MONETAG_CONFIG): () => void {
  registerMonetagServiceWorker(config.swPath);
  const cleanup = loadMonetagScript(config);
  return cleanup;
}
