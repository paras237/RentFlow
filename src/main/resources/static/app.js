/* ============================================================
   RENTFLOW — Full-Stack Frontend Application
   Connects to Spring Boot REST API with JWT Auth
   ============================================================ */

'use strict';

// ============================================================
// 1. API CLIENT
// ============================================================
const API_BASE = '/api';

function getToken()  { return localStorage.getItem('rentflow_token'); }
function setToken(t) { localStorage.setItem('rentflow_token', t); }
function clearToken(){ localStorage.removeItem('rentflow_token'); }
function getOwner()  { return JSON.parse(localStorage.getItem('rentflow_owner') || 'null'); }
function setOwner(o) { localStorage.setItem('rentflow_owner', JSON.stringify(o)); }
function clearOwner(){ localStorage.removeItem('rentflow_owner'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 
    'Content-Type': 'application/json', 
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...(options.headers || {}) 
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const finalOptions = {
    ...options,
    headers,
    cache: 'no-store' // Prevent browser caching of API responses
  };

  const res = await fetch(`${API_BASE}${path}`, finalOptions);

  if (res.status === 401) {
    if (getToken()) {
      // Only clear session and redirect if user had an active token
      clearToken(); clearOwner();
      showAuthScreen();
      throw new Error('Session expired. Please log in again.');
    }
    // No token = this is a login attempt - fall through to show real server error
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); msg = b.message || b.error || JSON.stringify(b); } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiUpload(path, formData, method = 'POST') {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const b = await res.json(); msg = b.message || b.error || JSON.stringify(b); } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ============================================================
// 2. AUTH API
// ============================================================
const apiLogin    = (email, password)         => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) });
const apiRegister = (username, email, password)=> apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
const apiVerifyOtp = (email, otpCode)         => apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otpCode }) });
const apiUpdateProfile   = (username)          => apiFetch('/auth/profile',  { method: 'PUT',  body: JSON.stringify({ username }) });
const apiChangePassword  = (currentPassword, newPassword) => apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });

// ============================================================
// 3. DATA APIs
// ============================================================
const apiGetDashboardStats   = ()    => apiFetch('/owner/dashboard/stats');
const apiGetProperties       = ()    => apiFetch('/owner/properties');
const apiDeleteProperty      = (id)  => apiFetch(`/owner/properties/${id}`, { method: 'DELETE' });
const apiGetUnitsByProperty  = (id)  => apiFetch(`/owner/properties/${id}/units`);
const apiGetLeases           = ()    => apiFetch('/leases/owner');
const apiCreateLease         = (dto) => apiFetch('/leases', { method: 'POST', body: JSON.stringify(dto) });
const apiGetMaintenance      = ()    => apiFetch('/owner/maintenance');
const apiGetApplications     = ()    => apiFetch('/owner/applications');
const apiUpdateApplicationStatus = (id, status) => apiFetch(`/owner/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
const apiGetAgents             = ()    => apiFetch('/owner/agents');
const apiInviteAgent           = (dto) => apiFetch('/owner/agents', { method: 'POST', body: JSON.stringify(dto) });
const apiRemoveAgent           = (id)  => apiFetch(`/owner/agents/${id}`, { method: 'DELETE' });
const apiUpdateMaintenanceStatus = (id, status) => apiFetch(`/owner/maintenance/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

async function apiCreateProperty(name, address, description, files) {
  const fd = new FormData();
  fd.append('property', new Blob([JSON.stringify({ name, address, description })], { type: 'application/json' }));
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
    }
  }
  return apiUpload('/owner/create-property', fd, 'POST');
}

