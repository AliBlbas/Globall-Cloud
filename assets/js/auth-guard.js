import { supabase } from './supabase.js';

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  window.location.replace(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
}
