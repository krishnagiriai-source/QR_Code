/* ══════════════════════════════════════════════════════════════
   MRK Foods — Multi Branch Manager QR System
   script.js — v5  (Smart Fallback Edition)

   HOW IT WORKS:
   ① If Firebase is configured → uses Firestore (real-time sync)
   ② If Firebase NOT configured → fetches managers.json (works instantly)
   ③ Safety timeout → page NEVER gets stuck loading
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════
   FIREBASE CONFIG
   ▶ Leave as-is = uses managers.json (works right now)
   ▶ Replace with real values = uses Firebase real-time
══════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey &&
         FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
         FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
}

let db = null;
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    return true;
  } catch(e) { console.warn('Firebase init failed:', e.message); return false; }
}

/* ─── Fallback data (always shown if everything else fails) ─── */
const SEED_DATA = [
  { id:'mgr_1', city:'Mumbai',    manager:'Suraj Jadhav',      card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=BqXvcZ0B2Rn7RAYZIIqY', mobile:'+918833505114', whatsapp:'918833505114', email:'suraj@mrkfoods.in',       available:true },
  { id:'mgr_2', city:'Hyderabad', manager:'Arun Kumar Naliya', card:'https://vcard-mrkfoods-mrk.vercel.app/card.html?id=L7O26WxeA8pRMHFlhvGn', mobile:'+919876543210', whatsapp:'919876543210', email:'arun@mrkfoods.in',        available:true },
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

function generateId()   { return 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
function getGradient(i) { return GRADIENTS[i % GRADIENTS.length]; }
function getInitials(n) { if (!n||!n.trim()) return '?'; return n.trim().split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
function esc(s)         { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg, type, dur) {
  type=type||'default'; dur=dur||2600;
  const wrap=document.getElementById('toastWrap'); if(!wrap) return;
  const t=document.createElement('div');
  t.className='toast'+(type!=='default'?' '+type:'');
  t.textContent=msg; wrap.appendChild(t);
  setTimeout(()=>{t.style.cssText='opacity:0;transform:translateY(8px) scale(.95);transition:all .3s';setTimeout(()=>t.remove(),320);},dur);
}

/* ── Loader with SAFETY TIMEOUT — NEVER gets stuck ── */
let loaderHidden = false;
function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  const l = document.getElementById('pageLoader');
  if (l) {
    l.style.transition = 'opacity .4s ease, visibility .4s ease';
    l.style.opacity = '0';
    l.style.visibility = 'hidden';
    setTimeout(()=>l.classList.add('hidden'), 450);
  }
}
/* Safety: force hide after 4 seconds NO MATTER WHAT */
setTimeout(hideLoader, 4000);

/* ══════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════ */
let activeManager = null;

function initLanding() {
  if (isFirebaseConfigured() && initFirebase()) {
    db.collection('managers').orderBy('city').onSnapshot(
      snap => startLanding(snap.docs.length ? snap.docs.map(d=>({id:d.id,...d.data()})) : SEED_DATA),
      ()   => loadFromJSON()
    );
  } else {
    loadFromJSON();
  }
}

function loadFromJSON() {
  fetch('managers.json?v=' + Date.now())
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(d => startLanding(Array.isArray(d)&&d.length ? d : SEED_DATA))
    .catch(()=> startLanding(SEED_DATA));
}

function startLanding(managers) {
  const sc=document.getElementById('statCount');  if(sc) sc.textContent=managers.length;
  const sx=document.getElementById('statCities'); if(sx) sx.textContent=managers.length;
  renderCards(managers, managers);
  setupSearch(managers);
  setupModal();
  hideLoader();
}

function renderCards(list, allMgrs) {
  const grid=document.getElementById('cardsGrid'), noRes=document.getElementById('noResults');
  if (!grid) return;
  grid.innerHTML='';
  if (!list||!list.length) { if(noRes) noRes.classList.remove('hidden'); return; }
  if (noRes) noRes.classList.add('hidden');
  list.forEach((mgr,idx)=>{
    const ri=allMgrs.findIndex(m=>m.id===mgr.id);
    const grad=getGradient(ri>=0?ri:idx);
    const avail=mgr.available!==false;
    const card=document.createElement('div');
    card.className='manager-card';
    card.setAttribute('role','listitem');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',esc(mgr.city)+' – '+esc(mgr.manager));
    card.style.animationDelay=(idx*0.07)+'s';
    card.innerHTML=`
      <div class="card-arrow ${mgr.card?'':'grey'}" aria-hidden="true">→</div>
      <div class="card-avatar" aria-hidden="true">
        <div class="avatar-ring"></div>
        <div class="avatar-inner" style="background:${grad}">${esc(getInitials(mgr.manager))}</div>
      </div>
      <div class="card-city"><span class="city-dot"></span>${esc(mgr.city)}</div>
      <p class="card-name">${esc(mgr.manager)}</p>
      <p class="card-role">City Sales Manager</p>
      <div class="status-badge ${avail?'':'unavail'}">
        <span class="status-dot"></span>${avail?'Available':'Coming Soon'}
      </div>`;
    const h=e=>{if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();openModal(mgr,grad);};
    card.addEventListener('click',h); card.addEventListener('keydown',h);
    grid.appendChild(card);
  });
}

function setupSearch(allMgrs) {
  const input=document.getElementById('searchInput'), clear=document.getElementById('searchClear');
  if (!input) return;
  input.addEventListener('input',()=>{
    const q=input.value.trim().toLowerCase();
    if(clear) clear.classList.toggle('hidden',!q);
    renderCards(q?allMgrs.filter(m=>m.city.toLowerCase().includes(q)||m.manager.toLowerCase().includes(q)):allMgrs,allMgrs);
  });
  if(clear) clear.addEventListener('click',()=>{input.value='';clear.classList.add('hidden');renderCards(allMgrs,allMgrs);input.focus();});
}

function setupModal() {
  const bd=document.getElementById('modalBackdrop'), cl=document.getElementById('modalClose'), sv=document.getElementById('modalSaveBtn'), sh=document.getElementById('modalSheet');
  if(bd) bd.addEventListener('click',closeModal);
  if(cl) cl.addEventListener('click',closeModal);
  if(sv) sv.addEventListener('click',()=>{if(activeManager)saveVCard(activeManager,sv);});
  if(sh){const inn=sh.querySelector('.modal-inner');if(inn){let y0=0;inn.addEventListener('touchstart',e=>{y0=e.touches[0].clientY;},{passive:true});inn.addEventListener('touchend',e=>{if(e.changedTouches[0].clientY-y0>80)closeModal();},{passive:true});}}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeManager)closeModal();});
}

