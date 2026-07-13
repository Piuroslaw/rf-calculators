# RF / SI Calculator Suite

## Project Goal
Web-based calculator toolkit for RF and signal integrity engineering.
Hosted as a static site on GitHub Pages.

## Stack
- Vanilla JS (ES modules, no framework)
- KaTeX for formula rendering (CDN)
- CSS custom properties for theming (host vars from Claude.ai design system)

## Structure
src/
  calculators/     ← one file per calculator
  shared/
    units.js       ← SI prefix formatting
    latex.js       ← KaTeX wrapper
    ui.js          ← shared UI helpers (theme, badge)
    registry.js    ← list of registered calculator modules (add new ones here)
  index.html       ← page shell: #tabs nav + #app card
  style.css        ← all CSS (design tokens, layout, components)
  main.js          ← tab router: renders #tabs from registry.js, mounts selected calculator into #app

## Coding Rules
- Each calculator exports: { id, title, calculate(inputs), schema, init(container) }
- New calculators must be added to `shared/registry.js` to appear as a tab
- Calculator selection lives in `location.hash` (`#<calculator-id>`) — deep-linkable/bookmarkable
- `main.js` replaces `#app`'s innerHTML on tab switch; calculators must not rely on state surviving a switch (attach listeners in `init()`, don't use module-level mutable state)
- SI prefixes use the existing units.js logic
- All formulas rendered via KaTeX, not plain text
- Mobile-friendly layout required

## Dev Server
ES modules require HTTP — open via `file://` will show a blank card.

```
python -m http.server 8080 --directory src
```

Then open http://localhost:8080

## Roadmap

### Phase 1 — Calculator registry + tab router — done
- [x] `shared/registry.js` listing calculator modules
- [x] Tab bar in `main.js`, rendered above the card, active tab highlighted
- [x] Hash-based routing (`#<calculator-id>`) for deep links + back/forward

### Phase 2 — Planned Calculators
- [x] dB ratio converter (voltage/power modes, dBµV, dBm, reference table)
- [ ] Voltage divider
- [ ] RC filter corner frequency
- [ ] Rise time ↔ critical length
- [ ] BW ↔ rise time
- [ ] Transmission line impedance (microstrip/stripline)

### Phase 3 — UI/UX enhancements
- [ ] Search/filter box in the tab bar once there are 5+ calculators
- [ ] Persist last-used tab and per-calculator inputs to `localStorage`
- [ ] Encode current calculator inputs into the URL (not just the selected tab) for shareable links
- [ ] Copy-result button next to outputs
- [ ] Recently used / pinned calculators if the list grows large
