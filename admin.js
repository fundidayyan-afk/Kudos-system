let adminPage = 1;
const ADMIN_PAGE_LIMIT = 20;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadReports() {
  const container = document.getElementById('reportsTable');
  const emptyEl = document.getElementById('reportsEmpty');
  try {
    const data = await apiFetch('/admin/reports');
    if (data.reports.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    const rows = data.reports.map((r) => `
      <tr>
        <td data-label="Reported by">${escapeHtml(r.reported_by_name)}</td>
        <td data-label="Kudos message">${escapeHtml(r.kudos_message)} ${r.kudos_is_visible ? '' : '<span class="hidden-badge">HIDDEN</span>'}</td>
        <td data-label="Reason">${escapeHtml(r.reason || '—')}</td>
        <td data-label="When">${new Date(r.created_at + 'Z').toLocaleString()}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table>
        <thead><tr><th>Reported by</th><th>Kudos</th><th>Reason</th><th>When</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
  }
}

function renderModerationRow(k) {
  const flagged = k.is_flagged ? '<span class="flag-badge">FLAGGED</span>' : '';
  const hiddenBadge = k.is_visible ? '' : '<span class="hidden-badge">HIDDEN</span>';
  const modInfo = k.moderated_by_name
    ? `<div class="hint">by ${escapeHtml(k.moderated_by_name)} (${k.moderation_action || ''})${k.reason_for_moderation ? ': ' + escapeHtml(k.reason_for_moderation) : ''}</div>`
    : '';

  return `
    <tr data-id="${k.id}">
      <td data-label="From → To">${escapeHtml(k.sender_name)} &rarr; ${escapeHtml(k.recipient_name)}</td>
      <td data-label="Message">${escapeHtml(k.message)} ${flagged}${hiddenBadge}${modInfo}</td>
      <td data-label="When">${new Date(k.created_at + 'Z').toLocaleString()}</td>
      <td data-label="Actions" class="actions">
        ${k.is_visible
          ? `<button class="danger hide-btn" data-id="${k.id}">Hide</button>`
          : `<button class="success restore-btn" data-id="${k.id}">Restore</button>`
        }
        <button class="danger delete-btn" data-id="${k.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadModeration(page = 1, append = false) {
  const container = document.getElementById('moderationTable');
  const loadMoreBtn = document.getElementById('loadMoreAdminBtn');

  try {
    const data = await apiFetch(`/admin/kudos?page=${page}&limit=${ADMIN_PAGE_LIMIT}`);
    const rows = data.kudos.map(renderModerationRow).join('');

    if (!append || page === 1) {
      container.innerHTML = `
        <table>
          <thead><tr><th>From &rarr; To</th><th>Message</th><th>When</th><th>Actions</th></tr></thead>
          <tbody id="modBody">${rows}</tbody>
        </table>
      `;
    } else {
      document.getElementById('modBody').insertAdjacentHTML('beforeend', rows);
    }

    adminPage = page;
    loadMoreBtn.classList.toggle('hidden', !data.pagination.hasMore);
  } catch (err) {
    console.error(err);
  }
}

function initModerationActions() {
  document.getElementById('moderationTable').addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    try {
      if (e.target.classList.contains('hide-btn')) {
        const reason = prompt('Reason for hiding this kudos (optional):') || '';
        await apiFetch(`/admin/kudos/${id}/hide`, { method: 'PATCH', body: JSON.stringify({ reason }) });
      } else if (e.target.classList.contains('restore-btn')) {
        await apiFetch(`/admin/kudos/${id}/restore`, { method: 'PATCH' });
      } else if (e.target.classList.contains('delete-btn')) {
        if (!confirm('Permanently delete this kudos? This cannot be undone.')) return;
        await apiFetch(`/admin/kudos/${id}`, { method: 'DELETE' });
      } else {
        return;
      }
      loadModeration(1);
      loadReports();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('loadMoreAdminBtn').addEventListener('click', () => loadModeration(adminPage + 1, true));
}

document.addEventListener('DOMContentLoaded', () => {
  const user = requireLoginOrRedirect();
  if (!user) return;

  if (user.role !== 'admin') {
    document.getElementById('accessDenied').classList.remove('hidden');
    return;
  }

  document.getElementById('welcomeMsg').textContent = `Hi, ${user.name}`;
  document.getElementById('adminView').classList.remove('hidden');
  document.getElementById('logoutBtn').addEventListener('click', logout);

  initModerationActions();
  loadReports();
  loadModeration(1);
});