function openModal(mgr,grad) {
  activeManager=mgr;
  const av=document.getElementById('modalAvatar');
  if(av){av.style.background=grad||getGradient(0);av.innerHTML=`<span>${esc(getInitials(mgr.manager))}</span>`;}
  const ne=document.getElementById('modalMgrName'); if(ne) ne.textContent=mgr.manager||'';
  const ce=document.getElementById('modalMgrCity'); if(ce) ce.textContent=(mgr.city||'')+' · MRK Foods';
  const cb=document.getElementById('modalCardBtn'), cl=document.getElementById('modalCardLabel');
  if(cb){if(mgr.card){cb.href=mgr.card;cb.classList.remove('disabled');if(cl)cl.textContent='View Digital Card';}else{cb.href='#';cb.classList.add('disabled');if(cl)cl.textContent='Card Coming Soon';}}
  const pb=document.getElementById('modalCallBtn');
  if(pb){if(mgr.mobile){pb.href='tel:'+mgr.mobile;pb.classList.remove('no-contact');}else{pb.removeAttribute('href');pb.classList.add('no-contact');}}
  const wb=document.getElementById('modalWaBtn');
  if(wb){if(mgr.whatsapp){const m=encodeURIComponent('Hi '+mgr.manager+', I found you through MRK Foods.');wb.href='https://wa.me/'+mgr.whatsapp+'?text='+m;wb.classList.remove('no-contact');}else{wb.removeAttribute('href');wb.classList.add('no-contact');}}
  const s=document.getElementById('modalSheet'); if(s) s.classList.add('open');
  const b=document.getElementById('modalBackdrop'); if(b) b.classList.add('open');
  document.body.style.overflow='hidden';
}

