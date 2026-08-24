(() => {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isStaffList = url.includes('/functions/v1/account-admin') && /[?&]kind=staff(?:&|$)/.test(url) && !/action=/.test(url);
    if (!isStaffList) return originalFetch(input, init);
    const response = await originalFetch(input, init);
    if (response.ok || response.status !== 403) return response;
    try {
      const client = window.gcSupabase || window.sb;
      const session = client ? (await client.auth.getSession()).data.session : null;
      if (!client || !session) return response;
      const { data, error } = await client.from('staff').select('id,full_name,role,branch,is_active,created_at,updated_at').eq('id', session.user.id).maybeSingle();
      if (error || !data || data.is_active !== true) return response;
      return new Response(JSON.stringify({ items:[data], kind:'staff', self_only:true }), { status:200, headers:{'Content-Type':'application/json'} });
    } catch { return response; }
  };
})();