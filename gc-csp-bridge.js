/* Globall Cloud CSP bridge.
 *
 * Legacy markup used inline event attributes. They are converted to data-gc-on*
 * attributes during the CSP migration. This small, non-eval dispatcher keeps
 * the migration compatible while all executable code remains in external JS.
 */
'use strict';

(() => {
  const eventTypes = ['click', 'change', 'submit', 'keydown', 'keyup', 'input', 'load', 'error', 'focus', 'blur', 'mouseover', 'mouseout'];
  const decode = (value) => {
    const node = document.createElement('textarea');
    node.innerHTML = String(value ?? '');
    return node.value;
  };
  const splitArgs = (source) => {
    const out = [];
    let start = 0;
    let quote = null;
    let escaped = false;
    let depth = 0;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && quote) { escaped = true; continue; }
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
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
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1).replace(/\\([\\'"nrt])/g, (_, ch) => ({ n: '\n', r: '\r', t: '\t', '\\': '\\', "'": "'", '"': '"' }[ch] ?? ch));
    }
    const domValue = value.match(/^document\.getElementById\((['"])([^'"]+)\1\)\.(value|checked|files)$/);
    if (domValue) return document.getElementById(domValue[2])?.[domValue[3]];
    const dataValue = value.match(/^event\.currentTarget\.dataset\.([A-Za-z0-9_]+)$/);
    if (dataValue) return element?.dataset?.[dataValue[1]];
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try { return JSON.parse(value); } catch (_) { return value; }
    }
    if (/^[A-Za-z_$][\w$]*$/.test(value)) {
      if (value === 'element') return element;
      if (value in window) return window[value];
      return undefined;
    }
    const plus = value.match(/^([A-Za-z_$][\w$]*)\s*\+\s*(-?\d+(?:\.\d+)?)$/);
    if (plus && plus[1] in window) return Number(window[plus[1]]) + Number(plus[2]);
    return undefined;
  };
  const resolvePath = (path) => {
    const parts = path.split('.');
    let target = window;
    for (const part of parts) {
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
      if (callMatch) {
        call(callMatch[1], splitArgs(callMatch[2]), event, element);
      }
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
  eventTypes.forEach(install);
})();
