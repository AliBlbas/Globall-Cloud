/* Globall Cloud — role-aware account security guard
 * UX layer only. Backend remains the authoritative permission boundary.
 */
(function(){
  'use strict';

  const LOCKED_IDS = [
    'customerEmail', 'customerPassword', 'staffEmail', 'staffPassword'
  ];

  function lockField(id, locked) {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = locked;
    el.disabled = false;
    el.setAttribute('aria-readonly', locked ? 'true' : 'false');
    el.classList.toggle('security-locked', locked);
    const noteId = `${id}SecurityNote`;
    let note = document.getElementById(noteId);
    if (locked && !note) {
      note = document.createElement('div');
      note.id = noteId;
      note.className = 'security-lock-note';
      note.textContent = 'Locked — Super Admin only';
      el.parentElement?.appendChild(note);
    }
    if (!locked && note) note.remove();
  }

  async function apply() {
    const sb = window.sb;
    if (!sb?.auth?.getSession) return;
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return;

    const role = session.user.app_metadata?.role || session.user.user_metadata?.role || 'guest';
    const superAdmin = role === 'super_admin';
    LOCKED_IDS.forEach((id) => lockField(id, !superAdmin));

    document.querySelectorAll('[data-super-admin-only]').forEach((el) => {
      el.toggleAttribute('hidden', !superAdmin);
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .security-locked{opacity:.68!important;cursor:not-allowed!important;background:rgba(255,255,255,.025)!important}
    .security-lock-note{margin-top:5px;font-size:11px;font-weight:800;color:#f0a83a}
  `;
  document.head.appendChild(style);

  window.addEventListener('supabase-auth-ready', apply);
  document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 250));
})();
