import { fmtSI, splitSI, parseSI, fmtPlain } from '../shared/units.js';
import { kat } from '../shared/latex.js';
import { setTheme } from '../shared/ui.js';

export const id = 'voltage-divider';
export const title = 'Voltage Divider';

export const schema = {
  inputs: [
    { id: 'vin', type: 'number', label: 'Input voltage', unit: 'V' },
    { id: 'r1',  type: 'number', label: 'R1 (top)',       unit: 'Ω' },
    { id: 'r2',  type: 'number', label: 'R2 (bottom)',    unit: 'Ω' },
  ],
  outputs: [
    { id: 'vout',    label: 'Output voltage' },
    { id: 'current', label: 'Divider current' },
    { id: 'p1',      label: 'Power in R1' },
    { id: 'p2',      label: 'Power in R2' },
    { id: 'ptotal',  label: 'Total power' },
  ],
};

export function calculate({ vin, r1, r2 } = {}) {
  if ([vin, r1, r2].some(v => v === undefined || isNaN(v)) || r1 + r2 <= 0) return {};
  const current = vin / (r1 + r2);
  const vout = vin * r2 / (r1 + r2);
  const p1 = current * current * r1;
  const p2 = current * current * r2;
  return { vout, current, p1, p2, ptotal: p1 + p2 };
}

function solveR2({ vin, vout, r1 }) {
  if ([vin, vout, r1].some(v => v === undefined || isNaN(v)) || vin <= vout || vout <= 0) return {};
  return { r2: vout * r1 / (vin - vout) };
}

// ── Common divider ratios ───────────────────────────────────────────────────
const RATIOS = [
  { ratio: 1,   label: '1 : 1 — R2 = R1',   note: '50.0% of Vin' },
  { ratio: 0.5, label: '2 : 1 — R2 = R1/2', note: '33.3% of Vin' },
  { ratio: 2,   label: '1 : 2 — R2 = 2·R1', note: '66.7% of Vin' },
  { ratio: 1/3, label: '3 : 1 — R2 = R1/3', note: '25.0% of Vin' },
  { ratio: 4,   label: '1 : 4 — R2 = 4·R1', note: '80.0% of Vin' },
  { ratio: 1/9, label: '9 : 1 — R2 = R1/9', note: '10.0% of Vin' },
  { ratio: 9,   label: '1 : 9 — R2 = 9·R1', note: '90.0% of Vin (10:1 probe)' },
];