const apiCreateUnit     = (dto)     => apiFetch('/owner/create-unit', { method: 'POST', body: JSON.stringify(dto) });
const apiUpdateUnit     = (id, dto) => apiFetch(`/owner/units/${id}`, { method: 'PUT',  body: JSON.stringify(dto) });
const apiDeleteUnit     = (id)      => apiFetch(`/owner/units/${id}`, { method: 'DELETE' });
const apiUpdateProperty = (id, name, address, description, files) => {
  const fd = new FormData();
  fd.append('property', new Blob([JSON.stringify({ name, address, description })], { type: 'application/json' }));
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
    }
  }
  return apiUpload(`/owner/properties/${id}`, fd, 'PUT');
};
const apiMarkInvoicePaid  = (id)  => apiFetch(`/invoices/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'PAID' }) });
const apiTerminateLease   = (id)  => apiFetch(`/leases/${id}/terminate`, { method: 'PUT' });
const apiDeleteInvoice    = (id)  => apiFetch(`/invoices/${id}`, { method: 'DELETE' });
const apiResendInvoice    = (id)  => apiFetch(`/invoices/${id}/resend`, { method: 'POST' });

const apiGenerateInvoice = (payload) =>
  apiFetch('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

// ============================================================
// 3.5 PUBLIC API
// ============================================================
const apiGetPublicProperties = () => fetch(`${API_BASE}/public/properties`).then(r => r.json());
const apiSubmitApplication   = (dto) => fetch(`${API_BASE}/public/apply`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dto)
}).then(async r => {
  if (!r.ok) {
    const err = await r.json().catch(()=>({}));
    throw new Error(err.message || 'Application failed');
  }
  return r.json();
});

// ============================================================
// 4. APP STATE
// ============================================================
let S = {
  properties: [],
  allUnits: [],
  leases: [],
  invoices: [],
  maintenance: [],
  applications: [],
  agents: [],
  dashboardStats: null,
  adminStats: null,
  maintenanceFilter: 'ALL',
  invoiceFilter: 'ALL',
  leaseFilter: 'ALL',
  propertySearch: '',
  publicProperties: [],
};

// ============================================================
// 5. BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
  initNavigation();
  initModals();
  initSettingsForms();
  initBillingForm();
  initRecurringChargesForm();
  initMarketplace();

  if (getToken()) {
    showAppScreen();
    bootstrapApp();
  } else {
    showMarketplaceScreen();
  }
});

window.toggleAuthMode = (mode) => {
  if (mode === 'register') {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
  } else {
    document.getElementById('form-register').classList.add('hidden');
    document.getElementById('form-login').classList.remove('hidden');
  }
};

function showAuthScreen(mode = 'login') {
  document.getElementById('marketplace-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  toggleAuthMode(mode);
}

function showAppScreen() {
  document.getElementById('marketplace-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
}

function showMarketplaceScreen() {
  document.getElementById('marketplace-screen').classList.remove('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  loadMarketplaceData();
}

async function bootstrapApp() {
  const owner = getOwner();
  if (owner) {
    const el = document.getElementById('sidebar-owner-name');
    if (el) el.textContent = owner.username || owner.email || 'Owner';
    
    if (owner.role === 'ROLE_SUPER_ADMIN') {
      const adminNav = document.getElementById('nav-admin');
      if (adminNav) adminNav.classList.remove('hidden');
    }
    if (owner.role === 'ROLE_OWNER' || owner.role === 'ROLE_SUPER_ADMIN') {
      const agentsNav = document.getElementById('nav-agents');
      if (agentsNav) agentsNav.classList.remove('hidden');
    }
  }
  await loadAllData();
}

async function loadAllData() {
  try {
    const owner = getOwner();
    const promises = [
      apiGetDashboardStats(),
      apiGetProperties(),
      apiGetLeases(),
      apiGetMaintenance(),
      apiGetApplications(),
    ];
    if (owner && owner.role !== 'ROLE_AGENT') {
      promises.push(apiGetAgents().then(data => S.agents = data || []).catch(()=>[]));
    }
    
    if (owner && owner.role === 'ROLE_SUPER_ADMIN') {
      promises.push(apiFetch('/admin/stats'));
    }

    const results = await Promise.allSettled(promises);
    const [stats, props, leases, maint, apps, adminStats] = results;

    if (stats.status  === 'fulfilled') S.dashboardStats = stats.value;
    if (props.status  === 'fulfilled') S.properties     = props.value  || [];
    if (leases.status === 'fulfilled') S.leases         = leases.value || [];
    if (maint.status  === 'fulfilled') S.maintenance    = maint.value  || [];
    if (apps.status   === 'fulfilled') S.applications   = apps.value   || [];
    if (adminStats && adminStats.status === 'fulfilled') S.adminStats = adminStats.value;

    // Load units for each property
    S.allUnits = [];
    for (const p of S.properties) {
      try {
        const units = await apiGetUnitsByProperty(p.id);
        (units || []).forEach(u => S.allUnits.push({ ...u, propertyName: p.name }));
      } catch (_) {}
    }

    // Load invoices per lease unit
    S.invoices = [];
    const seen = new Set();
    for (const l of S.leases) {
      if (!l.unitId || seen.has(l.unitId)) continue;
      seen.add(l.unitId);
      try {
        const invs = await apiFetch(`/invoices/unit/${l.unitId}`);
        (invs || []).forEach(i => S.invoices.push({ ...i, unitNumber: l.unitNumber || `Unit ${l.unitId}` }));
      } catch (_) {}
    }
    S.invoices.sort((a, b) => (b.id || 0) - (a.id || 0));

    renderAll();
  } catch (err) {
    console.error('Load error:', err);
    showToast('error', 'Load Error', err.message);
  }
}

// ============================================================
// 6. AUTH FORMS
// ============================================================
function initAuthForms() {
  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('btn-login');
    const errEl    = document.getElementById('login-error');

    // Client-side email validation
    if (!email.includes('@')) {
      errEl.textContent = '⚠ Please enter a valid email address (must include @).';
      errEl.classList.remove('hidden');
      return;
    }

    setLoading(btn, true);
    errEl.classList.add('hidden');
    try {
      const res = await apiLogin(email, password);
      setToken(res.accessToken);
      setOwner({ email: res.email, username: res.username, ownerId: res.ownerId, role: res.role });
      const nameEl = document.getElementById('sidebar-owner-name');
      if (nameEl) nameEl.textContent = res.username || res.email;
      showAppScreen();
      bootstrapApp();
      document.getElementById('login-form').reset();
    } catch (err) {
      errEl.textContent = '⚠ ' + (err.message || 'Invalid credentials. Please try again.');
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });

  // Register
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fn       = document.getElementById('reg-firstname').value.trim();
    const ln       = document.getElementById('reg-lastname').value.trim();
    const username = [fn, ln].filter(Boolean).join(' ');
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn      = document.getElementById('btn-register');
    const errEl    = document.getElementById('register-error');
    const sucEl    = document.getElementById('register-success');

    if (!email.includes('@')) {
      errEl.textContent = '⚠ Please enter a valid email address (must include @).';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 4) {
      errEl.textContent = '⚠ Password must be at least 4 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    setLoading(btn, true);
    errEl.classList.add('hidden');
    sucEl.classList.add('hidden');
    try {
      await apiRegister(username, email, password);
      document.getElementById('otp-email').value = email;
      switchAuth('otp');
      document.getElementById('register-form').reset();
    } catch (err) {
      errEl.textContent = '⚠ ' + (err.message || 'Registration failed. Try a different email.');
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });

  // OTP Verification
  document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('otp-email').value;
    const otpCode = document.getElementById('otp-code').value.trim();
    const btn = document.getElementById('btn-otp');
    const errEl = document.getElementById('otp-error');
    
    setLoading(btn, true);
    errEl.classList.add('hidden');
    
    try {
      await apiVerifyOtp(email, otpCode);
      const sucEl = document.getElementById('register-success');
      sucEl.textContent = '✓ Email verified! You can now sign in.';
      sucEl.classList.remove('hidden');
      document.getElementById('otp-form').reset();
      switchAuth('login');
    } catch (err) {
      errEl.textContent = '⚠ ' + (err.message || 'Invalid OTP code.');
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
}

function switchAuth(mode) {
  const loginEl = document.getElementById('form-login');
  const regEl   = document.getElementById('form-register');
  const otpEl   = document.getElementById('form-otp');
  
  loginEl.classList.add('hidden');
  regEl.classList.add('hidden');
  if (otpEl) otpEl.classList.add('hidden');
  
  if (mode === 'register') {
    regEl.classList.remove('hidden');
  } else if (mode === 'otp') {
    if (otpEl) otpEl.classList.remove('hidden');
  } else {
    loginEl.classList.remove('hidden');
  }
}

function logout() {
  clearToken(); clearOwner();
  S = { properties: [], allUnits: [], leases: [], invoices: [], maintenance: [], dashboardStats: null, maintenanceFilter: 'ALL', propertySearch: '' };
  showMarketplaceScreen();
  showToast('info', 'Signed Out', 'You have been securely logged out.');
}

// ============================================================
// 7. NAVIGATION — uses .tab class (matches HTML)
// ============================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabs     = document.querySelectorAll('.tab');         // ← correct selector

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      tabs.forEach(t => t.classList.remove('active'));
      const tabEl = document.getElementById(`tab-${tabId}`);
      if (tabEl) tabEl.classList.add('active');
      updateHeader(tabId);
      closeMobileSidebar();
    });
  });

  // "View all" links on overview
  document.querySelectorAll('[data-tab-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-tab-link');
      const nav = document.querySelector(`.nav-item[data-tab="${target}"]`);
      if (nav) nav.click();
    });
  });
}

function updateHeader(tabId) {
  const map = {
    overview:    ['Dashboard Overview',    'Occupancy, revenue & property analytics'],
    properties:  ['Properties & Units',    'Manage your property portfolio'],
    leases:      ['Lease Agreements',      'View and manage tenant lease contracts'],
    billing:     ['Invoices & Billing',    'Generate invoices and track payments'],
    maintenance: ['Maintenance Center',    'Track and resolve tenant requests'],
    settings:    ['Account Settings',      'Profile, password and preferences'],
  };
  const [title, sub] = map[tabId] || ['Dashboard', ''];
  document.getElementById('page-title').textContent    = title;
  document.getElementById('page-subtitle').textContent = sub;

  const btn = document.getElementById('btn-primary-action');
  const acts = {
    overview:   { html: '<i class="fa-solid fa-plus"></i> Add Property', fn: openAddPropertyModal },
    properties: { html: '<i class="fa-solid fa-plus"></i> Add Property', fn: openAddPropertyModal },
    leases:     { html: '<i class="fa-solid fa-file-signature"></i> New Lease', fn: openAddLeaseModal },
  };
  const act = acts[tabId];
  if (act) {
    btn.innerHTML = act.html;
    btn.onclick   = act.fn;
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 768) sb.classList.toggle('mob-open');
  else sb.classList.toggle('collapsed');
}
function closeMobileSidebar() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mob-open');
}

// ============================================================
// 8. MODALS
// ============================================================
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  ['prop-modal-error','unit-modal-error','lease-modal-error'].forEach(eid => {
    const el = document.getElementById(eid);
    if (el) el.classList.add('hidden');
  });
}

function openAddPropertyModal() {
  document.getElementById('add-property-form').reset();
  openModal('modal-property');
  document.getElementById('prop-name').focus();
}

function openAddUnitModal() {
  document.getElementById('add-unit-form').reset();
  document.getElementById('unit-metered-configs').classList.add('hidden');
  const dd = document.getElementById('unit-property-id');
  dd.innerHTML = '<option value="" disabled selected>Choose a property…</option>';
  S.properties.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    dd.appendChild(o);
  });
  openModal('modal-unit');
}

function openAddUnitToPropertyModal(propertyId) {
  document.getElementById('add-unit-form').reset();
  document.getElementById('unit-metered-configs').classList.add('hidden');
  const dd = document.getElementById('unit-property-id');
  dd.innerHTML = '';
  S.properties.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    if (p.id === propertyId) o.selected = true;
    dd.appendChild(o);
  });
  openModal('modal-unit');
}

async function openAddLeaseModal() {
  document.getElementById('add-lease-form').reset();
  const dd = document.getElementById('lease-unit-id');
  dd.innerHTML = '<option value="" disabled selected>Choose a vacant unit…</option>';
  openModal('modal-lease');
  const vacant = S.allUnits.filter(u => u.status === 'VACANT');
  if (vacant.length === 0) {
    dd.innerHTML += '<option disabled>No vacant units available</option>';
  } else {
    vacant.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = `${u.propertyName} — Unit ${u.unitNumber}`;
      dd.appendChild(o);
    });
  }
}

function initModals() {
  // Unit billing type toggle
  const bt = document.getElementById('unit-billing-type');
  if (bt) bt.addEventListener('change', () => {
    const mc = document.getElementById('unit-metered-configs');
    if (bt.value === 'METERED') {
      mc.classList.remove('hidden');
      document.getElementById('unit-elec-rate').required   = true;
      document.getElementById('unit-last-reading').required = true;
    } else {
      mc.classList.add('hidden');
      document.getElementById('unit-elec-rate').required   = false;
      document.getElementById('unit-last-reading').required = false;
    }
  });

  // Invoice unit dropdown → metered check
  const invDd = document.getElementById('create-inv-unit');
  if (invDd) invDd.addEventListener('change', () => {
    const uid  = parseInt(invDd.value);
    const unit = S.allUnits.find(u => u.id === uid);
    const mrg  = document.getElementById('create-inv-metered-group');
    if (unit && unit.billingType === 'METERED') {
      document.getElementById('create-inv-prev-meter').textContent = unit.lastMeterReading ?? '0.0';
      mrg.classList.remove('hidden');
      // Not required by default — meter is optional if custom charges are provided
      document.getElementById('create-inv-meter').required = false;
    } else {
      mrg.classList.add('hidden');
      document.getElementById('create-inv-meter').required = false;
    }
  });
}

// ============================================================
// 9b. EDIT / DELETE HANDLERS
// ============================================================
function openEditPropertyModal(id) {
  const p = S.properties.find(p => p.id === id);
  if (!p) return;
  setValue('edit-property-id',      id);
  setValue('edit-prop-name',        p.name);
  setValue('edit-prop-address',     p.address);
  setValue('edit-prop-description', p.description || '');
  document.getElementById('edit-prop-error').classList.add('hidden');
  document.getElementById('edit-prop-image').value = '';
  openModal('modal-edit-property');
}

async function submitEditProperty() {
  const id      = parseInt(document.getElementById('edit-property-id').value);
  const name    = document.getElementById('edit-prop-name').value.trim();
  const address = document.getElementById('edit-prop-address').value.trim();
  const description = document.getElementById('edit-prop-description').value.trim();
  const fileIn  = document.getElementById('edit-prop-image');
  const files   = fileIn.files;
  const errEl   = document.getElementById('edit-prop-error');
  const btn     = document.getElementById('btn-save-edit-property');
  if (!name || !address) { errEl.textContent = 'All fields required.'; errEl.classList.remove('hidden'); return; }
  setLoading(btn, true); errEl.classList.add('hidden');
  try {
    const res = await apiUpdateProperty(id, name, address, description, files);
    const idx = S.properties.findIndex(p => p.id === id);
    if (idx !== -1) S.properties[idx] = res;
    closeModal('modal-edit-property');
    renderAll();
    showToast('success', 'Property Updated', `"${name}" saved.`);
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

function openEditUnitModal(id) {
  const u = S.allUnits.find(u => u.id === id);
  if (!u) return;
  setValue('edit-unit-id',            id);
  setValue('edit-unit-number',        u.unitNumber);
  setValue('edit-unit-rent',          u.baseRent);
  setValue('edit-unit-billing-type',  u.billingType || 'FIXED');
  setValue('edit-unit-status',        u.status || 'VACANT');
  setValue('edit-unit-elec-rate',     u.electricityRate || '');
  setValue('edit-unit-last-reading',  u.lastMeterReading || '');
  const mc = document.getElementById('edit-unit-metered');
  mc.classList.toggle('hidden', u.billingType !== 'METERED');
  document.getElementById('edit-unit-error').classList.add('hidden');

  // billing type toggle
  const bt = document.getElementById('edit-unit-billing-type');
  bt.onchange = () => mc.classList.toggle('hidden', bt.value !== 'METERED');
  openModal('modal-edit-unit');
}

async function submitEditUnit() {
  const id          = parseInt(document.getElementById('edit-unit-id').value);
  const u           = S.allUnits.find(x => x.id === id);
  const unitNumber  = document.getElementById('edit-unit-number').value.trim();
  const baseRent    = parseFloat(document.getElementById('edit-unit-rent').value);
  const billingType = document.getElementById('edit-unit-billing-type').value;
  const status      = document.getElementById('edit-unit-status').value;
  const errEl       = document.getElementById('edit-unit-error');
  const btn         = document.getElementById('btn-save-edit-unit');
  if (!unitNumber || isNaN(baseRent)) { errEl.textContent = 'All fields required.'; errEl.classList.remove('hidden'); return; }
  const dto = { propertyId: u ? u.propertyId : null, unitNumber, baseRent, billingType, status };
  if (billingType === 'METERED') {
    dto.electricityRate  = parseFloat(document.getElementById('edit-unit-elec-rate').value)  || 0;
    dto.lastMeterReading = parseFloat(document.getElementById('edit-unit-last-reading').value) || 0;
  }
  setLoading(btn, true); errEl.classList.add('hidden');
  try {
    const res = await apiUpdateUnit(id, dto);
    const idx = S.allUnits.findIndex(x => x.id === id);
    if (idx > -1) S.allUnits[idx] = res;
    closeModal('modal-edit-unit');
    renderAll();
    showToast('success', 'Updated', 'Unit updated successfully.');
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

async function deleteUnit(id, unitNumber) {
  if (!confirm(`Delete Unit "${unitNumber}"?\n\nThis cannot be undone.`)) return;
  try {
    await apiDeleteUnit(id);
    S.allUnits = S.allUnits.filter(u => u.id !== id);
    renderAll();
    showToast('success', 'Unit Deleted', `Unit "${unitNumber}" removed.`);
  } catch (err) {
    showToast('error', 'Delete Failed', err.message);
  }
}

async function markInvoicePaid(id, btn) {
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try {
    await apiMarkInvoicePaid(id);
    const inv = S.invoices.find(i => i.id === id);
    if (inv) inv.status = 'PAID';
    renderInvoicesTable();
    showToast('success', 'Invoice Paid', `Invoice #${id} marked as paid.`);
  } catch (err) {
    // If endpoint not yet implemented, just update locally
    const inv = S.invoices.find(i => i.id === id);
    if (inv) { inv.status = 'PAID'; renderInvoicesTable(); showToast('success', 'Marked Paid', `Invoice #${id} marked as paid (local).`); }
    else { showToast('error', 'Error', err.message); btn.disabled = false; btn.textContent = orig; }
  }
}


