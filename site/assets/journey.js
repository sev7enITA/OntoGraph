'use strict';

const topicJourney = document.querySelector('[data-topic-journey]');

if (topicJourney) {
  const caseKey = new URL(location.href).searchParams.get('journey');
  const paths = [...topicJourney.querySelectorAll('[data-case]')];
  const selected = paths.find(path => path.dataset.case === caseKey);
  if (selected) {
    selected.classList.add('journey-selected');
    selected.querySelector('.journey-current').hidden = false;
    topicJourney.querySelector('ul').prepend(selected);
    const alternate = document.querySelector('.topic-language');
    const target = new URL(alternate.href);
    target.searchParams.set('journey', caseKey);
    alternate.href = target.href;
  }
}
