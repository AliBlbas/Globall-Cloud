/* Globall Cloud — one unified customer workspace.
   Public logistics routes now resolve inside the same customer app shell.
   Customer data remains protected by Supabase Auth and customer-self. */
(() => {
  'use strict';
  const body = document.body;
  const publicShell = document.getElementById('gcApp');
  const workspace = document.getElementById('gcCustomerWorkspace');
  const auth = document.getElementById('auth');
  if (!body || !publicShell || !workspace) return;

  const customerHashes = new Set([
    '#auth','#register','#overview','#homeMetrics','#gcCustomerRouteOverview',
    '#shipments','#shipmentsSection','#commercial','#quotesPanel','#newRequest',
    '#quoteForm','#activity','#notifications','#records','#payments',
    '#gcAccountSettings','#settings','#support'
  ]);
  const legacyRoutes = {
    '#public':'#overview',
    '#about':'#gcCustomerRouteOverview',
    '#services':'#gcCustomerRouteOverview',
    '#countries':'#gcCustomerRouteOverview',
    '#warehouses':'#gcCustomerRouteOverview',
    '#track':'#shipmentsSection',
    '#request':'#newRequest',
    '#quote':'#newRequest',
    '#pricing':'#newRequest',
    '#contact':'#support'
  };
  const hashToView = {
    '#overview':'home','#homeMetrics':'home','#gcCustomerRouteOverview':'home',
    '#auth':'home','#register':'home',
    '#shipments':'shipments','#shipmentsSection':'shipments',
    '#commercial':'requests','#quotesPanel':'requests','#newRequest':'requests','#quoteForm':'requests',
    '#activity':'notifications','#notifications':'notifications',
    '#records':'records','#payments':'records',
    '#gcAccountSettings':'settings','#settings':'settings','#support':'support'
  };
  const privateHashes = new Set([
    '#shipments','#shipmentsSection','#commercial','#quotesPanel','#newRequest','#quoteForm',
    '#activity','#notifications','#records','#payments','#gcAccountSettings','#settings','#support'
  ]);
  let authCheckStarted = false;

  const replaceHash = (hash) => {
    history.replaceState({gcUnifiedExperience:'customer'}, '', '/' + hash);
  };
  const enterCustomerMode = ({showAuth = false} = {}) => {
    body.classList.add('gc-customer-app');
    body.dataset.gcUnifiedExperience = 'customer';
    workspace.hidden = false;
    publicShell.hidden = true;
    document.title = 'Globall Cloud — Customer Workspace';
    // A second public bottom navigation is intentionally not part of this app shell.
    document.querySelectorAll('.gc-mobile-dock-v3, #gcPrimaryMobileNav').forEach(node => node.remove());
    if (showAuth) auth?.classList.remove('hidden');
    else auth?.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('gc:unified-view-changed', {detail:{mode:'customer'}}));
  };

  window.gcEnterCustomerMode = (options = {}) => enterCustomerMode(options);
  // Compatibility for old links: "home" now means the unified customer overview.
  window.gcShowPublicHomepage = () => {
    replaceHash('#overview');
    enterCustomerMode({showAuth:false});
    selectCustomerView('#overview');
  };

  const selectCustomerView = (hash = window.location.hash) => {
    const view = hashToView[hash] || 'home';
    body.dataset.gcCustomerView = view;
    if (typeof window.gcSelectCustomerView === 'function') {
      window.gcSelectCustomerView(view);
    }
  };

  const normalizeHash = () => {
    let hash = window.location.hash || '#auth';
    if (legacyRoutes[hash]) {
      hash = legacyRoutes[hash];
      replaceHash(hash);
    } else if (!customerHashes.has(hash)) {
      hash = '#overview';
      replaceHash(hash);
    }
    return hash;
  };

  const verifyExistingSession = async (requestAuthIfMissing = false) => {
    if (authCheckStarted) return;
    authCheckStarted = true;
    try {
      const client = window.sb || window.gcSupabase;
      if (!client?.auth?.getSession) throw new Error('Customer auth is unavailable');
      const {data, error} = await client.auth.getSession();
      if (error) throw error;
      if (!data?.session?.access_token) {
        if (requestAuthIfMissing) enterCustomerMode({showAuth:true});
        return;
      }
      if (typeof window.gcCustomerApi !== 'function') {
        if (requestAuthIfMissing) enterCustomerMode({showAuth:true});
        return;
      }
      const payload = await window.gcCustomerApi();
      if (!payload?.profile || payload.profile.kind === 'staff') {
        if (requestAuthIfMissing) enterCustomerMode({showAuth:true});
        return;
      }
      enterCustomerMode({showAuth:false});
      let hash = window.location.hash;
      if (hash === '#auth' || hash === '#register') {
        hash = '#overview';
        replaceHash(hash);
      }
      selectCustomerView(hash);
    } catch (_) {
      // Invalid, staff-only, or unlinked sessions never reveal private customer data.
      if (requestAuthIfMissing) enterCustomerMode({showAuth:true});
    } finally {
      authCheckStarted = false;
    }
  };

  const handleRoute = () => {
    const hash = normalizeHash();
    enterCustomerMode({showAuth: hash === '#auth' || hash === '#register'});
    selectCustomerView(hash);
    verifyExistingSession(hash === '#auth' || hash === '#register' || privateHashes.has(hash)).catch(() => {});
  };

  window.addEventListener('gc:customer-loaded', event => {
    if (!event.detail?.profile) return;
    enterCustomerMode({showAuth:false});
    let hash = window.location.hash;
    if (hash === '#auth' || hash === '#register' || !customerHashes.has(hash)) {
      hash = '#overview';
      replaceHash(hash);
    }
    selectCustomerView(hash);
  });

  auth?.querySelector('#close')?.addEventListener('click', () => {
    // Closing login reveals the integrated service overview, never the old homepage.
    Promise.resolve().then(async () => {
      if (!auth.classList.contains('hidden')) return;
      try {
        const client = window.sb || window.gcSupabase;
        const {data} = await client?.auth?.getSession?.();
        if (!data?.session?.access_token) {
          replaceHash('#overview');
          enterCustomerMode({showAuth:false});
          selectCustomerView('#overview');
        }
      } catch (_) {
        replaceHash('#overview');
        enterCustomerMode({showAuth:false});
        selectCustomerView('#overview');
      }
    });
  });

  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('popstate', handleRoute);

  // The root opens the unified portal. Existing sessions restore directly to the workspace.
  body.classList.add('gc-customer-app');
  body.dataset.gcUnifiedExperience = 'customer';
  let initialHash = window.location.hash || '#auth';
  if (!window.location.hash) replaceHash('#auth');
  handleRoute();
})();