async function submitAddProperty() {
  const name    = document.getElementById('prop-name').value.trim();
  const address = document.getElementById('prop-address').value.trim();
  const description = document.getElementById('prop-description').value.trim();
  const fileIn  = document.getElementById('prop-image');
  const files   = fileIn.files;
  const errEl   = document.getElementById('prop-modal-error');
  const btn     = document.getElementById('btn-save-property');
  if (!name || !address) { errEl.textContent = 'All fields are required.'; errEl.classList.remove('hidden'); return; }
  setLoading(btn, true); errEl.classList.add('hidden');
  try {
    const res = await apiCreateProperty(name, address, description, files);
    S.properties.push(res);
    closeModal('modal-property');
    renderAll();
    showToast('success', 'Property Added', `"${res.name}" has been created.`);
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

async function submitAddUnit() {
  const propertyId  = parseInt(document.getElementById('unit-property-id').value);
  const unitNumber  = document.getElementById('unit-number').value.trim();
  const baseRent    = parseFloat(document.getElementById('unit-rent').value);
  const billingType = document.getElementById('unit-billing-type').value;
  const errEl       = document.getElementById('unit-modal-error');
  const btn         = document.getElementById('btn-save-unit');

  if (!propertyId || !unitNumber || isNaN(baseRent)) {
    errEl.textContent = 'Please fill all required fields.'; errEl.classList.remove('hidden'); return;
  }
  const dto = { propertyId, unitNumber, baseRent, billingType };
  if (billingType === 'METERED') {
    dto.electricityRate  = parseFloat(document.getElementById('unit-elec-rate').value)  || 0;
    dto.lastMeterReading = parseFloat(document.getElementById('unit-last-reading').value) || 0;
  }
  setLoading(btn, true); errEl.classList.add('hidden');
  try {
    const res = await apiCreateUnit(dto);
    const prop = S.properties.find(p => p.id === propertyId);
    S.allUnits.push({ ...res, propertyName: prop?.name || '' });
    closeModal('modal-unit');
    renderAll();
    showToast('success', 'Unit Added', `Unit "${res.unitNumber}" created successfully.`);
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

async function submitAddLease() {
  const unitId           = parseInt(document.getElementById('lease-unit-id').value);
  const tenantFullName   = document.getElementById('lease-tenant-name').value.trim();
  const tenantEmail      = document.getElementById('lease-tenant-email').value.trim();
  const tenantPhoneNumber= document.getElementById('lease-tenant-phone').value.trim();
  const startDate        = document.getElementById('lease-start-date').value;
  const endDate          = document.getElementById('lease-end-date').value;
  const errEl            = document.getElementById('lease-modal-error');
  const btn              = document.getElementById('btn-save-lease');

  if (!unitId || !tenantFullName || !tenantEmail || !startDate || !endDate) {
    errEl.textContent = 'Please fill all required fields.'; errEl.classList.remove('hidden'); return;
  }
  if (new Date(endDate) <= new Date(startDate)) {
    errEl.textContent = 'End date must be after start date.'; errEl.classList.remove('hidden'); return;
  }
  setLoading(btn, true); errEl.classList.add('hidden');
  try {
    await apiCreateLease({ unitId, tenantFullName, tenantEmail, tenantPhoneNumber, startDate, endDate });
    const u = S.allUnits.find(u => u.id === unitId);
    if (u) u.status = 'OCCUPIED';
    closeModal('modal-lease');
    S.leases = await apiGetLeases();
    renderAll();
    showToast('success', 'Lease Created', `Lease for "${tenantFullName}" is now active.`);
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

// ============================================================
// 9.5 RECURRING CHARGES LOGIC
// ============================================================

async function openRecurringChargesModal(leaseId) {
  const lid = parseInt(leaseId, 10);
  document.getElementById('recurring-lease-id').value = lid;
  const container = document.getElementById('recurring-charges-container');
  container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--t3)"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
  openModal('modal-recurring-charges');

  try {
    // Always fetch fresh data from server
    const allLeases = await apiFetch('/leases/owner');
    S.leases = allLeases;
    const lease = allLeases.find(l => l.id === lid);
    const charges = (lease && lease.recurringCharges && lease.recurringCharges.length > 0)
      ? lease.recurringCharges
      : [];

    container.innerHTML = '';
    if (charges.length === 0) {
      addRecurringChargeRow('', '');
    } else {
      charges.forEach(c => addRecurringChargeRow(c.description, c.amount));
    }
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);padding:1rem">Error: ' + err.message + '</p>';
  }
}

function addRecurringChargeRow(desc, amt) {
  const container = document.getElementById('recurring-charges-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'rc-row';
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 36px;gap:8px;align-items:center;margin-bottom:10px;';

  const inp1 = document.createElement('input');
  inp1.type = 'text';
  inp1.className = 'fc rc-desc';
  inp1.placeholder = 'e.g. Water Bill';
  inp1.value = (desc != null) ? String(desc) : '';
  inp1.style.cssText = 'width:100%;min-width:0;';

  const inp2 = document.createElement('input');
  inp2.type = 'number';
  inp2.className = 'fc rc-amt';
  inp2.placeholder = 'Amount';
  inp2.min = '0';
  inp2.step = '0.01';
  inp2.value = (amt != null && amt !== '') ? String(amt) : '';
  inp2.style.cssText = 'width:100%;min-width:0;';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1rem;padding:4px;';
  btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  btn.onclick = function() { row.remove(); };

  row.appendChild(inp1);
  row.appendChild(inp2);
  row.appendChild(btn);
  container.appendChild(row);
}

function initRecurringChargesForm() {
  const form = document.getElementById('recurring-charges-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const leaseIdEl = document.getElementById('recurring-lease-id');
    const leaseId = leaseIdEl ? parseInt(leaseIdEl.value, 10) : 0;
    if (!leaseId || isNaN(leaseId)) {
      showToast('error', 'Error', 'No lease selected.');
      return;
    }

    const saveBtn = document.getElementById('btn-submit-recurring-charges');

    // Collect all rows
    const container = document.getElementById('recurring-charges-container');
    const rows = container ? container.querySelectorAll('.rc-row') : [];
    const charges = [];
    rows.forEach(function(row) {
      const d = row.querySelector('.rc-desc');
      const a = row.querySelector('.rc-amt');
      const desc = d ? d.value.trim() : '';
      const amt  = a ? parseFloat(a.value) : NaN;
      if (desc && !isNaN(amt) && amt > 0) {
        charges.push({ description: desc, amount: amt });
      }
    });

    if (charges.length === 0) {
      showToast('error', 'Validation', 'Add at least one charge with a name and amount.');
      return;
    }

    setLoading(saveBtn, true);
    try {
      await apiFetch('/leases/' + leaseId + '/recurring-charges', {
        method: 'PUT',
        body: JSON.stringify(charges)
      });
      // Refresh data
      S.leases = await apiFetch('/leases/owner');
      showToast('success', 'Saved!', charges.length + ' recurring charge(s) saved successfully.');
      closeModal('modal-recurring-charges');
      renderAll();
    } catch (err) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setLoading(saveBtn, false);
    }
  });
}

// ============================================================
// 10. BILLING FORM
// ============================================================
function initBillingForm() {
  const form = document.getElementById('create-invoice-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unitId = document.getElementById('create-inv-unit').value;
    const meterReading = document.getElementById('create-inv-meter').value;
    
    // Gather custom items - scoped ONLY to the invoice form, not the whole page
    const customItems = [];
    const invoiceContainer = document.getElementById('custom-invoice-items-container');
    const rows = invoiceContainer ? invoiceContainer.querySelectorAll('.custom-item-row') : [];
    rows.forEach(row => {
      const desc = row.querySelector('.item-desc').value.trim();
      const amt = parseFloat(row.querySelector('.item-amt').value);
      if (amt > 0) {
        customItems.push({ description: desc || 'Other Charge', amount: amt });
      }
    });

    // For METERED units: require meter reading ONLY if no custom charges provided
    const unit = S.allUnits.find(u => u.id === parseInt(unitId));
    if (unit && unit.billingType === 'METERED' && !meterReading && customItems.length === 0) {
      showToast('error', 'Missing Info', 'Please enter a meter reading or add at least one custom charge.');
      document.getElementById('create-inv-meter').focus();
      return;
    }

    const payload = {
      unitId: parseInt(unitId),
      currentMeterReading: meterReading ? parseFloat(meterReading) : null,
      customItems: customItems.length > 0 ? customItems : null
    };

    const btn = document.getElementById('btn-submit-create-invoice');
    setLoading(btn, true);
    try {
      const res = await apiGenerateInvoice(payload);
      const u = S.allUnits.find(u => u.id === parseInt(unitId));
      S.invoices.unshift({ ...res, unitNumber: u?.unitNumber || `Unit ${unitId}` });
      renderInvoicesTable();
      closeModal('modal-create-invoice');
      form.reset();
      showToast('success', 'Invoice Generated', `Invoice #${res.id} • Total: ₹${(res.totalAmount || 0).toFixed(2)}`);
    } catch (err) {
      showToast('error', 'Invoice Error', err.message);
    } finally { setLoading(btn, false); }
  });
}

// ============================================================
// 11. SETTINGS FORMS
// ============================================================
function initSettingsForms() {
  document.getElementById('profile-update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = [document.getElementById('settings-firstname').value.trim(), document.getElementById('settings-lastname').value.trim()].filter(Boolean).join(' ');
    const errEl = document.getElementById('profile-update-error');
    const sucEl = document.getElementById('profile-update-success');
    const btn   = document.getElementById('btn-update-profile');
    if (!username) { errEl.textContent = 'Name cannot be empty.'; errEl.classList.remove('hidden'); return; }
    setLoading(btn, true); errEl.classList.add('hidden'); sucEl.classList.add('hidden');
    try {
      const res = await apiUpdateProfile(username);
      const owner = getOwner();
      if (owner) { owner.username = res.username || username; setOwner(owner); }
      document.getElementById('sidebar-owner-name').textContent = res.username || username;
      sucEl.textContent = '✓ Profile updated!'; sucEl.classList.remove('hidden');
      showToast('success', 'Profile Updated', 'Your display name has been saved.');
    } catch (err) {
      errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
    } finally { setLoading(btn, false); }
  });

  document.getElementById('password-change-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPw = document.getElementById('settings-old-password').value;
    const newPw = document.getElementById('settings-new-password').value;
    const cfPw  = document.getElementById('settings-confirm-password').value;
    const errEl = document.getElementById('password-change-error');
    const sucEl = document.getElementById('password-change-success');
    const btn   = document.getElementById('btn-change-password');
    errEl.classList.add('hidden'); sucEl.classList.add('hidden');
    if (newPw !== cfPw)    { errEl.textContent = '⚠ Passwords do not match.';             errEl.classList.remove('hidden'); return; }
    if (newPw.length < 4)  { errEl.textContent = '⚠ Password must be at least 4 chars.'; errEl.classList.remove('hidden'); return; }
    setLoading(btn, true);
    try {
      await apiChangePassword(oldPw, newPw);
      sucEl.textContent = '✓ Password changed. Logging out…'; sucEl.classList.remove('hidden');
      document.getElementById('password-change-form').reset();
      showToast('success', 'Password Changed', 'Updated successfully.');
      setTimeout(logout, 2500);
    } catch (err) {
      errEl.textContent = '⚠ ' + err.message; errEl.classList.remove('hidden');
    } finally { setLoading(btn, false); }
  });
}

