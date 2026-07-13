import { fmtSI, splitSI, parseSI, fmtPlain, fmtDB } from '../shared/units.js';
import { kat } from '../shared/latex.js';
import { setTheme, badge, footerHTML, comingSoonHTML } from '../shared/ui.js';

export const id = 'db-converter';
export const title = 'dB Converter';

export const schema = {
  inputs: [
    { id: 'mode',  type: 'select',  options: ['voltage', 'power'], default: 'voltage' },
    { id: 'db',    type: 'number',  label: 'Decibels', unit: 'dB' },
    { id: 'ratio', type: 'number',  label: 'Ratio' },
  ],
  outputs: [
    { id: 'db',    label: 'dB' },
    { id: 'ratio', label: 'Ratio' },
  ],
};

export function calculate({ mode = 'voltage', db, ratio } = {}) {
  const k = mode === 'voltage' ? 20 : 10;
  if (db !== undefined && !isNaN(db))
    return { db, ratio: Math.pow(10, db / k) };
  if (ratio !== undefined && !isNaN(ratio) && ratio > 0)
    return { db: k * Math.log10(ratio), ratio };
  return {};
}

// ── Reference rows ──────────────────────────────────────────────────────────
const REFS = [
  { db: -120, noteV: 'Thermal noise floor (typical)',  noteP: '1 pW from 1 W ref' },
  { db: -100, noteV: 'Weak RF / sensitivity limit',    noteP: '10 pW — receiver noise floor' },
  { db:  -80, noteV: 'Typical RX noise floor',          noteP: '10 nW — typical sensitivity' },
  { db:  -60, noteV: 'Crosstalk / leakage level',       noteP: '1 µW — crosstalk / leakage' },
  { db:  -40, noteV: 'Strong attenuation',              noteP: '10 µW — strong attenuation' },
  { db:  -20, noteV: '10× less voltage',                noteP: '1% of input power' },
  { db:  -10, noteV: '~3.162× less voltage',            noteP: '10% of input power' },
  { db:   -6, noteV: '~half voltage',                   noteP: '~25% of input power' },
  { db:   -3, noteV: '~70.7% voltage · −3 dB BW',      noteP: 'Half power · −3 dB BW' },
  { db:    0, noteV: 'Unity gain',                      noteP: 'Unity gain' },
  { db:    3, noteV: '~1.414× voltage',                 noteP: 'Double power' },
  { db:    6, noteV: 'Double voltage',                  noteP: '~4× power' },
  { db:   10, noteV: '~3.162× voltage',                 noteP: '10× power' },
  { db:   20, noteV: '10× voltage',                     noteP: '100× power' },
  { db:   40, noteV: '100× voltage',                    noteP: '10 000× power' },
];

// ── Absolute unit tables ─────────────────────────────────────────────────────
const DBUV = {
  toUV:   { nV: 0.001, uV: 1,    mV: 1000,  V: 1e6  },
  fromUV: { nV: 1000,  uV: 1,    mV: 0.001, V: 1e-6 },
  lbl:    { nV: 'nV',  uV: 'µV', mV: 'mV',  V: 'V'  },
};
const DBM = {
  toMW:   { nW: 1e-6, uW: 0.001, mW: 1, W: 1000  },
  fromMW: { nW: 1e6,  uW: 1000,  mW: 1, W: 0.001 },
  lbl:    { nW: 'nW', uW: 'µW',  mW: 'mW', W: 'W' },
};

