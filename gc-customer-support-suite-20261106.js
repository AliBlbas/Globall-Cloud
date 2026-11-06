/* Globall Cloud — Customer Service Suite: tickets, contact requests, FAQ, and chat helpers. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const customerApi = async (body) => {
    const session = await window.sb?.auth?.getSession?.();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('تکایە سەرەتا بچۆ ژوورەوە بۆ بەکارهێنانی پشتیوانی.');
    const response = await fetch('https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/customer-self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda', 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'ناردنی داواکاری سەرکەوتوو نەبوو.');
    return payload;
  };
  const setStatus = (id, message, kind = '') => { const node = $(id); if (node) { node.textContent = message; node.className = `form-message ${kind}`; } };
  const mountQuickReplies = () => {
    const form = $('customerChatForm');
    if (!form || document.getElementById('gcChatQuickReplies')) return;
    const wrap = document.createElement('div'); wrap.id = 'gcChatQuickReplies'; wrap.className = 'gc-chat-quick-replies';
    wrap.innerHTML = '<span>وەڵامی خێرا:</span><button type="button" data-quick="شوێنی بارەکەم لە کوێیە؟">Tracking</button><button type="button" data-quick="تکایە نرخی بارەکەم بۆم بنێرە.">نرخ</button><button type="button" data-quick="دەمەوێت لەگەڵ ستاف قسە بکەم.">ستاف</button>';
    form.parentNode.insertBefore(wrap, form);
    wrap.querySelectorAll('[data-quick]').forEach((button) => button.addEventListener('click', () => { const input = $('customerChatInput'); if (input) { input.value = button.dataset.quick; input.focus(); } }));
  };
  const bindTicket = () => {
    const form = $('customerSupportTicketForm'); if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const data = Object.fromEntries(new FormData(form).entries());
      if (button) button.disabled = true; setStatus('customerTicketMessage', 'تیکەتەکە دەنێردرێت…');
      try {
        const subject = `Ticket · ${data.category || 'general'} · ${data.priority || 'normal'}`;
        const body = `[SUPPORT TICKET]\nCategory: ${data.category}\nPriority: ${data.priority}\nReference: ${data.reference || '—'}\n\n${data.message}`;
        await customerApi({ action: 'chat_send', data: { subject, body } });
        setStatus('customerTicketMessage', 'تیکەت بە سەرکەوتوویی نێردرا؛ تیمەکەمان لە Chat وەڵامت دەداتەوە.', 'success'); form.reset();
      } catch (error) { setStatus('customerTicketMessage', error.message, 'error'); } finally { if (button) button.disabled = false; }
    });
  };
  const bindContact = () => {
    const form = $('customerContactRequestForm'); if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const data = Object.fromEntries(new FormData(form).entries());
      if (button) button.disabled = true; setStatus('customerContactMessage', 'داواکاریی پەیوەندی دەنێردرێت…');
      try {
        const body = `[CONTACT REQUEST]\nPreferred channel: ${data.channel}\nPreferred time: ${data.time || 'Any time'}\n\n${data.message}`;
        await customerApi({ action: 'chat_send', data: { subject: `Contact Request · ${data.channel}`, body } });
        setStatus('customerContactMessage', 'داواکاریی پەیوەندی نێردرا؛ ستاف بە شێوازی هەڵبژێردراو پەیوەندیت پێوە دەکات.', 'success'); form.reset();
      } catch (error) { setStatus('customerContactMessage', error.message, 'error'); } finally { if (button) button.disabled = false; }
    });
  };
  const updateUnread = (dashboard) => {
    const threads = dashboard?.chat_threads || []; const unread = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0); const badge = $('gcSupportUnread');
    if (badge) { badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = unread === 0; }
  };
  const boot = () => { mountQuickReplies(); bindTicket(); bindContact(); window.addEventListener('gc:customer-loaded', (event) => updateUnread(event.detail)); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
