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
  index.html       ← tab router entry point
  style.css        ← all CSS (design tokens, layout, components)
  main.js          ← imports calculator, calls init()

## Coding Rules
- Each calculator exports: { id, title, calculate(inputs), schema }
- SI prefixes use the existing units.js logic
- All formulas rendered via KaTeX, not plain text
- Mobile-friendly layout required

## Dev Server
ES modules require HTTP — open via `file://` will show a blank card.

```
python -m http.server 8080 --directory src
```

Then open http://localhost:8080

## Planned Calculators
- [x] dB ratio converter (voltage/power modes, dBµV, dBm, reference table)
- [ ] Rise time ↔ critical length
- [ ] BW ↔ rise time
- [ ] Transmission line impedance (microstrip/stripline)
- [ ] RC filter corner frequency
- [ ] Voltage divider