// ── init ─────────────────────────────────────────────────────────────────────
export function init(container) {
  container.innerHTML = html();

  const q = sel => container.querySelector(sel);

  container.querySelectorAll('[data-theme-btn]').forEach(btn =>
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn))
  );

  ['#vin-in', '#r1-in', '#r2-in'].forEach(sel =>
    q(sel).addEventListener('input', updateForward)
  );
  ['#rv-vin', '#rv-vout', '#rv-r1'].forEach(sel =>
    q(sel).addEventListener('input', updateReverse)
  );

  buildRatioTable();

  // ── Forward: Vin, R1, R2 → Vout, I, P ──────────────────────────────────────
  function readForward() {
    return {
      vin: parseSI(q('#vin-in').value),
      r1:  parseSI(q('#r1-in').value),
      r2:  parseSI(q('#r2-in').value),
    };
  }

  function updateForward() {
    const { vin, r1, r2 } = readForward();
    const out = calculate({ vin, r1, r2 });

    q('#sch-vin').textContent  = isFinite(vin) ? fmtSI(vin) + 'V' : '—';
    q('#sch-r1').textContent   = isFinite(r1)  ? fmtSI(r1)  + 'Ω' : '—';
    q('#sch-r2').textContent   = isFinite(r2)  ? fmtSI(r2)  + 'Ω' : '—';
    q('#sch-vout').textContent = out.vout !== undefined ? fmtSI(out.vout) + 'V' : '—';

    if (out.vout === undefined) {
      ['#out-vout', '#out-i', '#out-p1', '#out-p2', '#out-ptot'].forEach(sel => q(sel).value = '');
      kat(q('#fwd-fml'), `V_{out}=V_{in}\\cdot\\dfrac{R_2}{R_1+R_2}`);
      return;
    }

    q('#out-vout').value = fmtSI(out.vout) + 'V';
    q('#out-i').value    = fmtSI(out.current) + 'A';
    q('#out-p1').value   = fmtSI(out.p1) + 'W';
    q('#out-p2').value   = fmtSI(out.p2) + 'W';
    q('#out-ptot').value = fmtSI(out.ptotal) + 'W';

    kat(q('#fwd-fml'),
      `V_{out}=${fmtPlain(vin)}\\cdot\\dfrac{${fmtSI(r2)}\\Omega}{${fmtSI(r1)}\\Omega+${fmtSI(r2)}\\Omega}=${fmtSI(out.vout)}\\text{V}`
    );
  }

  // ── Reverse: Vin, target Vout, R1 → R2 ──────────────────────────────────────
  function updateReverse() {
    const vin  = parseSI(q('#rv-vin').value);
    const vout = parseSI(q('#rv-vout').value);
    const r1   = parseSI(q('#rv-r1').value);
    const { r2 } = solveR2({ vin, vout, r1 });

    if (r2 === undefined) {
      q('#rv-r2').value = '';
      kat(q('#rev-fml'), `R_2=\\dfrac{V_{out}\\cdot R_1}{V_{in}-V_{out}}`);
      return;
    }

    q('#rv-r2').value = fmtSI(r2) + 'Ω';
    kat(q('#rev-fml'),
      `R_2=\\dfrac{${fmtPlain(vout)}\\cdot ${fmtSI(r1)}\\Omega}{${fmtPlain(vin)}-${fmtPlain(vout)}}=${fmtSI(r2)}\\Omega`
    );
  }

  // ── Ratio reference table ───────────────────────────────────────────────────
  function buildRatioTable() {
    q('#ratio-body').innerHTML = RATIOS.map(r =>
      `<tr data-ratio="${r.ratio}"><td>${r.label}</td><td class="note-c">${r.note}</td></tr>`
    ).join('');
    q('#ratio-body').querySelectorAll('tr').forEach(tr =>
      tr.addEventListener('click', () => {
        const ratio = parseFloat(tr.dataset.ratio);
        const r1 = parseSI(q('#r1-in').value);
        const base = isFinite(r1) && r1 > 0 ? r1 : 10000;
        if (!(isFinite(r1) && r1 > 0)) {
          const { num, prefix } = splitSI(base);
          q('#r1-in').value = num + prefix;
        }
        const { num, prefix } = splitSI(base * ratio);
        q('#r2-in').value = num + prefix;
        updateForward();
      })
    );
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  q('#vin-in').value = '5';
  q('#r1-in').value  = '10k';
  q('#r2-in').value  = '10k';
  updateForward();

  q('#rv-vin').value  = '5';
  q('#rv-vout').value = '3.3';
  q('#rv-r1').value   = '10k';
  updateReverse();
}

