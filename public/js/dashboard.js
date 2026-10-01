/**
 * Dashboard — JavaScript
 * Handles all dashboard interactivity
 */

let currentPage = 1;
let currentSearch = '';
let currentStatus = '';
let clicksChart = null;
let analyticsTimeChart = null;
let analyticsDeviceChart = null;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!api.isAuthenticated()) {
    window.location.href = '/login';
    return;
  }
  // Load user info
  loadUserInfo();

  // Load dashboard data
  loadDashboardStats();
  loadLinks(currentPage);

  // Tab retention logic via hashchange
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();

  // Create form handlers
  document.getElementById('createForm').addEventListener('submit', handleCreateLink);
  document.getElementById('editForm').addEventListener('submit', handleEditLink);
});

// ---- User Info ----
async function loadUserInfo() {
  try {
    const user = api.getUser();
    if (user) {
      document.getElementById('userName').textContent = user.display_name || user.email;
      document.getElementById('userPlan').textContent = user.plan_type || 'free';
    }

    // Fetch fresh profile
    const profile = await api.getProfile();
    if(profile) api.setAuth(profile, api.accessToken);
    document.getElementById('userName').textContent = profile.display_name || profile.email;
    document.getElementById('userPlan').textContent = profile.plan_type;
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

// ---- Dashboard Stats ----
async function loadDashboardStats() {
  try {
    const stats = await api.getDashboardStats();

    document.getElementById('kpiTotalLinks').textContent = stats.totalLinks.toLocaleString();
    document.getElementById('kpiTotalClicks').textContent = stats.totalClicks.toLocaleString();
    document.getElementById('kpiActiveLinks').textContent = stats.activeLinks.toLocaleString();
    document.getElementById('kpiClicksToday').textContent = stats.clicksToday.toLocaleString();

    // Top link
    const topLinkCard = document.getElementById('topLinkCard');
    if (stats.topLink) {
      topLinkCard.innerHTML = `
        <div class="top-link">
          <div class="code">/${escapeHtml(stats.topLink.shortCode)}</div>
          <div class="url" title="${escapeHtml(stats.topLink.longUrl)}">${escapeHtml(stats.topLink.longUrl)}</div>
          <div class="clicks">${stats.topLink.clicks.toLocaleString()} <span class="muted" style="font-size:14px; font-weight:400;">clicks</span></div>
        </div>
      `;
    }

    // Weekly chart
    renderClicksChart(stats.weeklyTrend);
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

// ---- Charts ----
function renderClicksChart(data) {
  const ctx = document.getElementById('clicksChart');
  if (!ctx) return;

  if (clicksChart) clicksChart.destroy();

  const labels = data.map(d =>
    new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  );
  const values = data.map(d => d.clicks);

  clicksChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data: values,
        borderColor: '#1a5fb4',
        backgroundColor: '#1a5fb4',
        borderWidth: 2,
        tension: 0,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      animation: false,
      scales: {
        x: {
          grid: { color: '#eaeef2' },
          ticks: { color: '#656d76', font: { size: 11 } },
        },
        y: {
          grid: { color: '#eaeef2' },
          ticks: { color: '#656d76', font: { size: 11 }, precision: 0 },
          beginAtZero: true,
        },
      },
    },
  });
}

// ---- Links ----
async function loadLinks(page = 1) {
  try {
    const data = await api.getLinks(page, 10, currentSearch, currentStatus);
    const tbody = document.getElementById('linksTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.getElementById('linksTableWrapper');
    const pagination = document.getElementById('pagination');

    if (data.links.length === 0 && page === 1 && !currentSearch) {
      emptyState.classList.remove('hidden');
      tableWrapper.style.display = 'none';
      pagination.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    tableWrapper.style.display = 'block';

    tbody.innerHTML = data.links.map(link => `
      <tr>
        <td class="nowrap">
          <a class="short-code" href="${escapeHtml(toHref(link.shortUrl))}" target="_blank">/${escapeHtml(link.shortCode)}</a>
        </td>
        <td>
          <div class="title" title="${escapeHtml(link.title || '')}">${escapeHtml(link.title || 'Untitled')}</div>
          <a href="${escapeHtml(link.longUrl)}" target="_blank" class="long-url" title="${escapeHtml(link.longUrl)}">${escapeHtml(link.longUrl)}</a>
        </td>
        <td>${link.clickCount.toLocaleString()}</td>
        <td class="nowrap muted">${timeAgo(link.createdAt)}</td>
        <td class="nowrap muted">${link.expiresAt ? new Date(link.expiresAt).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : 'Never'}</td>
        <td>
          ${link.isActive
        ? '<span class="status on">Active</span>'
        : '<span class="status off">Inactive</span>'
      }
          ${link.hasPassword || link.oneTime
        ? `<span class="flags">${[link.hasPassword && 'Password', link.oneTime && 'One-time'].filter(Boolean).join(', ')}</span>`
        : ''
      }
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-sm" onclick="copyToClipboard('${link.shortUrl}')">Copy</button>
            <button class="btn btn-sm" onclick="viewAnalytics(${link.id})">Stats</button>
            <button class="btn btn-sm" onclick="showQRCode(${link.id})">QR</button>
            <button class="btn btn-sm" onclick="openEditModal(${link.id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLink(${link.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Pagination
    const { page: p, totalPages } = data.pagination;
    currentPage = p;
    pagination.innerHTML = `
      <button onclick="loadLinks(${p - 1})" ${p <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="page-info">Page ${p} of ${totalPages || 1}</span>
      <button onclick="loadLinks(${p + 1})" ${p >= totalPages ? 'disabled' : ''}>Next</button>
    `;
  } catch (err) {
    console.error('Failed to load links:', err);
  }
}

// ---- Search ----
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = document.getElementById('searchInput').value.trim();
    currentStatus = document.getElementById('statusFilter')?.value || '';
    loadLinks(1);
  }, 300);
}

// ---- Create Link ----
function openCreateModal() {
  const user = api.getUser();
  const aliasInput = document.getElementById('createAlias');
  const aliasBadge = document.getElementById('aliasBadge');
  
  // Lock custom link for free users
  if (user && user.plan_type === 'free') {
    aliasInput.disabled = true;
    aliasInput.title = 'Upgrade to Pro or Business to use custom aliases';
    aliasInput.placeholder = 'Available on paid plans';
    if(aliasBadge) aliasBadge.style.display = 'inline-block';
  } else {
    aliasInput.disabled = false;
    aliasInput.title = '';
    aliasInput.placeholder = 'my-brand';
    if(aliasBadge) aliasBadge.style.display = 'none';
  }

  document.getElementById('createModal').classList.add('active');
}
function closeCreateModal() {
  document.getElementById('createModal').classList.remove('active');
  document.getElementById('createForm').reset();
}

async function handleCreateLink(e) {
  e.preventDefault();
  const btn = document.getElementById('createBtn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const data = await api.shortenUrl(
      document.getElementById('createUrl').value,
      {
        title: document.getElementById('createTitle').value || undefined,
        customAlias: document.getElementById('createAlias').value || undefined,
        expiresAt: document.getElementById('createExpiry').value || undefined,
        password: document.getElementById('createPassword').value || undefined,
        oneTime: document.getElementById('createOneTime').checked,
      }
    );

    showToast(`Link created: ${data.shortUrl}`, 'success');
    closeCreateModal();
    loadLinks(1);
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Create link';
    btn.disabled = false;
  }
}

// ---- Edit Link ----
async function openEditModal(linkId) {
  try {
    const link = await api.getLink(linkId);
    document.getElementById('editLinkId').value = link.id;
    document.getElementById('editUrl').value = link.longUrl;
    document.getElementById('editTitle').value = link.title || '';
    document.getElementById('editShortCode').value = link.shortCode;

    if (link.expiresAt) {
      const dt = new Date(link.expiresAt);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      document.getElementById('editExpiry').value = dt.toISOString().slice(0, 16);
    } else {
      document.getElementById('editExpiry').value = '';
    }

    document.getElementById('editPassword').value = '';
    document.getElementById('editIsActive').checked = link.isActive;

    document.getElementById('editModal').classList.add('active');
  } catch (err) {
    showToast('Failed to load link details', 'error');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  document.getElementById('editForm').reset();
}

async function handleEditLink(e) {
  e.preventDefault();
  const btn = document.getElementById('editBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const id = document.getElementById('editLinkId').value;
    const updates = {
      longUrl: document.getElementById('editUrl').value,
      title: document.getElementById('editTitle').value || undefined,
      expiresAt: document.getElementById('editExpiry').value || null,
      isActive: document.getElementById('editIsActive').checked
    };

    const pwd = document.getElementById('editPassword').value;
    if (pwd) updates.password = pwd;

    await api.updateLink(id, updates);
    showToast('Link updated', 'success');
    closeEditModal();
    loadLinks(currentPage);
    loadDashboardStats();
  } catch (err) {
    showToast(err.message || 'Failed to update link', 'error');
  } finally {
    btn.textContent = 'Save';
    btn.disabled = false;
  }
}

// ---- Delete Link ----
async function deleteLink(id) {
  if (!confirm('Delete this link? This cannot be undone.')) return;
  try {
    const btn = document.querySelector(`button[onclick="deleteLink(${id})"]`);
    if(btn) {
      btn.disabled = true;
      btn.textContent = 'Deleting...';
    }
    await api.deleteLink(id);
    showToast('Link deleted', 'success');
    loadLinks(currentPage);
    loadDashboardStats();
  } catch (err) {
    showToast(err.message || 'Failed to delete link', 'error');
  }
}

// ---- QR Code ----
async function showQRCode(id) {
  try {
    const data = await api.getQRCode(id);
    document.getElementById('qrImage').src = data.qr;
    document.getElementById('qrUrl').textContent = data.shortUrl;
    document.getElementById('qrModal').classList.add('active');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
function closeQRModal() {
  document.getElementById('qrModal').classList.remove('active');
}
function downloadQR() {
  const img = document.getElementById('qrImage');
  const link = document.createElement('a');
  link.download = 'qr-code.png';
  link.href = img.src;
  link.click();
}

// ---- Analytics ----
async function viewAnalytics(linkId) {
  try {
    const [analytics, timeSeries] = await Promise.all([
      api.getLinkAnalytics(linkId),
      api.getTimeSeries(linkId, 'day', 30),
    ]);

    // Update UI
    document.getElementById('analyticsTitle').textContent = `Analytics — /${analytics.shortCode}`;
    document.getElementById('analyticsTotalClicks').textContent = analytics.totalClicks.toLocaleString();
    document.getElementById('analyticsUniqueVisitors').textContent = analytics.uniqueVisitors.toLocaleString();

    // Time chart
    renderAnalyticsTimeChart(timeSeries.data);

    // Device chart
    renderAnalyticsDeviceChart(analytics.devices);

    // Breakdowns
    renderBreakdownList('countriesList', analytics.countries, 'country');
    renderBreakdownList('browsersList', analytics.browsers, 'browser');
    renderBreakdownList('referrersList', analytics.referrers, 'referer');

    // Show analytics view
    document.getElementById('overviewView').style.display = 'none';
    document.getElementById('linksView').style.display = 'none';
    document.getElementById('analyticsView').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Link Analytics';

    // Clear active tab
    document.querySelectorAll('.dash-nav a').forEach(l => l.classList.remove('active'));

    window.history.pushState(null, null, '#analytics');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeAnalytics() {
  document.getElementById('analyticsView').classList.remove('active');
  switchView('links');
}

function renderAnalyticsTimeChart(data) {
  const ctx = document.getElementById('analyticsTimeChart');
  if (analyticsTimeChart) analyticsTimeChart.destroy();

  analyticsTimeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Clicks',
          data: data.map(d => d.clicks),
          borderColor: '#1a5fb4',
          backgroundColor: '#1a5fb4',
          borderWidth: 2,
          pointRadius: 2,
        },
        {
          label: 'Unique',
          data: data.map(d => d.uniqueClicks),
          borderColor: '#8c959f',
          backgroundColor: '#8c959f',
          borderWidth: 2,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: '#1f2328', boxWidth: 12, font: { size: 12 } } } },
      scales: {
        x: { grid: { color: '#eaeef2' }, ticks: { color: '#656d76', font: { size: 10 } } },
        y: { grid: { color: '#eaeef2' }, ticks: { color: '#656d76', precision: 0 }, beginAtZero: true },
      },
    },
  });
}

function renderAnalyticsDeviceChart(devices) {
  const ctx = document.getElementById('analyticsDeviceChart');
  if (analyticsDeviceChart) analyticsDeviceChart.destroy();

  const colors = ['#1a5fb4', '#8c959f', '#2e7d32', '#e0a100', '#c62828'];

  analyticsDeviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: devices.map(d => d.device),
      datasets: [{
        data: devices.map(d => d.clicks),
        backgroundColor: colors.slice(0, devices.length),
        borderWidth: 1,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#1f2328', boxWidth: 12, font: { size: 12 } } },
      },
    },
  });
}

function renderBreakdownList(elementId, items, nameKey) {
  const el = document.getElementById(elementId);
  if (!items || items.length === 0) {
    el.innerHTML = '<li class="muted">No data yet</li>';
    return;
  }
  el.innerHTML = items.map(item => `
    <li>
      <span class="name">${escapeHtml(item[nameKey] || 'Unknown')}</span>
      <span class="count">${item.clicks.toLocaleString()}</span>
    </li>
  `).join('');
}

// ---- View Switching ----
function handleRouteChange() {
  let hash = window.location.hash.replace('#', '');
  const validViews = ['overview', 'links', 'analytics'];

  if (!validViews.includes(hash)) {
    hash = 'overview';
    window.history.replaceState(null, null, '#' + hash);
  }

  document.getElementById('overviewView').style.display = hash === 'overview' ? 'block' : 'none';
  document.getElementById('linksView').style.display = hash === 'links' ? 'block' : 'none';
  document.getElementById('analyticsView').classList.toggle('active', hash === 'analytics');

  document.querySelectorAll('.dash-nav a[data-view]').forEach(l => {
    l.classList.toggle('active', l.dataset.view === hash);
  });

  document.getElementById('pageTitle').textContent = hash === 'overview' ? 'Dashboard' : (hash === 'analytics' ? 'Link Analytics' : 'My Links');

  if (hash === 'links') loadLinks(1);
  if (hash === 'overview') loadDashboardStats();
}

function switchView(view) {
  if (window.location.hash.replace('#', '') !== view) {
    window.location.hash = view; // Triggers handleRouteChange
  } else {
    handleRouteChange(); // Force render if already there
  }
}

// ---- Logout ----
async function handleLogout() {
  await api.logout();
  window.location.href = '/';
}

// ---- Utilities ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
