import { fmtSI, splitSI, parseSI, fmtPlain } from '../shared/units.js';
import { kat } from '../shared/latex.js';
import { setTheme, footerHTML, comingSoonHTML } from '../shared/ui.js';

export const id = 'rise-time-bw';
export const title = 'Rise Time & Bandwidth';

const C = 299792458; // speed of light, m/s

export const schema = {
  inputs: [
    { id: 'tr', type: 'number', label: 'Rise time (10–90%)', unit: 's' },
    { id: 'bw', type: 'number', label: 'Bandwidth / knee frequency', unit: 'Hz' },
    { id: 'er', type: 'number', label: 'Relative permittivity (εr)', unit: '' },
  ],
  outputs: [
    { id: 'tr',    label: 'Rise time' },
    { id: 'bw',    label: 'Bandwidth / knee frequency' },
    { id: 'v',     label: 'Propagation velocity' },
    { id: 'lcrit', label: 'Critical trace length' },
  ],
};

// f = 0.35/Tr is the standard "knee frequency" rule of thumb (Howard Johnson);
// Lcrit = v*Tr/6 is the "1/6 rule": treat a trace as a transmission line once
// its one-way delay exceeds Tr/6.
export function calculate({ tr, bw, er } = {}) {
  if (er === undefined || isNaN(er) || er < 1) return {};
  const v = C / Math.sqrt(er);
  let outTr, outBw;
  if (tr !== undefined && !isNaN(tr) && tr > 0) {
    outTr = tr;
    outBw = 0.35 / tr;
  } else if (bw !== undefined && !isNaN(bw) && bw > 0) {
    outBw = bw;
    outTr = 0.35 / bw;
  } else {
    return {};
  }
  return { tr: outTr, bw: outBw, v, lcrit: v * outTr / 6 };
}

const ENVIRONMENTS = {
  air:        { label: 'Air',              er: 1.0 },
  microstrip: { label: 'Microstrip (PCB)', er: 3.0 },
  stripline:  { label: 'Stripline (PCB)',  er: 4.3 },
};

const SIGNALS = [
  { label: 'TTL / slow CMOS logic',       tr: 5e-9 },
  { label: 'Fast CMOS / LVDS clock',      tr: 1e-9 },
  { label: 'USB 2.0 Hi-Speed (480Mbps)',  tr: 500e-12 },
  { label: 'PCIe Gen1 (2.5GT/s)',         tr: 100e-12 },
  { label: 'DDR4 (3200MT/s)',             tr: 80e-12 },
  { label: 'PCIe Gen4 / 10G SerDes',      tr: 30e-12 },
];

const PFX = { T: 1e12, G: 1e9, M: 1e6, k: 1e3, '': 1, m: 1e-3, µ: 1e-6, n: 1e-9, p: 1e-12 };

