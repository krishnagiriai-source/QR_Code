/* ════════════════════════════════════════════════════════════
   MRK Foods — script.js  (Final Version)
   
   HOW DATA FLOWS:
   Admin saves → JSONBin cloud DB → Customer fetches → Shows live
   No GitHub push. No manual JSON edit. Fully automatic.
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── Avatar gradients — consistent per slot ── */
const GRADS = [
  'linear-gradient(135deg,#0b1623,#1a2d47)',
  'linear-gradient(135deg,#1a0533,#4a1080)',
  'linear-gradient(135deg,#001a0e,#00401f)',
  'linear-gradient(135deg,#1a1500,#4a3800)',
  'linear-gradient(135deg,#1a000a,#4a0020)',
  'linear-gradient(135deg,#001520,#003050)',
  'linear-gradient(135deg,#0a1a00,#1e4000)',
  'linear-gradient(135deg,#1a0d00,#4a2800)',
];

/* ════════════════════════════════════════════
   JSONBIN API — read & write cloud database
════════════════════════════════════════════ */
function binUrl()     { return `https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}`; }
function binHeaders() {
  return {
    'Content-Type':  'application/json',
    'X-Master-Key':  CONFIG.API_KEY,
    'X-Bin-Versioning': 'false'   // always overwrite latest, no version history needed
  };
}

/* FETCH managers from JSONBin */
async function dbRead() {
  const res = await fetch(binUrl() + '/latest', { headers: binHeaders() });
  if (!res.ok) throw new Error('DB read failed: ' + res.status);
  const json = await res.json();
  /* JSONBin wraps data in { record: {...} } */
  const record = json.record || json;
  return Array.isArray(record.managers) ? record.managers : [];
}

/* WRITE managers to JSONBin */
async function dbWrite(managers) {
  const res = await fetch(binUrl(), {
    method:  'PUT',
    headers: binHeaders(),
    body:    JSON.stringify({ managers })
  });
  if (!res.ok) throw new Error('DB write failed: ' + res.status);
  return true;
}

/* ════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════ */
function uid()           { return 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
function grad(i)         { return GRADS[i % GRADS.length]; }
function initials(name)  { return (name||'').trim().split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase() || '?'; }
function esc(s)          { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function el(id)          { return document.getElementById(id); }
function val(id)         { return (el(id)||{value:''}).value.trim(); }

/* Toast notifications */
function toast(msg, type, dur) {
  const wrap = el('toastWrap'); if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' '+type : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateY(8px) scale(.95);transition:all .3s'; setTimeout(()=>t.remove(), 320); }, dur||2800);
}

function hideLoader() {
  const l = el('pageLoader');
  if (l) setTimeout(()=>l.classList.add('hidden'), 350);
}

/* ════════════════════════════════════════════
   ROUTER — detect page
════════════════════════════════════════════ */
function isAdmin() {
  return window.location.pathname.toLowerCase().includes('admin') ||
         (document.title||'').toLowerCase().includes('admin');
}

function boot() {
  if (isAdmin()) initAdmin();
  else           initLanding();
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', boot);
else
  boot();

/* ════════════════════════════════════════════════════════
   ══════════════  LANDING PAGE  ══════════════════════════
   Fetches live from JSONBin — customers always see latest
   ════════════════════════════════════════════════════════ */
let _activeManager = null;
let _allManagers   = [];

async function initLanding() {
  hideLoader();
  showEl('loadingMsg', true);

  /* Check config */
  if (!CONFIG.BIN_ID || CONFIG.BIN_ID === 'PASTE_BIN_ID_HERE') {
    showEl('loadingMsg', false);
    showEl('errorMsg', true);
    toast('⚠️ Setup not complete. Please configure config.js', 'error', 6000);
    return;
  }

  try {
    _allManagers = await dbRead();
    showEl('loadingMsg', false);

    /* Update stats */
    const sc = el('statCount'), sx = el('statCities'), sr = el('statsRow');
    if (sc) sc.textContent = _allManagers.length;
    if (sx) sx.textContent = _allManagers.length;
    if (sr) sr.style.opacity = '1';

    renderCards(_allManagers, _allManagers);
    setupSearch();
    setupModal();

  } catch(err) {
    showEl('loadingMsg', false);
    showEl('errorMsg', true);
    toast('Could not load data. Check internet connection.', 'error');
  }
}

/* ── Render manager cards ── */
function renderCards(list, all) {
  const grid  = el('cardsGrid');
  const noRes = el('noResults');
  if (!grid) return;

  grid.innerHTML = '';

  if (!list || !list.length) {
    if (noRes) noRes.classList.remove('hidden');
    return;
  }
  if (noRes) noRes.classList.add('hidden');

  list.forEach((mgr, idx) => {
    const ri    = all.findIndex(m => m.id === mgr.id);
    const g     = grad(ri >= 0 ? ri : idx);
    const avail = mgr.available !== false;

    const card = document.createElement('div');
    card.className = 'manager-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.style.animationDelay = (idx * 0.07) + 's';

    card.innerHTML = `
      <div class="card-arrow ${mgr.card ? '' : 'grey'}" aria-hidden="true">→</div>
      <div class="card-avatar" aria-hidden="true">
        <div class="avatar-ring"></div>
        <div class="avatar-inner" style="background:${g}">${esc(initials(mgr.manager))}</div>
      </div>
      <div class="card-city"><span class="city-dot"></span>${esc(mgr.city)}</div>
      <p class="card-name">${esc(mgr.manager)}</p>
      <p class="card-role">City Sales Manager</p>
      <div class="status-badge ${avail ? '' : 'unavail'}">
        <span class="status-dot"></span>${avail ? 'Available' : 'Coming Soon'}
      </div>`;

    const open = e => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openModal(mgr, g);
    };
    card.addEventListener('click',   open);
    card.addEventListener('keydown', open);
    grid.appendChild(card);
  });
}

/* ── Search ── */
function setupSearch() {
  const inp   = el('searchInput');
  const clear = el('searchClear');
  if (!inp) return;

  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (clear) clear.classList.toggle('hidden', !q);
    const filtered = q
      ? _allManagers.filter(m =>
          (m.city||'').toLowerCase().includes(q) ||
          (m.manager||'').toLowerCase().includes(q))
      : _allManagers;
    renderCards(filtered, _allManagers);
  });

  if (clear) {
    clear.addEventListener('click', () => {
      inp.value = '';
      clear.classList.add('hidden');
      renderCards(_allManagers, _allManagers);
      inp.focus();
    });
  }
}

