/**
 * Payment and Booking API Client for Static Hosting with PHP Backend (/payment)
 */

export const API_BASE = '/payment';

export interface ApiFailureResult {
  ok: false;
  error: string;
  status?: number;
}

/**
 * Perform a safe POST request:
 * Reads response as TEXT first, then JSON.parse inside try/catch.
 * If server returns HTML error page (e.g., 500/502/404/401) or network fails, returns clean error object preserving HTTP status.
 */
export async function postJson<T = any>(
  url: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<T | ApiFailureResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(extraHeaders || {}),
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('royal_admin_token');
        localStorage.removeItem('royal_mgmt_authenticated');
        sessionStorage.removeItem('royal_mgmt_authenticated');
        window.dispatchEvent(new CustomEvent('atelier:unauthorized_admin'));
      }
    }

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (typeof data === 'object' && data !== null) {
        if (!('status' in data)) {
          (data as any).status = res.status;
        }
        return data as T;
      }
      return { ok: false, error: 'خطا در ارتباط با سرور', status: res.status };
    } catch {
      return { ok: false, error: 'خطا در ارتباط با سرور', status: res.status };
    }
  } catch (err: any) {
    return { ok: false, error: 'خطا در ارتباط با سرور' };
  }
}

/**
 * Perform a safe GET request:
 * Reads response as TEXT first, then JSON.parse inside try/catch.
 * If server returns HTML error page or network fails, returns clean error object preserving HTTP status.
 */
export async function getJson<T = any>(
  url: string,
  extraHeaders?: Record<string, string>
): Promise<T | ApiFailureResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(extraHeaders || {}),
      },
    });

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('royal_admin_token');
        localStorage.removeItem('royal_mgmt_authenticated');
        sessionStorage.removeItem('royal_mgmt_authenticated');
        window.dispatchEvent(new CustomEvent('atelier:unauthorized_admin'));
      }
    }

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (typeof data === 'object' && data !== null) {
        if (!('status' in data)) {
          (data as any).status = res.status;
        }
        return data as T;
      }
      return { ok: false, error: 'خطا در ارتباط با سرور', status: res.status };
    } catch {
      return { ok: false, error: 'خطا در ارتباط با سرور', status: res.status };
    }
  } catch (err: any) {
    return { ok: false, error: 'خطا در ارتباط با سرور' };
  }
}
