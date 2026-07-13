import { calculators } from './shared/registry.js';

const tabsEl = document.getElementById('tabs');
const appEl = document.getElementById('app');

function idFromHash() {
  const id = location.hash.slice(1);
  return calculators.some(c => c.id === id) ? id : calculators[0].id;
}

function renderTabs(activeId) {
  tabsEl.innerHTML = calculators.map(c =>
    `<button class="tab-btn${c.id === activeId ? ' active' : ''}" data-tab="${c.id}">${c.title}</button>`
  ).join('');
  tabsEl.querySelectorAll('[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => { location.hash = btn.dataset.tab; })
  );
}

function renderCalculator(id) {
  const calc = calculators.find(c => c.id === id) ?? calculators[0];
  appEl.innerHTML = '';
  calc.init(appEl);
}

function route() {
  const id = idFromHash();
  renderTabs(id);
  renderCalculator(id);
}

window.addEventListener('hashchange', route);
route();