/* ── Modal ── */
function setupModal() {
  const bd = el('modalBackdrop'), cb = el('modalClose'), sb = el('modalSaveBtn');
  if (bd) bd.addEventListener('click', closeModal);
  if (cb) cb.addEventListener('click', closeModal);
  if (sb) sb.addEventListener('click', () => { if (_activeManager) saveVCard(_activeManager, sb); });

  const sheet = el('modalSheet');
  if (sheet) {
    const inner = sheet.querySelector('.modal-inner');
    if (inner) {
      let y0 = 0;
      inner.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, {passive:true});
      inner.addEventListener('touchend',   e => { if (e.changedTouches[0].clientY - y0 > 80) closeModal(); }, {passive:true});
    }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && _activeManager) closeModal(); });
}

function openModal(mgr, g) {
  _activeManager = mgr;
  const av = el('modalAvatar');
  if (av) { av.style.background = g; av.innerHTML = `<span>${esc(initials(mgr.manager))}</span>`; }

  setText('modalMgrName', mgr.manager || '');
  setText('modalMgrCity', (mgr.city || '') + ' · MRK Foods');

  /* Card button */
  const cardBtn = el('modalCardBtn'), cardLbl = el('modalCardLabel');
  if (cardBtn) {
    if (mgr.card) {
      cardBtn.href = mgr.card;
      cardBtn.classList.remove('disabled');
      if (cardLbl) cardLbl.textContent = 'View Digital Card';
    } else {
      cardBtn.href = '#';
      cardBtn.classList.add('disabled');
      if (cardLbl) cardLbl.textContent = 'Card Coming Soon';
    }
  }

  /* Call */
  const callBtn = el('modalCallBtn');
  if (callBtn) {
    if (mgr.mobile) { callBtn.href = 'tel:' + mgr.mobile; callBtn.classList.remove('no-contact'); }
    else            { callBtn.removeAttribute('href');     callBtn.classList.add('no-contact'); }
  }

  /* WhatsApp */
  const waBtn = el('modalWaBtn');
  if (waBtn) {
    if (mgr.whatsapp) {
      const m = encodeURIComponent('Hi ' + mgr.manager + ', I found you through MRK Foods. I\'d like to connect.');
      waBtn.href = 'https://wa.me/' + mgr.whatsapp + '?text=' + m;
      waBtn.classList.remove('no-contact');
    } else {
      waBtn.removeAttribute('href');
      waBtn.classList.add('no-contact');
    }
  }

  const sheet = el('modalSheet'), bd = el('modalBackdrop');
  if (sheet) sheet.classList.add('open');
  if (bd)    bd.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const s = el('modalSheet'), b = el('modalBackdrop');
  if (s) s.classList.remove('open');
  if (b) b.classList.remove('open');
  document.body.style.overflow = '';
  _activeManager = null;
}