// ── HTML template ────────────────────────────────────────────────────────────
function html() {
  return `
<svg style="display:none" aria-hidden="true"><defs>
  <symbol id="i-divider" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v4"/><rect x="9" y="5" width="6" height="6" rx="1"/><path d="M12 11v2"/><path d="M12 13h7"/><path d="M12 13v2"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M12 21v2"/></symbol>
  <symbol id="i-swap"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 5l3 3-3 3M20 16H6M10 13l-3 3 3 3"/></symbol>
  <symbol id="i-cpu"     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 7V3M12 7V3M15 7V3M9 17v4M12 17v4M15 17v4M7 9H3M7 12H3M7 15H3M17 9h4M17 12h4M17 15h4"/></symbol>
  <symbol id="i-sun"     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l-1.41 1.41"/></symbol>
  <symbol id="i-moon"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
</defs></svg>

<div class="hdr">
  <div class="hdr-left">
    <div class="hdr-icon"><span class="ico" style="width:24px;height:24px"><svg><use href="#i-divider"/></svg></span></div>
    <div>
      <p class="hdr-title">Voltage Divider</p>
      <p class="hdr-sub">Vin, R1, R2 → Vout · click a ratio to load it</p>
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
    <p class="sec-lbl">Series divider</p>
    <div class="row3">
      <div class="inp-card">
        <div class="inp-lbl">Vin</div>
        <div class="inp-row">
          <input class="inp-field inp-sm" type="text" inputmode="decimal" id="vin-in">
          <span class="inp-unit">V</span>
        </div>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">R1 (top)</div>
        <div class="inp-row">
          <input class="inp-field inp-sm" type="text" inputmode="decimal" id="r1-in">
          <span class="inp-unit">Ω</span>
        </div>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">R2 (bottom)</div>
        <div class="inp-row">
          <input class="inp-field inp-sm" type="text" inputmode="decimal" id="r2-in">
          <span class="inp-unit">Ω</span>
        </div>
      </div>
    </div>

    <div class="fml">
      <span class="fml-lbl">Formula</span>
      <div class="fml-eq" id="fwd-fml"></div>
    </div>

    <p class="sec-lbl">Results</p>
    <div class="stat-grid">
      <div class="inp-card">
        <div class="inp-lbl">Vout</div>
        <input class="inp-field inp-sm" type="text" id="out-vout" readonly>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Current</div>
        <input class="inp-field inp-sm" type="text" id="out-i" readonly>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Power R1</div>
        <input class="inp-field inp-sm" type="text" id="out-p1" readonly>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Power R2</div>
        <input class="inp-field inp-sm" type="text" id="out-p2" readonly>
      </div>
      <div class="inp-card">
        <div class="inp-lbl">Total power</div>
        <input class="inp-field inp-sm" type="text" id="out-ptot" readonly>
      </div>
    </div>
  </div>

  <div class="col-abs">
    <div class="abs-block">
      <div class="abs-head">
        <span class="abs-name"><span class="ico" style="width:13px;height:13px"><svg><use href="#i-swap"/></svg></span>&nbsp; Solve for R2</span>
        <span class="abs-ref">target Vout, given Vin &amp; R1</span>
      </div>
      <div class="row3">
        <div class="inp-card">
          <div class="inp-lbl">Vin</div>
          <div class="inp-row">
            <input class="inp-field inp-sm" type="text" inputmode="decimal" id="rv-vin">
            <span class="inp-unit">V</span>
          </div>
        </div>
        <div class="inp-card">
          <div class="inp-lbl">Target Vout</div>
          <div class="inp-row">
            <input class="inp-field inp-sm" type="text" inputmode="decimal" id="rv-vout">
            <span class="inp-unit">V</span>
          </div>
        </div>
        <div class="inp-card">
          <div class="inp-lbl">R1 (top)</div>
          <div class="inp-row">
            <input class="inp-field inp-sm" type="text" inputmode="decimal" id="rv-r1">
            <span class="inp-unit">Ω</span>
          </div>
        </div>
      </div>
      <div class="inp-card" style="margin-bottom:.75rem">
        <div class="inp-lbl">Required R2</div>
        <div class="inp-row">
          <input class="inp-field" type="text" id="rv-r2" readonly>
          <span class="inp-unit">Ω</span>
        </div>
      </div>
      <div class="fml fml-sm">
        <span class="fml-lbl">Formula</span>
        <div class="fml-eq" id="rev-fml"></div>
      </div>
    </div>
  </div>

  <div class="col-ref">
    <p class="sec-lbl">Schematic</p>
    <div class="sch-wrap">
      <svg class="sch-svg" viewBox="0 0 210 230" xmlns="http://www.w3.org/2000/svg">
        <circle class="dot" cx="60" cy="15" r="2.5"/>
        <text class="lbl-desig" x="14" y="19">Vin</text>
        <text class="val" id="sch-vin" x="70" y="19">5V</text>

        <path class="wire" d="M60 15v35"/>
        <rect class="box" x="45" y="50" width="30" height="40" rx="3"/>
        <text class="lbl-desig" x="14" y="73">R1</text>
        <text class="val" id="sch-r1" x="85" y="73">10kΩ</text>

        <path class="wire" d="M60 90v20"/>
        <circle class="dot" cx="60" cy="110" r="2.5"/>
        <path class="wire" d="M60 110h60"/>
        <circle class="dot" cx="150" cy="110" r="2.5"/>
        <text class="lbl-desig" x="155" y="106">Vout</text>
        <text class="val" id="sch-vout" x="155" y="122">2.5V</text>

        <path class="wire" d="M60 110v20"/>
        <rect class="box" x="45" y="130" width="30" height="40" rx="3"/>
        <text class="lbl-desig" x="14" y="153">R2</text>
        <text class="val" id="sch-r2" x="85" y="153">10kΩ</text>

        <path class="wire" d="M60 170v25"/>
        <path class="wire" d="M45 195h30"/>
        <path class="wire" d="M50 200h20"/>
        <path class="wire" d="M55 205h10"/>
        <text class="lbl" x="70" y="207">GND</text>
      </svg>
    </div>

    <p class="sec-lbl">Common ratios</p>
    <div class="tbl-wrap">
      <table class="ref-tbl">
        <thead>
          <tr>
            <th>Ratio</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody id="ratio-body"></tbody>
      </table>
    </div>
  </div>

</div>

<div class="footer">
  <span class="footer-tag"><span class="ico" style="width:14px;height:14px"><svg><use href="#i-cpu"/></svg></span> RF &amp; Signal Integrity Toolkit</span>
  <span class="footer-ver">v0.3 · more tools coming</span>
</div>
`;
}
