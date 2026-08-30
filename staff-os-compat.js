(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const STAFF_VERIFY = `${SUPABASE_URL}/functions/v1/staff-auth-verify`;

  async function verifyCurrentStaff(client, session) {
    const response = await originalFetch(STAFF_VERIFY, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (payload?.authorized !== true || !payload?.staff?.id) return null;
    return payload.staff;
  }

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isStaffList = url.includes('/functions/v1/account-admin')
      && /[?&]kind=staff(?:&|$)/.test(url)
      && !/action=/.test(url);

    if (!isStaffList) return originalFetch(input, init);

    const response = await originalFetch(input, init);
    if (response.ok || response.status !== 403) return response;

    try {
      const client = window.gcSupabase || window.sb;
      const session = client ? (await client.auth.getSession()).data.session : null;
      if (!client || !session?.access_token || !session?.user?.id) return response;

      const staff = await verifyCurrentStaff(client, session);
      if (!staff || String(staff.id) !== String(session.user.id)) return response;

      return new Response(
        JSON.stringify({ items: [staff], kind: 'staff', self_only: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        },
      );
    } catch {
      return response;
    }
  };
})();
