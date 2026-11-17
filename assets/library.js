// Divine Light Library: category filters and the lesson audio player.
// Without JS, every card shows and the plain <audio> controls still work.
(function () {
  /* ---------- Filters on the library page ---------- */
  var chips = document.querySelectorAll('.lib-chip');
  var cards = document.querySelectorAll('.lib-grid .lib-card');
  var count = document.querySelector('[data-lib-count]');
  function applyFilter(cat) {
    var shown = 0;
    Array.prototype.forEach.call(cards, function (c) {
      var match = cat === 'all' || c.getAttribute('data-cat') === cat;
      c.hidden = !match;
      if (match) shown++;
    });
    Array.prototype.forEach.call(chips, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-filter') === cat ? 'true' : 'false');
    });
    if (count) count.textContent = shown + (shown === 1 ? ' item' : ' items');
  }
  Array.prototype.forEach.call(chips, function (b) {
    b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); });
  });
  if (chips.length) applyFilter('all');

  /* ---------- Audio player on lesson pages ---------- */
  var player = document.querySelector('.lib-player');
  if (!player) return;
  var audio = player.querySelector('audio');
  var play = player.querySelector('.lib-play');
  var seek = player.querySelector('.lib-seek');
  var cur = player.querySelector('[data-cur]');
  var dur = player.querySelector('[data-dur]');
  var speedBtn = player.querySelector('[data-speed]');
  var msg = player.querySelector('.lib-player-msg');
  var key = 'dl-lib-pos:' + (player.getAttribute('data-id') || audio.currentSrc);
  var speeds = [1, 1.25, 0.75];

  audio.removeAttribute('controls');
  player.classList.add('is-enhanced');
  player.querySelector('.lib-player-ui').hidden = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  }
  function paint() {
    var d = audio.duration || 0, t = audio.currentTime || 0;
    var p = d ? (t / d) * 100 : 0;
    if (document.activeElement !== seek) seek.value = d ? Math.round((t / d) * 1000) : 0;
    seek.style.setProperty('--p', p + '%');
    seek.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
    cur.textContent = fmt(t);
  }
  function save() { try { localStorage.setItem(key, String(Math.floor(audio.currentTime))); } catch (e) {} }

  play.addEventListener('click', function () {
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } else audio.pause();
  });
  audio.addEventListener('play', function () { player.classList.add('is-playing'); play.setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', function () { player.classList.remove('is-playing'); play.setAttribute('aria-label', 'Play'); save(); });
  audio.addEventListener('loadedmetadata', function () {
    dur.textContent = fmt(audio.duration);
    try {
      var saved = parseInt(localStorage.getItem(key), 10);
      if (saved > 5 && saved < audio.duration - 10) {
        audio.currentTime = saved;
        msg.textContent = 'Picking up where you left off, at ' + fmt(saved) + '.';
      }
    } catch (e) {}
    paint();
  });
  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    paint();
    if (Date.now() - lastSave > 5000) { lastSave = Date.now(); save(); }
  });
  audio.addEventListener('ended', function () {
    try { localStorage.removeItem(key); } catch (e) {}
    msg.textContent = 'Take a moment before you get up. Notice how you feel.';
  });
  audio.addEventListener('error', function () {
    player.classList.add('is-unavailable');
    msg.textContent = 'This recording is not available here yet. Please check back soon.';
  });

  seek.addEventListener('input', function () {
    if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    paint();
  });
  Array.prototype.forEach.call(player.querySelectorAll('[data-skip]'), function (b) {
    b.addEventListener('click', function () {
      var d = audio.duration || 0;
      audio.currentTime = Math.max(0, Math.min(d || Infinity, audio.currentTime + Number(b.getAttribute('data-skip'))));
      paint();
    });
  });
  if (speedBtn) speedBtn.addEventListener('click', function () {
    var i = (speeds.indexOf(audio.playbackRate) + 1) % speeds.length;
    audio.playbackRate = speeds[i];
    speedBtn.textContent = speeds[i] + '×';
    speedBtn.setAttribute('aria-label', 'Playback speed ' + speeds[i] + ' times');
  });

  // Space toggles play when focus is not on a control that uses it.
  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space') return;
    var t = e.target;
    if (t.closest && t.closest('button, a, input, textarea, select')) return;
    e.preventDefault();
    play.click();
  });
})();