// ============================================================
// 12. RENDER ENGINE
// ============================================================
function renderAll() {
  renderStats();
  renderAdminStats();
  renderOverviewLists();
  renderPropertiesGrid();
  renderLeasesTable();
  renderBillingDropdowns();
  renderInvoicesTable();
  renderMaintenanceTickets();
  renderApplications();
  if (getOwner() && getOwner().role !== 'ROLE_AGENT') { renderAgents(); }
  prefillSettings();
}

function renderAdminStats() {
  if (!S.adminStats) return;
  const as = S.adminStats;
  const elL = document.getElementById('admin-landlords');
  const elP = document.getElementById('admin-properties');
  const elT = document.getElementById('admin-tenants');
  const elU = document.getElementById('admin-units');
  if (elL) elL.textContent = as.totalLandlords;
  if (elP) elP.textContent = as.totalProperties;
  if (elT) elT.textContent = as.totalTenants;
  if (elU) elU.textContent = as.totalUnits;
}

function renderStats() {
  const st = S.dashboardStats;
  const occupied = S.allUnits.filter(u => u.status === 'OCCUPIED').length;
  const total    = S.allUnits.length;
  const rate     = total > 0 ? ((occupied / total) * 100).toFixed(1) : '0.0';
  const revenue  = S.invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const active   = S.maintenance.filter(m => m.status !== 'COMPLETED').length;
  const urgent   = S.maintenance.filter(m => m.status !== 'COMPLETED' && (m.priority === 'HIGH' || m.priority === 'EMERGENCY')).length;
  const rateNum  = parseFloat(st?.occupancyRate?.toFixed(1) ?? rate);

  setText('stat-total-properties', st?.totalProperties ?? S.properties.length);
  setText('stat-occupied-units',   st?.activeTenants   ?? occupied);
  setText('stat-occupancy-rate',   `${rateNum}% Rate`);
  setText('stat-total-revenue',    `₹${(st?.totalRevenue ?? revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('stat-active-concerns',  st?.maintenanceRequests ?? active);
  setText('stat-emergency-count',  `${urgent} Urgent`);

  // Occupancy progress bar
  const prog = document.getElementById('stat-prog-bar');
  if (prog) setTimeout(() => { prog.style.width = Math.min(rateNum, 100) + '%'; }, 100);

  // Nav maintenance badge — always use live count from S.maintenance (never the stale backend cache)
  const badge = document.getElementById('nav-maint-badge');
  if (badge) {
    const cnt = active; // computed live: S.maintenance.filter(m => m.status !== 'COMPLETED').length
    if (cnt > 0) { badge.textContent = cnt > 99 ? '99+' : cnt; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  renderOccupancyChart(rateNum, occupied, total);
  renderRevenueChart();
}

function renderOverviewLists() {
  // Properties list
  const pl = document.getElementById('overview-properties-list');
  if (!pl) return;
  if (S.properties.length === 0) {
    pl.innerHTML = emptyState('fa-city', 'No properties yet', 'Add your first property to get started.');
  } else {
    pl.innerHTML = '';
    S.properties.slice(0, 5).forEach(p => {
      const units    = S.allUnits.filter(u => u.propertyId === p.id);
      const occupied = units.filter(u => u.status === 'OCCUPIED').length;
      const pct = units.length > 0 ? Math.round((occupied/units.length)*100) : 0;
      const initials = (p.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      pl.insertAdjacentHTML('beforeend', `
        <div class="li-row">
          <div class="li-left">
            <div class="li-ico" style="font-family:'Syne',sans-serif;font-weight:800;font-size:.72rem">${esc(initials)}</div>
            <div><div class="li-name">${esc(p.name)}</div><div class="li-sub">${esc(p.address)}</div></div>
          </div>
          <div class="li-right">
            <div class="li-amount">${occupied}/${units.length}</div>
            <div style="font-size:.68rem;color:${pct>=75?'var(--mint)':pct>=40?'var(--gold)':'var(--rose)'}">${pct}% full</div>
          </div>
        </div>`);
    });
  }

  // Invoices list
  const il = document.getElementById('overview-invoices-list');
  if (!il) return;
  if (S.invoices.length === 0) {
    il.innerHTML = emptyState('fa-receipt', 'No invoices yet', 'Generate invoices from the Billing tab.');
  } else {
    il.innerHTML = '';
    S.invoices.slice(0, 5).forEach(inv => {
      il.insertAdjacentHTML('beforeend', `
        <div class="li-row">
          <div class="li-left">
            <div class="li-ico"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <div><div class="li-name">${esc(inv.tenantName || 'Unknown')}</div><div class="li-sub">Unit ${esc(inv.unitNumber || '—')} · ${esc(inv.billingMonth || '—')}</div></div>
          </div>
          <div class="li-right">
            <div class="li-amount">₹${(inv.totalAmount || 0).toFixed(0)}</div>
            <span class="badge badge-${(inv.status||'pending').toLowerCase()}">${inv.status||'PENDING'}</span>
          </div>
        </div>`);
    });
  }

  // Maintenance list
  const ml = document.getElementById('overview-maintenance-list');
  if (!ml) return;
  const active = S.maintenance.filter(m => m.status !== 'COMPLETED');
  if (active.length === 0) {
    ml.innerHTML = emptyState('fa-circle-check', 'All clear!', 'No open maintenance requests.');
  } else {
    ml.innerHTML = '';
    const priColors = { HIGH:'var(--rose-d)', MEDIUM:'var(--gold-d)', LOW:'var(--mint-d)', EMERGENCY:'var(--rose-d)' };
    const priText   = { HIGH:'var(--rose)', MEDIUM:'var(--gold)', LOW:'var(--mint)', EMERGENCY:'var(--rose)' };
    active.slice(0, 4).forEach(t => {
      const bg  = priColors[(t.priority||'LOW').toUpperCase()] || priColors.LOW;
      const clr = priText[(t.priority||'LOW').toUpperCase()] || priText.LOW;
      ml.insertAdjacentHTML('beforeend', `
        <div class="li-row">
          <div class="li-left">
            <div class="li-ico" style="background:${bg};color:${clr}"><i class="fa-solid fa-screwdriver-wrench"></i></div>
            <div><div class="li-name">${esc(t.title)}</div><div class="li-sub">Unit ${esc(t.unitNumber||'—')} · ${esc(t.propertyName||'—')}</div></div>
          </div>
          <div class="li-right">
            <span class="badge badge-${(t.priority||'low').toLowerCase()}">${t.priority||'—'}</span>
          </div>
        </div>`);
    });
  }
}

function renderPropertiesGrid() {
  const grid = document.getElementById('properties-grid');
  if (!grid) return;
  const term     = S.propertySearch.toLowerCase();
  const filtered = term ? S.properties.filter(p => p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term)) : S.properties;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fa-solid fa-city"></i>
      <h3>${term ? 'No results' : 'No properties yet'}</h3>
      <p>${term ? 'Try a different search term.' : 'Click "Add Property" to get started.'}</p>
      ${!term ? '<button class="btn btn-primary" style="margin-top:.75rem" onclick="openAddPropertyModal()"><i class="fa-solid fa-plus"></i> Add Property</button>' : ''}
    </div>`;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach(p => {
    const units    = S.allUnits.filter(u => u.propertyId === p.id);
    const occupied = units.filter(u => u.status === 'OCCUPIED').length;
    const pct      = units.length > 0 ? Math.round((occupied/units.length)*100) : 0;

    const unitsHtml = units.length === 0
      ? `<p style="font-size:.75rem;color:var(--t3);padding:.4rem 0">No units yet — add one below.</p>`
      : units.map(u => `
          <div class="unit-item">
            <div class="unit-item-l">
              <strong>Unit ${esc(u.unitNumber)}</strong>
              <span>₹${(u.baseRent||0).toLocaleString('en-IN')}/mo · ${(u.billingType||'FIXED').toLowerCase()}</span>
            </div>
            <div style="display:flex;align-items:center;gap:.35rem">
              <span class="badge badge-${(u.status||'vacant').toLowerCase()}">${u.status||'VACANT'}</span>
              <button class="btn-icon" title="Edit unit" onclick="openEditUnitModal(${u.id})"><i class="fa-solid fa-pen" style="font-size:.7rem"></i></button>
              <button class="btn-icon" title="Delete unit" onclick="deleteUnit(${u.id},'${esc(u.unitNumber)}')" style="color:var(--rose)"><i class="fa-solid fa-trash" style="font-size:.7rem"></i></button>
            </div>
          </div>`).join('');

    const card = document.createElement('div');
    card.className = 'dash-prop-card';
    card.innerHTML = `
      <div class="prop-banner">
        ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover">` : '<i class="fa-solid fa-building-columns"></i>'}
      </div>
      <div class="prop-body">
        <h3>${esc(p.name)}</h3>
        <div class="prop-addr"><i class="fa-solid fa-location-dot"></i>${esc(p.address)}</div>
        <div class="prop-occ-bar">
          <div class="prop-occ-track"><div class="prop-occ-fill" style="width:${pct}%"></div></div>
          <span class="prop-occ-txt">${occupied}/${units.length} occupied</span>
        </div>
        <div class="unit-label">Units (${units.length})</div>
        <div class="unit-rows">${unitsHtml}</div>
        <div class="prop-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditPropertyModal(${p.id})">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-ghost btn-sm" onclick="openAddUnitToPropertyModal(${p.id})">
            <i class="fa-solid fa-door-open"></i> Add Unit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteProperty(${p.id}, '${esc(p.name)}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function renderLeasesTable() {
  const tbody = document.getElementById('leases-tbody');
  if (!tbody) return;

  const filtered = S.leaseFilter === 'ALL' ? S.leases
    : S.leases.filter(l => S.leaseFilter === 'ACTIVE' ? l.isActive : !l.isActive);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('fa-file-contract', 'No leases yet', 'Create a lease to assign tenants to units.')}</td></tr>`;
    return;
  }

  const today = new Date();
  tbody.innerHTML = '';
  filtered.forEach(l => {
    const portalUrl = l.accessToken ? `${location.origin}/tenant.html?token=${l.accessToken}` : null;
    const portalCell = portalUrl
      ? `<div style="display:flex;align-items:center;gap:.35rem">
           <button class="btn btn-ghost btn-xs" title="Copy tenant link" onclick="copyPortalLink('${esc(portalUrl)}',this)">
             <i class="fa-solid fa-copy"></i>
           </button>
           <a href="${esc(portalUrl)}" target="_blank" class="btn btn-ghost btn-xs" title="Open tenant portal">
             <i class="fa-solid fa-arrow-up-right-from-square"></i>
           </a>
         </div>`
      : '—';

    // Expiry indicator
    let expiryHtml = '—';
    if (l.endDate) {
      const end  = new Date(l.endDate);
      const days = Math.ceil((end - today) / 86400000);
      const dateStr = fmtDate(l.endDate);
      if (!l.isActive) {
        expiryHtml = `<span style="color:var(--t3)">${dateStr}</span>`;
      } else if (days < 0) {
        expiryHtml = `${dateStr}<br><span class="expiry-warning expiry-critical">Expired</span>`;
      } else if (days <= 14) {
        expiryHtml = `${dateStr}<br><span class="expiry-warning expiry-critical">${days}d left</span>`;
      } else if (days <= 30) {
        expiryHtml = `${dateStr}<br><span class="expiry-warning expiry-soon">${days}d left</span>`;
      } else {
        expiryHtml = `${dateStr}<br><span class="expiry-ok">${days}d left</span>`;
      }
    }

    const terminateBtn = l.isActive
      ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:.35rem">
           <button class="btn btn-ghost btn-xs" style="color:var(--mint)" title="Charge Tenant" onclick="openCreateInvoiceModalForUnit(${l.unitId})"><i class="fa-solid fa-file-invoice-dollar"></i> Charge</button>
           <button class="btn btn-ghost btn-xs" style="color:var(--primary)" title="Recurring Billing" onclick="openRecurringChargesModal(${l.id})"><i class="fa-solid fa-repeat"></i></button>
           <button class="btn btn-ghost btn-xs" style="color:var(--rose)" title="Terminate lease" onclick="terminateLease(${l.id},'${esc(l.tenantName||'Tenant')}')"><i class="fa-solid fa-ban"></i></button>
         </div>`
      : `<span style="color:var(--t3);font-size:.72rem">Ended</span>`;

    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><strong>Unit ${esc(l.unitNumber||'—')}</strong><span class="td-sub">${esc(l.propertyName||'—')}</span></td>
        <td>${esc(l.tenantName||'—')}<span class="td-sub">${esc(l.tenantEmail||'')}</span></td>
        <td>${fmtDate(l.startDate)}</td>
        <td>${expiryHtml}</td>
        <td><span class="badge badge-${l.isActive ? 'active' : 'inactive'}">${l.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>${portalCell}</td>
        <td>${terminateBtn}</td>
      </tr>`);
  });
}

function filterLeases(filter, btn) {
  S.leaseFilter = filter;
  document.querySelectorAll('#lease-filter-chips .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLeasesTable();
}

async function terminateLease(id, name) {
  if (!confirm(`Terminate the lease for "${name}"? This will free the unit and cannot be undone.`)) return;
  try {
    await apiTerminateLease(id);
    showToast('success', 'Lease Terminated', `Lease for ${name} has been ended and unit set to VACANT.`);
    await loadAllData();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

function copyPortalLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    btn.style.color = 'var(--mint)';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    showToast('success', 'Link Copied!', 'Share this link with your tenant.');
  }).catch(() => showToast('error', 'Copy Failed', 'Please copy manually: ' + url));
}

function renderBillingDropdowns() {
  const dd = document.getElementById('create-inv-unit');
  if (!dd) return;
  dd.innerHTML = '<option value="" disabled selected>Choose a unit…</option>';
  const occupied = S.allUnits.filter(u => u.status === 'OCCUPIED');
  if (occupied.length === 0) {
    dd.innerHTML += '<option disabled>No occupied units available</option>';
  } else {
    occupied.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = `${u.propertyName} — Unit ${u.unitNumber}`;
      dd.appendChild(o);
    });
  }
}

function renderInvoicesTable() {
  const tbody = document.getElementById('invoices-tbody');
  if (!tbody) return;

  // Render billing summary
  const summaryEl = document.getElementById('billing-summary');
  if (summaryEl && S.invoices.length > 0) {
    const paid    = S.invoices.filter(i => i.status === 'PAID').reduce((s,i)   => s+(i.totalAmount||0), 0);
    const pending = S.invoices.filter(i => i.status !== 'PAID').reduce((s,i) => s+(i.totalAmount||0), 0);
    const total   = paid + pending;
    summaryEl.innerHTML = `
      <div class="bsumm-card">
        <div class="bsumm-ico" style="background:var(--co-dim);color:var(--co)"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <div><div class="bsumm-val">₹${total.toLocaleString('en-IN',{maximumFractionDigits:0})}</div><div class="bsumm-lbl">Total Billed</div></div>
      </div>
      <div class="bsumm-card">
        <div class="bsumm-ico" style="background:var(--mint-d);color:var(--mint)"><i class="fa-solid fa-circle-check"></i></div>
        <div><div class="bsumm-val" style="color:var(--mint)">₹${paid.toLocaleString('en-IN',{maximumFractionDigits:0})}</div><div class="bsumm-lbl">Collected</div></div>
      </div>
      <div class="bsumm-card">
        <div class="bsumm-ico" style="background:var(--gold-d);color:var(--gold)"><i class="fa-solid fa-hourglass-half"></i></div>
        <div><div class="bsumm-val" style="color:var(--gold)">₹${pending.toLocaleString('en-IN',{maximumFractionDigits:0})}</div><div class="bsumm-lbl">Outstanding</div></div>
      </div>`;
  }

  const filter   = S.invoiceFilter || 'ALL';
  const filtered = filter === 'ALL' ? S.invoices : S.invoices.filter(i => (i.status||'PENDING').toUpperCase() === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('fa-receipt', 'No invoices yet', 'Use the form to generate your first invoice.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  filtered.forEach(inv => {
    const isPaid = (inv.status || '').toUpperCase() === 'PAID';

    // Actions block
    let actionsHtml = `<div style="display:flex;align-items:center;justify-content:flex-end;gap:.35rem">
      <button class="btn btn-ghost btn-xs" title="View Details" onclick="openInvoiceModal(${inv.id})"><i class="fa-solid fa-eye"></i></button>
      <button class="btn btn-ghost btn-xs" title="Resend Reminder Email" onclick="resendInvoice(${inv.id}, '${esc(inv.tenantName)}')"><i class="fa-solid fa-envelope"></i></button>`;

    if (!isPaid) {
      actionsHtml += `<button class="btn btn-ghost btn-xs" title="Mark Paid" onclick="markInvoicePaid(${inv.id}, this)"><i class="fa-solid fa-check" style="color:var(--mint)"></i></button>
                      <button class="btn btn-ghost btn-xs" title="Delete/Void" onclick="deleteInvoice(${inv.id})" style="color:var(--rose)"><i class="fa-solid fa-trash"></i></button>`;
    }
    actionsHtml += `</div>`;

    let extraChargesHtml = '';
    let hasExtraCharges = false;
    const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN');

    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(item => {
        if (item.description !== 'Base Rent' && !item.description.startsWith('Electricity Usage')) {
          extraChargesHtml += `<div style="white-space: nowrap; font-size: 0.85em; color: var(--t2);"><span style="color: var(--t3);">${esc(item.description)}:</span> ${fmt(item.amount)}</div>`;
          hasExtraCharges = true;
        }
      });
    }

    if (!hasExtraCharges) {
      // Fallback calculation for older invoices or if no extra charges
      const extraChargesAmt = Math.max(0, (inv.totalAmount || 0) - (inv.rentAmount || 0) - (inv.electricityAmount || 0));
      if (extraChargesAmt > 0) {
        extraChargesHtml = `<div style="font-size: 0.85em; color: var(--t2);">${fmt(extraChargesAmt)}</div>`;
      } else {
        extraChargesHtml = '<span style="color:var(--t3)">—</span>';
      }
    }

    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>#${inv.id}</td>
        <td><strong>Unit ${esc(inv.unitNumber||'—')}</strong><span class="td-sub">${esc(inv.tenantName||'—')}</span></td>
        <td>${fmt(inv.rentAmount)}</td>
        <td>${fmt(inv.electricityAmount)}</td>
        <td>${extraChargesHtml}</td>
        <td><strong>${fmt(inv.totalAmount)}</strong></td>
        <td><span class="badge badge-${(inv.status||'pending').toLowerCase()}">${inv.status||'PENDING'}</span></td>
        <td>${actionsHtml}</td>
      </tr>`);
  });
}

