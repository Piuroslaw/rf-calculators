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

export function footerHTML() {
  return `
<div class="footer">
  <span class="footer-tag"><span class="ico" style="width:14px;height:14px"><svg><use href="#i-cpu"/></svg></span> RF &amp; Signal Integrity Toolkit</span>
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
