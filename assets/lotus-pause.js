(() => {
  const pause = document.getElementById('lotus-pause');
  if (!pause) return;

  const button = pause.querySelector('button');
  const status = pause.querySelector('[role="status"]');
  const next = pause.querySelector('.lotus-pause-link');
  let timer;

  function finish(message, label, completed = false) {
    clearTimeout(timer);
    delete pause.dataset.phase;
    status.textContent = message;
    button.textContent = label;
    next.hidden = !completed;
  }

  button.addEventListener('click', () => {
    if (pause.dataset.phase) {
      finish('One breath. Ten seconds.', 'Take a breath');
      return;
    }

    next.hidden = true;
    pause.dataset.phase = 'in';
    status.textContent = 'Breathe in gently.';
    button.textContent = 'Stop';
    timer = setTimeout(() => {
      pause.dataset.phase = 'out';
      status.textContent = 'Breathe out slowly.';
      timer = setTimeout(() => finish('Take your time.', 'Take another breath', true), 6000);
    }, 4000);
  });

  window.addEventListener('pagehide', () => finish('One breath. Ten seconds.', 'Take a breath'));
  pause.hidden = false;
})();