function closeModal() {
  const s=document.getElementById('modalSheet'); if(s) s.classList.remove('open');
  const b=document.getElementById('modalBackdrop'); if(b) b.classList.remove('open');
  document.body.style.overflow=''; activeManager=null;
}

function saveVCard(mgr,btn) {
  const lines=['BEGIN:VCARD','VERSION:3.0','FN:'+(mgr.manager||''),'TITLE:City Sales Manager','ORG:MRK Foods Private Limited'];
  if(mgr.mobile)  lines.push('TEL;TYPE=CELL:'+mgr.mobile);
  if(mgr.email)   lines.push('EMAIL;TYPE=WORK:'+mgr.email);
  if(mgr.card)    lines.push('URL:'+mgr.card);
  lines.push('NOTE:City Manager – '+mgr.city+' | MRK Foods','END:VCARD');
  const blob=new Blob([lines.join('\r\n')],{type:'text/vcard;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=((mgr.manager||'contact').replace(/\s+/g,'_'))+'_MRKFoods.vcf';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  if(btn){const o=btn.innerHTML;btn.innerHTML='<span class="m-btn-icon">✅</span><span>Saved!</span>';setTimeout(()=>{btn.innerHTML=o;},2200);}
}

/* ══════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════ */
const STORAGE_KEY='mrk_managers_v2';
function saveLocal(list){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(list));}catch(_){}}
function loadLocal(){try{const r=localStorage.getItem(STORAGE_KEY);if(r){const p=JSON.parse(r);if(Array.isArray(p)&&p.length)return p;}}catch(_){}saveLocal(SEED_DATA);return[...SEED_DATA];}

function saveManager(data,id,cb) {
  if(isFirebaseConfigured()&&db){
    const ref=id?db.collection('managers').doc(id):db.collection('managers').doc();
    const ts=firebase.firestore.FieldValue.serverTimestamp();
    const op=id?ref.update({...data,updatedAt:ts}):ref.set({...data,createdAt:ts});
    op.then(()=>cb(null)).catch(e=>cb(e));
  } else {
    const list=loadLocal();
    if(id){const i=list.findIndex(m=>m.id===id);if(i>=0)list[i]={...list[i],...data};}
    else list.push({id:generateId(),...data});
    saveLocal(list);cb(null);
  }
}

function deleteManager(id,cb) {
  if(isFirebaseConfigured()&&db){db.collection('managers').doc(id).delete().then(()=>cb(null)).catch(e=>cb(e));}
  else{saveLocal(loadLocal().filter(m=>m.id!==id));cb(null);}
}

function switchTab(tab) {
  ['managers','add','qr'].forEach(t=>{
    const tm={managers:'tabManagers',add:'tabAdd',qr:'tabQR'};
    const pm={managers:'panelManagers',add:'panelAdd',qr:'panelQR'};
    const btn=document.getElementById(tm[t]);if(btn)btn.classList.toggle('active',t===tab);
    const pnl=document.getElementById(pm[t]);if(pnl)pnl.classList.toggle('active',t===tab);
  });
}

let cachedAdminManagers=[];

function initAdminList() {
  if(isFirebaseConfigured()&&db){
    db.collection('managers').orderBy('city').onSnapshot(
      snap=>{cachedAdminManagers=snap.docs.map(d=>({id:d.id,...d.data()}));refreshAdminUI();},
      ()  =>{cachedAdminManagers=loadLocal();refreshAdminUI();}
    );
  } else {
    cachedAdminManagers=loadLocal(); refreshAdminUI();
  }
}

