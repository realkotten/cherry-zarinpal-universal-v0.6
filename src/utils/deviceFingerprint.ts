/**
 * Deterministic Device Fingerprinting Utility
 * Collects standard non-invasive browser/device characteristics,
 * performs an offscreen 2D canvas render, and hashes with cyrb53.
 * Zero external dependencies.
 */

let cachedFingerprint: string | null = null;

/**
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 * Fast, deterministic 53-bit hash generator for pure JavaScript.
 */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: number; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '17px Arial';
    ctx.fillStyle = '#111827';
    ctx.fillText('trimbook', 10, 10);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

export function getDeviceFingerprint(): string {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    if (typeof window === 'undefined') {
      return 'fp-unavailable';
    }

    const nav = window.navigator || ({} as Navigator);
    const scr = window.screen || ({} as Screen);

    const userAgent = nav.userAgent || '';
    const language = nav.language || '';
    const screenW = scr.width || 0;
    const screenH = scr.height || 0;
    const colorDepth = scr.colorDepth || 0;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const timezoneOffset = new Date().getTimezoneOffset();
    const hardwareConcurrency = nav.hardwareConcurrency || 0;
    const maxTouchPoints = nav.maxTouchPoints || 0;
    const canvasHash = getCanvasHash();

    const components = [
      userAgent,
      language,
      screenW,
      screenH,
      colorDepth,
      devicePixelRatio,
      timezoneOffset,
      hardwareConcurrency,
      maxTouchPoints,
      canvasHash,
    ].join('###');

    const hash = cyrb53(components);
    cachedFingerprint = hash || 'fp-unavailable';
    return cachedFingerprint;
  } catch {
    return 'fp-unavailable';
  }
}