/* Save vCard to phone contacts */
function saveVCard(mgr, btn) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0',
    'FN:' + (mgr.manager || ''),
    'TITLE:City Sales Manager',
    'ORG:MRK Foods Private Limited',
  ];
  if (mgr.mobile)   lines.push('TEL;TYPE=CELL:'  + mgr.mobile);
  if (mgr.email)    lines.push('EMAIL;TYPE=WORK:' + mgr.email);
  if (mgr.card)     lines.push('URL:'             + mgr.card);
  lines.push('NOTE:City Manager – ' + (mgr.city || '') + ' | MRK Foods HoReCa', 'END:VCARD');

  const blob = new Blob([lines.join('\r\n')], {type: 'text/vcard;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = ((mgr.manager || 'contact').replace(/\s+/g, '_')) + '_MRKFoods.vcf';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);

  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="m-btn-icon">✅</span><span>Saved to Contacts!</span>';
    setTimeout(() => { btn.innerHTML = orig; }, 2200);
  }
}

/* ════════════════════════════════════════════════════════
   ══════════════  ADMIN PANEL  ═══════════════════════════
   ════════════════════════════════════════════════════════ */
let _editingId = null;
let _deleteId  = null;
let _dbManagers = [];  /* local cache of what's in JSONBin */

/* ── Password Gate ── */
function initAdmin() {
  hideLoader();

  /* Check if config is set */
  if (!CONFIG.BIN_ID || CONFIG.BIN_ID === 'PASTE_BIN_ID_HERE') {
    el('passwordGate').hidden = false;
    toast('⚠️ config.js not configured. Please set BIN_ID and API_KEY.', 'error', 8000);
    return;
  }

  /* Check if already logged in this session */
  if (sessionStorage.getItem('mrk_admin_auth') === 'yes') {
    showAdminPanel();
  } else {
    el('passwordGate').hidden = false;
  }
}

function checkPassword() {
  const pw = (el('pwInput')||{}).value || '';
  const err = el('pwError');
  if (pw === CONFIG.ADMIN_PASS) {
    sessionStorage.setItem('mrk_admin_auth', 'yes');
    if (err) err.hidden = true;
    el('passwordGate').hidden = true;
    showAdminPanel();
  } else {
    if (err) err.hidden = false;
    const inp = el('pwInput');
    if (inp) { inp.value = ''; inp.focus(); inp.classList.add('error'); setTimeout(()=>inp.classList.remove('error'),1500); }
  }
}

function adminLogout() {
  sessionStorage.removeItem('mrk_admin_auth');
  window.location.reload();
}

async function showAdminPanel() {
  el('adminPanel').hidden = false;

  /* Set QR URL to current origin */
  const qrEl = el('qrUrl');
  if (qrEl && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    qrEl.value = window.location.origin + '/index.html';
  }

  /* Load managers from cloud */
  setSyncStatus('loading');
  try {
    _dbManagers = await dbRead();
    setSyncStatus('synced');
    renderAdminList();
    initAddPreview();
    wireAdminEvents();
  } catch(err) {
    setSyncStatus('error');
    toast('⚠️ Could not connect to cloud database. Check config.js', 'error', 6000);
    renderAdminListFallback();
    wireAdminEvents();
  }
}

function setSyncStatus(state) {
  const dot = el('syncDot'), lbl = el('syncLabel'), ind = el('syncIndicator');
  if (!dot || !lbl) return;
  dot.className = 'sync-dot ' + state;
  const labels = { loading: 'Connecting…', synced: 'Live ✓', error: 'Offline ✗', saving: 'Saving…' };
  lbl.textContent = labels[state] || state;
}

