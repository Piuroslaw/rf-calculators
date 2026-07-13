# RF / SI Calculator Suite

A small, fast, dependency-free toolkit of web calculators for RF (radio frequency) and signal integrity engineering. Pick a calculator from the tab bar, get a live result and the formula behind it — no build step, no install, no backend.

## Calculators

| Calculator | What it does |
|---|---|
| **dB Converter** | Decibels ↔ linear ratio (voltage or power mode), plus dBµV ↔ voltage and dBm ↔ power, with a clickable reference table of common values |
| **Voltage Divider** | Vin/R1/R2 → Vout, current, and power; reverse-solves for the R2 needed to hit a target Vout (with a nearest-E24-standard-value suggestion); includes a live schematic and a clickable ratio reference table |

More calculators are planned — see the [Roadmap](CLAUDE.md#roadmap) in `CLAUDE.md`.

## Quick start

The app is plain ES modules, which browsers only load over `http://`/`https://` — opening `src/index.html` directly via `file://` will just show a blank card. Serve the `src/` folder with any static file server, for example:

```
python -m http.server 8080 --directory src
```

Then open **http://localhost:8080**.

## Tech stack

- Vanilla JavaScript (ES modules) — no framework, no bundler
- [KaTeX](https://katex.org/) (via CDN) for formula rendering
- CSS custom properties for theming — light / dark / system, switchable per calculator

## Project structure

```
src/
  calculators/     one file per calculator
  shared/
    units.js       SI prefix formatting/parsing
    latex.js       KaTeX render wrapper
    ui.js          shared UI helpers (theme toggle, badges, footer)
    registry.js    list of registered calculator modules
  index.html        page shell: #tabs nav + #app card
  style.css         design tokens, layout, components
  main.js           tab router: renders #tabs, mounts the selected calculator into #app
```

Calculator selection is hash-based (`#<calculator-id>`), so any tab is directly linkable and works with browser back/forward.

## Adding a calculator

Each calculator is a module that exports:

```js
export const id = 'my-calculator';
export const title = 'My Calculator';
export const schema = { inputs: [...], outputs: [...] };
export function calculate(inputs) { /* pure function */ }
export function init(container) { /* render + wire up the DOM */ }
```

Register it in [`src/shared/registry.js`](src/shared/registry.js) and it appears as a new tab automatically. Because `main.js` replaces `#app`'s contents wholesale on every tab switch, a calculator's `init()` must attach its own listeners and must not depend on module-level mutable state surviving a switch.

Full conventions (coding rules, formula-rendering requirements, roadmap) live in [`CLAUDE.md`](CLAUDE.md) — that's the source of truth for contributing.

## Deployment

Intended to be hosted as a static site on GitHub Pages, serving directly out of `src/`.
