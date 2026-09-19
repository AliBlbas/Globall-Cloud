(() => {
  'use strict';

  const input = document.getElementById('trackInput');
  const form = document.getElementById('gcTrackingForm');
  const toast = document.getElementById('gcToast');
  const health = document.getElementById('gcHealth');
  const healthText = document.getElementById('gcHealthText');
  const notificationButton = document.getElementById('enableNotificationsBtn');
  let toastTimer;
  let deepLinkStarted = false;

  window.showToast = (message, kind = 'info') => {
    if (!toast) return;
    toast.textContent = String(message || '');
    toast.dataset.kind = kind;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4800);
  };

  const normalizeSearchValue = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase();
  const query = new URLSearchParams(window.location.search);
  const deepLinkId = normalizeSearchValue(query.get('id') || query.get('track'));

  const setHealth = (state, message) => {
    if (!health || !healthText) return;
    health.dataset.state = state;
    healthText.textContent = message;
  };

  const waitForSupabase = async () => {
    if (typeof window.gcEnsureSupabase !== 'function') return;
    try {
      await window.gcEnsureSupabase();
    } catch (_) {
      // The tracking request will still return a controlled error if the bridge is unavailable.
    }
  };

  if (input) {
    input.addEventListener('blur', () => {
      input.value = normalizeSearchValue(input.value);
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!input) return;
      input.value = normalizeSearchValue(input.value);
      if (!input.value) {
        window.showToast('تکایە ژمارەی شوێنکەوتن بنووسە.', 'error');
        input.focus();
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await waitForSupabase();
        if (typeof window.doTrackSearch !== 'function') throw new Error('Tracking controller is unavailable');
        window.doTrackSearch();
      } catch (_) {
        window.showToast('سیستەمی شوێنکەوتن بەردەست نییە. تکایە دووبارە هەوڵبدەوە.', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  const startDeepLinkSearch = async () => {
    if (!deepLinkId || deepLinkStarted || !input) return;
    input.value = deepLinkId;
    await waitForSupabase();
    if (typeof window.doTrackSearch !== 'function') return;
    deepLinkStarted = true;
    window.doTrackSearch();
  };

  if (deepLinkId && input) {
    input.value = deepLinkId;
    window.addEventListener('load', () => { void startDeepLinkSearch(); }, { once: true });
    setTimeout(() => { void startDeepLinkSearch(); }, 0);
  }

  if (notificationButton) {
    notificationButton.addEventListener('click', () => {
      if (typeof window.enableNotifications === 'function') window.enableNotifications();
    });
  }

  window.addEventListener('gc:supabase-health', (event) => {
    const state = event.detail?.state;
    if (state === 'ready') setHealth('ready', 'پەیوەندی بە Supabase ئامادەیە.');
    else if (state === 'degraded') setHealth('degraded', 'پەیوەندی بە سیستەمەکە کەمە؛ دووبارە هەوڵبدەوە.');
    else setHealth('checking', 'پەیوەندی بە سیستەمەکە لە پشکنینە…');
  });

  window.addEventListener('gc:tracking-realtime', (event) => {
    const state = event.detail?.status;
    if (state === 'SUBSCRIBED') setHealth('ready', 'شوێنکەوتن و نوێکردنەوەی زیندوو چالاکە.');
    else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') setHealth('degraded', 'شوێنکەوتنی زیندوو بەردەست نییە؛ داتای کۆتایی هێشتا نیشان دەدرێت.');
  });
})();
