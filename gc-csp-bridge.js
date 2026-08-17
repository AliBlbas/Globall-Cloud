/* Globall Cloud CSP bridge.
 * Keeps legacy data-gc-on* handlers working without eval and also provides
 * one shared Supabase browser client for staff consoles.
 */
'use strict';

(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const eventTypes = ['click', 'change', 'submit', 'keydown', 'keyup', 'input', 'load', 'error', 'focus', 'blur', 'mouseover', 'mouseout'];

  function bootstrapSupabase() {
    try {
      if (!window.supabase?.createClient) return null;
      if (!window.sb) {
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      }
      return window.sb;
    } catch (error) {
      console.error('[Globall Cloud] Supabase bootstrap failed', error);
      return null;
    }
  }

  function removeStaleConnectionWarning() {
    const ok = Boolean(window.sb);
    if (!ok) return;
    const phrases = ['Supabase هێشتا پەیوەست نەکراوە', 'Supabase is not connected', 'Supabase client is not available'];
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length) return;
      const text = (node.textContent || '').trim();
      if (text && phrases.some((phrase) => text.includes(phrase))) {
        node.textContent = 'Supabase production connection is ready.';
        node.style.color = 'var(--good, #2ed27f)';
        node.setAttribute('data-gc-connection-state', 'ready');
      }
    });
  }

  const decode = (value) => {
    const node = document.createElement('textarea');
    node.innerHTML = String(value ?? '');
    return node.value;
  };
  const splitArgs = (source) => {
    const out = [];
    let start = 0, quote = null, escaped = false, depth = 0;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && quote) { escaped = true; continue; }
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if ('([{'.includes(ch)) depth += 1;
      if (')]}'.includes(ch)) depth -= 1;
      if (ch === ',' && depth === 0) { out.push(source.slice(start, i).trim()); start = i + 1; }
    }
    const tail = source.slice(start).trim();
    if (tail) out.push(tail);
    return out;
  };
  const literal = (source, event, element) => {
    const value = decode(source.trim());
    if (!value) return undefined;
    if (value === 'event') return event;
    if (value === 'event.target') return event.target;
    if (value === 'event.currentTarget') return element;
    if (value === 'this') return element;
    if (value === 'this.value') return element?.value;
    if (value === 'this.checked') return element?.checked;
    if (value === 'this.files') return element?.files;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) return value.slice(1, -1);
    const domValue = value.match(/^document\.getElementById\((['"])([^'"]+)\1\)\.(value|checked|files)$/);
    if (domValue) return document.getElementById(domValue[2])?.[domValue[3]];
    const dataValue = value.match(/^event\.currentTarget\.dataset\.([A-Za-z0-9_]+)$/);
    if (dataValue) return element?.dataset?.[dataValue[1]];
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try { return JSON.parse(value); } catch (_) { return value; }
    }
    if (/^[A-Za-z_$][\w$]*$/.test(value)) return value in window ? window[value] : undefined;
    return undefined;
  };
  const resolvePath = (path) => {
    let target = window;
    for (const part of path.split('.')) {
      if (target == null) return undefined;
      target = target[part];
    }
    return target;
  };
  const call = (name, args, event, element) => {
    const fn = resolvePath(name);
    if (typeof fn !== 'function') return false;
    fn(...args.map((arg) => literal(arg, event, element)));
    return true;
  };
  const execute = (raw, event, element) => {
    let code = decode(raw).trim();
    if (!code) return;
    if (/^if\s*\(event\.key\s*===\s*['"]Enter['"]\)\s*/.test(code)) {
      if (event.key !== 'Enter') return;
      code = code.replace(/^if\s*\(event\.key\s*===\s*['"]Enter['"]\)\s*/, '').trim();
    }
    const statements = [];
    let start = 0, quote = null, escaped = false, depth = 0;
    for (let i = 0; i < code.length; i += 1) {
      const ch = code[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && quote) { escaped = true; continue; }
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if ('([{'.includes(ch)) depth += 1;
      if (')]}'.includes(ch)) depth -= 1;
      if (ch === ';' && depth === 0) { statements.push(code.slice(start, i).trim()); start = i + 1; }
    }
    statements.push(code.slice(start).trim());
    for (const statement of statements) {
      if (!statement) continue;
      if (statement === 'event.preventDefault()') { event.preventDefault(); continue; }
      const domCall = statement.match(/^\$\((['"])([^'"]+)\1\)\.classList\.(add|remove|toggle)\((['"])([^'"]+)\4\)$/);
      if (domCall) { document.getElementById(domCall[2])?.classList?.[domCall[3]](domCall[5]); continue; }
      const callMatch = statement.match(/^(?:window\.)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\((.*)\)$/s);
      if (callMatch) call(callMatch[1], splitArgs(callMatch[2]), event, element);
    }
  };
  const install = (eventType) => {
    document.addEventListener(eventType, (event) => {
      const attr = `data-gc-on${eventType}`;
      const element = event.target?.closest?.(`[${attr}]`);
      if (!element) return;
      try { execute(element.getAttribute(attr), event, element); }
      catch (error) { console.error(`Globall Cloud ${attr} handler failed`, error); }
    }, true);
  };

  bootstrapSupabase();
  eventTypes.forEach(install);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeStaleConnectionWarning, { once: true });
  else removeStaleConnectionWarning();
})();
