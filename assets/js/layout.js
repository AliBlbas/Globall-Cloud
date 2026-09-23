import { supabase } from './supabase.js';

export async function initLayout(activePage) {
  if (document.querySelector('.gc-sidebar')) return;
  const sidebarHTML = `<aside class="sidebar gc-sidebar"><a href="/" class="logo">Global Cloud</a><nav><a href="/" data-page="dashboard">🚚 Logistics</a><a href="/shipments.html" data-page="shipments">📦 Shipments</a><a href="/tracking-integration.html" data-page="tracking">📍 Tracking</a><a href="/request" data-page="request">💬 Quote Request</a><a href="/services" data-page="services">🧭 Services</a><a href="/dashboard" data-page="customer">👤 Customer Portal</a></nav></aside>`;
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  document.querySelector(`[data-page="${activePage}"]`)?.classList.add('active');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
}
