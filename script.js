/* ══════════════════════════════════════════════════════════════
   MRK Foods — Multi Branch Manager QR System
   script.js — v4  (Firebase Firestore Edition)

   ARCHITECTURE:
   - All data lives in Firebase Firestore (collection: "managers")
   - Landing page (index.html) → reads from Firestore in real-time
   - Admin panel (admin.html)  → reads/writes Firestore directly
   - NO more managers.json, NO more localStorage, NO more GitHub push
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════
   FIREBASE CONFIG — Replace with YOUR project values
   (Get from Firebase Console → Project Settings → Your Apps)
══════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCOk_iCSylLleaXH7vDZVX_zkKZoBQTg2U",
  authDomain: "mrk-foodsqr.firebaseapp.com",
  projectId: "mrk-foodsqr",
  storageBucket: "mrk-foodsqr.firebasestorage.app",
  messagingSenderId: "59138087863",
  appId: "1:59138087863:web:e8b92c03bc6396dee92632",
  measurementId: "G-MNDBWBGQKX
};

/* ─── Initialise Firebase (safe to call multiple times) ─── */
let db;
function initFirebase() {
  if (!firebase || !firebase.apps) {
    console.error('Firebase SDK not loaded. Check HTML script tags.');
    return false;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  db = firebase.firestore();
  return true;
}

/* ─── Seed data (fallback if Firestore unreachable) ─── */
const SEED_DATA = [
  { id:'mgr_1', city:'Mumbai',    manager:'Suraj Jadhav',      card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=BqXvcZ0B2Rn7RAYZIIqY', mobile:'+918833505114', whatsapp:'918833505114', email:'suraj@mrkfoods.in',       available:true },
  { id:'mgr_2', city:'Hyderabad', manager:'Arun Kumar Naliya', card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=L7O26WxeA8pRMHFlhvGn',  mobile:'+919876543210', whatsapp:'919876543210', email:'arun@mrkfoods.in',        available:true },
  { id:'mgr_3', city:'Delhi',     manager:'Vijay Vijarajan',   card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=J1Yh3B4KC8zoQHU7jgtI', mobile:'+919820595083', whatsapp:'919820595083', email:'northindia@mrkfoods.in', available:true },
  { id:'mgr_4', city:'Jaipur',    manager:'Rohit Gaikwad',     card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=DQNE2eZd3KFk4hXI8EOH', mobile:'+919988776655', whatsapp:'919988776655', email:'rohit@mrkfoods.in',       available:true }
];

const GRADIENTS = [
  'linear-gradient(135deg,#0b1623,#1a2d47)',
  'linear-gradient(135deg,#1a0533,#4a1080)',
  'linear-gradient(135deg,#001a0e,#00401f)',
  'linear-gradient(135deg,#1a1500,#4a3800)',
  'linear-gradient(135deg,#1a000a,#4a0020)',
  'linear-gradient(135deg,#001520,#003050)',
  'linear-gradient(135deg,#0a1a00,#1e4000)',
  'linear-gradient(135deg,#1a0d00,#4a2800)',
];

/* ─── Helpers ─── */
function generateId()   { return 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
function getGradient(i) { return GRADIENTS[i % GRADIENTS.length]; }
function getInitials(n) { if (!n||!n.trim()) return '?'; return n.trim().split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
function esc(s)         { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ─── Toast ─── */
function showToast(msg, type, dur) {
  type = type||'default'; dur = dur||2600;
  const wrap = document.getElementById('toastWrap'); if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type !== 'default' ? ' ' + type : '');
  t.textContent = msg; wrap.appendChild(t);
  setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateY(8px) scale(.95);transition:all .3s'; setTimeout(()=>t.remove(),320); }, dur);
}

function hideLoader() {
  const l = document.getElementById('pageLoader');
  if (l) setTimeout(()=>l.classList.add('hidden'), 400);
}

/* ══════════════════════════════════════════════
   LANDING PAGE
   - Reads all managers from Firestore in real-time
   - QR code → index.html → always shows latest data
══════════════════════════════════════════════ */
let activeManager = null;

function initLanding() {
  if (!initFirebase()) {
    startLanding(SEED_DATA);
    return;
  }

  /* Real-time listener — updates live without page refresh */
  db.collection('managers').orderBy('city').onSnapshot(
    snapshot => {
      const managers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      startLanding(managers.length ? managers : SEED_DATA);
    },
    err => {
      console.warn('Firestore error, using seed data:', err);
      startLanding(SEED_DATA);
    }
  );
}

function startLanding(managers) {
  const sc = document.getElementById('statCount');  if (sc) sc.textContent = managers.length;
  const sx = document.getElementById('statCities'); if (sx) sx.textContent = managers.length;
  renderCards(managers, managers);
  setupSearch(managers);
  setupModal();
  hideLoader();
}

/* ─── Render Cards ─── */
function renderCards(list, allMgrs) {
  const grid  = document.getElementById('cardsGrid');
  const noRes = document.getElementById('noResults');
  if (!grid) return;
  grid.innerHTML = '';
  if (!list || !list.length) { if (noRes) noRes.classList.remove('hidden'); return; }
  if (noRes) noRes.classList.add('hidden');

  list.forEach((mgr, idx) => {
    const realIdx = allMgrs.findIndex(m=>m.id===mgr.id);
    const grad    = getGradient(realIdx >= 0 ? realIdx : idx);
    const inits   = getInitials(mgr.manager);
    const avail   = mgr.available !== false;

    const card = document.createElement('div');
    card.className = 'manager-card';
    card.setAttribute('role','listitem');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label', esc(mgr.city)+' – '+esc(mgr.manager));
    card.style.animationDelay = (idx*0.07)+'s';
    card.innerHTML = `
      <div class="card-arrow ${mgr.card?'':'grey'}" aria-hidden="true">→</div>
      <div class="card-avatar" aria-hidden="true">
        <div class="avatar-ring"></div>
        <div class="avatar-inner" style="background:${grad}">${esc(inits)}</div>
      </div>
      <div class="card-city"><span class="city-dot"></span>${esc(mgr.city)}</div>
      <p class="card-name">${esc(mgr.manager)}</p>
      <p class="card-role">City Sales Manager</p>
      <div class="status-badge ${avail?'':'unavail'}">
        <span class="status-dot"></span>${avail?'Available':'Coming Soon'}
      </div>`;
    const h = e => { if (e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); openModal(mgr, grad); };
    card.addEventListener('click', h);
    card.addEventListener('keydown', h);
    grid.appendChild(card);
  });
}

/* ─── Search ─── */
function setupSearch(allMgrs) {
  const input = document.getElementById('searchInput'), clear = document.getElementById('searchClear');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (clear) clear.classList.toggle('hidden', !q);
    renderCards(q ? allMgrs.filter(m=>m.city.toLowerCase().includes(q)||m.manager.toLowerCase().includes(q)) : allMgrs, allMgrs);
  });
  if (clear) clear.addEventListener('click', ()=>{ input.value=''; clear.classList.add('hidden'); renderCards(allMgrs,allMgrs); input.focus(); });
}

/* ─── Modal ─── */
function setupModal() {
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');
  const saveBtn  = document.getElementById('modalSaveBtn');
  const sheet    = document.getElementById('modalSheet');
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (saveBtn)  saveBtn.addEventListener('click', ()=>{ if (activeManager) saveVCard(activeManager, saveBtn); });
  if (sheet) {
    const inner = sheet.querySelector('.modal-inner');
    if (inner) {
      let y0 = 0;
      inner.addEventListener('touchstart', e=>{ y0=e.touches[0].clientY; }, {passive:true});
      inner.addEventListener('touchend',   e=>{ if (e.changedTouches[0].clientY-y0>80) closeModal(); }, {passive:true});
    }
  }
  document.addEventListener('keydown', e=>{ if (e.key==='Escape'&&activeManager) closeModal(); });
}

function openModal(mgr, grad) {
  activeManager = mgr;
  const av = document.getElementById('modalAvatar');
  if (av) { av.style.background=grad||getGradient(0); av.innerHTML=`<span>${esc(getInitials(mgr.manager))}</span>`; }
  const nameEl = document.getElementById('modalMgrName'); if (nameEl) nameEl.textContent = mgr.manager||'';
  const cityEl = document.getElementById('modalMgrCity'); if (cityEl) cityEl.textContent = (mgr.city||'')+' · MRK Foods';
  const cardBtn = document.getElementById('modalCardBtn'), cardLabel = document.getElementById('modalCardLabel');
  if (cardBtn) {
    if (mgr.card) { cardBtn.href=mgr.card; cardBtn.classList.remove('disabled'); if (cardLabel) cardLabel.textContent='View Digital Card'; }
    else { cardBtn.href='#'; cardBtn.classList.add('disabled'); if (cardLabel) cardLabel.textContent='Card Coming Soon'; }
  }
  const callBtn = document.getElementById('modalCallBtn');
  if (callBtn) { if (mgr.mobile) { callBtn.href='tel:'+mgr.mobile; callBtn.classList.remove('no-contact'); } else { callBtn.removeAttribute('href'); callBtn.classList.add('no-contact'); } }
  const waBtn = document.getElementById('modalWaBtn');
  if (waBtn) {
    if (mgr.whatsapp) { const m=encodeURIComponent('Hi '+mgr.manager+', I found you through MRK Foods.'); waBtn.href='https://wa.me/'+mgr.whatsapp+'?text='+m; waBtn.classList.remove('no-contact'); }
    else { waBtn.removeAttribute('href'); waBtn.classList.add('no-contact'); }
  }
  const s = document.getElementById('modalSheet'); if (s) s.classList.add('open');
  const b = document.getElementById('modalBackdrop'); if (b) b.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const s = document.getElementById('modalSheet'); if (s) s.classList.remove('open');
  const b = document.getElementById('modalBackdrop'); if (b) b.classList.remove('open');
  document.body.style.overflow = ''; activeManager = null;
}

function saveVCard(mgr, btn) {
  const lines = ['BEGIN:VCARD','VERSION:3.0','FN:'+(mgr.manager||''),'TITLE:City Sales Manager','ORG:MRK Foods Private Limited'];
  if (mgr.mobile)  lines.push('TEL;TYPE=CELL:'+mgr.mobile);
  if (mgr.email)   lines.push('EMAIL;TYPE=WORK:'+mgr.email);
  if (mgr.card)    lines.push('URL:'+mgr.card);
  lines.push('NOTE:City Manager – '+mgr.city+' | MRK Foods','END:VCARD');
  const blob = new Blob([lines.join('\r\n')], {type:'text/vcard;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=((mgr.manager||'contact').replace(/\s+/g,'_'))+'_MRKFoods.vcf';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  if (btn) { const orig=btn.innerHTML; btn.innerHTML='<span class="m-btn-icon">✅</span><span>Saved to Contacts!</span>'; setTimeout(()=>{ btn.innerHTML=orig; }, 2200); }
}

/* ══════════════════════════════════════════════
   ADMIN PANEL — Reads/writes Firestore directly
   Changes go LIVE instantly, no GitHub push needed
══════════════════════════════════════════════ */

/* ─── Tab switching ─── */
function switchTab(tab) {
  ['managers','add','qr'].forEach(t => {
    const tm = {managers:'tabManagers',add:'tabAdd',qr:'tabQR'};
    const pm = {managers:'panelManagers',add:'panelAdd',qr:'panelQR'};
    const btn = document.getElementById(tm[t]); if (btn) btn.classList.toggle('active', t===tab);
    const pnl = document.getElementById(pm[t]); if (pnl) pnl.classList.toggle('active', t===tab);
  });
}

/* ─── Load & render admin list (real-time) ─── */
function initAdminList() {
  if (!db) { showToast('⚠️ Firebase not connected.','error'); return; }

  db.collection('managers').orderBy('city').onSnapshot(snapshot => {
    const managers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const cntEl  = document.getElementById('adminCount');
    const tabCnt = document.getElementById('tabCount');
    if (cntEl)  cntEl.textContent  = managers.length;
    if (tabCnt) tabCnt.textContent = managers.length;

    renderAdminList(managers);
  }, err => {
    showToast('❌ Firestore error: '+err.message,'error');
  });
}

function renderAdminList(managers) {
  const listEl = document.getElementById('adminList');
  if (!listEl) return;

  /* Allow search filtering on cached list */
  const srch = document.getElementById('adminSearch');
  const q    = srch ? srch.value.trim().toLowerCase() : '';
  const filtered = q ? managers.filter(m=>(m.city||'').toLowerCase().includes(q)||(m.manager||'').toLowerCase().includes(q)) : managers;

  /* Store for search re-use */
  listEl.dataset.managers = JSON.stringify(managers);

  if (!filtered.length) {
    listEl.innerHTML = `<div class="list-empty"><p class="list-empty-icon">👤</p><p class="list-empty-txt">${q?'No results found.':'No managers yet. Add one!'}</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map((mgr, idx) => {
    const realIdx = managers.findIndex(m=>m.id===mgr.id);
    const grad    = getGradient(realIdx>=0?realIdx:idx);
    const inits   = getInitials(mgr.manager);
    const avail   = mgr.available !== false;
    const sid     = esc(mgr.id);
    return `
      <div class="mgr-row" id="row_${sid}">
        <div class="mgr-avatar">
          <div class="mgr-av-ring"></div>
          <div class="mgr-avatar-inner" style="background:${grad};position:absolute;inset:2px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:700;color:#e8c86d">${esc(inits)}</div>
        </div>
        <div class="mgr-info">
          <p class="mgr-name">${esc(mgr.manager)}</p>
          <p class="mgr-city-tag"><span style="width:4px;height:4px;border-radius:50%;background:#c9a84c;display:inline-block;margin-right:4px"></span>${esc(mgr.city)}</p>
          <p class="mgr-url">${esc(mgr.card||'No card URL')}</p>
        </div>
        <button class="avail-toggle ${avail?'':'off'}" onclick="toggleAvail('${sid}',${!avail})">${avail?'● Available':'○ Unavailable'}</button>
        <div class="mgr-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${sid}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="openConfirmDelete('${sid}','${esc(mgr.manager)}')" title="Delete">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

/* ─── Search (uses cached list) ─── */
function filterAdminList() {
  const listEl = document.getElementById('adminList');
  if (!listEl || !listEl.dataset.managers) return;
  try { renderAdminList(JSON.parse(listEl.dataset.managers)); } catch(_) {}
}

/* ─── Add Manager → Firestore ─── */
function addManager() {
  const city     = ((document.getElementById('addCity')     ||{}).value||'').trim();
  const name     = ((document.getElementById('addName')     ||{}).value||'').trim();
  const card     = ((document.getElementById('addCard')     ||{}).value||'').trim();
  const mobile   = ((document.getElementById('addMobile')   ||{}).value||'').trim();
  const whatsapp = ((document.getElementById('addWhatsapp') ||{}).value||'').trim();
  const email    = ((document.getElementById('addEmail')    ||{}).value||'').trim();
  const available = ((document.getElementById('addStatus')  ||{}).value||'true') === 'true';

  if (!city||!name||!card) {
    ['addCity','addName','addCard'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.value.trim()){el.classList.add('error');setTimeout(()=>el.classList.remove('error'),2000);}});
    showToast('⚠️ City, Name and Card URL are required.','error');
    return;
  }

  if (!db) { showToast('❌ Firebase not connected.','error'); return; }

  /* Disable button while saving */
  const btn = document.querySelector('#panelAdd .btn-maroon');
  if (btn) { btn.disabled=true; btn.textContent='Saving…'; }

  db.collection('managers').add({ city, manager:name, card, mobile, whatsapp, email, available, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => {
      clearAddForm();
      showToast('✅ '+name+' added! Page is now live.','success');
      switchTab('managers');
    })
    .catch(err => {
      showToast('❌ Error: '+err.message,'error');
    })
    .finally(() => {
      if (btn) { btn.disabled=false; btn.innerHTML='✅ Add Manager'; }
    });
}

function initAddPreview() {
  const nameEl = document.getElementById('addName'), cityEl = document.getElementById('addCity'), prev = document.getElementById('addPreview');
  if (!nameEl||!cityEl||!prev) return;
  const update = () => {
    const n = nameEl.value.trim(), c = cityEl.value.trim();
    if (n||c) {
      prev.style.display='block';
      const pa = document.getElementById('previewAvatar'); if (pa) pa.textContent=getInitials(n)||'?';
      const pn = document.getElementById('previewName');   if (pn) pn.textContent=n||'Manager Name';
      const pc = document.getElementById('previewCity');   if (pc) pc.textContent=c||'City';
    } else { prev.style.display='none'; }
  };
  nameEl.addEventListener('input', update); cityEl.addEventListener('input', update);
}

function clearAddForm() {
  ['addCity','addName','addCard','addMobile','addWhatsapp','addEmail'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
  const st = document.getElementById('addStatus'); if (st) st.value='true';
  const prev = document.getElementById('addPreview'); if (prev) prev.style.display='none';
}

/* ─── Toggle Availability ─── */
function toggleAvail(id, newVal) {
  if (!db) return;
  db.collection('managers').doc(id).update({ available: newVal })
    .then(() => showToast('Status updated!','success'))
    .catch(err => showToast('❌ '+err.message,'error'));
}

/* ─── Edit Modal → Firestore ─── */
let editingId = null;

function openEditModal(id) {
  if (!db) return;
  db.collection('managers').doc(id).get().then(doc => {
    if (!doc.exists) return;
    const mgr = { id: doc.id, ...doc.data() };
    editingId = id;
    const f = (eid,val)=>{ const el=document.getElementById(eid); if (el) el.value=val||''; };
    f('editCity',mgr.city); f('editName',mgr.manager); f('editCard',mgr.card);
    f('editMobile',mgr.mobile); f('editWhatsapp',mgr.whatsapp); f('editEmail',mgr.email);
    const st = document.getElementById('editStatus'); if (st) st.value=(mgr.available!==false)?'true':'false';
    document.getElementById('editBack').classList.add('open');
    document.getElementById('editModal').classList.add('open');
    document.body.style.overflow='hidden';
  });
}

function closeEditModal() {
  document.getElementById('editBack').classList.remove('open');
  document.getElementById('editModal').classList.remove('open');
  document.body.style.overflow=''; editingId=null;
}

function saveEdit() {
  const city     = ((document.getElementById('editCity')     ||{}).value||'').trim();
  const name     = ((document.getElementById('editName')     ||{}).value||'').trim();
  const card     = ((document.getElementById('editCard')     ||{}).value||'').trim();
  const mobile   = ((document.getElementById('editMobile')   ||{}).value||'').trim();
  const whatsapp = ((document.getElementById('editWhatsapp') ||{}).value||'').trim();
  const email    = ((document.getElementById('editEmail')    ||{}).value||'').trim();
  const available = ((document.getElementById('editStatus')  ||{}).value||'true') === 'true';
  if (!city||!name||!card) { showToast('⚠️ City, Name and Card URL are required.','error'); return; }
  if (!db||!editingId) return;

  const saveBtn = document.querySelector('#editModal .btn-maroon');
  if (saveBtn) { saveBtn.disabled=true; saveBtn.textContent='Saving…'; }

  db.collection('managers').doc(editingId).update({ city, manager:name, card, mobile, whatsapp, email, available, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => {
      closeEditModal();
      showToast('✅ '+name+' updated! Changes are live.','success');
    })
    .catch(err => showToast('❌ '+err.message,'error'))
    .finally(() => { if (saveBtn) { saveBtn.disabled=false; saveBtn.innerHTML='💾 Save Changes'; } });
}

/* ─── Delete ─── */
let deleteId = null;

function openConfirmDelete(id, name) {
  deleteId = id;
  const txt = document.getElementById('confirmTxt'); if (txt) txt.textContent='Delete "'+name+'"? This cannot be undone.';
  document.getElementById('confirmBack').classList.add('open');
  document.getElementById('confirmBox').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeConfirm() {
  document.getElementById('confirmBack').classList.remove('open');
  document.getElementById('confirmBox').classList.remove('open');
  document.body.style.overflow=''; deleteId=null;
}

/* ─── QR Code — links to landing page showing ALL managers ─── */
let qrGenerated = false;

function generateQR() {
  const urlEl = document.getElementById('qrUrl'), prev = document.getElementById('qrPreview'), acts = document.getElementById('qrActions');
  if (!urlEl||!prev) return;
  let url = urlEl.value.trim();
  if (!url) { showToast('⚠️ Enter your landing page URL first.','error'); return; }
  if (!url.startsWith('http')) url = 'https://'+url;
  prev.innerHTML=''; qrGenerated=false;
  const wrapper = document.createElement('div'); wrapper.id='qrTarget';
  wrapper.style.cssText='display:flex;align-items:center;justify-content:center;';
  prev.appendChild(wrapper);
  if (typeof QRCode==='undefined') { prev.innerHTML='<p style="color:#fca5a5;font-size:.84rem;text-align:center;padding:20px">QRCode.js not loaded. Check internet connection.</p>'; showToast('QR library not loaded.','error'); return; }
  try {
    new QRCode(wrapper, { text:url, width:184, height:184, colorDark:'#0b1623', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H });
    qrGenerated=true; if (acts) acts.style.display='flex';
    showToast('📱 QR generated! Scanning this opens ALL managers.','success');
  } catch(e) { prev.innerHTML='<p style="color:#fca5a5;font-size:.84rem;padding:20px">QR generation failed.</p>'; }
}

function downloadQR() {
  if (!qrGenerated) { showToast('⚠️ Generate a QR first.','error'); return; }
  const canvas = document.querySelector('#qrTarget canvas'), img = document.querySelector('#qrTarget img');
  const draw = src => {
    const pad=24, c=document.createElement('canvas'); c.width=208; c.height=208;
    const ctx=c.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,208,208);
    const i=new Image(); i.onload=()=>{ ctx.drawImage(i,pad,pad,184,184); const a=document.createElement('a'); a.download='MRKFoods_QR.png'; a.href=c.toDataURL('image/png'); a.click(); showToast('⬇️ QR downloaded!','success'); }; i.src=src;
  };
  if (canvas) draw(canvas.toDataURL('image/png'));
  else if (img) draw(img.src);
  else showToast('⚠️ Generate QR first.','error');
}

function copyQrUrl() {
  const urlEl = document.getElementById('qrUrl'); if (!urlEl||!urlEl.value) { showToast('⚠️ No URL.','error'); return; }
  navigator.clipboard.writeText(urlEl.value).then(()=>showToast('🔗 URL copied!','success')).catch(()=>showToast('Copy failed.','error'));
}

function printQR() {
  if (!qrGenerated) { showToast('⚠️ Generate a QR first.','error'); return; }
  const canvas = document.querySelector('#qrTarget canvas'), img = document.querySelector('#qrTarget img');
  const src = canvas?canvas.toDataURL('image/png'):(img?img.src:null);
  if (!src) { showToast('⚠️ No QR to print.','error'); return; }
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>MRK Foods QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;background:#fff;gap:18px;padding:30px}img{width:220px;height:220px;border:1px solid #eee;padding:12px;border-radius:8px}h2{font-size:1.3rem;text-align:center}p{font-size:.85rem;color:#666;text-align:center;max-width:320px}</style></head><body><h2>MRK Foods Private Limited</h2><img src="${src}"><p>Scan to connect with your city manager.</p><script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ─── Wire admin events ─── */
function wireAdminEvents() {
  const confirmYes = document.getElementById('confirmYes');
  if (confirmYes) confirmYes.addEventListener('click', () => {
    if (!deleteId||!db) return;
    db.collection('managers').doc(deleteId).delete()
      .then(() => { closeConfirm(); showToast('🗑️ Manager deleted.','error'); })
      .catch(err => showToast('❌ '+err.message,'error'));
  });
  const cb = document.getElementById('confirmBack'); if (cb) cb.addEventListener('click', closeConfirm);
  const eb = document.getElementById('editBack');    if (eb) eb.addEventListener('click', closeEditModal);
  const as = document.getElementById('adminSearch'); if (as) as.addEventListener('input', filterAdminList);
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const em = document.getElementById('editModal'); if (em&&em.classList.contains('open')) closeEditModal();
  const cb = document.getElementById('confirmBox'); if (cb&&cb.classList.contains('open')) closeConfirm();
  if (activeManager) closeModal();
});

/* ─── Router ─── */
function isAdminPage() {
  return window.location.pathname.toLowerCase().includes('admin') || (document.title||'').toLowerCase().includes('admin');
}

function initAdmin() {
  if (!initFirebase()) {
    showToast('❌ Firebase config missing. Please update FIREBASE_CONFIG in script.js','error', 8000);
    hideLoader();
    return;
  }
  initAdminList();
  wireAdminEvents();
  initAddPreview();

  /* Pre-fill QR URL with current domain */
  const qrUrlEl = document.getElementById('qrUrl');
  if (qrUrlEl) {
    const host = window.location.hostname;
    const isLocal = (host==='localhost'||host==='127.0.0.1'||!host);
    if (!isLocal) qrUrlEl.value = window.location.origin + '/index.html';
  }
  hideLoader();
}

function boot() { if (isAdminPage()) initAdmin(); else initLanding(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
