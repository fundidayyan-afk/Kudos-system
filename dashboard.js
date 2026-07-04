let currentPage = 1;
const PAGE_LIMIT = 20;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initLoginForm() {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      showDashboard(data.user);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

async function loadColleagues() {
  const select = document.getElementById('recipient');
  select.innerHTML = '<option value="">Select a colleague...</option>';
  try {
    const data = await apiFetch('/users');
    if (data.users.length === 0) {
      select.innerHTML = '<option value="">No colleagues available</option>';
      return;
    }
    data.users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

function renderKudosCard(k) {
  const senderLabel = k.sender_active === 0 ? `${escapeHtml(k.sender_name)} (Former employee)` : escapeHtml(k.sender_name);
  const recipientLabel = k.recipient_active === 0 ? `${escapeHtml(k.recipient_name)} (Former employee)` : escapeHtml(k.recipient_name);

  const div = document.createElement('div');
  div.className = 'kudos-card';
  div.innerHTML = `
    <button class="report-btn" data-id="${k.id}" title="Report this kudos">Report</button>
    <div class="meta">${senderLabel} &rarr; ${recipientLabel} &middot; ${timeAgo(k.created_at)}</div>
    <div class="message">${escapeHtml(k.message)}</div>
  `;
  return div;
}

async function loadFeed(page = 1, append = false) {
  const feedEl = document.getElementById('feed');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const emptyEl = document.getElementById('feedEmpty');

  try {
    const data = await apiFetch(`/kudos?page=${page}&limit=${PAGE_LIMIT}`);
    if (!append) feedEl.innerHTML = '';

    if (data.kudos.length === 0 && page === 1) {
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
    }

    data.kudos.forEach((k) => feedEl.appendChild(renderKudosCard(k)));

    currentPage = page;
    loadMoreBtn.classList.toggle('hidden', !data.pagination.hasMore);
  } catch (err) {
    console.error(err);
  }
}

function initReportHandler() {
  document.getElementById('feed').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('report-btn')) return;
    const id = e.target.dataset.id;
    const reason = prompt('Why are you reporting this kudos? (optional)') || '';
    try {
      await apiFetch(`/kudos/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      alert('Thanks — this has been reported to an administrator.');
    } catch (err) {
      alert(err.message);
    }
  });
}

function initKudosForm() {
  const form = document.getElementById('kudosForm');
  const messageEl = document.getElementById('message');
  const charCount = document.getElementById('charCount');
  const errorEl = document.getElementById('kudosError');
  const successEl = document.getElementById('kudosSuccess');
  const recipientEl = document.getElementById('recipient');
  const user = getStoredUser();

  messageEl.addEventListener('input', () => {
    charCount.textContent = `(${messageEl.value.length}/500)`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const recipient_id = recipientEl.value;
    const message = messageEl.value.trim();

    if (!recipient_id) {
      errorEl.textContent = 'Please select a colleague.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (recipient_id === user.id) {
      errorEl.textContent = 'You cannot send a kudos to yourself.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (message.length === 0) {
      errorEl.textContent = 'Message cannot be empty.';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      await apiFetch('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipient_id, message }),
      });
      successEl.textContent = 'Kudos sent!';
      successEl.classList.remove('hidden');
      form.reset();
      charCount.textContent = '(0/500)';
      loadFeed(1);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('loadMoreBtn').addEventListener('click', () => loadFeed(currentPage + 1, true));
}

function showDashboard(user) {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden');
  document.getElementById('welcomeMsg').textContent = `Hi, ${user.name}`;
  if (user.role === 'admin') {
    document.getElementById('adminLink').classList.remove('hidden');
  }
  loadColleagues();
  loadFeed(1);
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initKudosForm();
  initReportHandler();
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const user = getStoredUser();
  if (user && getToken()) {
    showDashboard(user);
  }
});
