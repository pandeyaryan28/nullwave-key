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
  zoneId: '11959623',
  swPath: '/sw.js',
  scriptUrl: 'https://5gvci.com/act/files/tag.min.js?z=11959623',
};

const SCRIPT_ELEMENT_ID = 'monetag-tag-script';

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
 * Dynamically loads the Monetag Push/MultiTag ad delivery script.
 */
export function loadMonetagScript(config: MonetagConfig = DEFAULT_MONETAG_CONFIG): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Check if script is already injected by ID or source
  const existingScript =
    document.getElementById(SCRIPT_ELEMENT_ID) ||
    document.querySelector(`script[src*="${config.zoneId}"]`);
  if (existingScript) {
    return () => {};
  }

  try {
    const script = document.createElement('script');
    script.id = SCRIPT_ELEMENT_ID;
    script.src = config.scriptUrl || `https://${config.domain}/tag.min.js`;
    script.setAttribute('data-zone', String(config.zoneId));
    script.setAttribute('data-cfasync', 'false');
    script.async = true;

    // Append to document body or head
    const target = document.body || document.head || document.documentElement;
    target.appendChild(script);

    return () => {
      // Optional cleanup
      const el = document.getElementById(SCRIPT_ELEMENT_ID);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  } catch (err) {
    console.debug('[Monetag] Tag loader note:', err);
    return () => {};
  }
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
