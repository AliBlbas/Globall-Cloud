/* Globall Cloud — defensive Staff OS auth bridge
 * Keeps Supabase Auth as the source of truth and verifies the staff row before
 * exposing the internal console. This layer only runs on staff-os.html.
 */
(() => {
  'use strict';

  if (!/\/staff-os\.html(?:$|[?#])/.test(window.location.pathname)) return;

  const waitFor = (getter, timeoutMs = 10000, intervalMs = 100) => new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      try {
        const value = getter();
        if (value) {
          clearInterval(timer);
          resolve(value);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Authentication client did not initialize in time.'));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, intervalMs);
  });

  const setMessage = (text, tone = 'error') => {
    const node = document.getElementById('loginMsg');
    if (!node) return;
    node.textContent = text || '';
    node.style.color = tone === 'success' ? '#9ff3d0' : '#ffb9c0';
  };

  const setBusy = (busy) => {
    const form = document.getElementById('loginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? 'چاوەڕوان بە…' : 'چوونەژوورەوە بۆ Staff OS →';
  };

  const showApp = () => {
    const gate = document.getElementById('gate');
    const app = document.getElementById('app');
    if (gate) gate.classList.add('hidden');
    if (app) app.classList.remove('hidden');
  };

  const showGate = () => {
    const gate = document.getElementById('gate');
    const app = document.getElementById('app');
    if (app) app.classList.add('hidden');
    if (gate) gate.classList.remove('hidden');
  };

  const verifyStaff = async (client, userId) => {
    const { data, error } = await client
      .from('staff')
      .select('id,full_name,role,branch,is_active,active')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('ئەم بەکارهێنەرە لە staff access ـدا نییە.');

    const active = data.is_active !== false && data.active !== false;
    if (!active) throw new Error('دەستڕاگەیشتنی ئەم staff ـە ناچالاکە.');

    return data;
  };

  const boot = async () => {
    if (!document.getElementById('loginForm')) return;

    try {
      const client = await waitFor(() => window.sb || null);
      const form = document.getElementById('loginForm');

      // Replace only the login submit path; leave the rest of the original page intact.
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMessage('');
        setBusy(true);

        try {
          const email = String(document.getElementById('email')?.value || '').trim().toLowerCase();
          const password = String(document.getElementById('password')?.value || '');
          if (!email || !password) throw new Error('ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.');

          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (!data?.user?.id) throw new Error('Login سەرکەوتوو بوو، بەڵام user session نەگەڕایەوە.');

          await verifyStaff(client, data.user.id);
          setMessage('Login سەرکەوتوو بوو. تکایە چاوەڕوان بە…', 'success');
          window.location.reload();
        } catch (error) {
          console.error('[Globall Cloud] Staff login:', error);
          const message = /invalid login credentials/i.test(error?.message || '')
            ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.'
            : error?.message || 'نەتوانرا login بکرێت.';
          setMessage(message);
          setBusy(false);
        }
      }, true);

      // Verify an already-existing session before exposing the internal console.
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user?.id) {
        showGate();
        return;
      }

      try {
        await verifyStaff(client, session.user.id);
        showApp();
      } catch (error) {
        console.warn('[Globall Cloud] Staff session rejected:', error);
        await client.auth.signOut().catch(() => undefined);
        showGate();
        setMessage(error?.message || 'ئەم هەژمارە ڕێگەی چوونە ناوی نییە.');
      }
    } catch (error) {
      console.error('[Globall Cloud] Staff auth bridge:', error);
      showGate();
      setMessage('Supabase Auth ئامادە نەبوو. تکایە دووبارە هەوڵبدەرەوە.');
      setBusy(false);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
