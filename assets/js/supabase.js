const BRIDGE_SRC = '/production-bridge.js?v=20260829-shop';

async function ensureBridge() {
  if (window.gcSupabase) return window.gcSupabase;
  if (typeof window.gcEnsureSupabase === 'function') {
    try { return await window.gcEnsureSupabase(); } catch (_) {}
  }
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="production-bridge.js"]');
    if (existing) {
      const done = () => (window.gcSupabase ? resolve() : reject(new Error('Supabase bridge unavailable')));
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', () => reject(new Error('Supabase bridge failed')), { once: true });
      setTimeout(done, 8000);
      return;
    }
    const script = document.createElement('script');
    script.src = BRIDGE_SRC;
    script.async = true;
    script.addEventListener('load', () => window.gcSupabase ? resolve() : reject(new Error('Supabase client unavailable')), { once: true });
    script.addEventListener('error', () => reject(new Error('Supabase bridge failed')), { once: true });
    document.head.appendChild(script);
  });
  if (!window.gcSupabase) throw new Error('Supabase client unavailable');
  return window.gcSupabase;
}

export const supabase = await ensureBridge();
