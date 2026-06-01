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