// ── init ─────────────────────────────────────────────────────────────────────
export function init(container) {
  container.innerHTML = html();

  const q = sel => container.querySelector(sel);

  container.querySelectorAll('[data-theme-btn]').forEach(btn =>
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn))
  );

  // ── SI-prefixed field helper (mirrors dB Converter's ratio field) ──────────
  // Shows a value split into a plain number (in the input) + prefix (in the
  // adjacent unit span); expands to the raw number on focus so typing over it
  // doesn't silently lose the implied magnitude, and re-collapses on blur.
  function siField(input, unitEl, baseUnit) {
    let prefix = '';
    const self = {
      show(value) {
        const { num, prefix: p } = splitSI(value);
        prefix = p;
        input.value = num;
        unitEl.textContent = p + baseUnit;
      },
      focus() {
        if (!prefix) return;
        const num = parseFloat(input.value);
        if (isNaN(num)) return;
        input.value = fmtPlain(num * (PFX[prefix] ?? 1));
        unitEl.textContent = baseUnit;
        prefix = '';
      },
      blur() {
        const v = parseSI(input.value);
        if (isFinite(v) && v > 0) self.show(v);
      },
      // parseSI(input.value) alone is only correct once the field is
      // self-contained (post-focus, or freshly written by show() with no
      // prefix). If it's still showing a collapsed "350" next to a separate
      // "p" unit span — e.g. read() called via the swap button without the
      // field ever being focused — the bare digits need the tracked prefix
      // applied, since the digits alone don't carry it.
      read() {
        const raw = input.value.trim();
        if (!raw) return NaN;
        const last = raw[raw.length - 1];
        const hasOwnPrefix = isNaN(+last) && PFX[last] !== undefined;
        if (hasOwnPrefix || !prefix) return parseSI(raw);
        return parseFloat(raw) * (PFX[prefix] ?? 1);
      },
    };
    return self;
  }

  const trField = siField(q('#tr-in'), q('#tr-unit'), 's');
  const bwField = siField(q('#bw-in'), q('#bw-unit'), 'Hz');

  // Authoritative last-valid rise time (seconds), kept in sync by fromTr/fromBw/
  // setTr. updateEnv() reads this instead of re-parsing #tr-in's DOM value,
  // because #tr-in may be showing a collapsed "350" + separate "p" prefix span
  // (via siField.show) with no focus/input event to trust as self-contained.
  let lastTr;

  q('#tr-in').addEventListener('input', fromTr);
  q('#tr-in').addEventListener('focus', () => trField.focus());
  q('#tr-in').addEventListener('blur',  () => trField.blur());
  q('#bw-in').addEventListener('input', fromBw);
  q('#bw-in').addEventListener('focus', () => bwField.focus());
  q('#bw-in').addEventListener('blur',  () => bwField.blur());
  q('#swap-btn').addEventListener('click', fromTr);

  q('#er-in').addEventListener('input', updateEnv);
  container.querySelectorAll('[data-env]').forEach(btn =>
    btn.addEventListener('click', () => setEnv(btn.dataset.env))
  );

  buildSignalsTable();

  // ── Environment ──────────────────────────────────────────────────────────
  function currentEr() {
    return parseFloat(q('#er-in').value);
  }

  function setEnv(key) {
    const preset = ENVIRONMENTS[key];
    container.querySelectorAll('[data-env]').forEach(b => b.classList.toggle('active', b.dataset.env === key));
    q('#er-in').value = preset.er;
    updateEnv();
  }

  function updateEnv() {
    const er = currentEr();
    if (isNaN(er) || er < 1) {
      q('#v-out').value = '';
      q('#delay-in-out').value = '';
      kat(q('#v-fml'), `v=\\dfrac{c}{\\sqrt{\\varepsilon_r}}`);
      renderLength({});
      return;
    }
    const v = C / Math.sqrt(er);
    q('#v-out').value = fmtSI(v) + 'm/s';
    q('#delay-in-out').value = fmtSI(0.0254 / v) + 's/in';
    kat(q('#v-fml'),
      `v=\\dfrac{c}{\\sqrt{\\varepsilon_r}}=\\dfrac{c}{\\sqrt{${fmtPlain(er)}}}=\\text{${fmtSI(v)}m/s}`
    );
    if (lastTr !== undefined) {
      renderLength(calculate({ tr: lastTr, er }));
    }
  }

  // ── Rise time ↔ bandwidth (each direction only ever writes the OTHER field,
  // never the one the user is actively typing into) ──────────────────────────
  function fromTr() {
    const str = q('#tr-in').value.trim();
    if (!str || str.endsWith('.')) return;
    const tr = trField.read();
    if (isNaN(tr) || tr <= 0) {
      lastTr = undefined;
      q('#bw-in').value = ''; q('#bw-unit').textContent = 'Hz';
      renderBwFormula({}); renderLength({});
      return;
    }
    const out = calculate({ tr, er: currentEr() });
    if (out.bw === undefined) {
      lastTr = undefined;
      q('#bw-in').value = ''; q('#bw-unit').textContent = 'Hz';
      renderBwFormula({}); renderLength({});
      return;
    }
    lastTr = out.tr;
    bwField.show(out.bw);
    renderBwFormula(out);
    renderLength(out);
  }

  function fromBw() {
    const str = q('#bw-in').value.trim();
    if (!str || str.endsWith('.')) return;
    const bw = bwField.read();
    if (isNaN(bw) || bw <= 0) {
      lastTr = undefined;
      q('#tr-in').value = ''; q('#tr-unit').textContent = 's';
      renderBwFormula({}); renderLength({});
      return;
    }
    const out = calculate({ bw, er: currentEr() });
    if (out.tr === undefined) {
      lastTr = undefined;
      q('#tr-in').value = ''; q('#tr-unit').textContent = 's';
      renderBwFormula({}); renderLength({});
      return;
    }
    lastTr = out.tr;
    trField.show(out.tr);
    renderBwFormula(out);
    renderLength(out);
  }

  function renderBwFormula(out) {
    if (out.bw === undefined) {
      kat(q('#bw-fml'), `f_{BW}=\\dfrac{0.35}{T_r}`);
      return;
    }
    kat(q('#bw-fml'),
      `f_{BW}=\\dfrac{0.35}{\\text{${fmtSI(out.tr)}s}}=\\text{${fmtSI(out.bw)}Hz}`
    );
  }

  function renderLength(out) {
    if (out.lcrit === undefined) {
      q('#lcrit-out').value = '';
      q('#lcrit-in').textContent = '';
      kat(q('#lcrit-fml'), `L_{crit}=\\dfrac{v\\cdot T_r}{6}`);
      return;
    }
    q('#lcrit-out').value = fmtSI(out.lcrit) + 'm';
    q('#lcrit-in').textContent = '≈ ' + fmtPlain(out.lcrit / 0.0254) + ' in';
    kat(q('#lcrit-fml'),
      `L_{crit}=\\dfrac{v\\cdot T_r}{6}=\\dfrac{\\text{${fmtSI(out.v)}m/s}\\cdot\\text{${fmtSI(out.tr)}s}}{6}=\\text{${fmtSI(out.lcrit)}m}`
    );
  }

  // Sets Tr directly from a known raw value (bootstrap, reference-table click)
  // without round-tripping through the (prefix-stripped) DOM field.
  function setTr(trSeconds) {
    const out = calculate({ tr: trSeconds, er: currentEr() });
    if (out.tr === undefined) return;
    lastTr = out.tr;
    trField.show(out.tr);
    bwField.show(out.bw);
    renderBwFormula(out);
    renderLength(out);
  }

  // ── Typical signals reference table ─────────────────────────────────────────
  function buildSignalsTable() {
    q('#sig-body').innerHTML = SIGNALS.map(s =>
      `<tr data-tr="${s.tr}"><td class="note-c">${s.label}</td><td>${fmtSI(s.tr)}s</td></tr>`
    ).join('');
    q('#sig-body').querySelectorAll('tr').forEach(tr =>
      tr.addEventListener('click', () => setTr(parseFloat(tr.dataset.tr)))
    );
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  setEnv('microstrip');
  setTr(1e-9);
}