// ── init ─────────────────────────────────────────────────────────────────────
export function init(container) {
  container.innerHTML = html();

  let mode = 'voltage';
  let ratioSIPrefix = '';
  let dbuvUnit = 'uV';
  let dbmUnit  = 'mW';

  const q = sel => container.querySelector(sel);

  // Theme
  container.querySelectorAll('[data-theme-btn]').forEach(btn =>
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn))
  );

  // Mode toggle
  q('#btn-v').addEventListener('click', () => setMode('voltage'));
  q('#btn-p').addEventListener('click', () => setMode('power'));

  // Main converter
  q('#db-in').addEventListener('input', fromDB);
  q('#rt-in').addEventListener('input', fromRatio);
  q('#rt-in').addEventListener('focus', focusRatio);
  q('#rt-in').addEventListener('blur',  blurRatio);
  q('#swap-btn').addEventListener('click', fromDB);

  // dBµV
  q('#dbuv-db').addEventListener('input', dbuvFromDb);
  q('#dbuv-v').addEventListener('input',  dbuvFromV);
  q('#dbuv-v').addEventListener('blur', () => {
    const v = parseSI(q('#dbuv-v').value);
    if (isFinite(v) && v > 0) q('#dbuv-v').value = fmtPlain(v);
  });
  container.querySelectorAll('[data-dbuv-unit]').forEach(btn =>
    btn.addEventListener('click', () => dbuvSetUnit(btn.dataset.dbuvUnit))
  );

  // dBm
  q('#dbm-db').addEventListener('input', dbmFromDb);
  q('#dbm-p').addEventListener('input',  dbmFromP);
  q('#dbm-p').addEventListener('blur', () => {
    const p = parseSI(q('#dbm-p').value);
    if (isFinite(p) && p > 0) q('#dbm-p').value = fmtPlain(p);
  });
  container.querySelectorAll('[data-dbm-unit]').forEach(btn =>
    btn.addEventListener('click', () => dbmSetUnit(btn.dataset.dbmUnit))
  );

  // ── Main converter helpers ────────────────────────────────────────────────
  const K   = () => mode === 'voltage' ? 20 : 10;
  const toR = db => Math.pow(10, db / K());
  const toDB = r => K() * Math.log10(r);

  function showFormula(dir, val) {
    const k = K(); let tex;
    if (dir === 'db' && val !== null)
      tex = `\\mathrm{ratio}=10^{${val}/${k}}=\\text{${fmtSI(toR(val))}}`;
    else if (dir === 'ratio' && val !== null && val > 0)
      tex = `\\mathrm{dB}=${k}\\cdot\\log_{10}(\\text{${fmtSI(val)}})=${fmtDB(toDB(val))}\\,\\mathrm{dB}`;
    else
      tex = k === 20
        ? `\\mathrm{ratio}=10^{\\mathrm{dB}/20}\\;\\Longleftrightarrow\\;\\mathrm{dB}=20\\cdot\\log_{10}(\\mathrm{ratio})`
        : `\\mathrm{ratio}=10^{\\mathrm{dB}/10}\\;\\Longleftrightarrow\\;\\mathrm{dB}=10\\cdot\\log_{10}(\\mathrm{ratio})`;
    kat(q('#fml-eq'), tex);
  }

  function fromDB() {
    const db = parseFloat(q('#db-in').value);
    const base = mode === 'voltage' ? 'V/V' : 'W/W';
    if (isNaN(db)) {
      q('#rt-in').value = '';
      q('#rt-unit').textContent = base;
      ratioSIPrefix = '';
      showFormula(null, null);
      return;
    }
    const { num, prefix } = splitSI(toR(db));
    ratioSIPrefix = prefix;
    q('#rt-in').value = num;
    q('#rt-unit').textContent = prefix + base;
    showFormula('db', db);
  }

  function fromRatio() {
    const str = q('#rt-in').value.trim();
    if (!str || str.endsWith('.')) return;
    const r = parseSI(str);
    if (isNaN(r) || r <= 0) { q('#db-in').value = ''; showFormula(null, null); return; }
    q('#db-in').value = fmtDB(toDB(r));
    showFormula('ratio', r);
  }

  function focusRatio() {
    if (!ratioSIPrefix) return;
    const num = parseFloat(q('#rt-in').value);
    if (!isNaN(num)) {
      const pfx = { T: 1e12, G: 1e9, M: 1e6, k: 1e3, '': 1, m: 1e-3, µ: 1e-6, n: 1e-9, p: 1e-12 };
      const r = num * (pfx[ratioSIPrefix] ?? 1);
      q('#rt-in').value = fmtSI(r);
      q('#rt-unit').textContent = mode === 'voltage' ? 'V/V' : 'W/W';
      ratioSIPrefix = '';
    }
  }

  function blurRatio() {
    const r = parseSI(q('#rt-in').value);
    const base = mode === 'voltage' ? 'V/V' : 'W/W';
    if (isFinite(r) && r > 0) {
      const { num, prefix } = splitSI(r);
      ratioSIPrefix = prefix;
      q('#rt-in').value = num;
      q('#rt-unit').textContent = prefix + base;
    }
  }

  function setMode(m) {
    mode = m;
    ratioSIPrefix = '';
    q('#btn-v').classList.toggle('active', m === 'voltage');
    q('#btn-p').classList.toggle('active', m === 'power');
    q('#th-rt').textContent = m === 'voltage' ? 'Ratio (V/V)' : 'Ratio (W/W)';
    buildTable();
    fromDB();
  }

  function buildTable() {
    q('#ref-body').innerHTML = REFS.map(r =>
      `<tr data-db="${r.db}"><td>${badge(r.db)}</td><td>${fmtSI(toR(r.db))}</td><td class="note-c">${mode === 'voltage' ? r.noteV : r.noteP}</td></tr>`
    ).join('');
    q('#ref-body').querySelectorAll('tr').forEach(tr =>
      tr.addEventListener('click', () => { q('#db-in').value = tr.dataset.db; fromDB(); })
    );
  }

  // ── dBµV helpers ──────────────────────────────────────────────────────────
  function bestUnitDbuv(vuv) {
    if (vuv >= 1e6) return 'V';
    if (vuv >= 1e3) return 'mV';
    if (vuv >= 1)   return 'uV';
    return 'nV';
  }

  function setDbuvPill(u) {
    dbuvUnit = u;
    container.querySelectorAll('[data-dbuv-unit]').forEach(b =>
      b.classList.toggle('active', b.dataset.dbuvUnit === u)
    );
    q('#dbuv-vunit').textContent = DBUV.lbl[u];
  }

  function dbuvFromDb() {
    const db = parseFloat(q('#dbuv-db').value);
    if (isNaN(db)) { q('#dbuv-v').value = ''; dbuvFormula(null); return; }
    const vuv = Math.pow(10, db / 20);
    const u = bestUnitDbuv(vuv);
    setDbuvPill(u);
    q('#dbuv-v').value = fmtPlain(vuv * DBUV.fromUV[u]);
    dbuvFormula(db);
  }

  function dbuvFromV() {
    const str = q('#dbuv-v').value;
    if (!str || str.endsWith('.')) return;
    const v = parseSI(str);
    if (isNaN(v) || v <= 0) { q('#dbuv-db').value = ''; dbuvFormula(null); return; }
    const db = 20 * Math.log10(v * DBUV.toUV[dbuvUnit]);
    q('#dbuv-db').value = fmtDB(db);
    dbuvFormula(db);
  }

  function dbuvSetUnit(u) {
    setDbuvPill(u);
    const db = parseFloat(q('#dbuv-db').value);
    if (!isNaN(db)) {
      const vuv = Math.pow(10, db / 20);
      q('#dbuv-v').value = fmtPlain(vuv * DBUV.fromUV[u]);
      dbuvFormula(db);
    }
  }

  function dbuvFormula(db) {
    let tex;
    if (db !== null) {
      const vuv = Math.pow(10, db / 20);
      tex = `\\mathrm{dB}\\mu\\mathrm{V}=20\\cdot\\log_{10}(\\text{${fmtSI(vuv)}}\\,\\mu\\mathrm{V})=${fmtDB(db)}`;
    } else {
      tex = `\\mathrm{dB}\\mu\\mathrm{V}=20\\cdot\\log_{10}\\!\\left(\\tfrac{V}{1\\,\\mu\\mathrm{V}}\\right)`;
    }
    kat(q('#dbuv-fml'), tex);
  }

  // ── dBm helpers ───────────────────────────────────────────────────────────
  function bestUnitDbm(pmw) {
    if (pmw >= 1000)  return 'W';
    if (pmw >= 1)     return 'mW';
    if (pmw >= 0.001) return 'uW';
    return 'nW';
  }

  function setDbmPill(u) {
    dbmUnit = u;
    container.querySelectorAll('[data-dbm-unit]').forEach(b =>
      b.classList.toggle('active', b.dataset.dbmUnit === u)
    );
    q('#dbm-punit').textContent = DBM.lbl[u];
  }

  function dbmFromDb() {
    const db = parseFloat(q('#dbm-db').value);
    if (isNaN(db)) { q('#dbm-p').value = ''; dbmFormula(null); return; }
    const pmw = Math.pow(10, db / 10);
    const u = bestUnitDbm(pmw);
    setDbmPill(u);
    q('#dbm-p').value = fmtPlain(pmw * DBM.fromMW[u]);
    dbmFormula(db);
  }

  function dbmFromP() {
    const str = q('#dbm-p').value;
    if (!str || str.endsWith('.')) return;
    const p = parseSI(str);
    if (isNaN(p) || p <= 0) { q('#dbm-db').value = ''; dbmFormula(null); return; }
    const db = 10 * Math.log10(p * DBM.toMW[dbmUnit]);
    q('#dbm-db').value = fmtDB(db);
    dbmFormula(db);
  }

  function dbmSetUnit(u) {
    setDbmPill(u);
    const db = parseFloat(q('#dbm-db').value);
    if (!isNaN(db)) {
      const pmw = Math.pow(10, db / 10);
      q('#dbm-p').value = fmtPlain(pmw * DBM.fromMW[u]);
      dbmFormula(db);
    }
  }

  function dbmFormula(db) {
    let tex;
    if (db !== null) {
      const pmw = Math.pow(10, db / 10);
      tex = `\\mathrm{dBm}=10\\cdot\\log_{10}(\\text{${fmtSI(pmw)}}\\,\\mathrm{mW})=${fmtDB(db)}`;
    } else {
      tex = `\\mathrm{dBm}=10\\cdot\\log_{10}\\!\\left(\\tfrac{P}{1\\,\\mathrm{mW}}\\right)`;
    }
    kat(q('#dbm-fml'), tex);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  buildTable();
  q('#db-in').value = '6'; fromDB();
  q('#dbuv-db').value = '0'; dbuvFromDb();
  q('#dbm-db').value  = '0'; dbmFromDb();
}

