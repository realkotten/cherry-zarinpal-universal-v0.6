const KEY = 'trimbook_device_uuid_v1';

function genUuid(): string {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  });
}
function readCookie(): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(id: string): void {
  document.cookie = KEY + '=' + encodeURIComponent(id) + '; max-age=' + (60 * 60 * 24 * 730) + '; path=/; SameSite=Lax';
}
function readLocal(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function writeLocal(id: string): void { try { localStorage.setItem(KEY, id); } catch {} }
function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('trimbook-identity', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('kv'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbGet(): Promise<string | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(KEY);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbSet(id: string): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  try { db.transaction('kv', 'readwrite').objectStore('kv').put(id, KEY); } catch {}
}
export async function getDeviceUuid(): Promise<string> {
  let id = readLocal() || readCookie() || (await idbGet());
  if (!id) id = genUuid();
  writeLocal(id); writeCookie(id); await idbSet(id);
  return id;
}
