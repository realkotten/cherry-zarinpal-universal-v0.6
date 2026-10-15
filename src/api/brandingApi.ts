import { getJson, API_BASE } from "./paymentApi";

export interface Branding { tenantKey: string; salonName: string; barberName: string; tagline: string; address: string; phone: string; }
const DEFAULTS: Branding = { tenantKey: "default", salonName: "سالن زیبایی", barberName: "آرایشگر", tagline: "رزرو آنلاین نوبت", address: "", phone: "" };
let cache: Branding | null = null;
export async function getBranding(): Promise<Branding> {
  if (cache) return cache;
  const res = await getJson<{ ok: boolean; branding?: Partial<Branding> }>(`${API_BASE}/tenant.php`);
  cache = res.ok && res.branding ? { ...DEFAULTS, ...res.branding } : DEFAULTS;
  return cache;
}
