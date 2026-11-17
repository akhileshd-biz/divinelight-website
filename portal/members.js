import { getUser, handleAuthCallback, login, logout, requestPasswordRecovery, signup, updateUser } from '@netlify/identity';

const byId = id => document.getElementById(id);
const auth = byId('auth');
const status = byId('status');
let mode = 'login';
let account;
let selected;

function message(text = '') {
  status.textContent = text;
  status.hidden = !text;
}

function setMode(next) {
  mode = next;
  const titles = { login: 'Welcome back.', signup: 'Become a member.', recover: 'Reset your password.', password: 'Set a new password.' };
  const actions = { login: 'Sign in', signup: 'Create account', recover: 'Send reset email', password: 'Save password' };
  byId('auth-title').textContent = titles[next];
  byId('auth-copy').textContent = next === 'signup' ? 'Create an account to join the $25 monthly membership.' :
    next === 'login' ? 'Sign in to open your Divine Light member library.' : 'Use the email address for your Divine Light account.';
  byId('auth-copy').hidden = next === 'password';
  byId('auth-submit').textContent = actions[next];
  auth.email.required = next !== 'password';
  byId('email-field').hidden = !auth.email.required;
  auth.password.required = next !== 'recover';
  auth.password.autocomplete = next === 'login' ? 'current-password' : 'new-password';
  auth.password.minLength = ['signup', 'password'].includes(next) ? 8 : 0;
  byId('password-field').hidden = !auth.password.required;
  byId('switch-auth').textContent = next === 'login' ? 'Create an account' : 'Back to sign in';
  byId('switch-auth').hidden = next === 'password';
  byId('recover').hidden = next !== 'login';
}

async function api(payload) {
  const response = await fetch('/api/membership', payload ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  } : { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Membership is temporarily unavailable.');
  return data;
}

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

async function openAccount() {
  byId('login').hidden = true;
  byId('sign-out').hidden = false;
  account = await api();
  byId('account').hidden = false;
  byId('subscription-status').textContent = account.active ? 'Your membership is active.' :
    account.hasBilling ? 'Manage billing to restore access.' : 'Join to unlock your member library and save lesson progress.';
  byId('billing').textContent = account.hasBilling ? 'Manage membership' : 'Join membership';
  renderCards();
}

async function run(button, action) {
  button.disabled = true;
  message();
  try { await action(); }
  catch (error) { message(error.message || 'Something went wrong. Please try again.'); }
  finally { button.disabled = false; }
}

byId('switch-auth').onclick = () => { message(); setMode(mode === 'login' ? 'signup' : 'login'); };
byId('recover').onclick = () => { message(); setMode('recover'); };
auth.addEventListener('submit', event => {
  event.preventDefault();
  void run(byId('auth-submit'), async () => {
    const { email, password } = Object.fromEntries(new FormData(auth));
    if (mode === 'recover') {
      await requestPasswordRecovery(email);
      message('If an account exists, check your email for a password reset link.');
      setMode('login');
    } else if (mode === 'signup') {
      await signup(email, password);
      auth.password.value = '';
      if (await getUser()) await openAccount();
      else { setMode('login'); message('Check your email to confirm your account, then sign in.'); }
    } else {
      if (mode === 'password') await updateUser({ password });
      else await login(email, password);
      auth.reset();
      await openAccount();
    }
  });
});

byId('sign-out').onclick = event => void run(event.currentTarget, async () => {
  await logout();
  location.replace('/members');
});
byId('billing').onclick = event => void run(event.currentTarget, async () => {
  const { url } = await api({ action: account.hasBilling ? 'manage' : 'checkout' });
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
  await api({ action: 'complete', lesson: lesson.id, complete });
  account.completed = account.completed.filter(id => id !== lesson.id);
  if (complete) account.completed.push(lesson.id);
  if (selected === lesson && !byId('lesson').hidden) showLesson(lesson);
  else renderCards();
});

void run(byId('auth-submit'), async () => {
  const result = await handleAuthCallback();
  if (result?.type === 'recovery') setMode('password');
  else if (await getUser()) await openAccount();
});