// ── HTML template ────────────────────────────────────────────────────────────
function html() {
  return `
<svg style="display:none" aria-hidden="true"><defs>
  <symbol id="i-fn"      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C4 6,6 6,8 12S12 18,14 12S18 6,20 12"/></symbol>
  <symbol id="i-bolt"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L6 13h7l-2 8 9-11h-7z"/></symbol>
  <symbol id="i-pulse"   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,12 5,12 8,5 11,19 14,12 18,12 22,12"/></symbol>
  <symbol id="i-swap"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 5l3 3-3 3M20 16H6M10 13l-3 3 3 3"/></symbol>
  <symbol id="i-cpu"     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 7V3M12 7V3M15 7V3M9 17v4M12 17v4M15 17v4M7 9H3M7 12H3M7 15H3M17 9h4M17 12h4M17 15h4"/></symbol>
  <symbol id="i-sun"     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l-1.41 1.41"/></symbol>
  <symbol id="i-moon"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
</defs></svg>

<div class="hdr">
  <div class="hdr-left">
    <div class="hdr-icon"><span class="ico" style="width:24px;height:24px"><svg><use href="#i-fn"/></svg></span></div>
    <div>
      <p class="hdr-title">dB Converter</p>
      <p class="hdr-sub">Decibels ↔ linear ratio · click any reference row to load</p>
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
    <div class="seg">
      <button class="seg-btn active" id="btn-v">
        <span class="ico" style="width:15px;height:15px"><svg><use href="#i-bolt"/></svg></span>
        Voltage / field <span class="sub">(20·log₁₀)</span>
      </button>
      <button class="seg-btn" id="btn-p">
        <span class="ico" style="width:15px;height:15px"><svg><use href="#i-pulse"/></svg></span>
        Power <span class="sub">(10·log₁₀)</span>
      </button>
    </div>

    <div class="conv">
      <div class="inp-card">
        <div class="inp-lbl">Decibels</div>
        <div class="inp-row">
          <input class="inp-field" type="number" id="db-in" step="any">
          <span class="inp-unit">dB</span>
        </div>
      </div>
      <button class="swap" id="swap-btn" title="Recalculate">
        <span class="ico" style="width:16px;height:16px"><svg><use href="#i-swap"/></svg></span>
      </button>
      <div class="inp-card">
        <div class="inp-lbl">Ratio</div>
        <div class="inp-row">
          <input class="inp-field" type="text" inputmode="decimal" id="rt-in">
          <span class="inp-unit" id="rt-unit">V/V</span>
        </div>
      </div>
    </div>

    <div class="fml">
      <span class="fml-lbl">Formula</span>
      <div class="fml-eq" id="fml-eq"></div>
    </div>
  </div>

  <div class="col-abs">
    <div class="abs-block">
      <div class="abs-head">
        <span class="abs-name">dBµV &nbsp;↔&nbsp; Voltage</span>
        <span class="abs-ref">ref. 1 µV</span>
      </div>
      <div class="abs-grid">
        <div class="inp-card">
          <div class="inp-lbl-sym">dBµV</div>
          <div class="inp-row">
            <input class="inp-field inp-sm" type="number" id="dbuv-db" step="any">
            <span class="inp-unit">dBµV</span>
          </div>
        </div>
        <div class="abs-arrow"><span class="ico" style="width:14px;height:14px"><svg><use href="#i-swap"/></svg></span></div>
        <div>
          <div class="inp-card">
            <div class="inp-lbl">Voltage</div>
            <div class="inp-row">
              <input class="inp-field inp-sm" type="text" inputmode="decimal" id="dbuv-v">
              <span class="inp-unit" id="dbuv-vunit">µV</span>
            </div>
          </div>
          <div class="upill-row">
            <button class="upill"        data-dbuv-unit="nV">nV</button>
            <button class="upill active" data-dbuv-unit="uV">µV</button>
            <button class="upill"        data-dbuv-unit="mV">mV</button>
            <button class="upill"        data-dbuv-unit="V">V</button>
          </div>
        </div>
      </div>
      <div class="fml fml-sm">
        <span class="fml-lbl">Formula</span>
        <div class="fml-eq" id="dbuv-fml"></div>
      </div>
    </div>

    <div class="abs-block">
      <div class="abs-head">
        <span class="abs-name">dBm &nbsp;↔&nbsp; Power</span>
        <span class="abs-ref">ref. 1 mW</span>
      </div>
      <div class="abs-grid">
        <div class="inp-card">
          <div class="inp-lbl-sym">dBm</div>
          <div class="inp-row">
            <input class="inp-field inp-sm" type="number" id="dbm-db" step="any">
            <span class="inp-unit">dBm</span>
          </div>
        </div>
        <div class="abs-arrow"><span class="ico" style="width:14px;height:14px"><svg><use href="#i-swap"/></svg></span></div>
        <div>
          <div class="inp-card">
            <div class="inp-lbl">Power</div>
            <div class="inp-row">
              <input class="inp-field inp-sm" type="text" inputmode="decimal" id="dbm-p">
              <span class="inp-unit" id="dbm-punit">mW</span>
            </div>
          </div>
          <div class="upill-row">
            <button class="upill"        data-dbm-unit="nW">nW</button>
            <button class="upill"        data-dbm-unit="uW">µW</button>
            <button class="upill active" data-dbm-unit="mW">mW</button>
            <button class="upill"        data-dbm-unit="W">W</button>
          </div>
        </div>
      </div>
      <div class="fml fml-sm">
        <span class="fml-lbl">Formula</span>
        <div class="fml-eq" id="dbm-fml"></div>
      </div>
    </div>
  </div>

  <div class="col-ref">
    <p class="sec-lbl">Common reference values</p>
    <div class="tbl-wrap">
      <table class="ref-tbl">
        <thead>
          <tr>
            <th style="width:76px">dB</th>
            <th id="th-rt" style="width:110px">Ratio (V/V)</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody id="ref-body"></tbody>
      </table>
    </div>
    ${comingSoonHTML()}
  </div>

</div>

${footerHTML()}
`;
}
