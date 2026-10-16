/* Globall Cloud — isolated customer account/settings view.
   Profile updates use customer-self; password changes use the authenticated
   account-self-password function; avatar files are limited to the current user's
   folder in the public avatars bucket. */
(() => {
  'use strict';
  const LANG_KEY = 'gc-language';
  const THEME_KEY = 'gc-theme';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const copy = {
    ckb: {
      dir:'rtl', title:'ڕێکخستنی هەژمار', intro:'زانیاریی پڕۆفایل، وێنە، وشەی نهێنی و ڕێکخستنە کەسییەکانت تەنها لێرە بەڕێوەببە.',
      signedOut:'بۆ بینینی پڕۆفایل و گۆڕینی زانیارییەکانت سەرەتا بچۆ ژوورەوە.', login:'چوونەژوورەوە',
      profile:'پڕۆفایلەکەم', changePhoto:'گۆڕینی وێنە', photoHint:'PNG، JPG یان WebP · تا 4MB',
      code:'کۆدی تایبەتی کڕیار', name:'ناوی تەواو', email:'ئیمەیڵ', phone:'ژمارەی مۆبایل',
      emailHint:'بۆ گۆڕینی ئیمەیڵ پێویستە پشتڕاستکردنەوەی هەژمار بکرێت؛ لێرە وەک زانیاریی ناسنامە پیشان دەدرێت.',
      language:'زمانی هەژمار', save:'پاشەکەوتکردنی پڕۆفایل', saving:'پاشەکەوت دەکرێت…',
      appearance:'دۆخی نمایش', theme:'ڕووناکی/تاریکی', dark:'تاریک', light:'ڕووناک',
      security:'پاراستن و وشەی نهێنی', currentPass:'وشەی نهێنیی ئێستا', newPass:'وشەی نهێنیی نوێ',
      confirmPass:'دووبارە وشەی نهێنیی نوێ', changePass:'گۆڕینی وشەی نهێنی', changingPass:'گۆڕینی وشەی نهێنی…',
      passwordHint:'وشەی نهێنیی نوێ دەبێت لانیکەم 12 پیت بێت. وشەی نهێنیی ئێستا بۆ پشتڕاستکردنەوە پێویستە.',
      logout:'چوونەدەرەوە', documents:'بینینی بەڵگە و پارەدان', support:'چوون بۆ پشتیوانی',
      saved:'زانیاریی پڕۆفایل پاشەکەوت کرا.', photoTooLarge:'قەبارەی وێنە دەبێت لە 4MB کەمتر بێت.',
      photoInvalid:'تکایە فایلێکی وێنە هەڵبژێرە.', passMismatch:'دوو وشەی نهێنی نوێکە یەکسان نین.',
      passShort:'وشەی نهێنیی نوێ دەبێت لانیکەم 12 پیت بێت.', currentPassWrong:'وشەی نهێنیی ئێستا دروست نییە.',
      passSaved:'وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.', email:'ئیمەیڵ', error:'هەڵەیەک ڕوویدا؛ دووبارە هەوڵ بدەوە.',
      network:'پەیوەندی ئینتەرنێت یان سێرڤەر پشکنین پێویستە.'
    },
    ar: {
      dir:'rtl', title:'إعدادات الحساب', intro:'أدر ملفك الشخصي وصورتك وكلمة المرور والتفضيلات هنا فقط.',
      signedOut:'سجّل الدخول أولاً لعرض ملفك الشخصي وتعديل معلوماتك.', login:'تسجيل الدخول',
      profile:'ملفي الشخصي', changePhoto:'تغيير الصورة', photoHint:'PNG أو JPG أو WebP · بحد أقصى 4MB',
      code:'رمز العميل الخاص', name:'الاسم الكامل', email:'البريد الإلكتروني', phone:'رقم الهاتف',
      emailHint:'تغيير البريد يتطلب تأكيد الحساب؛ يعرض هنا كبيان للهوية.',
      language:'لغة الحساب', save:'حفظ الملف الشخصي', saving:'جارٍ الحفظ…',
      appearance:'المظهر', theme:'المظهر الفاتح/الداكن', dark:'داكن', light:'فاتح',
      security:'الأمان وكلمة المرور', currentPass:'كلمة المرور الحالية', newPass:'كلمة المرور الجديدة',
      confirmPass:'تأكيد كلمة المرور الجديدة', changePass:'تغيير كلمة المرور', changingPass:'جارٍ تغيير كلمة المرور…',
      passwordHint:'يجب أن تتكون كلمة المرور الجديدة من 12 حرفاً على الأقل. يلزم إدخال كلمة المرور الحالية.',
      logout:'تسجيل الخروج', documents:'عرض المستندات والمدفوعات', support:'الانتقال إلى الدعم',
      saved:'تم حفظ الملف الشخصي.', photoTooLarge:'يجب أن يكون حجم الصورة أقل من 4MB.',
      photoInvalid:'يرجى اختيار ملف صورة.', passMismatch:'كلمتا المرور الجديدتان غير متطابقتين.',
      passShort:'يجب أن تتكون كلمة المرور الجديدة من 12 حرفاً على الأقل.', currentPassWrong:'كلمة المرور الحالية غير صحيحة.',
      passSaved:'تم تغيير كلمة المرور بنجاح.', error:'حدث خطأ؛ يرجى المحاولة مرة أخرى.',
      network:'تحقق من اتصال الإنترنت أو الخادم.'
    },
    en: {
      dir:'ltr', title:'Account settings', intro:'Manage your profile, photo, password and personal preferences here only.',
      signedOut:'Sign in first to view your profile and update your information.', login:'Sign in',
      profile:'My profile', changePhoto:'Change photo', photoHint:'PNG, JPG or WebP · up to 4MB',
      code:'Private customer code', name:'Full name', email:'Email', phone:'Mobile phone',
      emailHint:'Changing email requires account confirmation; it is shown here for identity.',
      language:'Account language', save:'Save profile', saving:'Saving…',
      appearance:'Appearance', theme:'Light/dark mode', dark:'Dark', light:'Light',
      security:'Security and password', currentPass:'Current password', newPass:'New password',
      confirmPass:'Confirm new password', changePass:'Change password', changingPass:'Changing password…',
      passwordHint:'Your new password must be at least 12 characters. Enter your current password to verify.',
      logout:'Sign out', documents:'View documents and payments', support:'Open support',
      saved:'Profile saved.', photoTooLarge:'Image must be smaller than 4MB.',
      photoInvalid:'Please choose an image file.', passMismatch:'The new passwords do not match.',
      passShort:'The new password must be at least 12 characters.', currentPassWrong:'Current password is incorrect.',
      passSaved:'Password changed successfully.', error:'Something went wrong; please try again.',
      network:'Check your internet connection or the server.'
    }
  };
  const $ = id => document.getElementById(id);
  const validLang = value => Object.prototype.hasOwnProperty.call(copy, value) ? value : 'ckb';
  const currentLang = () => validLang(window.localStorage?.getItem(LANG_KEY) || document.documentElement.lang);
  const t = key => copy[currentLang()][key] || copy.ckb[key] || key;
  let section = null;
  let selectedAvatarFile = null;
  let profileCache = null;
  let previewUrl = '';

  const message = (id, text, kind = 'muted') => {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.dataset.state = kind;
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-success', kind === 'success');
  };
  const applyCopy = () => {
    const dictionary = copy[currentLang()];
    document.documentElement.lang = currentLang();
    document.documentElement.dir = dictionary.dir;
    section?.querySelectorAll('[data-gc-profile-i18n]').forEach(el => {
      const key = el.dataset.gcProfileI18n;
      if (dictionary[key]) el.textContent = dictionary[key];
    });
    const langSelect = $('gcSettingsLanguage');
    if (langSelect) langSelect.value = currentLang();
    const themeSelect = $('gcSettingsTheme');
    if (themeSelect) themeSelect.value = document.documentElement.dataset.gcTheme || window.localStorage?.getItem(THEME_KEY) || 'dark';
    syncAuthState();
  };
  const setAvatar = (url, name) => {
    const img = $('gcSettingsAvatar');
    const fallback = $('gcSettingsAvatarFallback');
    if (img && fallback) {
      const cleanUrl = String(url || '').trim();
      if (cleanUrl) {
        img.src = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'gc_avatar_refresh=' + Date.now();
        img.hidden = false;
        fallback.hidden = true;
        img.onerror = () => { img.hidden = true; fallback.hidden = false; };
      } else {
        img.removeAttribute('src');
        img.hidden = true;
        fallback.hidden = false;
      }
      fallback.textContent = String(name || 'GC').trim().slice(0, 1).toUpperCase() || 'G';
      fallback.setAttribute('aria-label', name || 'Customer profile');
    }
  };
  const syncAuthState = () => {
    const loggedOut = $('gcSettingsLoggedOut');
    const loggedIn = $('gcSettingsLoggedIn');
    const isLoggedIn = Boolean(profileCache);
    if (loggedOut) loggedOut.hidden = isLoggedIn;
    if (loggedIn) loggedIn.hidden = !isLoggedIn;
    const logoutButton = $('gcSettingsLogout');
    if (logoutButton) logoutButton.textContent = t('logout');
  };
  const syncProfile = profile => {
    if (!profile || typeof profile !== 'object') return;
    profileCache = profile;
    const savedLanguage = validLang(profile.preferred_language || currentLang());
    try { window.localStorage?.setItem(LANG_KEY, savedLanguage); } catch (_) {}
    if (typeof window.gcDashboardSetLanguage === 'function' && savedLanguage !== currentLang()) window.gcDashboardSetLanguage(savedLanguage);
    if ($('gcSettingsName')) $('gcSettingsName').value = profile.name || '';
    if ($('gcSettingsEmail')) $('gcSettingsEmail').value = profile.email || '';
    if ($('gcSettingsPhone')) $('gcSettingsPhone').value = profile.phone || '';
    if ($('gcSettingsCustomerCode')) $('gcSettingsCustomerCode').textContent = profile.code || profile.gc_code || 'GC-—';
    if ($('gcSettingsIdentityName')) $('gcSettingsIdentityName').textContent = profile.name || profile.email || 'Customer';
    if ($('gcSettingsIdentityEmail')) $('gcSettingsIdentityEmail').textContent = profile.email || '—';
    if ($('gcSettingsLanguage')) $('gcSettingsLanguage').value = validLang(profile.preferred_language || currentLang());
    setAvatar(profile.avatar_url || null, profile.name || profile.email);
    applyCopy();
    syncAuthState();
  };
  const renderSection = () => {
    if (document.querySelector('#gcAccountSettings')) return;
    const main = document.querySelector('#gcCustomerWorkspace .app-main, body.gc-customer-app .app-main');
    if (!main) return;
    section = document.createElement('section');
    section.id = 'gcAccountSettings';
    section.className = 'section-block gc-account-settings-screen';
    section.setAttribute('aria-labelledby', 'gcSettingsMainTitle');
    section.innerHTML = `
      <div class="section-heading gc-account-settings-heading">
        <div><span class="eyebrow">MY ACCOUNT · PRIVATE</span><h2 id="gcSettingsMainTitle" data-gc-profile-i18n="title">ڕێکخستنی هەژمار</h2><p data-gc-profile-i18n="intro">زانیاریی پڕۆفایل، وێنە، وشەی نهێنی و ڕێکخستنە کەسییەکانت تەنها لێرە بەڕێوەببە.</p></div>
      </div>
      <article id="gcSettingsLoggedOut" class="surface-card gc-settings-logged-out">
        <div class="gc-settings-lock" aria-hidden="true">↗</div><div><strong data-gc-profile-i18n="signedOut">بۆ بینینی پڕۆفایل و گۆڕینی زانیارییەکانت سەرەتا بچۆ ژوورەوە.</strong><p class="muted">Globall Cloud · Customer Workspace</p></div>
        <button type="button" id="gcSettingsSignIn" class="app-primary-action" data-gc-profile-i18n="login">چوونەژوورەوە</button>
      </article>
      <div id="gcSettingsLoggedIn" class="gc-settings-authenticated" hidden>
        <div class="gc-settings-grid">
          <article class="surface-card gc-settings-profile-card">
            <div class="gc-settings-card-heading"><span class="eyebrow">CUSTOMER IDENTITY</span><h3 data-gc-profile-i18n="profile">پڕۆفایلەکەم</h3></div>
            <div class="gc-settings-identity">
              <div class="gc-settings-avatar-wrap">
                <img id="gcSettingsAvatar" alt="Customer profile photo" hidden>
                <span id="gcSettingsAvatarFallback" class="gc-settings-avatar-fallback">G</span>
                <button type="button" id="gcAvatarChoose" class="gc-avatar-change" data-gc-profile-i18n="changePhoto">گۆڕینی وێنە</button>
                <input id="gcAvatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden>
              </div>
              <div class="gc-settings-identity-copy"><strong id="gcSettingsIdentityName">—</strong><span class="gc-customer-code" id="gcSettingsCustomerCode">GC-—</span><small id="gcSettingsIdentityEmail">—</small></div>
            </div>
            <small class="gc-avatar-hint" data-gc-profile-i18n="photoHint">PNG، JPG یان WebP · تا 4MB</small>
            <form id="gcProfileForm" class="gc-account-form">
              <label for="gcSettingsName" data-gc-profile-i18n="name">ناوی تەواو</label><input id="gcSettingsName" class="field" type="text" autocomplete="name" maxlength="160" required>
              <label for="gcSettingsEmail" data-gc-profile-i18n="email">ئیمەیڵ</label><input id="gcSettingsEmail" class="field" type="email" autocomplete="email" readonly aria-readonly="true">
              <small class="muted gc-email-hint" data-gc-profile-i18n="emailHint">بۆ گۆڕینی ئیمەیڵ پێویستە پشتڕاستکردنەوەی هەژمار بکرێت.</small>
              <label for="gcSettingsPhone" data-gc-profile-i18n="phone">ژمارەی مۆبایل</label><input id="gcSettingsPhone" class="field" type="tel" autocomplete="tel" maxlength="40">
              <label for="gcSettingsLanguage" data-gc-profile-i18n="language">زمانی هەژمار</label><select id="gcSettingsLanguage" class="field"><option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option></select>
              <div id="gcProfileMessage" class="gc-settings-message" role="status" aria-live="polite"></div>
              <button type="submit" id="gcProfileSave" class="app-primary-action" data-gc-profile-i18n="save">پاشەکەوتکردنی پڕۆفایل</button>
            </form>
          </article>
          <div class="gc-settings-right-column">
            <article class="surface-card gc-settings-security-card">
              <div class="gc-settings-card-heading"><span class="eyebrow">ACCOUNT SECURITY</span><h3 data-gc-profile-i18n="security">پاراستن و وشەی نهێنی</h3></div>
              <form id="gcPasswordForm" class="gc-account-form">
                <label for="gcCurrentPassword" data-gc-profile-i18n="currentPass">وشەی نهێنیی ئێستا</label><input id="gcCurrentPassword" class="field" type="password" autocomplete="current-password" minlength="1" required>
                <label for="gcNewPassword" data-gc-profile-i18n="newPass">وشەی نهێنیی نوێ</label><input id="gcNewPassword" class="field" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
                <label for="gcConfirmPassword" data-gc-profile-i18n="confirmPass">دووبارە وشەی نهێنیی نوێ</label><input id="gcConfirmPassword" class="field" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
                <p class="gc-password-hint" data-gc-profile-i18n="passwordHint">وشەی نهێنیی نوێ دەبێت لانیکەم 12 پیت بێت.</p>
                <div id="gcPasswordMessage" class="gc-settings-message" role="status" aria-live="polite"></div>
                <button type="submit" id="gcPasswordSave" class="app-primary-action" data-gc-profile-i18n="changePass">گۆڕینی وشەی نهێنی</button>
              </form>
            </article>
            <article class="surface-card gc-settings-preferences-card">
              <div class="gc-settings-card-heading"><span class="eyebrow">DISPLAY</span><h3 data-gc-profile-i18n="appearance">دۆخی نمایش</h3></div>
              <label for="gcSettingsTheme" data-gc-profile-i18n="theme">ڕووناکی/تاریکی</label>
              <select id="gcSettingsTheme" class="field"><option value="dark" data-gc-profile-i18n="dark">تاریک</option><option value="light" data-gc-profile-i18n="light">ڕووناک</option></select>
              <p class="muted gc-settings-note" data-gc-profile-i18n="intro">ڕێکخستنەکان تەنها بۆ هەژماری خۆتن.</p>
            </article>
            <article class="surface-card gc-settings-actions-card">
              <button type="button" id="gcSettingsRecords" class="gc-settings-secondary-action" data-gc-profile-i18n="documents">بینینی بەڵگە و پارەدان</button>
              <button type="button" id="gcSettingsSupport" class="gc-settings-secondary-action" data-gc-profile-i18n="support">چوون بۆ پشتیوانی</button>
              <button type="button" id="gcSettingsLogout" class="gc-settings-logout" data-gc-profile-i18n="logout">چوونەدەرەوە</button>
            </article>
          </div>
        </div>
      </div>`;
    main.appendChild(section);

    $('gcSettingsSignIn')?.addEventListener('click', () => document.getElementById('loginBtn')?.click());
    $('gcSettingsLogout')?.addEventListener('click', () => document.getElementById('logoutBtn')?.click());
    $('gcSettingsRecords')?.addEventListener('click', () => window.gcSelectCustomerView ? window.gcSelectCustomerView('records') : (location.hash = '#records'));
    $('gcSettingsSupport')?.addEventListener('click', () => window.gcSelectCustomerView ? window.gcSelectCustomerView('support') : (location.hash = '#support'));
    $('gcAvatarChoose')?.addEventListener('click', () => $('gcAvatarFile')?.click());
    $('gcAvatarFile')?.addEventListener('change', () => {
      const file = $('gcAvatarFile')?.files?.[0];
      selectedAvatarFile = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      if (!file) { setAvatar(profileCache?.avatar_url || null, profileCache?.name); return; }
      if (!file.type.startsWith('image/')) { message('gcProfileMessage', t('photoInvalid'), 'error'); $('gcAvatarFile').value = ''; return; }
      if (file.size > 4 * 1024 * 1024) { message('gcProfileMessage', t('photoTooLarge'), 'error'); $('gcAvatarFile').value = ''; return; }
      selectedAvatarFile = file;
      previewUrl = URL.createObjectURL(file);
      const img = $('gcSettingsAvatar'), fallback = $('gcSettingsAvatarFallback');
      if (img && fallback) { img.src = previewUrl; img.hidden = false; fallback.hidden = true; }
      message('gcProfileMessage', t('changePhoto'), 'muted');
    });
    $('gcProfileForm')?.addEventListener('submit', saveProfile);
    $('gcPasswordForm')?.addEventListener('submit', changePassword);
    $('gcSettingsLanguage')?.addEventListener('change', event => {
      const language = validLang(event.target.value);
      if (typeof window.gcDashboardSetLanguage === 'function') window.gcDashboardSetLanguage(language);
      else { document.documentElement.lang = language; document.documentElement.dir = copy[language].dir; try { localStorage.setItem(LANG_KEY, language); } catch (_) {} }
      applyCopy();
    });
    $('gcSettingsTheme')?.addEventListener('change', event => {
      const theme = event.target.value === 'light' ? 'light' : 'dark';
      if (typeof window.gcDashboardSetTheme === 'function') window.gcDashboardSetTheme(theme);
      else { try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}; document.documentElement.dataset.gcTheme = theme; document.documentElement.style.colorScheme = theme; }
      applyCopy();
    });
  };
  const saveProfile = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('gcProfileSave');
    const api = window.gcCustomerApi;
    const sb = window.sb;
    if (!api || !sb) { message('gcProfileMessage', t('network'), 'error'); return; }
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = t('saving');
    message('gcProfileMessage', '', 'muted');
    try {
      const {data:sessionData} = await sb.auth.getSession();
      const user = sessionData.session?.user;
      if (!sessionData.session?.access_token || !user?.id) throw new Error(t('signedOut'));
      let avatarUrl = profileCache?.avatar_url || user.user_metadata?.avatar_url || '';
      if (selectedAvatarFile) {
        const ext = selectedAvatarFile.type === 'image/png' ? 'png' : selectedAvatarFile.type === 'image/webp' ? 'webp' : 'jpg';
        const path = user.id + '/avatar.' + ext;
        const upload = await sb.storage.from('avatars').upload(path, selectedAvatarFile, {
          cacheControl: '3600', upsert: true, contentType: selectedAvatarFile.type
        });
        if (upload.error) throw upload.error;
        avatarUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      const language = validLang($('gcSettingsLanguage').value);
      const response = await api({method:'POST', body:{action:'update_profile', data:{
        full_name:$('gcSettingsName').value.trim(),
        email:$('gcSettingsEmail').value.trim(),
        phone:$('gcSettingsPhone').value.trim(),
        language,
        avatar_url:avatarUrl
      }}});
      profileCache = {...(profileCache || {}), ...(response.profile || {}), name:$('gcSettingsName').value.trim(), email:$('gcSettingsEmail').value.trim(), phone:$('gcSettingsPhone').value.trim(), preferred_language:language, avatar_url:avatarUrl || null};
      setAvatar(avatarUrl, profileCache.name);
      $('gcSettingsIdentityName').textContent = profileCache.name || 'Customer';
      $('gcSettingsIdentityEmail').textContent = profileCache.email || '—';
      selectedAvatarFile = null;
      $('gcAvatarFile').value = '';
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
      if (typeof window.gcDashboardSetLanguage === 'function') window.gcDashboardSetLanguage(language);
      message('gcProfileMessage', t('saved'), 'success');
      if (typeof window.gcCustomerReload === 'function') await window.gcCustomerReload();
    } catch (error) {
      const raw = String(error?.message || '');
      message('gcProfileMessage', /failed to fetch|networkerror|load failed/i.test(raw) ? t('network') : (raw || t('error')), 'error');
    } finally {
      button.disabled = false;
      button.textContent = t('save');
    }
  };
  const changePassword = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const currentPassword = $('gcCurrentPassword').value;
    const newPassword = $('gcNewPassword').value;
    const confirmPassword = $('gcConfirmPassword').value;
    if (newPassword.length < 12) { message('gcPasswordMessage', t('passShort'), 'error'); return; }
    if (newPassword !== confirmPassword) { message('gcPasswordMessage', t('passMismatch'), 'error'); return; }
    const sb = window.sb;
    const button = $('gcPasswordSave');
    button.disabled = true;
    button.textContent = t('changingPass');
    message('gcPasswordMessage', '', 'muted');
    try {
      if (!sb) throw new Error(t('network'));
      const {data:sessionData} = await sb.auth.getSession();
      const email = sessionData.session?.user?.email;
      if (!email || !sessionData.session?.access_token) throw new Error(t('signedOut'));
      const check = await sb.auth.signInWithPassword({email, password:currentPassword});
      if (check.error) throw new Error(t('currentPassWrong'));
      const {data:freshSession,error:sessionError} = await sb.auth.getSession();
      if (sessionError || !freshSession.session?.access_token) throw new Error(t('network'));
      const response = await fetch(SUPABASE_URL + '/functions/v1/account-self-password', {
        method:'POST',
        headers:{Authorization:'Bearer ' + freshSession.session.access_token, apikey:SUPABASE_KEY, 'Content-Type':'application/json'},
        body:JSON.stringify({password:newPassword}),
        cache:'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (/password must be at least 12/i.test(String(payload.error || ''))) throw new Error(t('passShort'));
        throw new Error(payload.error || t('error'));
      }
      form.reset();
      message('gcPasswordMessage', t('passSaved'), 'success');
    } catch (error) {
      const raw = String(error?.message || '');
      message('gcPasswordMessage', /invalid login credentials/i.test(raw) ? t('currentPassWrong') : (/failed to fetch|networkerror|load failed/i.test(raw) ? t('network') : (raw || t('error'))), 'error');
    } finally {
      button.disabled = false;
      button.textContent = t('changePass');
    }
  };
  const mount = () => {
    // The customer workspace is embedded in the single homepage document and remains
    // hidden until the user opens the account area or a valid customer session is found.
    if (!document.body?.classList.contains('gc-customer-app') && !document.querySelector('#gcCustomerWorkspace')) return;
    renderSection();
    if (!section) section = $('gcAccountSettings');
    applyCopy();
    // The customer portal publishes the authenticated profile after its API load.
    window.addEventListener('gc:customer-loaded', event => {
      if (event.detail?.profile) syncProfile(event.detail.profile);
    });
    const loginButton = document.getElementById('loginBtn');
    if (loginButton && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (!loginButton.classList.contains('hidden') && !profileCache) syncAuthState();
      });
      observer.observe(loginButton, {attributes:true, attributeFilter:['class']});
    }
    window.gcOpenSettings = () => {
      if (typeof window.gcSelectCustomerView === 'function') window.gcSelectCustomerView('settings');
      else { location.hash = '#gcAccountSettings'; section?.scrollIntoView({block:'start'}); }
    };
    window.gcCloseSettings = () => {};
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();