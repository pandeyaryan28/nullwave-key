/**
 * Monetag Universal Ad Engine
 * Manages service worker registration, all MultiTag direct formats,
 * SPA route-change re-arming, click-trigger forwarding, and ad-block detection.
 */

export interface MonetagTagDefinition {
  src: string;
  zone: string;
  format: 'multitag' | 'onclick' | 'vignette' | 'push';
}

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

export const MONETAG_ALL_TAGS: MonetagTagDefinition[] = [
  {
    src: 'https://quge5.com/88/tag.min.js',
    zone: '290826',
    format: 'multitag',
  },
  {
    src: 'https://b3mny.com/tag.min.js?z=11959766',
    zone: '11959766',
    format: 'onclick',
  },
  {
    src: 'https://ekhay.com/vignette.min.js?z=11959767',
    zone: '11959767',
    format: 'vignette',
  },
  {
    src: 'https://auqot.com/pfe/current/tag.min.js?z=11959768',
    zone: '11959768',
    format: 'push',
  },
  {
    src: 'https://5gvci.com/act/files/tag.min.js?z=11959623',
    zone: '11959623',
    format: 'push',
  },
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
 * Dynamically injects all Monetag ad tags across the web application.
 */
export function loadAllMonetagTags(): void {
  if (typeof window === 'undefined') {
    return;
  }

  MONETAG_ALL_TAGS.forEach((tag) => {
    const id = `monetag-tag-${tag.zone}`;
    const exists =
      document.getElementById(id) ||
      document.querySelector(`script[data-zone="${tag.zone}"]`) ||
      document.querySelector(`script[src*="${tag.zone}"]`);

    if (!exists) {
      try {
        const s = document.createElement('script');
        s.id = id;
        s.src = tag.src;
        s.setAttribute('data-zone', tag.zone);
        s.setAttribute('data-cfasync', 'false');
        s.async = true;
        (document.body || document.head || document.documentElement).appendChild(s);
      } catch (err) {
        console.debug('[Monetag] Tag injection note for zone', tag.zone, err);
      }
    }
  });
}

/**
 * Legacy compatibility export for single-call loaders.
 */
export function loadMonetagScript(_config: MonetagConfig = DEFAULT_MONETAG_CONFIG): () => void {
  loadAllMonetagTags();
  return () => {};
}

/**
 * Triggers an ad interaction event across all listeners.
 * Useful in SPAs when clicking custom buttons, PDF overlays, or ad slots.
 */
export function triggerMonetagClick(event?: MouseEvent | React.MouseEvent): void {
  if (typeof window === 'undefined') return;

  try {
    const clickEvt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: (event && 'clientX' in event) ? event.clientX : window.innerWidth / 2,
      clientY: (event && 'clientY' in event) ? event.clientY : window.innerHeight / 2,
    });
    document.dispatchEvent(clickEvt);
  } catch {}
}

/**
 * Checks whether an adblocker is actively blocking Monetag scripts.
 */
export async function detectAdBlocker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const testRequest = new Request('https://quge5.com/88/tag.min.js', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    await fetch(testRequest);
    return false;
  } catch {
    return true;
  }
}

/**
 * Initializes full Monetag ad delivery on the targeted page.
 * Registers the root service worker and attaches all MultiTag scripts.
 */
export function initMonetag(_config: MonetagConfig = DEFAULT_MONETAG_CONFIG): () => void {
  registerMonetagServiceWorker();
  loadAllMonetagTags();
  return () => {};
}

/**
 * Universal initializer called on SPA route changes.
 */
export function initMonetagUniversal(): void {
  registerMonetagServiceWorker();
  loadAllMonetagTags();
}