function refreshAdminUI() {
  const ce=document.getElementById('adminCount'); if(ce) ce.textContent=cachedAdminManagers.length;
  const tc=document.getElementById('tabCount');   if(tc) tc.textContent=cachedAdminManagers.length;
  renderAdminList();
}

function renderAdminList() {
  const listEl=document.getElementById('adminList'); if(!listEl) return;
  const srch=document.getElementById('adminSearch');
  const q=srch?srch.value.trim().toLowerCase():'';
  const filtered=q?cachedAdminManagers.filter(m=>(m.city||'').toLowerCase().includes(q)||(m.manager||'').toLowerCase().includes(q)):cachedAdminManagers;
  if(!filtered.length){listEl.innerHTML=`<div class="list-empty"><p class="list-empty-icon">👤</p><p class="list-empty-txt">${q?'No results found.':'No managers yet. Add one!'}</p></div>`;return;}
  listEl.innerHTML=filtered.map((mgr,idx)=>{
    const ri=cachedAdminManagers.findIndex(m=>m.id===mgr.id);
    const grad=getGradient(ri>=0?ri:idx);
    const avail=mgr.available!==false;
    const sid=esc(mgr.id);
    return `<div class="mgr-row" id="row_${sid}">
      <div class="mgr-avatar">
        <div class="mgr-av-ring"></div>
        <div class="mgr-avatar-inner" style="background:${grad};position:absolute;inset:2px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:700;color:#e8c86d">${esc(getInitials(mgr.manager))}</div>
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

function addManager() {
  const city    =((document.getElementById('addCity')    ||{}).value||'').trim();
  const name    =((document.getElementById('addName')    ||{}).value||'').trim();
  const card    =((document.getElementById('addCard')    ||{}).value||'').trim();
  const mobile  =((document.getElementById('addMobile')  ||{}).value||'').trim();
  const whatsapp=((document.getElementById('addWhatsapp')||{}).value||'').trim();
  const email   =((document.getElementById('addEmail')   ||{}).value||'').trim();
  const available=((document.getElementById('addStatus') ||{}).value||'true')==='true';
  if(!city||!name||!card){['addCity','addName','addCard'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.value.trim()){el.classList.add('error');setTimeout(()=>el.classList.remove('error'),2000);}});showToast('⚠️ City, Name and Card URL are required.','error');return;}
  const btn=document.querySelector('#panelAdd .btn-maroon');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  saveManager({city,manager:name,card,mobile,whatsapp,email,available},null,err=>{
    if(btn){btn.disabled=false;btn.innerHTML='✅ Add Manager';}
    if(err){showToast('❌ Error: '+err.message,'error');return;}
    if(!isFirebaseConfigured()){cachedAdminManagers=loadLocal();refreshAdminUI();showToast('✅ '+name+' added! Click Export JSON → upload to GitHub.','success',5000);}
    else showToast('✅ '+name+' added! Live now.','success');
    clearAddForm();switchTab('managers');
  });
}

function initAddPreview() {
  const ne=document.getElementById('addName'),ce=document.getElementById('addCity'),prev=document.getElementById('addPreview');
  if(!ne||!ce||!prev) return;
  const u=()=>{const n=ne.value.trim(),c=ce.value.trim();if(n||c){prev.style.display='block';const pa=document.getElementById('previewAvatar');if(pa)pa.textContent=getInitials(n)||'?';const pn=document.getElementById('previewName');if(pn)pn.textContent=n||'Manager Name';const pc=document.getElementById('previewCity');if(pc)pc.textContent=c||'City';}else prev.style.display='none';};
  ne.addEventListener('input',u);ce.addEventListener('input',u);
}

function clearAddForm() {
  ['addCity','addName','addCard','addMobile','addWhatsapp','addEmail'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const st=document.getElementById('addStatus');if(st)st.value='true';
  const prev=document.getElementById('addPreview');if(prev)prev.style.display='none';
}

function toggleAvail(id,newVal) {
  saveManager({available:newVal},id,err=>{
    if(err){showToast('❌ '+err.message,'error');return;}
    if(!isFirebaseConfigured()){cachedAdminManagers=loadLocal();refreshAdminUI();}
    showToast('Status updated!','success');
  });
}

let editingId=null;
function openEditModal(id) {
  const mgr=cachedAdminManagers.find(m=>m.id===id);if(!mgr)return;
  editingId=id;
  const f=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
  f('editCity',mgr.city);f('editName',mgr.manager);f('editCard',mgr.card);
  f('editMobile',mgr.mobile);f('editWhatsapp',mgr.whatsapp);f('editEmail',mgr.email);
  const st=document.getElementById('editStatus');if(st)st.value=(mgr.available!==false)?'true':'false';
  document.getElementById('editBack').classList.add('open');
  document.getElementById('editModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeEditModal() {
  document.getElementById('editBack').classList.remove('open');
  document.getElementById('editModal').classList.remove('open');
  document.body.style.overflow='';editingId=null;
}
function saveEdit() {
  const city    =((document.getElementById('editCity')    ||{}).value||'').trim();
  const name    =((document.getElementById('editName')    ||{}).value||'').trim();
  const card    =((document.getElementById('editCard')    ||{}).value||'').trim();
  const mobile  =((document.getElementById('editMobile')  ||{}).value||'').trim();
  const whatsapp=((document.getElementById('editWhatsapp')||{}).value||'').trim();
  const email   =((document.getElementById('editEmail')   ||{}).value||'').trim();
  const available=((document.getElementById('editStatus') ||{}).value||'true')==='true';
  if(!city||!name||!card){showToast('⚠️ City, Name and Card URL are required.','error');return;}
  const sb=document.querySelector('#editModal .btn-maroon');
  if(sb){sb.disabled=true;sb.textContent='Saving…';}
  saveManager({city,manager:name,card,mobile,whatsapp,email,available},editingId,err=>{
    if(sb){sb.disabled=false;sb.innerHTML='💾 Save Changes';}
    if(err){showToast('❌ '+err.message,'error');return;}
    if(!isFirebaseConfigured()){cachedAdminManagers=loadLocal();refreshAdminUI();}
    closeEditModal();showToast('✅ '+name+' updated!','success');
  });
}

let deleteId=null;
function openConfirmDelete(id,name) {
  deleteId=id;
  const txt=document.getElementById('confirmTxt');if(txt)txt.textContent='Delete "'+name+'"? This cannot be undone.';
  document.getElementById('confirmBack').classList.add('open');
  document.getElementById('confirmBox').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeConfirm() {
  document.getElementById('confirmBack').classList.remove('open');
  document.getElementById('confirmBox').classList.remove('open');
  document.body.style.overflow='';deleteId=null;
}

function exportJSON() {
  const managers=isFirebaseConfigured()?cachedAdminManagers:loadLocal();
  const blob=new Blob([JSON.stringify(managers,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='managers.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('📥 managers.json downloaded! Upload to GitHub.','success',4000);
}

let qrGenerated=false;
function generateQR() {
  const urlEl=document.getElementById('qrUrl'),prev=document.getElementById('qrPreview'),acts=document.getElementById('qrActions');
  if(!urlEl||!prev)return;
  let url=urlEl.value.trim();
  if(!url){showToast('⚠️ Enter your landing page URL first.','error');return;}
  if(!url.startsWith('http'))url='https://'+url;
  prev.innerHTML='';qrGenerated=false;
  const wrapper=document.createElement('div');wrapper.id='qrTarget';
  wrapper.style.cssText='display:flex;align-items:center;justify-content:center;';
  prev.appendChild(wrapper);
  if(typeof QRCode==='undefined'){prev.innerHTML='<p style="color:#fca5a5;font-size:.84rem;text-align:center;padding:20px">QRCode.js not loaded.</p>';return;}
  try{
    new QRCode(wrapper,{text:url,width:184,height:184,colorDark:'#0b1623',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    qrGenerated=true;if(acts)acts.style.display='flex';
    showToast('📱 QR generated! Scans open ALL managers live.','success');
  }catch(e){prev.innerHTML='<p style="color:#fca5a5;padding:20px">QR generation failed.</p>';}
}
function downloadQR() {
  if(!qrGenerated){showToast('⚠️ Generate a QR first.','error');return;}
  const canvas=document.querySelector('#qrTarget canvas'),img=document.querySelector('#qrTarget img');
  const draw=src=>{const c=document.createElement('canvas');c.width=208;c.height=208;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,208,208);const i=new Image();i.onload=()=>{ctx.drawImage(i,24,24,184,184);const a=document.createElement('a');a.download='MRKFoods_QR.png';a.href=c.toDataURL('image/png');a.click();showToast('⬇️ Downloaded!','success');};i.src=src;};
  if(canvas)draw(canvas.toDataURL('image/png'));else if(img)draw(img.src);else showToast('⚠️ Generate QR first.','error');
}
function copyQrUrl(){const urlEl=document.getElementById('qrUrl');if(!urlEl||!urlEl.value){showToast('⚠️ No URL.','error');return;}navigator.clipboard.writeText(urlEl.value).then(()=>showToast('🔗 URL copied!','success')).catch(()=>showToast('Copy failed.','error'));}
function printQR() {
  if(!qrGenerated){showToast('⚠️ Generate a QR first.','error');return;}
  const canvas=document.querySelector('#qrTarget canvas'),img=document.querySelector('#qrTarget img');
  const src=canvas?canvas.toDataURL('image/png'):(img?img.src:null);
  if(!src){showToast('⚠️ No QR to print.','error');return;}
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>MRK Foods QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;background:#fff;gap:18px;padding:30px}img{width:220px;height:220px;border:1px solid #eee;padding:12px;border-radius:8px}h2{font-size:1.3rem;text-align:center}p{font-size:.85rem;color:#666;text-align:center;max-width:320px}</style></head><body><h2>MRK Foods Private Limited</h2><img src="${src}"><p>Scan to connect with your city manager.</p><script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

function wireAdminEvents() {
  const cy=document.getElementById('confirmYes');
  if(cy)cy.addEventListener('click',()=>{
    if(!deleteId)return;
    deleteManager(deleteId,err=>{
      if(err){showToast('❌ '+err.message,'error');return;}
      if(!isFirebaseConfigured()){cachedAdminManagers=loadLocal();refreshAdminUI();}
      closeConfirm();showToast('🗑️ Manager deleted.','error');
    });
  });
  const cb=document.getElementById('confirmBack');if(cb)cb.addEventListener('click',closeConfirm);
  const eb=document.getElementById('editBack');   if(eb)eb.addEventListener('click',closeEditModal);
  const as=document.getElementById('adminSearch');if(as)as.addEventListener('input',renderAdminList);
}

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const em=document.getElementById('editModal');if(em&&em.classList.contains('open'))closeEditModal();
  const cb=document.getElementById('confirmBox');if(cb&&cb.classList.contains('open'))closeConfirm();
  if(activeManager)closeModal();
});

function isAdminPage(){return window.location.pathname.toLowerCase().includes('admin')||(document.title||'').toLowerCase().includes('admin');}

function initAdmin() {
  if(isFirebaseConfigured())initFirebase();
  initAdminList();
  wireAdminEvents();
  initAddPreview();
  const qrUrlEl=document.getElementById('qrUrl');
  if(qrUrlEl){const host=window.location.hostname;if(host&&host!=='localhost'&&host!=='127.0.0.1')qrUrlEl.value=window.location.origin+'/index.html';}
  hideLoader();
}

function boot(){if(isAdminPage())initAdmin();else initLanding();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
