export function kat(idOrEl, latex) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  try {
    katex.render(latex, el, { throwOnError: false, displayMode: false });
  } catch (e) {
    el.textContent = latex;
  }
}
