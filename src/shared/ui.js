export function setTheme(t) {
  if (t === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
  ['light', 'dark', 'system'].forEach(x =>
    document.getElementById('th-' + x)?.classList.toggle('active', x === t)
  );
}

export function badge(db) {
  const c = db > 0 ? 'b-pos' : db < 0 ? 'b-neg' : 'b-zero';
  return `<span class="badge ${c}">${db > 0 ? '+' : ''}${db}</span>`;
}

export const APP_VERSION = 'v0.3';

// Icon is inlined (not a <use href="#i-cpu">) so this helper has no dependency
// on the calling calculator's own sprite <defs>.
export function footerHTML() {
  return `
<div class="footer">
  <span class="footer-tag"><span class="ico" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 7V3M12 7V3M15 7V3M9 17v4M12 17v4M15 17v4M7 9H3M7 12H3M7 15H3M17 9h4M17 12h4M17 15h4"/></svg></span> RF &amp; Signal Integrity Toolkit</span>
  <span class="footer-ver">${APP_VERSION} · more tools coming</span>
</div>`;
}

const COMING_SOON = ['Rise time ↔ BW', 'Critical length', 'Propagation delay', 'Skin depth', 'Impedance matching'];

export function comingSoonHTML() {
  return `
<hr class="div">
<p class="sec-lbl">Coming soon</p>
<div class="cs-row">
  ${COMING_SOON.map(x => `<span class="cs-pill">${x}</span>`).join('\n  ')}
</div>`;
}
