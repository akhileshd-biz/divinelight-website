const byId = id => document.getElementById(id);
const auth = byId('auth');
const status = byId('status');
let linkCode;
let account;
let selected;
const demo = new URLSearchParams(location.search).get('demo') === '1';
const demoEmail = 'demo@example.com';
const demoLessons = [
  { id: 'divine', title: 'Divine Light', description: 'A sample grounding lesson.', content: 'Sit comfortably, take three easy breaths, and notice where your feet meet the ground.' },
  { id: 'sleep', title: 'Sleep', description: 'A sample wind-down lesson.', content: 'Let your shoulders settle and take a moment to notice your breathing.', audio: '/library-relax' },
];
const demoProgressKey = 'divine-light-demo-progress';

function demoAccount() {
  const completed = JSON.parse(sessionStorage.getItem(demoProgressKey) || '[]');
  return { active: true, hasBilling: false, lessons: demoLessons, completed };
}


function message(text = '') {
  status.textContent = text;
  status.hidden = !text;
}

async function api(payload, endpoint = '/api/membership') {
  const response = await fetch(endpoint, payload ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  } : { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Membership is temporarily unavailable.');
  return data;
}

const signInApi = payload => api(payload, '/api/member-auth');

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderCards() {
  byId('lessons').replaceChildren(...account.lessons.map(lesson => {
    const card = element('article', 'course-card');
    const cover = element('div', `cover cover-${lesson.id === 'sleep' ? 'sleep' : 'light'}`);
    cover.append(element('h2', '', lesson.title));
    const body = element('div', 'card-body');
    const progress = element('progress', '');
    progress.max = 1;
    progress.value = account.completed.includes(lesson.id) ? 1 : 0;
    progress.setAttribute('aria-label', `${lesson.title} completion`);
    const button = element('button', 'cta', progress.value ? 'Revisit lesson' : 'Open lesson');
    button.type = 'button';
    button.addEventListener('click', () => showLesson(lesson));
    body.append(element('h3', 'card-title', lesson.title), progress, element('p', 'card-description', lesson.description), button);
    card.append(cover, body);
    return card;
  }));
}

function showLesson(lesson) {
  selected = lesson;
  byId('account').hidden = true;
  byId('lesson').hidden = false;
  byId('lesson-title').textContent = lesson.title;
  byId('lesson-copy').textContent = lesson.content;
  byId('lesson-audio').hidden = !lesson.audio;
  if (lesson.audio) byId('lesson-audio').href = lesson.audio;
  byId('complete').textContent = account.completed.includes(lesson.id) ? 'Mark incomplete' : 'Mark complete';
  byId('lesson-title').focus();
}

function renderLibraryOffer() {
  const owns = Boolean(account.ownsLibrary);
  byId('library-offer').hidden = demo || owns || !account.libraryForSale;
  byId('downloads').hidden = !owns;
  byId('download-list').replaceChildren(...(account.downloads || []).map(item => {
    const row = element('li', 'download-item');
    const link = element('a', 'cta download-btn', 'Download');
    link.href = item.file;
    link.setAttribute('download', item.name);
    link.setAttribute('aria-label', `Download ${item.title} (${item.size})`);
    row.append(element('span', 'download-title', `${item.title} · ${item.size}`), link);
    return row;
  }));
  if (new URLSearchParams(location.search).get('purchase') === 'complete') {
    message(owns ? 'Payment received. Your downloads are ready below.'
      : 'Payment received. Your downloads will appear in a moment. Refresh the page if they do not.');
  }
}

async function openAccount() {
  byId('login').hidden = true;
  byId('sign-out').hidden = false;
  account = demo ? demoAccount() : await api();
  byId('account').hidden = false;
  byId('subscription-status').textContent = account.active ? 'Your membership is active.' :
    account.hasBilling ? 'Manage billing to restore access.' : 'Join to unlock your member library and save lesson progress.';
  if (account.billingReady === false) {
    byId('subscription-status').textContent = 'You’re signed in. Membership billing is being set up.';
    byId('billing').closest('.membership').hidden = true;
  }
  if (demo) {
    byId('subscription-status').textContent = 'Demo account · progress is saved in this tab.';
    byId('billing').closest('.membership').hidden = true;
  }
  byId('billing').textContent = account.hasBilling ? 'Manage membership' : 'Join membership';
  renderLibraryOffer();
  renderCards();
}

async function run(button, action) {
  button.disabled = true;
  message();
  try { await action(); }
  catch (error) { message(error.message || 'Something went wrong. Please try again.'); }
  finally { button.disabled = false; }
}

auth.addEventListener('submit', event => {
  event.preventDefault();
  void run(byId('auth-submit'), async () => {
    if (demo) {
      await openAccount();
    } else if (linkCode) {
      const code = linkCode;
      try {
        await signInApi({ action: 'redeem', code });
        await openAccount();
      } finally {
        linkCode = null;
        byId('email-field').hidden = false;
        auth.email.required = true;
        byId('auth-submit').textContent = 'Send sign-in link';
      }
    } else {
      const result = await signInApi({ action: 'send', email: auth.email.value });
      message(result.message);
    }
  });
});

byId('sign-out').onclick = event => void run(event.currentTarget, async () => {
  if (!demo) await signInApi({ action: 'logout' });
  location.replace(demo ? '/members?demo=1' : '/members');
});
byId('billing').onclick = event => void run(event.currentTarget, async () => {
  const { url } = await api({ action: account.hasBilling ? 'manage' : 'checkout' });
  location.assign(url);
});
byId('buy-library').onclick = event => void run(event.currentTarget, async () => {
  const { url } = await api({ action: 'buy-library' });
  location.assign(url);
});
byId('back').onclick = () => {
  byId('lesson').hidden = true;
  byId('account').hidden = false;
  renderCards();
};
byId('complete').onclick = event => void run(event.currentTarget, async () => {
  const lesson = selected;
  const complete = !account.completed.includes(lesson.id);
  if (!demo) await api({ action: 'complete', lesson: lesson.id, complete });
  account.completed = account.completed.filter(id => id !== lesson.id);
  if (complete) account.completed.push(lesson.id);
  if (demo) sessionStorage.setItem(demoProgressKey, JSON.stringify(account.completed));
  if (selected === lesson && !byId('lesson').hidden) showLesson(lesson);
  else renderCards();
});

void run(byId('auth-submit'), async () => {
  if (demo) {
    byId('auth-title').textContent = 'Try the demo library.';
    byId('auth-copy').textContent = 'Sample sign-in details only. This demo uses sample lessons and has no billing.';
    auth.email.value = demoEmail;
    auth.autocomplete = 'off';
    auth.email.readOnly = true;
    byId('auth-submit').textContent = 'Sign in to demo';
    return;
  }
  linkCode = new URLSearchParams(location.hash.slice(1)).get('member_link');
  if (linkCode) {
    history.replaceState(null, '', location.pathname + location.search);
    byId('auth-title').textContent = 'Finish signing in.';
    byId('auth-copy').textContent = 'Continue to your Divine Light account.';
    byId('email-field').hidden = true;
    auth.email.required = false;
    byId('auth-submit').textContent = 'Continue to account';
  } else if ((await signInApi()).signedIn) {
    await openAccount();
  }
});