/* ── Tab switching ── */
function switchTab(tab) {
  const tabs = { managers:'tabManagers', add:'tabAdd', qr:'tabQR' };
  const pnls = { managers:'panelManagers', add:'panelAdd', qr:'panelQR' };
  Object.keys(tabs).forEach(t => {
    const b = el(tabs[t]); if (b) b.classList.toggle('active', t === tab);
    const p = el(pnls[t]); if (p) p.classList.toggle('active', t === tab);
  });
}

/* ── Render admin manager list ── */
function renderAdminList() {
  const listEl = el('adminList');
  if (!listEl) return;

  const cnt  = el('adminCount'), tc = el('tabCount');
  if (cnt) cnt.textContent = _dbManagers.length;
  if (tc)  tc.textContent  = _dbManagers.length;

  const q = val('adminSearch').toLowerCase();
  const shown = q
    ? _dbManagers.filter(m => (m.city||'').toLowerCase().includes(q) || (m.manager||'').toLowerCase().includes(q))
    : _dbManagers;

  if (!shown.length) {
    listEl.innerHTML = `<div class="list-empty">
      <p class="list-empty-icon">👤</p>
      <p class="list-empty-txt">${q ? 'No results.' : 'No managers yet. Add one!'}</p>
    </div>`;
    return;
  }

  listEl.innerHTML = shown.map((mgr, idx) => {
    const ri    = _dbManagers.findIndex(m => m.id === mgr.id);
    const g     = grad(ri >= 0 ? ri : idx);
    const avail = mgr.available !== false;
    const sid   = esc(mgr.id);
    return `
      <div class="mgr-row" id="row_${sid}">
        <div class="mgr-avatar">
          <div class="mgr-av-ring"></div>
          <div style="position:absolute;inset:2px;border-radius:9px;display:flex;align-items:center;justify-content:center;
                      font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:700;color:#e8c86d;
                      background:${g}">${esc(initials(mgr.manager))}</div>
        </div>
        <div class="mgr-info">
          <p class="mgr-name">${esc(mgr.manager)}</p>
          <p class="mgr-city-tag">
            <span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:#c9a84c;margin-right:5px;vertical-align:middle"></span>
            ${esc(mgr.city)}
          </p>
          <p class="mgr-url" title="${esc(mgr.card||'')}">
            ${esc(mgr.card || 'No card URL set')}
          </p>
        </div>
        <button class="avail-toggle ${avail?'':'off'}" onclick="toggleAvail('${sid}')">
          ${avail ? '● Available' : '○ Unavailable'}
        </button>
        <div class="mgr-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${sid}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="openConfirmDelete('${sid}','${esc(mgr.manager)}')" title="Delete">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function renderAdminListFallback() {
  const listEl = el('adminList');
  if (listEl) listEl.innerHTML = `<div class="list-empty"><p class="list-empty-icon">⚠️</p><p class="list-empty-txt">Could not load from cloud. Check config.js</p></div>`;
}

/* ── Add Manager ── */
async function addManager() {
  const city     = val('addCity');
  const name     = val('addName');
  const card     = val('addCard');
  const mobile   = val('addMobile');
  const whatsapp = val('addWhatsapp');
  const email    = val('addEmail');
  const available= val('addStatus') !== 'false';

  if (!city || !name || !card) {
    ['addCity','addName','addCard'].forEach(id => {
      const e = el(id);
      if (e && !val(id)) { e.classList.add('error'); setTimeout(()=>e.classList.remove('error'), 1800); }
    });
    toast('⚠️ City, Name and Card URL are required.', 'error');
    return;
  }

  /* Optimistic UI */
  const btn = el('addBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  setSyncStatus('saving');

  const newMgr = { id:uid(), city, manager:name, card, mobile, whatsapp, email, available };
  _dbManagers.push(newMgr);

  try {
    await dbWrite(_dbManagers);
    setSyncStatus('synced');
    clearAddForm();
    renderAdminList();
    toast('✅ ' + name + ' added — live instantly for all customers!', 'success');
    switchTab('managers');
  } catch(err) {
    /* Rollback */
    _dbManagers = _dbManagers.filter(m => m.id !== newMgr.id);
    setSyncStatus('error');
    toast('❌ Save failed. Check internet & config.js', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '✅ Add & Sync Live'; }
  }
}

/* Live preview */
function initAddPreview() {
  const ni = el('addName'), ci = el('addCity'), pr = el('addPreview');
  if (!ni || !ci || !pr) return;
  const upd = () => {
    const n = ni.value.trim(), c = ci.value.trim();
    if (n || c) {
      pr.style.display = 'block';
      const pa = el('previewAvatar'), pn = el('previewName'), pc = el('previewCity');
      if (pa) pa.textContent = initials(n) || '?';
      if (pn) pn.textContent = n || 'Manager Name';
      if (pc) pc.textContent = c || 'City';
    } else pr.style.display = 'none';
  };
  ni.addEventListener('input', upd);
  ci.addEventListener('input', upd);
}

function clearAddForm() {
  ['addCity','addName','addCard','addMobile','addWhatsapp','addEmail'].forEach(id => {
    const e = el(id); if (e) e.value = '';
  });
  const s = el('addStatus'); if (s) s.value = 'true';
  const p = el('addPreview'); if (p) p.style.display = 'none';
}

/* ── Toggle availability ── */
async function toggleAvail(id) {
  const mgr = _dbManagers.find(m => m.id === id);
  if (!mgr) return;
  mgr.available = !mgr.available;
  setSyncStatus('saving');
  try {
    await dbWrite(_dbManagers);
    setSyncStatus('synced');
    renderAdminList();
    toast(mgr.manager + ' → ' + (mgr.available ? '✅ Available' : '⏳ Coming Soon'), 'success');
  } catch {
    mgr.available = !mgr.available; /* rollback */
    setSyncStatus('error');
    toast('❌ Save failed.', 'error');
    renderAdminList();
  }
}

/* ── Edit Modal ── */
function openEditModal(id) {
  const mgr = _dbManagers.find(m => m.id === id);
  if (!mgr) return;
  _editingId = id;
  const f = (eid, v) => { const e = el(eid); if (e) e.value = v || ''; };
  f('editCity',     mgr.city);
  f('editName',     mgr.manager);
  f('editCard',     mgr.card);
  f('editMobile',   mgr.mobile);
  f('editWhatsapp', mgr.whatsapp);
  f('editEmail',    mgr.email);
  const st = el('editStatus'); if (st) st.value = mgr.available !== false ? 'true' : 'false';
  el('editBack').classList.add('open');
  el('editModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  el('editBack').classList.remove('open');
  el('editModal').classList.remove('open');
  document.body.style.overflow = '';
  _editingId = null;
}

async function saveEdit() {
  const city     = val('editCity');
  const name     = val('editName');
  const card     = val('editCard');
  const mobile   = val('editMobile');
  const whatsapp = val('editWhatsapp');
  const email    = val('editEmail');
  const available= val('editStatus') !== 'false';

  if (!city || !name || !card) { toast('⚠️ City, Name and Card URL are required.', 'error'); return; }

  const idx = _dbManagers.findIndex(m => m.id === _editingId);
  if (idx < 0) return;

  const prev = { ..._dbManagers[idx] };
  _dbManagers[idx] = { ..._dbManagers[idx], city, manager:name, card, mobile, whatsapp, email, available };

  const btn = el('saveEditBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  setSyncStatus('saving');

  try {
    await dbWrite(_dbManagers);
    setSyncStatus('synced');
    renderAdminList();
    closeEditModal();
    toast('✅ ' + name + ' updated — live instantly for all customers!', 'success');
  } catch {
    _dbManagers[idx] = prev; /* rollback */
    setSyncStatus('error');
    toast('❌ Save failed. Check internet & config.js', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💾 Save & Sync Live'; }
  }
}

/* ── Delete ── */
function openConfirmDelete(id, name) {
  _deleteId = id;
  const t = el('confirmTxt');
  if (t) t.textContent = 'Delete "' + name + '"? This cannot be undone.';
  el('confirmBack').classList.add('open');
  el('confirmBox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeConfirm() {
  el('confirmBack').classList.remove('open');
  el('confirmBox').classList.remove('open');
  document.body.style.overflow = '';
  _deleteId = null;
}

async function doDelete() {
  if (!_deleteId) return;
  const prev = [..._dbManagers];
  _dbManagers = _dbManagers.filter(m => m.id !== _deleteId);
  setSyncStatus('saving');
  closeConfirm();
  try {
    await dbWrite(_dbManagers);
    setSyncStatus('synced');
    renderAdminList();
    toast('🗑️ Manager deleted — removed for all customers.', 'error');
  } catch {
    _dbManagers = prev; /* rollback */
    setSyncStatus('error');
    toast('❌ Delete failed.', 'error');
    renderAdminList();
  }
}

/* ── QR Code ── */
let _qrDone = false;
function generateQR() {
  const urlEl = el('qrUrl'), prev = el('qrPreview'), acts = el('qrActions');
  if (!urlEl || !prev) return;
  let url = urlEl.value.trim();
  if (!url) { toast('⚠️ Enter your landing page URL first.', 'error'); return; }
  if (!url.startsWith('http')) url = 'https://' + url;
  prev.innerHTML = ''; _qrDone = false;
  const w = document.createElement('div');
  w.id = 'qrTarget';
  w.style.cssText = 'display:flex;align-items:center;justify-content:center';
  prev.appendChild(w);
  if (typeof QRCode === 'undefined') {
    prev.innerHTML = '<p style="color:#fca5a5;font-size:.84rem;text-align:center;padding:20px">QRCode.js not loaded. Check internet.</p>';
    return;
  }
  try {
    new QRCode(w, {text:url, width:184, height:184, colorDark:'#0b1623', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H});
    _qrDone = true;
    if (acts) acts.style.display = 'flex';
    toast('📱 QR generated — links to: ' + url, 'success');
  } catch { prev.innerHTML = '<p style="color:#fca5a5;padding:20px">QR generation failed.</p>'; }
}

function downloadQR() {
  if (!_qrDone) { toast('⚠️ Generate QR first.', 'error'); return; }
  const canvas = document.querySelector('#qrTarget canvas'), img = document.querySelector('#qrTarget img');
  const draw = src => {
    const pad = 24, c = document.createElement('canvas');
    c.width = 208; c.height = 208;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,208,208);
    const i = new Image();
    i.onload = () => {
      ctx.drawImage(i, pad, pad, 184, 184);
      const a = document.createElement('a');
      a.download = 'MRKFoods_Master_QR.png';
      a.href = c.toDataURL('image/png');
      a.click();
      toast('⬇️ QR downloaded!', 'success');
    };
    i.src = src;
  };
  if (canvas) draw(canvas.toDataURL('image/png'));
  else if (img) draw(img.src);
  else toast('⚠️ Generate QR first.', 'error');
}

function copyQrUrl() {
  const u = (el('qrUrl')||{}).value;
  if (!u) { toast('⚠️ No URL.', 'error'); return; }
  navigator.clipboard.writeText(u).then(()=>toast('🔗 URL copied!','success')).catch(()=>toast('Copy failed.','error'));
}

function printQR() {
  if (!_qrDone) { toast('⚠️ Generate QR first.', 'error'); return; }
  const c = document.querySelector('#qrTarget canvas'), i = document.querySelector('#qrTarget img');
  const src = c ? c.toDataURL('image/png') : (i ? i.src : null);
  if (!src) { toast('⚠️ No QR to print.', 'error'); return; }
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>MRK Foods QR</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;background:#fff;gap:16px;padding:30px}
    img{width:240px;height:240px;padding:16px;border:1px solid #eee;border-radius:10px}
    h2{font-size:1.3rem;text-align:center;margin:0}p{font-size:.85rem;color:#666;text-align:center;max-width:320px}</style>
    </head><body><h2>MRK Foods Private Limited</h2>
    <img src="${src}" alt="QR Code">
    <p>Scan this QR code to find and connect with your nearest MRK Foods city manager.</p>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ── Wire all admin event listeners ── */
function wireAdminEvents() {
  const cy = el('confirmYes');
  if (cy) cy.addEventListener('click', doDelete);
  const cb = el('confirmBack'); if (cb) cb.addEventListener('click', closeConfirm);
  const eb = el('editBack');    if (eb) eb.addEventListener('click', closeEditModal);
  const as = el('adminSearch'); if (as) as.addEventListener('input', renderAdminList);
}

/* ── Global keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const em = el('editModal');  if (em  && em.classList.contains('open'))  closeEditModal();
  const cb = el('confirmBox'); if (cb  && cb.classList.contains('open'))  closeConfirm();
  if (_activeManager) closeModal();
});

/* ── DOM helpers ── */
function setText(id, txt) { const e = el(id); if (e) e.textContent = txt; }
function showEl(id, show) {
  const e = el(id);
  if (!e) return;
  if (show) e.classList.remove('hidden');
  else      e.classList.add('hidden');
}
