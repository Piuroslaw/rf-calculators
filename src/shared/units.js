const SI_TIERS = [
  [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'],
  [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'],
];

export function fmtSI(val) {
  if (!isFinite(val)) return '—';
  if (val === 0) return '0';
  const abs = Math.abs(val), sign = val < 0 ? '-' : '';
  for (let i = 0; i < SI_TIERS.length; i++) {
    const [div, sym] = SI_TIERS[i];
    if (abs >= div || i === SI_TIERS.length - 1) {
      const s = parseFloat((abs / div).toPrecision(4)).toString();
      if (parseFloat(s) >= 1000 && i > 0) {
        const [d2, s2] = SI_TIERS[i - 1];
        return sign + parseFloat((abs / d2).toPrecision(4)) + s2;
      }
      return sign + s + sym;
    }
  }
}

export function splitSI(val) {
  if (!isFinite(val) || val === 0) return { num: val === 0 ? '0' : '—', prefix: '' };
  const abs = Math.abs(val), sign = val < 0 ? '-' : '';
  for (let i = 0; i < SI_TIERS.length; i++) {
    const [div, sym] = SI_TIERS[i];
    if (abs >= div || i === SI_TIERS.length - 1) {
      const s = parseFloat((abs / div).toPrecision(4)).toString();
      if (parseFloat(s) >= 1000 && i > 0) {
        const [d2, s2] = SI_TIERS[i - 1];
        return { num: sign + parseFloat((abs / d2).toPrecision(4)), prefix: s2 };
      }
      return { num: sign + s, prefix: sym };
    }
  }
}

export function parseSI(str) {
  if (!str || !str.trim()) return NaN;
  str = str.trim().replace(',', '.');
  if (str.endsWith('.')) return NaN;
  const map = { T: 1e12, G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, µ: 1e-6, μ: 1e-6, u: 1e-6, n: 1e-9, p: 1e-12 };
  const last = str[str.length - 1];
  if (isNaN(+last) && map[last] !== undefined) return parseFloat(str.slice(0, -1)) * map[last];
  return parseFloat(str);
}

export function fmtPlain(val) {
  if (!isFinite(val)) return '—';
  if (val === 0) return '0';
  const s = parseFloat(val.toPrecision(5)).toString();
  return s.includes('e') ? fmtSI(val) : s;
}

export function fmtDB(db) {
  return parseFloat(db.toPrecision(6)).toString();
}
