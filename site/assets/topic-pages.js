'use strict';

for (const lab of document.querySelectorAll('[data-scenarios]')) {
  const picker = lab.querySelector('.scenario-picker');
  const select = picker.querySelector('select');
  const states = lab.querySelectorAll('[data-scenario]');
  const results = lab.querySelector('.scenario-results');
  results.setAttribute('aria-live', 'polite');
  const show = () => {
    for (const state of states) {
      state.hidden = state.dataset.scenario !== select.value;
    }
  };
  show();
  picker.hidden = false;
  select.addEventListener('change', show);
}

for (const calculator of document.querySelectorAll('[data-estimate]')) {
  const output = calculator.querySelector('output');
  const total = calculator.querySelector('[data-total]');
  const fields = calculator.elements;
  const numberFormat = new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 2 });
  const estimate = () => {
    if (!calculator.checkValidity()) {
      total.textContent = '—';
      output.setAttribute('aria-label', calculator.dataset.error);
      return;
    }
    const hours = fields.applications.valueAsNumber * fields['per-application'].valueAsNumber
      + fields.modelling.valueAsNumber + fields.verification.valueAsNumber;
    total.textContent = numberFormat.format(hours);
    output.removeAttribute('aria-label');
  };
  calculator.addEventListener('input', estimate);
  calculator.addEventListener('submit', event => event.preventDefault());
  estimate();
}