function openCreateInvoiceModal() {
  const container = document.getElementById('custom-invoice-items-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center; color:var(--t3); font-size:.8rem; padding:.5rem 0;" id="empty-items-msg">
        No custom charges added. Base Rent will be included automatically.
      </div>`;
  }
  
  // Clear meter reading
  const meterEl = document.getElementById('create-inv-meter');
  if (meterEl) meterEl.value = '';
  
  const dd = document.getElementById('create-inv-unit');
  if (dd) {
    dd.value = '';
    dd.dispatchEvent(new Event('change'));
  }
  
  openModal('modal-create-invoice');
}

function openCreateInvoiceModalForUnit(unitId) {
  openCreateInvoiceModal();
  // Pre-select the unit and trigger metered check
  setTimeout(() => {
    const dd = document.getElementById('create-inv-unit');
    if (dd) {
      dd.value = unitId;
      dd.dispatchEvent(new Event('change'));
    }
    // Auto-add one custom charge row ready to fill in
    addCustomInvoiceItemRow();
  }, 50);
}

function addCustomInvoiceItemRow() {
  const container = document.getElementById('custom-invoice-items-container');
  const emptyMsg = document.getElementById('empty-items-msg');
  if (emptyMsg) emptyMsg.style.display = 'none';

  const row = document.createElement('div');
  row.className = 'custom-item-row';
  row.style.display = 'flex';
  row.style.gap = '.5rem';
  row.style.alignItems = 'center';
  
  row.innerHTML = `
    <input type="text" class="fc item-desc" placeholder="Description (e.g., Water Bill)" style="flex:2;" required>
    <div style="position:relative; flex:1;">
      <span style="position:absolute; left:.6rem; top:50%; transform:translateY(-50%); color:var(--t3); font-size:.9rem;">₹</span>
      <input type="number" class="fc item-amt" placeholder="Amount" step="0.01" min="0" style="padding-left:1.5rem;" required>
    </div>
    <button type="button" class="btn-icon" style="color:var(--rose);" onclick="removeCustomInvoiceItemRow(this)">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
  container.appendChild(row);
}

function removeCustomInvoiceItemRow(btn) {
  const row = btn.closest('.custom-item-row');
  if (row) row.remove();
  
  const container = document.getElementById('custom-invoice-items-container');
  if (container && container.querySelectorAll('.custom-item-row').length === 0) {
    const emptyMsg = document.getElementById('empty-items-msg');
    if (emptyMsg) emptyMsg.style.display = 'block';
  }
}

function openInvoiceModal(id) {
  const inv = S.invoices.find(i => i.id === id);
  if (!inv) return;
  const owner = getOwner() || { fullName: 'RentFlow Owner', email: 'owner@rentflow.com' };

  setText('inv-det-owner-name', owner.fullName || 'Property Owner');
  setText('inv-det-owner-email', owner.email || '');

  const badge = document.getElementById('inv-det-status-badge');
  badge.className = `badge badge-${(inv.status||'pending').toLowerCase()}`;
  badge.textContent = inv.status || 'PENDING';

  setText('inv-det-id', inv.id);
  setText('inv-det-issued', fmtDate(inv.createdAt));
  setText('inv-det-due', fmtDate(inv.dueDate));

  setText('inv-det-tenant-name', inv.tenantName || 'Tenant');
  
  const l = S.leases.find(lx => lx.id === inv.leaseId);
  setText('inv-det-tenant-email', l && l.tenantEmail ? l.tenantEmail : 'Tenant Email');

  setText('inv-det-unit-number', `Unit ${inv.unitNumber || '—'}`);
  setText('inv-det-period', `Billing Month: ${inv.billingMonth || '—'}`);

  const itemsTbody = document.getElementById('inv-det-items');
  let itemsHtml = '';

  if (inv.items && inv.items.length > 0) {
    inv.items.forEach(item => {
      itemsHtml += `
        <tr>
          <td><strong>${item.description}</strong></td>
          <td style="text-align:right">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
        </tr>`;
    });
  } else {
    // Fallback for old invoices
    itemsHtml += `
      <tr>
        <td><strong>Base Rent</strong></td>
        <td style="text-align:right">₹${(inv.rentAmount || 0).toLocaleString('en-IN')}</td>
      </tr>`;
    if (inv.electricityAmount > 0 || (inv.usage !== null && inv.usage > 0)) {
      itemsHtml += `
        <tr>
          <td>
            <strong>Electricity Usage</strong><br>
            <span style="font-size:.78rem;color:var(--t3)">
              Prev: ${inv.previousMeterReading || 0} kWh &nbsp;|&nbsp; Curr: ${inv.currentMeterReading || 0} kWh<br>
              Usage: ${inv.usage || 0} kWh
            </span>
          </td>
          <td style="text-align:right">₹${(inv.electricityAmount || 0).toLocaleString('en-IN')}</td>
        </tr>`;
    }
  }
  
  itemsTbody.innerHTML = itemsHtml;
  setText('inv-det-total', `₹${(inv.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}`);

  openModal('modal-invoice-details');
}


function printInvoice() {
  window.print();
}

async function deleteInvoice(id) {
  if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
  try {
    await apiDeleteInvoice(id);
    showToast('success', 'Deleted', 'Invoice has been deleted successfully.');
    await loadAllData();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

async function resendInvoice(id, name) {
  try {
    showToast('info', 'Sending...', `Sending reminder to ${name}...`);
    await apiResendInvoice(id);
    showToast('success', 'Sent', `Reminder email sent to ${name}.`);
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

function renderMaintenanceTickets() {
  const list = document.getElementById('maintenance-tickets-list');
  if (!list) return;
  const filter  = S.maintenanceFilter;
  const tickets = filter === 'ALL' ? S.maintenance : S.maintenance.filter(t => t.status === filter);

  setText('maint-total',         S.maintenance.length);
  setText('maint-emergency',     S.maintenance.filter(t => t.priority === 'EMERGENCY').length);
  setText('maint-pending-count', S.maintenance.filter(t => t.status === 'PENDING').length);
  setText('ticket-count-badge',  tickets.length);

  if (tickets.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-check"></i><h3>All clear!</h3><p>${filter === 'ALL' ? 'No maintenance requests.' : `No ${filter.replace('_',' ').toLowerCase()} tickets.`}</p></div>`;
    return;
  }
  list.innerHTML = '';
  tickets.forEach(t => {
    const nextStatus = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', COMPLETED: null }[t.status];
    const nextLabel  = { PENDING: 'Start Work',  IN_PROGRESS: 'Mark Done',  COMPLETED: null }[t.status];
    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.innerHTML = `
      <div class="ticket-hd">
        <h4>${esc(t.title)}</h4>
        <span class="badge badge-${(t.priority||'low').toLowerCase()}">${t.priority||'—'}</span>
      </div>
      <p class="ticket-desc">${esc(t.description||'No description provided.')}</p>
      <div class="ticket-ft">
        <div class="ticket-ft-l">
          <span><i class="fa-solid fa-location-dot"></i> ${esc(t.propertyName||'—')}</span>
          <span><i class="fa-solid fa-door-open"></i> Unit ${esc(t.unitNumber||'—')}</span>
          <span><i class="fa-solid fa-user"></i> ${esc(t.tenantName||'Tenant')}</span>
          <span><i class="fa-regular fa-calendar"></i> ${t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}</span>
        </div>
        <div class="ticket-ft-r">
          <span class="badge badge-${(t.status||'pending').toLowerCase().replace('_','-')}">${(t.status||'PENDING').replace('_',' ')}</span>
          ${nextStatus ? `<button class="btn btn-ghost btn-xs" onclick="updateMaintenanceStatus(${t.id},'${nextStatus}',this)">${nextLabel}</button>` : ''}
        </div>
      </div>`;
    list.appendChild(card);
  });
}

function prefillSettings() {
  const owner = getOwner();
  if (!owner) return;
  const parts = (owner.username || '').split(' ');
  setValue('settings-firstname',    parts[0] || '');
  setValue('settings-lastname',     parts.slice(1).join(' ') || '');
  setValue('settings-email',        owner.email || '');
  setText('settings-email-display', owner.email || '—');
}

// ============================================================
// 13. ACTIONS
// ============================================================
function filterProperties(term) {
  S.propertySearch = term;
  renderPropertiesGrid();
}

function filterMaintenance(status, el) {
  S.maintenanceFilter = status;
  document.querySelectorAll('#maintenance-filter .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMaintenanceTickets();
}

async function updateMaintenanceStatus(id, status, btn) {
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try {
    const res = await apiUpdateMaintenanceStatus(id, status);
    const idx = S.maintenance.findIndex(t => t.id === id);
    if (idx !== -1) S.maintenance[idx] = res;
    
    if (S.dashboardStats) {
      S.dashboardStats.maintenanceRequests = S.maintenance.filter(m => m.status !== 'COMPLETED').length;
    }
    renderMaintenanceTickets();
    renderStats();
    
    showToast('success', 'Updated', `Ticket marked as ${status.replace('_',' ')}.`);
  } catch (err) {
    showToast('error', 'Update Failed', err.message);
    btn.disabled = false; btn.textContent = orig;
  }
}

async function deleteProperty(id, name) {
  if (!confirm(`Delete property "${name}"?\n\nAll associated units will also be removed.`)) return;
  try {
    await apiDeleteProperty(id);
    S.properties = S.properties.filter(p => p.id !== id);
    S.allUnits   = S.allUnits.filter(u => u.propertyId !== id);
    renderAll();
    showToast('success', 'Deleted', `"${name}" has been removed.`);
  } catch (err) {
    showToast('error', 'Delete Failed', err.message);
  }
}

// ============================================================
// 14. UTILITIES
// ============================================================
function togglePwd(inputId, btn) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (el.type === 'password') { el.type = 'text';     btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>'; }
  else                        { el.type = 'password'; btn.innerHTML = '<i class="fa-solid fa-eye"></i>'; }
}

function setLoading(btn, loading) {
  if (!btn) return;
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  if (text)   text.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
}

function showToast(type, title, msg) {
  const wrap  = document.getElementById('toast-container');
  if (!wrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]||'fa-circle-info'} toast-icon"></i>
    <div><div class="toast-title">${esc(title)}</div><div class="toast-msg">${esc(msg)}</div></div>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.cssText += 'opacity:0;transform:translateY(10px);transition:.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function emptyState(icon, h, p) {
  return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h3>${h}</h3><p>${p}</p></div>`;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
  catch (_) { return String(d); }
}

// Expose to inline onclick handlers
Object.assign(window, {
  switchAuth, logout, openModal, closeModal,
  openAddPropertyModal, openAddUnitModal, openAddLeaseModal, openAddUnitToPropertyModal,
  openEditPropertyModal, openEditUnitModal,
  submitAddProperty, submitAddUnit, submitAddLease,
  submitEditProperty, submitEditUnit,
  toggleSidebar, togglePwd,
  filterProperties, filterMaintenance, filterInvoices, filterLeases,
  updateMaintenanceStatus, deleteProperty, deleteUnit, markInvoicePaid,
  copyPortalLink, terminateLease, openRecurringChargesModal, addRecurringChargeRow,
  openInvoiceModal, printInvoice, deleteInvoice, resendInvoice,
  openCreateInvoiceModal, addCustomInvoiceItemRow, removeCustomInvoiceItemRow
});

// ============================================================
// 15. VISUAL CHARTS
// ============================================================
function renderOccupancyChart(rate, occupied, total) {
  const svg = document.getElementById('occupancy-donut');
  const legend = document.getElementById('occupancy-legend');
  if (!svg || !legend) return;

  const r = 35, cx = 45, cy = 45;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, rate));
  const dash  = (pct / 100) * circ;
  const gap   = circ - dash;

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="url(#occ-grad)" stroke-width="10"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${circ * 0.25}"
      stroke-linecap="round"
      style="transition:stroke-dasharray .6s ease"/>
    <defs>
      <linearGradient id="occ-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#00c9a7"/>
        <stop offset="100%" stop-color="#38b6ff"/>
      </linearGradient>
    </defs>
    <text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="middle"
      font-family="Syne,sans-serif" font-size="13" font-weight="800" fill="#f5f5f4">${pct.toFixed(0)}%</text>`;

  const vacant = total - occupied;
  legend.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.5rem">
      <div style="display:flex;align-items:center;gap:.5rem">
        <div style="width:10px;height:10px;border-radius:50%;background:linear-gradient(90deg,#00c9a7,#38b6ff);flex-shrink:0"></div>
        <span style="font-size:.78rem;color:var(--t2)">Occupied <strong style="color:var(--t1)">${occupied}</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <div style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.08);flex-shrink:0"></div>
        <span style="font-size:.78rem;color:var(--t2)">Vacant <strong style="color:var(--t1)">${vacant}</strong></span>
      </div>
      <div style="font-size:.7rem;color:var(--t3);margin-top:.2rem">${total} units total</div>
    </div>`;
}

function renderRevenueChart() {
  const wrap = document.getElementById('revenue-chart-wrap');
  if (!wrap) return;
  if (S.invoices.length === 0) { wrap.innerHTML = `<div style="width:100%;text-align:center;color:var(--t3);font-size:.78rem;padding:1rem 0">No invoice data yet</div>`; return; }

  // Group invoices by billing month (last 6)
  const monthMap = {};
  S.invoices.forEach(inv => {
    const m = inv.billingMonth || (inv.createdAt ? inv.createdAt.substring(0,7) : null);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = 0;
    monthMap[m] += inv.totalAmount || 0;
  });
  const months = Object.keys(monthMap).sort().slice(-6);
  const vals   = months.map(m => monthMap[m]);
  const maxVal = Math.max(...vals, 1);

  wrap.innerHTML = months.map((m, i) => {
    const pct   = (vals[i] / maxVal) * 100;
    const label = m.split('-').slice(0,2).map((v,j) => j===1 ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(v)-1] : '').join('');
    return `<div class="rev-bar-wrap" title="₹${vals[i].toLocaleString('en-IN')} in ${m}">
      <div class="rev-bar" style="height:${Math.max(4,pct)}%"></div>
      <div class="rev-bar-label">${label}</div>
    </div>`;
  }).join('');
}

function filterInvoices(filter, btn) {
  S.invoiceFilter = filter;
  document.querySelectorAll('#invoice-filter-chips .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderInvoicesTable();
}

// ============================================================
// MARKETPLACE PUBLIC CODE
// ============================================================
async function loadMarketplaceData() {
  try {
    S.publicProperties = await apiGetPublicProperties() || [];
    renderMarketplace(S.publicProperties);
  } catch (err) {
    console.error("Error loading marketplace:", err);
  }
}

function renderMarketplace(props) {
  const grid = document.getElementById("mp-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!props || props.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="es-ico"><i class="fa-solid fa-house-chimney-window"></i></div><p>No available listings at the moment.</p></div>`;
    return;
  }
  props.forEach(p => {
    const uCount = (p.vacantUnits || []).length;
    let minRent = Infinity;
    if (p.vacantUnits && p.vacantUnits.length > 0) {
      minRent = p.vacantUnits.reduce((min, u) => Math.min(min, u.baseRent), Infinity);
    }
    const rentDisplay = minRent === Infinity ? 'TBD' : '₹' + minRent;
    const img = p.imageUrl || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400";
    let allImages = [];
    if (p.imageUrl) allImages.push(p.imageUrl);
    if (p.additionalImages && p.additionalImages.length > 0) {
      allImages = allImages.concat(p.additionalImages);
    }
    if (allImages.length === 0) allImages.push("https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400");
    
    let galleryHtml = `<div class="prop-gallery">`;
    allImages.forEach(src => {
      galleryHtml += `<div class="prop-img-holder"><img src="${src}" alt="${p.name}" /></div>`;
    });
    galleryHtml += `</div>`;

    const descHtml = p.description ? `<p class="prop-desc">${p.description}</p>` : '';

    const div = document.createElement("div");
    div.className = "prop-card";
    
    div.innerHTML = `
      <div class="prop-price-pill"><span>From</span> ${rentDisplay}</div>
      ${galleryHtml}
      <div class="prop-card-body">
        <div class="prop-card-head">
          <h3>${p.name}</h3>
          <p class="prop-address"><i class="fa-solid fa-location-dot"></i> ${p.address}</p>
          ${descHtml}
        </div>
        <div class="prop-units-tag">
          <i class="fa-solid fa-door-open"></i> ${uCount} Unit${uCount !== 1 ? 's' : ''} Available
        </div>
        <div class="prop-card-foot">
          <button class="btn btn-primary w100" onclick="openApplyModal(${p.id})">Apply to Rent</button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
}

function filterMarketplace(q) {
  const s = q.toLowerCase();
  const filtered = S.publicProperties.filter(p => p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s));
  renderMarketplace(filtered);
}

function initMarketplace() {
  document.getElementById("apply-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-apply");
    setLoading(btn, true);
    try {
      const dto = {
        property: { id: document.getElementById("apply-property-id").value },
        unit: { id: document.getElementById("apply-unit-id").value },
        tenantName: document.getElementById("apply-name").value.trim(),
        tenantEmail: document.getElementById("apply-email").value.trim(),
        tenantPhone: document.getElementById("apply-phone").value.trim(),
        message: document.getElementById("apply-msg").value.trim()
      };
      await apiSubmitApplication(dto);
      showToast("success", "Application Submitted", "We will contact you shortly.");
      closeModal("modal-apply");
      e.target.reset();
    } catch (err) {
      showToast("error", "Application Failed", err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

window.openApplyModal = (propId) => {
  const p = S.publicProperties.find(x => x.id === propId);
  if (!p) return;
  document.getElementById("apply-property-id").value = p.id;
  document.getElementById("apply-property-name").textContent = `Apply for ${p.name}`;
  const sel = document.getElementById("apply-unit-id");
  sel.innerHTML = "";
  p.vacantUnits.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = `Unit ${u.unitNumber} - ₹${u.baseRent}/mo`;
    sel.appendChild(opt);
  });
  openModal("modal-apply");
};

// ============================================================
// OWNER APPLICATIONS
// ============================================================
async function loadApplications() {
  try {
    S.applications = await apiGetApplications() || [];
    renderApplications();
  if (getOwner() && getOwner().role !== 'ROLE_AGENT') { renderAgents(); }
  } catch (err) {
    showToast("error", "Error", "Failed to load applications");
  }
}

function renderApplications() {
  const tbody = document.getElementById("applications-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!S.applications || S.applications.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No rental applications found.</div></td></tr>`;
    return;
  }
  S.applications.forEach(a => {
    const d = new Date(a.createdAt).toLocaleDateString();
    let badgeClass = "gray";
    if (a.status === "APPROVED") badgeClass = "green";
    else if (a.status === "REJECTED") badgeClass = "red";
    
    let actions = "";
    if (a.status === "PENDING") {
      actions = `
        <button class="btn btn-ghost btn-sm" onclick="updateApplicationStatus(${a.id}, 'APPROVED')" title="Approve"><i class="fa-solid fa-check" style="color:var(--green)"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="updateApplicationStatus(${a.id}, 'REJECTED')" title="Reject"><i class="fa-solid fa-xmark" style="color:var(--rose)"></i></button>
      `;
    }
    
    const propName = a.property ? a.property.name : "-";
    const unitNo = a.unit ? a.unit.unitNumber : "-";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${a.tenantName}</strong><br><small style="color:var(--t3)">${a.message || 'No message'}</small></td>
      <td>${propName}<br><span style="color:var(--t2)">Unit ${unitNo}</span></td>
      <td>${a.tenantEmail}<br><span style="color:var(--t2)">${a.tenantPhone}</span></td>
      <td>${d}</td>
      <td><span class="badge ${badgeClass}">${a.status}</span></td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateApplicationStatus = async (id, status) => {
  if (!confirm(`Are you sure you want to ${status.toLowerCase()} this application?`)) return;
  try {
    await apiUpdateApplicationStatus(id, status);
    showToast("success", "Status Updated", `Application marked as ${status}`);
    await loadApplications();
  } catch (err) {
    showToast("error", "Update Failed", err.message);
  }
};

// ============================================================
// OWNER AGENTS
// ============================================================
async function loadAgents() {
  try {
    S.agents = await apiGetAgents() || [];
    renderAgents();
  } catch (err) {
    console.error("Failed to load agents:", err);
  }
}

function renderAgents() {
  const tbody = document.getElementById("agents-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!S.agents || S.agents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No team agents found.</div></td></tr>`;
    return;
  }
  S.agents.forEach(a => {
    let actions = `<button class="btn btn-ghost btn-sm" onclick="removeAgent(${a.id})" title="Remove"><i class="fa-solid fa-trash" style="color:var(--rose)"></i></button>`;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${a.username}</strong></td>
      <td>${a.email}</td>
      <td><span class="badge gray">${a.role.replace('ROLE_','')}</span></td>
      <td>${a.isVerified ? '<span class="badge green">Verified</span>' : '<span class="badge gray">Pending</span>'}</td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.removeAgent = async (id) => {
  if (!confirm('Are you sure you want to remove this agent?')) return;
  try {
    await apiRemoveAgent(id);
    showToast('success', 'Agent Removed', 'Agent access revoked.');
    await loadAgents();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
};

document.getElementById('invite-agent-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-invite');
  setLoading(btn, true);
  try {
    const dto = {
      username: document.getElementById('agent-username').value.trim(),
      email: document.getElementById('agent-email').value.trim()
    };
    const res = await apiInviteAgent(dto);
    showToast('success', 'Agent Invited', `Temp Password: ${res.tempPassword}. They can log in immediately.`);
    closeModal('modal-invite-agent');
    e.target.reset();
    await loadAgents();
  } catch (err) {
    showToast('error', 'Invite Failed', err.message);
  } finally {
    setLoading(btn, false);
  }
});
