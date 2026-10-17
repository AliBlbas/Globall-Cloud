/* Globall Cloud — unified public homepage + authenticated customer workspace.
   One canonical document; customer data stays behind Supabase Auth and customer-self. */
(() => {
  'use strict';
  const body = document.body;
  const home = document.getElementById('gcApp');
  const workspace = document.getElementById('gcCustomerWorkspace');
  const auth = document.getElementById('auth');
  const homeDock = document.querySelector('.gc-mobile-dock-v3');
  const injectedDock = document.getElementById('gcPrimaryMobileNav');
  if (!body || !home || !workspace) return;

  const customerHashes = new Set([
    '#auth','#register','#overview','#homeMetrics','#gcCustomerRouteOverview','#shipments','#shipmentsSection',
    '#commercial','#quotesPanel','#newRequest','#quoteForm','#activity',
    '#notifications','#records','#payments','#gcAccountSettings','#settings','#support'
  ]);
  const publicHashes = new Set(['#public','#services','#request','#contact','#about','#track','#pricing','#countries','#warehouses','#quote']);
  const hashToView = {
    '#overview':'home','#homeMetrics':'home','#gcCustomerRouteOverview':'home','#auth':'home','#register':'home',
    '#shipments':'shipments','#shipmentsSection':'shipments',
    '#commercial':'requests','#quotesPanel':'requests','#newRequest':'requests','#quoteForm':'requests',
    '#activity':'notifications','#notifications':'notifications',
    '#records':'records','#payments':'records',
    '#gcAccountSettings':'settings','#settings':'settings','#support':'support'
  };
  const viewHash = {
    home:'#overview',shipments:'#shipmentsSection',requests:'#newRequest',
    notifications:'#activity',records:'#records',settings:'#gcAccountSettings',support:'#support'
  };
  let authCheckStarted = false;
  let publicModeForced = window.location.hash === '#public';

  const setDockVisibility = (hidden) => {
    [homeDock, injectedDock].filter(Boolean).forEach(node => {
      if (hidden) node.setAttribute('hidden', '');
      else node.removeAttribute('hidden');
    });
  };
  const originalTitle = document.title;
  const setPublicMode = ({keepHash = false, forcePublic = true} = {}) => {
    publicModeForced = forcePublic;
    auth?.classList.add('hidden');
    workspace.hidden = true;
    home.hidden = false;
    body.classList.remove('gc-customer-app');
    delete body.dataset.gcUnifiedExperience;
    delete body.dataset.gcCustomerView;
    document.title = originalTitle;
    setDockVisibility(false);
    if (!keepHash && window.location.hash !== '#public') {
      history.replaceState({gcUnifiedExperience:'public'}, '', '/#public');
    }
    window.dispatchEvent(new CustomEvent('gc:unified-view-changed', {detail:{mode:'public'}}));
  };
  const enterCustomerMode = ({showAuth = false} = {}) => {
    publicModeForced = false;
    body.classList.add('gc-customer-app');
    body.dataset.gcUnifiedExperience = 'customer';
    document.title = 'Globall Cloud — Customer Workspace';
    workspace.hidden = false;
    home.hidden = true;
    setDockVisibility(true);
    if (showAuth) auth?.classList.remove('hidden');
    else auth?.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('gc:unified-view-changed', {detail:{mode:'customer'}}));
  };
  window.gcEnterCustomerMode = (options = {}) => enterCustomerMode(options);
  window.gcShowPublicHomepage = () => setPublicMode({keepHash:false, forcePublic:true});

  const selectCustomerView = (hash = window.location.hash) => {
    const view = hashToView[hash] || 'home';
    if (typeof window.gcSelectCustomerView === 'function') {
      window.gcSelectCustomerView(view);
    } else {
      body.dataset.gcCustomerView = view;
    }
  };
  const customerRouteRequested = () => customerHashes.has(window.location.hash);
  const explicitAuthRoute = () => ['#auth', '#register'].includes(window.location.hash);
  const handleRoute = () => {
    if (window.location.hash === '#public') {
      setPublicMode({keepHash:true, forcePublic:true});
      return;
    }
    if (customerRouteRequested()) {
      enterCustomerMode({showAuth:explicitAuthRoute()});
      selectCustomerView(window.location.hash);
      verifyExistingSession(true).catch(() => {});
      return;
    }
    setPublicMode({keepHash:true, forcePublic:true});
  };
  const verifyExistingSession = async (routeNeedsCustomer = false) => {
    if (authCheckStarted) return;
    authCheckStarted = true;
    try {
      const client = window.sb || window.gcSupabase;
      if (!client?.auth?.getSession) throw new Error('Customer auth is unavailable');
      const {data, error} = await client.auth.getSession();
      if (error) throw error;
      if (!data?.session?.access_token) {
        if (routeNeedsCustomer && !publicModeForced) enterCustomerMode({showAuth:true});
        return;
      }
      if (typeof window.gcCustomerApi !== 'function') {
        if (routeNeedsCustomer && !publicModeForced) enterCustomerMode({showAuth:true});
        return;
      }
      const payload = await window.gcCustomerApi();
      if (!payload?.profile || payload.profile.kind === 'staff') {
        if (routeNeedsCustomer && !publicModeForced) enterCustomerMode({showAuth:true});
        return;
      }
      if (publicModeForced || window.location.hash === '#public') return;
      enterCustomerMode({showAuth:false});
      selectCustomerView(window.location.hash);
    } catch (error) {
      // A stale, staff-only, or unlinked session must not expose the private workspace.
      if (routeNeedsCustomer && !publicModeForced) enterCustomerMode({showAuth:true});
      else if (!publicModeForced) setPublicMode({keepHash:true, forcePublic:true});
    } finally {
      authCheckStarted = false;
    }
  };

  window.addEventListener('gc:customer-loaded', event => {
    if (!event.detail?.profile || publicModeForced) return;
    enterCustomerMode({showAuth:false});
    if (window.location.hash === '#auth' || window.location.hash === '#register') {
      history.replaceState({gcUnifiedExperience:'customer'}, '', '/#overview');
    }
    selectCustomerView(window.location.hash);
  });

  auth?.querySelector('#close')?.addEventListener('click', () => {
    Promise.resolve().then(async () => {
      if (!auth.classList.contains('hidden')) return;
      const client = window.sb || window.gcSupabase;
      try {
        const {data} = await client?.auth?.getSession?.();
        if (!data?.session?.access_token) setPublicMode({keepHash:false, forcePublic:true});
      } catch (_) {
        setPublicMode({keepHash:false, forcePublic:true});
      }
    });
  });

  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('popstate', handleRoute);

  // Start in public mode unless the URL explicitly targets the customer workspace.
  if (publicHashes.has(window.location.hash)) {
    // Public sections must remain public after refresh, even when the customer has a session.
    setPublicMode({keepHash:true, forcePublic:true});
  } else if (customerRouteRequested()) {
    enterCustomerMode({showAuth:explicitAuthRoute()});
    selectCustomerView(window.location.hash);
    verifyExistingSession(true).catch(() => {});
  } else {
    // The root URL without a section hash restores a signed-in customer's workspace.
    setPublicMode({keepHash:true, forcePublic:false});
    verifyExistingSession(false).catch(() => {});
  }
})();