// ── HTML template ────────────────────────────────────────────────────────────
function html() {
  return `
<svg style="display:none" aria-hidden="true"><defs>
  <symbol id="i-edge"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h4l6-10h8"/></symbol>
  <symbol id="i-swap"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 5l3 3-3 3M20 16H6M10 13l-3 3 3 3"/></symbol>
  <symbol id="i-sun"     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l-1.41 1.41"/></symbol>
  <symbol id="i-moon"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
</defs></svg>

<div class="hdr">
  <div class="hdr-left">
    <div class="hdr-icon"><span class="ico" style="width:24px;height:24px"><svg><use href="#i-edge"/></svg></span></div>
    <div>
      <p class="hdr-title">Rise Time &amp; Bandwidth</p>
      <p class="hdr-sub">Tr ↔ knee frequency · critical trace length by environment</p>
    </div>
  </div>
  <div class="theme-ctrl" role="group" aria-label="Color theme">
    <button class="theme-btn"        id="th-light"  data-theme-btn="light"  title="Light"><span class="ico" style="width:15px;height:15px"><svg><use href="#i-sun"/></svg></span></button>
    <button class="theme-btn"        id="th-dark"   data-theme-btn="dark"   title="Dark"><span class="ico" style="width:15px;height:15px"><svg><use href="#i-moon"/></svg></span></button>
    <button class="theme-btn active" id="th-system" data-theme-btn="system" title="System"><span class="ico" style="width:15px;height:15px"><svg><use href="#i-monitor"/></svg></span></button>
  </div>
</div>

<div class="layout">

  <div class="col-main">
    <p class="sec-lbl">Environment</p>
    <div class="seg seg3">
      <button class="seg-btn" data-env="air">Air</button>
      <button class="seg-btn" data-env="microstrip">Microstrip <span class="sub">(PCB)</span></button>
      <button class="seg-btn" data-env="stripline">Stripline <span class="sub">(PCB)</span></button>
    </div>
    <div class="row3">
      <div class="inp-card">
        <div class="inp-lbl">Relative permittivity εr</div>
        <div class="inp-row">
          <input class="inp-field inp-sm" type="number" step="any" id="er-in">
        </div>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Velocity</div>
        <input class="inp-field inp-sm" type="text" id="v-out" readonly>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Delay</div>
        <input class="inp-field inp-sm" type="text" id="delay-in-out" readonly>
      </div>
    </div>
    <div class="fml fml-sm">
      <span class="fml-lbl">Formula</span>
      <div class="fml-eq" id="v-fml"></div>
    </div>

    <p class="sec-lbl">Rise time ↔ bandwidth</p>
    <div class="conv">
      <div class="inp-card">
        <div class="inp-lbl">Rise time (10–90%)</div>
        <div class="inp-row">
          <input class="inp-field" type="text" inputmode="decimal" id="tr-in">
          <span class="inp-unit" id="tr-unit">s</span>
        </div>
      </div>
      <button class="swap" id="swap-btn" title="Recalculate">
        <span class="ico" style="width:16px;height:16px"><svg><use href="#i-swap"/></svg></span>
      </button>
      <div class="inp-card">
        <div class="inp-lbl">Bandwidth (knee freq)</div>
        <div class="inp-row">
          <input class="inp-field" type="text" inputmode="decimal" id="bw-in">
          <span class="inp-unit" id="bw-unit">Hz</span>
        </div>
      </div>
    </div>
    <div class="fml">
      <span class="fml-lbl">Formula</span>
      <div class="fml-eq" id="bw-fml"></div>
    </div>

    <p class="sec-lbl">Critical trace length</p>
    <div class="inp-card" style="margin-bottom:.75rem">
      <div class="inp-lbl">Lcrit — treat as transmission line above this length</div>
      <div class="inp-row">
        <input class="inp-field" type="text" id="lcrit-out" readonly>
        <span class="inp-unit">m</span>
      </div>
      <div class="calc-hint" id="lcrit-in"></div>
    </div>
    <div class="fml fml-sm">
      <span class="fml-lbl">Formula</span>
      <div class="fml-eq" id="lcrit-fml"></div>
    </div>
  </div>

  <div class="col-abs">
    <p class="sec-lbl">Rules of thumb</p>
    <div class="note-box">
      <ul>
        <li><b>Knee frequency:</b> f<sub>BW</sub> ≈ 0.35 / T<sub>r</sub> (10–90% rise time) — roughly the highest frequency content that matters for signal integrity.</li>
        <li><b>1/6 rule</b> (Howard Johnson): treat a trace as a transmission line once its one-way delay exceeds T<sub>r</sub>/6 — i.e. length &gt; L<sub>crit</sub>. Some designers use a looser T<sub>r</sub>/4 threshold instead.</li>
        <li><b>Faster edges shrink everything:</b> halving T<sub>r</sub> doubles bandwidth and halves the critical length.</li>
        <li><b>Microstrip vs stripline:</b> microstrip fields sit partly in air, partly in the dielectric, so use an <i>effective</i> εr (noticeably below the bulk laminate value) — not the bulk FR4 εr. Stripline is fully embedded, so the bulk εr applies directly.</li>
        <li><b>FR4 sanity check:</b> ≈140–150&nbsp;ps/in in microstrip, ≈170–180&nbsp;ps/in in stripline — handy for eyeballing a critical length without recomputing v by hand.</li>
      </ul>
    </div>
  </div>

  <div class="col-ref">
    <p class="sec-lbl">Typical rise times</p>
    <div class="tbl-wrap">
      <table class="ref-tbl">
        <thead>
          <tr>
            <th>Signal</th>
            <th style="width:90px">Tr (approx.)</th>
          </tr>
        </thead>
        <tbody id="sig-body"></tbody>
      </table>
    </div>
    ${comingSoonHTML()}
  </div>

</div>

${footerHTML()}
`;
}
