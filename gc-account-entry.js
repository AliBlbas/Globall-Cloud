/* Globall Cloud — customer sign-in and account creation helper. */
(() => {
  'use strict';
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const $ = selector => document.querySelector(selector);
  const mount = () => {
    const auth = $('#auth');
    const signIn = $('#signIn');
    if (!auth || !signIn || $('#gcCreateAccount')) return;
    const box = auth.querySelector('.box');
    if (!box) return;
    const mode = document.createElement('div');
    mode.className = 'gc-auth-mode';
    mode.innerHTML = '<button type="button" class="btn" id="gcCreateAccount">دانانی هەژماری نوێ</button><button type="button" class="btn hidden" id="gcBackToLogin">گەڕانەوە بۆ login</button>';
    box.appendChild(mode);
    const confirm = document.createElement('input');
    confirm.id = 'gcConfirmPassword'; confirm.className = 'field hidden'; confirm.type = 'password'; confirm.autocomplete = 'new-password'; confirm.placeholder = 'دووبارەکردنەوەی وشەی نهێنی'; confirm.minLength = 12;
    const name = document.createElement('input');
    name.id = 'gcRegisterName'; name.className = 'field hidden'; name.autocomplete = 'name'; name.placeholder = 'ناوی تەواو';
    $('#password')?.insertAdjacentElement('afterend', confirm);
    $('#email')?.insertAdjacentElement('beforebegin', name);
    const create = $('#gcCreateAccount'); const back = $('#gcBackToLogin');
    const setRegister = active => { name.classList.toggle('hidden', !active); confirm.classList.toggle('hidden', !active); signIn.textContent = active ? 'دروستکردنی هەژمار' : 'چوونەژوورەوە'; create.classList.toggle('hidden', active); back.classList.toggle('hidden', !active); };
    create.addEventListener('click', () => setRegister(true));
    back.addEventListener('click', () => setRegister(false));
    signIn.addEventListener('click', async event => {
      if (!name.classList.contains('hidden')) {
        event.stopImmediatePropagation();
        const email = $('#email').value.trim(), password = $('#password').value, fullName = name.value.trim();
        if (!fullName || password.length < 12 || password !== confirm.value) { $('#msg').textContent = 'ناو بنووسە و وشەی نهێنییەکان یەکسان و لانیکەم 12 پیت بن.'; return; }
        $('#msg').textContent = '…'; signIn.disabled = true;
        try {
          if (!window.supabase) throw new Error('سیستەمی هەژمار بەردەست نییە.');
          const client = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
          const { error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName, name: fullName } } });
          $('#msg').textContent = error ? error.message : 'هەژمار دروست کرا؛ ئەگەر داواکرا، ئیمەیڵەکەت پشتڕاست بکە.';
          if (!error) setRegister(false);
        } catch (error) { $('#msg').textContent = error.message || 'دروستکردنی هەژمار سەرکەوتوو نەبوو.'; }
        finally { signIn.disabled = false; }
      }
    }, true);
    if (location.hash === '#register' || location.hash === '#auth') { auth.classList.remove('hidden'); if (location.hash === '#register') setRegister(true); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
