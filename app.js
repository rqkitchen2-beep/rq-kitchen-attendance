/* RQ Kitchen — Attendance app (Supabase) */
(function () {
'use strict';

/* ======================= basics ======================= */
const TZ = 'Asia/Dubai', OFF = '+04:00';
const DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const tFmt = new Intl.DateTimeFormat('ar-AE-u-nu-latn', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const dFmt = new Intl.DateTimeFormat('ar-AE-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const nFmt = new Intl.DateTimeFormat('ar-AE-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
const kFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayKey = d => kFmt.format(d);                                    // YYYY-MM-DD in Dubai
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = k => new Date(k + 'T12:00:00Z').getUTCDay();
const at = (k, hm) => new Date(k + 'T' + hm + ':00' + OFF).getTime();   // Dubai wall-clock → ms
const fmtT = ms => ms ? tFmt.format(new Date(ms)) : '—';
const fmtHM = x => tFmt.format(new Date(at('2000-01-01', x.start))) + ' – ' + tFmt.format(new Date(at('2000-01-01', x.end)));
const h2 = x => (Math.round(x * 100) / 100).toFixed(2);
const money = x => (Math.round(x * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hm5 = t => (t || '').slice(0, 5);
const msg = (el, type, text) => { if (el) el.innerHTML = text ? `<div class="msg ${type}">${esc(text)}</div>` : ''; };
const show = (id, on) => $(id).classList.toggle('hidden', !on);

if (!window.RQ_CONFIG || !window.RQ_CONFIG.SUPABASE_URL || RQ_CONFIG.SUPABASE_URL.includes('YOUR-')) {
  document.body.insertAdjacentHTML('afterbegin', '<div class="msg err" style="margin:12px">ضع رابط ومفتاح Supabase في ملف config.js</div>');
  return;
}
const sb = window.supabase.createClient(RQ_CONFIG.SUPABASE_URL, RQ_CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const TOKEN_KEY = 'rq_att_token';
let token = null; try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
const saveToken = t => { token = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
async function call(fn, args = {}) {
  const { data, error } = await sb.rpc(fn, Object.assign({ p_token: token }, args));
  if (error) {
    if (/att_auth/.test(error.message || '')) { localSignOut(); }
    const err = new Error(error.message || 'rpc'); err.code = /att_auth/.test(error.message || '') ? 'auth' : /att_forbidden/.test(error.message || '') ? 'forbidden' : 'net'; throw err;
  }
  setNet('on');
  return data;
}

/* ======================= state ======================= */
let me = null;              // me = own att_employees row (mapped)
let cfg = { branches: [], employees: [], grace: 10, openLead: 30, payMode: 'deduct', workDays: 26, bonusAt: 30, bonusDays: 4, requireApproval: true };
let att = {}, sched = {}, pay = {}, notes = [];
let loadedFrom = null, curTab = 'punch', picked = null, busy = false;
const isMgr = () => me && me.role === 'manager' && me.status === 'active';
const isEmp = () => me && me.role === 'employee' && me.status === 'active';
const staff = () => cfg.employees.filter(e => e.role === 'employee' && e.status === 'active');
const empById = id => cfg.employees.find(e => e.id === id);
const branchById = id => cfg.branches.find(b => b.id === id);
const empBranches = e => e.branchIds || [];
const inBranch = (e, bid) => empBranches(e).includes(bid);
const branchShift = b => ({ start: b?.start || '14:00', end: b?.end || '00:30' });

/* ======================= clock ======================= */
function tick() {
  const n = new Date(), parts = tFmt.formatToParts(n);
  const hm = parts.filter(x => x.type !== 'dayPeriod').map(x => x.value).join('').trim();
  const dp = (parts.find(x => x.type === 'dayPeriod') || {}).value || '';
  $('#clockTime').innerHTML = esc(hm) + (dp ? `<span class="dp">${esc(dp)}</span>` : '');
  $('#clockDate').textContent = dFmt.format(n);
}
tick();
setInterval(() => { tick(); if (isEmp() && !busy) renderPunch(); }, 15000);

/* ======================= mapping ======================= */
const mapBranch = r => ({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, radius: r.radius_m, start: hm5(r.start_time), end: hm5(r.end_time), sort: r.sort });
const mapEmp = r => ({ id: r.id, name: r.name, email: r.email, role: r.role, status: r.status, branchIds: r.branch_ids || [], off: r.weekly_off, createdAt: r.created_at });
const mapRec = r => ({ id: r.id, empId: r.employee_id, branchId: r.branch_id, day: r.day,
  inAt: Date.parse(r.in_at), outAt: r.out_at ? Date.parse(r.out_at) : null,
  ss: r.shift_start ? Date.parse(r.shift_start) : null, se: r.shift_end ? Date.parse(r.shift_end) : null,
  inDist: r.in_dist, outDist: r.out_dist });
function putSched(r) {
  (sched[r.day] = sched[r.day] || { o: {} }).o[r.employee_id] = r.is_off ? { off: true } : { start: hm5(r.start_time), end: hm5(r.end_time) };
}
function monthStart(k, back) { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - back, 1)); return d.toISOString().slice(0, 10); }

/* ======================= loading ======================= */
function applyData(d, merge) {
  me = mapEmp(d.me);
  const st = d.settings || {};
  Object.assign(cfg, { grace: st.grace_min, openLead: st.open_lead_min, payMode: st.pay_mode, workDays: st.work_days,
    bonusAt: st.bonus_at, bonusDays: st.bonus_days, requireApproval: st.require_approval });
  cfg.branches = (d.branches || []).map(mapBranch);
  cfg.employees = isMgr() ? (d.employees || []).map(mapEmp) : [me];
  pay = {}; (d.salaries || []).forEach(r => pay[r.employee_id] = Number(r.monthly));
  if (!merge) { att = {}; sched = {}; }
  (d.records || []).forEach(x => { const m = mapRec(x); att[m.empId + '_' + m.day] = m; });
  (d.schedule || []).forEach(putSched);
  notes = d.notifications || [];
}
async function loadAll() {
  if (!loadedFrom) loadedFrom = monthStart(dayKey(new Date()), 1);
  applyData(await call('att_data', { p_from: loadedFrom }));
}
async function reloadRecent() { await loadAll(); }
async function ensureFrom(from) {
  if (!loadedFrom || from >= loadedFrom) return;
  const d = await call('att_data', { p_from: from, p_to: loadedFrom });
  (d.records || []).forEach(x => { const m = mapRec(x); att[m.empId + '_' + m.day] = m; });
  (d.schedule || []).forEach(putSched);
  loadedFrom = from;
}

/* ======================= live refresh ======================= */
function setNet(s) {
  const el = $('#netState'); el.className = 'net ' + (s === 'on' ? 'on' : s === 'off' ? 'off' : '');
  el.textContent = s === 'on' ? 'متصل' : s === 'off' ? 'غير متصل' : 'جاري الاتصال…';
}
window.addEventListener('online', () => { setNet('wait'); refresh(); });
window.addEventListener('offline', () => setNet('off'));
let refreshing = false;
async function refresh() {
  if (!token || refreshing || busy || draft) return;
  refreshing = true;
  const was = me && me.status;
  try { await loadAll(); if ((me && me.status) !== was) return afterAuth(); renderAll(); }
  catch (e) { if (e.code === 'net') setNet('off'); }
  finally { refreshing = false; }
}
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });

/* ======================= account ======================= */
const AUTH_BOXES = ['#bootBox', '#loginBox', '#regBox', '#forgotBox', '#pendingBox', '#mgrHome', '#ticket'];
function onlyBox(id) { AUTH_BOXES.forEach(b => show(b, b === id)); }
$('#toReg').onclick = () => onlyBox('#regBox');
$('#toForgot').onclick = () => onlyBox('#forgotBox');
$$('[data-back]').forEach(b => b.onclick = () => onlyBox('#loginBox'));
const pinOk = p => /^\d{4,6}$/.test(p);
const ACC_ERR = { invalid: 'البريد أو الرقم السري غير صحيح.', disabled: 'تم إيقاف هذا الحساب. راجع المدير.', exists: 'هذا البريد مسجل من قبل. ادخل من شاشة الدخول.',
  name: 'اكتب اسمك الكامل.', email: 'اكتب بريداً إلكترونياً صحيحاً.', pin: 'الرقم السري يجب أن يكون من 4 إلى 6 أرقام.', old: 'الرقم السري الحالي غير صحيح.' };
$('#lgBtn').onclick = async () => {
  const email = $('#lgEmail').value.trim().toLowerCase(), pin = $('#lgPin').value.trim(), out = $('#lgMsg');
  if (!email || !pin) return msg(out, 'err', 'اكتب البريد والرقم السري.');
  $('#lgBtn').disabled = true; msg(out, 'info', 'جاري الدخول…');
  try {
    const r = await call('att_login', { p_email: email, p_pin: pin });
    if (!r.ok) { const t = r.error === 'locked' ? `محاولات كثيرة. حاول بعد الساعة ${fmtT(Date.parse(r.until))}.` : (ACC_ERR[r.error] || 'تعذّر الدخول.'); msg(out, 'err', t); }
    else { saveToken(r.token); $('#lgPin').value = ''; msg(out, '', ''); await afterAuth(); }
  } catch (e) { msg(out, 'err', 'تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.'); }
  $('#lgBtn').disabled = false;
};
$('#lgPin').onkeydown = e => { if (e.key === 'Enter') $('#lgBtn').click(); };
$('#rgBtn').onclick = async () => {
  const out = $('#rgMsg'), name = $('#rgName').value.trim().replace(/\s+/g, ' '), email = $('#rgEmail').value.trim().toLowerCase(), pin = $('#rgPin').value.trim();
  if (name.length < 3) return msg(out, 'err', ACC_ERR.name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg(out, 'err', ACC_ERR.email);
  if (!pinOk(pin)) return msg(out, 'err', ACC_ERR.pin);
  if (pin !== $('#rgPin2').value.trim()) return msg(out, 'err', 'الرقمان السريان غير متطابقين.');
  $('#rgBtn').disabled = true; msg(out, 'info', 'جاري إنشاء حسابك…');
  try {
    const r = await call('att_register', { p_name: name, p_email: email, p_pin: pin });
    if (!r.ok) msg(out, 'err', ACC_ERR[r.error] || 'تعذّر إنشاء الحساب.');
    else { ['#rgName', '#rgEmail', '#rgPin', '#rgPin2'].forEach(x => $(x).value = ''); msg(out, '', ''); saveToken(r.token); await afterAuth(); }
  } catch (e) { msg(out, 'err', 'تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.'); }
  $('#rgBtn').disabled = false;
};
$('#cpBtn').onclick = async () => {
  const out = $('#cpMsg'), old = $('#cpOld').value.trim(), p = $('#cpPin').value.trim();
  if (!pinOk(p)) return msg(out, 'err', ACC_ERR.pin);
  if (p !== $('#cpPin2').value.trim()) return msg(out, 'err', 'الرقمان غير متطابقين.');
  try { const r = await call('att_change_pin', { p_old: old, p_new: p });
    if (!r.ok) return msg(out, 'err', ACC_ERR[r.error] || 'لم يتم الحفظ.');
    ['#cpOld', '#cpPin', '#cpPin2'].forEach(x => $(x).value = ''); msg(out, 'ok', 'تم حفظ الرقم السري الجديد.');
  } catch (e) { msg(out, 'err', 'لم يتم الحفظ. حاول مرة أخرى.'); }
};
function localSignOut() { saveToken(null); me = null; att = {}; sched = {}; pay = {}; notes = []; picked = null; loadedFrom = null; draft = null; showTab('punch'); applyRole(); onlyBox('#loginBox'); }
const signOut = async () => { try { await sb.rpc('att_logout', { p_token: token }); } catch (e) {} localSignOut(); };
$('#signOutTop').onclick = signOut; $('#mineOut').onclick = signOut; $('#pdOut').onclick = signOut;
$('#pdRefresh').onclick = () => afterAuth();

let authing = false;
async function afterAuth() {
  if (!token || authing) return;
  authing = true;
  try {
    onlyBox('#bootBox');
    try { await loadAll(); }
    catch (e) { if (e.code !== 'auth') { onlyBox('#loginBox'); msg($('#lgMsg'), 'err', 'تعذّر تحميل البيانات. تحقق من الإنترنت وحاول مرة أخرى.'); } return; }
    if (me.status !== 'active') {
      onlyBox('#pendingBox');
      $('#pdTitle').textContent = 'حسابك بانتظار الاعتماد';
      $('#pdText').textContent = `أهلاً ${me.name}. أرسلنا بياناتك للمدير، وبمجرد اعتماد حسابك يفتح لك تسجيل الحضور هنا تلقائياً.`;
      applyRole(); return;
    }
    showTab(isMgr() ? 'today' : 'punch');
    renderAll();
  } finally { authing = false; }
}

/* ======================= tabs & roles ======================= */
const ALL_TABS = ['punch', 'mine', 'today', 'sched', 'reports', 'settings'];
function allowedTabs() { return isMgr() ? ['punch', 'today', 'sched', 'reports', 'settings'] : isEmp() ? ['punch', 'mine'] : ['punch']; }
function showTab(t) {
  if (!allowedTabs().includes(t)) t = 'punch';
  curTab = t;
  $$('nav.tabs button').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === t));
  ALL_TABS.forEach(x => show('#tab-' + x, x === t));
  document.body.classList.toggle('compact', t !== 'punch');
}
function applyRole() {
  const al = allowedTabs();
  $$('nav.tabs button').forEach(x => x.classList.toggle('hidden', !al.includes(x.dataset.tab)));
  show('nav.tabs', al.length > 1);
  show('#signOutTop', isMgr());
  if (!al.includes(curTab)) showTab('punch');
}
$$('nav.tabs button').forEach(b => b.onclick = () => { showTab(b.dataset.tab); window.scrollTo(0, 0); renderAll(); if (b.dataset.tab === 'mine') setTimeout(markRead, 1500); });
$('#bellBtn').onclick = () => { showTab('mine'); window.scrollTo(0, 0); renderAll(); setTimeout(markRead, 1500); };

/* ======================= shifts ======================= */
const overrideOf = (e, day) => sched[day]?.o?.[e.id] || null;
function isOff(e, day) { const o = overrideOf(e, day); if (o) return !!o.off; return Number(e.off) === dow(day); }
function shiftOf(e, day, branchId) {
  const o = overrideOf(e, day), bs = branchShift(branchById(branchId || empBranches(e)[0]));
  const st = (o && o.start) || bs.start, en = (o && o.start) ? o.end : bs.end;
  const s = at(day, st); let x = at(day, en); if (x <= s) x += 864e5;
  return { s, e: x, hours: (x - s) / 36e5 };
}
const leadMs = () => (Number(cfg.openLead) || 0) * 6e4;
function openRecord(empId) {
  const t = dayKey(new Date()), y = addDays(t, -1);
  for (const d of [t, y]) { const r = att[empId + '_' + d]; if (r && r.inAt && !r.outAt && Date.now() - r.inAt < 20 * 36e5) return r; }
  return null;
}
function openBranches(e, now) {
  const out = [];
  for (const d of [dayKey(new Date(now)), addDays(dayKey(new Date(now)), -1)]) {
    if (isOff(e, d) || att[e.id + '_' + d]) continue;
    cfg.branches.filter(b => b.lat != null && b.lng != null).forEach(b => {
      const sh = shiftOf(e, d, b.id); if (now >= sh.s - leadMs() && now <= sh.e && !out.some(x => x.id === b.id)) out.push(b);
    });
  }
  return out;
}
function nextOpening(e, now) {
  const t = dayKey(new Date(now)); if (isOff(e, t)) return null;
  return cfg.branches.filter(b => b.lat != null && b.lng != null).map(b => ({ b, at: shiftOf(e, t, b.id).s - leadMs() }))
    .filter(x => x.at > now).sort((a, b) => a.at - b.at)[0] || null;
}

/* ======================= punch screen ======================= */
function renderPunch() {
  if (!token || !me || me.status !== 'active') return;
  if (isMgr()) { onlyBox('#mgrHome'); return; }
  onlyBox('#ticket');
  const e = me, t = dayKey(new Date()), now = Date.now(), btn = $('#punchBtn');
  const open = openRecord(e.id), rec = open || att[e.id + '_' + t];
  if (open) picked = open.branchId;
  const avail = open ? [branchById(open.branchId)].filter(Boolean) : openBranches(e, now);
  if (picked && !avail.some(b => b.id === picked)) picked = null;
  const tb = branchById(picked), offToday = isOff(e, t) && !open, done = !open && rec && rec.outAt;
  $('#tName').textContent = e.name;
  $('#tMeta').textContent = offToday ? 'اليوم إجازة حسب الجدول' : tb ? `دوام ${tb.name} ${fmtT(shiftOf(e, open ? open.day : t, tb.id).s)} – ${fmtT(shiftOf(e, open ? open.day : t, tb.id).e)}` : avail.length ? 'اختر الفرع الذي تداوم فيه الآن' : '';
  const closed = !open && !done && (offToday || !avail.length);
  show('#pickWrap', !closed && !done);
  $('#branchPick').innerHTML = avail.map(b => { const sh = shiftOf(e, t, b.id);
    return `<label><input type="radio" name="bp" value="${esc(b.id)}" ${picked === b.id ? 'checked' : ''} ${open ? 'disabled' : ''}>${esc(b.name)} <span class="small" style="opacity:.75">${fmtT(sh.s)} – ${fmtT(sh.e)}</span></label>`; }).join('');
  $$('#branchPick input').forEach(el => el.onchange = () => { picked = el.value; msg($('#punchMsg'), '', ''); renderPunch(); });
  $('#pickLabel').textContent = open ? 'الانصراف من الفرع الذي سجلت فيه الحضور' : 'في أي فرع تداوم الآن؟';
  show('#closedNote', closed);
  if (closed) { const nx = nextOpening(e, now);
    $('#closedNote').innerHTML = offToday ? '<b>اليوم إجازتك</b><span>لا يوجد تسجيل حضور اليوم.</span>'
      : `<b>التسجيل مغلق الآن</b><span>${nx ? `يفتح تسجيل الحضور الساعة ${fmtT(nx.at)} في ${esc(nx.b.name)}.` : 'لا يوجد دوام متاح الآن.'}</span>`; }
  if (open) { btn.className = 'punch out'; btn.innerHTML = 'انصراف<small>اضغط للتسجيل</small>'; btn.disabled = false; }
  else if (done) { btn.className = 'punch in'; btn.innerHTML = 'تم<small>انتهى دوام اليوم</small>'; btn.disabled = true; }
  else if (closed) { btn.className = 'punch in'; btn.innerHTML = 'مغلق<small>خارج وقت الدوام</small>'; btn.disabled = true; }
  else { btn.className = 'punch in'; btn.innerHTML = picked ? 'حضور<small>اضغط للتسجيل</small>' : 'حضور<small>اختر الفرع أولاً</small>'; btn.disabled = !picked; }
  if (busy) btn.disabled = true;
  $('#tStamp').innerHTML = rec ? `<div><span class="small muted">الحضور</span><b>${fmtT(rec.inAt)}</b></div><div><span class="small muted">الانصراف</span><b>${fmtT(rec.outAt)}</b></div>` : '';
  renderBadges();
}
function getPos() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej({ code: 0 });
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}
const PUNCH_ERR = {
  auth: 'انتهت الجلسة. ادخل مرة أخرى.', not_active: 'حسابك غير مفعّل. راجع المدير.', no_branch: 'اختر الفرع.',
  no_location: 'موقع هذا الفرع غير محدد. راجع المدير.', day_off: 'اليوم إجازتك حسب الجدول.', done_today: 'سجلت حضورك وانصرافك اليوم.'
};
$('#punchBtn').onclick = async () => {
  const out = $('#punchMsg'), btn = $('#punchBtn');
  if (!isEmp() || busy) return;
  const open = openRecord(me.id);
  if (!open && !picked) return msg(out, 'err', 'اختر الفرع الذي تداوم فيه.');
  busy = true; btn.disabled = true; msg(out, 'info', 'جاري تحديد موقعك…');
  let pos;
  try { pos = await getPos(); }
  catch (err) { busy = false; renderPunch(); return msg(out, 'err', err.code === 1 ? 'لم يُسمح بالوصول للموقع. فعّل صلاحية الموقع للتطبيق ثم حاول مرة أخرى.' : 'تعذّر تحديد موقعك. تأكد من تشغيل GPS وحاول مرة أخرى.'); }
  const { latitude, longitude, accuracy } = pos.coords;
  msg(out, 'info', 'جاري التسجيل…');
  let data = null;
  try { data = await call('att_punch', { p_branch: open ? open.branchId : picked, p_lat: latitude, p_lng: longitude, p_acc: accuracy }); } catch (e) {}
  busy = false;
  if (!data) { renderPunch(); return msg(out, 'err', 'لم يتم التسجيل. تحقق من الاتصال وحاول مرة أخرى.'); }
  if (!data.ok) {
    let t = PUNCH_ERR[data.error];
    if (data.error === 'too_far') t = `موقعك لا يطابق فرع ${data.branch}: أنت على بعد ${data.dist} متر منه، والمسموح ${data.radius} متر. دقة موقعك الآن ±${Math.round(accuracy)} متر؛ إن كانت كبيرة اقترب من باب الفرع وحاول مرة أخرى.`;
    if (data.error === 'closed') t = data.opens ? `التسجيل مغلق الآن. يفتح الساعة ${fmtT(Date.parse(data.opens))}.` : 'التسجيل مغلق الآن.';
    await reloadRecent(); renderPunch(); return msg(out, 'err', t || 'لم يتم التسجيل.');
  }
  await reloadRecent(); renderPunch();
  if (data.action === 'out') msg(out, 'ok', `تم تسجيل انصرافك الساعة ${fmtT(Date.parse(data.at))} في ${data.branch}.`);
  else msg(out, 'ok', data.late_min > (cfg.grace || 0) ? `تم تسجيل حضورك في ${data.branch} الساعة ${fmtT(Date.parse(data.at))} (متأخر ${data.late_min} دقيقة).` : `تم تسجيل حضورك في ${data.branch} الساعة ${fmtT(Date.parse(data.at))}.`);
  if (navigator.vibrate) navigator.vibrate(60);
};

/* ======================= report engine ======================= */
function compute(from, to, branchId) {
  const today = dayKey(new Date()), now = Date.now(), grace = Number(cfg.grace) || 0;
  const emps = (isMgr() ? staff() : [me]).filter(e => !branchId || inBranch(e, branchId));
  let period = 0; for (let d = from; d <= to && d <= today; d = addDays(d, 1)) period++;
  const rows = [], log = [];
  for (const e of emps) {
    const r = { e, present: 0, absent: 0, lateN: 0, lateMin: 0, hours: 0, ot: 0, noOut: 0 };
    for (let d = from; d <= to && d <= today; d = addDays(d, 1)) {
      const rec = att[e.id + '_' + d], off = isOff(e, d);
      const sh = (rec && rec.ss) ? { s: rec.ss, e: rec.se, hours: (rec.se - rec.ss) / 36e5 } : shiftOf(e, d, rec?.branchId);
      if (rec && rec.inAt) {
        r.present++;
        const lm = Math.round((rec.inAt - sh.s) / 6e4), isLate = lm > grace;
        if (isLate) { r.lateN++; r.lateMin += lm; }
        let w = 0, o = 0;
        if (rec.outAt) { w = (rec.outAt - rec.inAt) / 36e5; o = w - sh.hours; o = o >= 0.25 ? o : 0; r.hours += w; r.ot += o; }
        else if (!(d >= addDays(today, -1) && now - rec.inAt < 20 * 36e5)) r.noOut++;
        log.push({ d, e, rec, state: isLate ? 'متأخر' : 'حاضر', lm: isLate ? lm : 0, w, o, missing: !rec.outAt });
      } else if (!off && (d < today || now > sh.s + grace * 6e4)) {
        r.absent++; log.push({ d, e, rec: null, state: 'غائب', lm: 0, w: 0, o: 0 });
      }
    }
    const sal = Number(pay[e.id]) || 0, daily = sal / 30, mode = cfg.payMode || 'deduct';
    const bonusAt = Number(cfg.bonusAt) || 30, bonusDays = Number(cfg.bonusDays) || 0, work = Number(cfg.workDays) || 26;
    r.salary = sal; r.daily = daily;
    r.bonus = (period >= 28 && r.present >= Math.min(bonusAt, period)) ? bonusDays * daily : 0;
    if (mode === 'deduct') {
      const required = Math.max(0, Math.min(work, period - (30 - work)));
      r.deductDays = Math.max(0, required - r.present); r.absent = r.deductDays;
      r.extraDays = period >= 28 ? Math.max(0, r.present - required) : 0; r.bonus = r.extraDays * daily;
      r.base = Math.max(0, sal - r.deductDays * daily);
    } else { r.deductDays = null; r.extraDays = 0; r.base = r.present * daily; }
    r.net = r.base + r.bonus;
    rows.push(r);
  }
  return { rows, log, period };
}

/* ======================= my report ======================= */
const unread = () => notes.filter(n => !n.read_at).length;
function renderBadges() {
  const n = isEmp() ? unread() : 0;
  $('#navBadge').textContent = n; show('#navBadge', !!n);
  $('#bellCount').textContent = n; show('#bellCount', !!n);
  const nn = isMgr() ? cfg.employees.filter(e => e.status === 'pending').length : 0;
  $('#setBadge').textContent = nn; show('#setBadge', !!nn);
}
async function markRead() { if (!isEmp() || !unread()) return; try { await call('att_mark_read'); notes.forEach(n => n.read_at = n.read_at || new Date().toISOString()); renderBadges(); } catch (e) {} }
async function renderMine() {
  if (!isEmp()) return;
  const e = me, mm = $('#mineMonth');
  if (!mm.value) mm.value = dayKey(new Date()).slice(0, 7);
  const [y, m] = mm.value.split('-').map(Number), from = mm.value + '-01', to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  if (loadedFrom && from < loadedFrom) { await ensureFrom(from); }
  const { rows, log } = compute(from, to, ''); const r = rows[0]; if (!r) return;
  const mine = log.sort((a, b) => a.d < b.d ? 1 : -1);
  show('#notesPanel', notes.length > 0);
  $('#notesList').innerHTML = notes.slice(0, 10).map(n => `<li class="${n.read_at ? '' : 'new'}"><div>${esc(n.body)}<time>${nFmt.format(new Date(n.created_at))}</time></div></li>`).join('');
  $('#mineTitle').textContent = 'تقرير ' + e.name;
  const dm = (cfg.payMode || 'deduct') === 'deduct';
  $('#mineSums').innerHTML = `<div><b>${r.present}</b><span>أيام الحضور</span></div><div><b>${r.lateN}</b><span>مرات التأخير (${r.lateMin} د)</span></div><div><b>${h2(r.hours)}</b><span>ساعات العمل</span></div>` +
    (dm ? `<div><b>${r.extraDays || 0}</b><span>أيام زيادة</span></div>` : `<div><b>${h2(r.ot)}</b><span>ساعات إضافية</span></div>`);
  $('#mineNote').textContent = dm ? `الراتب الكامل عند ${Number(cfg.workDays) || 26} يوم دوام، وكل يوم زيادة يُحسب لك بقيمة يوم.` : '';
  $('#mySalary').innerHTML = !r.salary ? '<p class="muted small" style="margin:0">لم يُسجَّل راتبك بعد. راجع المدير.</p>' :
    `<div class="sums" style="margin:0 0 12px"><div><b>${money(r.net)}</b><span>المستحق لهذا الشهر حتى الآن</span></div><div><b>${money(r.salary)}</b><span>الراتب الشهري</span></div><div><b>${money(r.daily)}</b><span>قيمة اليوم</span></div><div><b>${money(r.bonus)}</b><span>${dm ? 'قيمة الأيام الزيادة' : 'المكافأة'}</span></div></div>
     <ul class="list">${dm ? `<li><span>أيام الدوام المطلوبة للراتب الكامل</span><b>${Number(cfg.workDays) || 26}</b></li><li><span>أيام الخصم</span><b>${r.deductDays}</b></li><li><span>أيام زيادة</span><b>${r.extraDays || 0}</b></li>` : ''}
     <li><span>الأساسي المستحق</span><b>${money(r.base)}</b></li></ul>
     <p class="small muted" style="margin:10px 0 0">الحساب يكتمل بنهاية الشهر.</p>`;
  const bn = id => branchById(id)?.name || '';
  $('#mineTable').innerHTML = `<thead><tr><th>التاريخ</th><th>الفرع</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th><th>الساعات</th></tr></thead><tbody>` +
    (mine.length ? mine.map(x => { const st = x.state === 'غائب' ? '<span class="tag abs">غائب</span>' : x.state === 'متأخر' ? `<span class="tag late">متأخر ${x.lm} د</span>` : '<span class="tag in">حاضر</span>';
      return `<tr><td>${DAYS[dow(x.d)]} ${x.d.slice(5)}</td><td>${esc(x.rec ? bn(x.rec.branchId) : '—')}</td><td class="num">${x.rec ? fmtT(x.rec.inAt) : '—'}</td><td class="num">${x.rec ? fmtT(x.rec.outAt) : '—'}</td><td>${st}</td><td class="num">${x.w ? h2(x.w) : '—'}</td></tr>`; }).join('')
      : '<tr><td colspan="6" class="muted">لا توجد أيام مسجلة في هذا الشهر.</td></tr>') + '</tbody>';
  renderBadges();
}
$('#mineMonth').onchange = renderMine;

/* ======================= manager: today ======================= */
function renderToday() {
  if (!isMgr()) return;
  const t = dayKey(new Date()), now = Date.now(), grace = Number(cfg.grace) || 0;
  $('#todayBox').innerHTML = cfg.branches.map(b => {
    const es = staff().filter(e => e.status === 'active').filter(e => { const r = openRecord(e.id) || att[e.id + '_' + t]; return inBranch(e, b.id) || (r && r.branchId === b.id); });
    let inside = 0;
    const items = es.map(e => {
      const rec = openRecord(e.id) || att[e.id + '_' + t], sh = shiftOf(e, t, b.id); let tag;
      if (isOff(e, t) && !rec) tag = '<span class="tag">إجازة</span>';
      else if (rec && rec.branchId !== b.id) tag = `<span class="tag">${rec.outAt ? 'عمل' : 'حاضر'} في ${esc(branchById(rec.branchId)?.name || 'فرع آخر')}</span>`;
      else if (rec && rec.outAt) tag = `<span class="tag out">انصرف ${fmtT(rec.outAt)}</span>`;
      else if (rec) { inside++; const lm = Math.round((rec.inAt - (rec.ss || sh.s)) / 6e4);
        tag = lm > grace ? `<span class="tag late">متأخر ${lm} د · ${fmtT(rec.inAt)}</span>` : `<span class="tag in">حاضر ${fmtT(rec.inAt)}</span>`; }
      else if (now > sh.s + grace * 6e4) tag = '<span class="tag abs">لم يحضر</span>';
      else tag = `<span class="tag">يبدأ ${fmtT(sh.s)}</span>`;
      return `<li><span>${esc(e.name)}</span>${tag}</li>`;
    }).join('');
    const bsh = branchShift(b), noLoc = b.lat == null;
    return `<div class="panel"><div class="branchHead"><h3>${esc(b.name)}</h3><button class="btn alt small" data-bt="${esc(b.id)}">موعد الدوام ${esc(fmtHM(bsh))}</button></div>
      <div class="hidden" id="bt-${esc(b.id)}" style="margin:8px 0 12px"><div class="row" style="grid-template-columns:1fr 1fr auto;align-items:end">
        <div><label>بداية الدوام</label><input type="time" id="bts-${esc(b.id)}" value="${esc(bsh.start)}"></div>
        <div><label>نهاية الدوام</label><input type="time" id="bte-${esc(b.id)}" value="${esc(bsh.end)}"></div>
        <button class="btn mustard" data-btsave="${esc(b.id)}">حفظ</button></div><div id="btm-${esc(b.id)}"></div></div>
      ${noLoc ? '<p class="small" style="margin:0 0 6px;color:var(--out)">موقع الفرع غير محدد، والتسجيل فيه مغلق. حدده من الإعدادات.</p>' : ''}
      <p class="small muted" style="margin:0 0 4px">داخل الدوام الآن: ${inside} من ${es.length}</p>
      ${es.length ? `<ul class="list">${items}</ul>` : '<p class="muted small">لا يوجد موظفون في هذا الفرع.</p>'}</div>`;
  }).join('') || '<div class="panel"><p class="muted" style="margin:0">أضف الفروع من الإعدادات.</p></div>';
}
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-bt]'); if (t) { $('#bt-' + t.dataset.bt).classList.toggle('hidden'); return; }
  const sv = ev.target.closest('[data-btsave]'); if (!sv || !isMgr()) return;
  const id = sv.dataset.btsave, st = $('#bts-' + id).value, en = $('#bte-' + id).value;
  if (!st || !en) return msg($('#btm-' + id), 'err', 'حدد وقت البداية والنهاية.');
  sv.disabled = true;
  try { await call('att_mgr_branch', { p: { id, start_time: st, end_time: en } }); }
  catch (e) { sv.disabled = false; return msg($('#btm-' + id), 'err', 'لم يتم الحفظ. حاول مرة أخرى.'); }
  sv.disabled = false;
  const b = branchById(id); if (b) { b.start = st; b.end = en; } draft = null; renderAll();
});

/* ======================= manager: schedule ======================= */
let scDraft = null, scDay = null;
function scLoad(day) { scDay = day; $('#scDay').value = day; scDraft = JSON.parse(JSON.stringify(sched[day]?.o || {})); renderSched(); }
function renderSched() {
  if (!isMgr()) return;
  if (!scDay) return scLoad(dayKey(new Date()));
  const list = staff().filter(e => e.status === 'active');
  $('#scList').innerHTML = `<h3>${DAYS[dow(scDay)]} ${scDay}</h3>` + (list.length ? list.map(e => {
    const o = scDraft[e.id], wk = Number(e.off) === dow(scDay), bs = branchShift(branchById(empBranches(e)[0]));
    return `<div class="emp-row"><div class="row"><div><label>${esc(e.name)}</label>
      <select data-sc="${esc(e.id)}"><option value="def">${wk ? 'حسب الفرع (إجازة أسبوعية)' : 'حسب موعد الفرع الذي يسجل فيه'}</option><option value="custom">موعد مخصص</option><option value="off">إجازة</option></select></div>
      <div class="row ${o && !o.off ? '' : 'hidden'}" style="grid-template-columns:1fr 1fr">
        <div><label>من</label><input type="time" data-scs="${esc(e.id)}" value="${esc(o?.start || bs.start)}"></div>
        <div><label>إلى</label><input type="time" data-sce="${esc(e.id)}" value="${esc(o?.end || bs.end)}"></div></div></div></div>`; }).join('') : '<p class="muted small">لا يوجد موظفون معتمدون بعد.</p>');
  list.forEach(e => { const o = scDraft[e.id], el = $(`[data-sc="${e.id}"]`); if (el) el.value = o ? (o.off ? 'off' : 'custom') : 'def'; });
  $$('[data-sc]').forEach(el => el.onchange = () => { const id = el.dataset.sc, e = empById(id), bs = branchShift(branchById(empBranches(e)[0]));
    if (el.value === 'def') delete scDraft[id]; else if (el.value === 'off') scDraft[id] = { off: true }; else scDraft[id] = { start: scDraft[id]?.start || bs.start, end: scDraft[id]?.end || bs.end };
    renderSched(); });
  $$('[data-scs]').forEach(el => el.onchange = () => { const o = scDraft[el.dataset.scs]; if (o) o.start = el.value; });
  $$('[data-sce]').forEach(el => el.onchange = () => { const o = scDraft[el.dataset.sce]; if (o) o.end = el.value; });
}
$('#scDay').onchange = e => e.target.value && scLoad(e.target.value);
$('#scPrev').onclick = () => scLoad(addDays(scDay, -1));
$('#scNext').onclick = () => scLoad(addDays(scDay, 1));
$('#scAll').onchange = e => show('#scAllTimes', e.target.value === 'custom');
$('#scApplyAll').onclick = () => { const v = $('#scAll').value; if (!v) return;
  staff().filter(e => e.status === 'active').forEach(e => { if (v === 'def') delete scDraft[e.id]; else if (v === 'off') scDraft[e.id] = { off: true }; else scDraft[e.id] = { start: $('#scAllS').value, end: $('#scAllE').value }; });
  renderSched(); };
async function scWrite(day, next) {
  const prev = sched[day]?.o || {}, ups = [], dels = [];
  staff().forEach(e => { const a = JSON.stringify(prev[e.id] || null), b = JSON.stringify(next[e.id] || null); if (a === b) return;
    const o = next[e.id]; if (!o) dels.push(e.id); else ups.push({ employee_id: e.id, day, is_off: !!o.off, start_time: o.off ? null : o.start, end_time: o.off ? null : o.end }); });
  if (ups.length || dels.length) await call('att_mgr_schedule', { p_day: day, p_set: ups, p_del: dels });
  sched[day] = { o: JSON.parse(JSON.stringify(next)) };
}
$('#scSave').onclick = async () => { try { await scWrite(scDay, scDraft); msg($('#scMsg'), 'ok', 'تم حفظ جدول ' + scDay + '، ووصل تنبيه لكل موظف تغيّر موعده.'); } catch (e) { msg($('#scMsg'), 'err', 'لم يتم الحفظ. حاول مرة أخرى.'); } };
$('#scCopy').onclick = async () => { const next = addDays(scDay, 1);
  try { await scWrite(scDay, scDraft); await scWrite(next, JSON.parse(JSON.stringify(scDraft))); scLoad(next); msg($('#scMsg'), 'ok', 'تم النسخ إلى ' + next + '. عدّل ما تريد واحفظ.'); }
  catch (e) { msg($('#scMsg'), 'err', 'لم يتم النسخ. حاول مرة أخرى.'); } };

/* ======================= manager: reports ======================= */
const bnames = e => empBranches(e).map(id => branchById(id)?.name).filter(Boolean).join('، ');
function setRange(kind) {
  const t = dayKey(new Date()); let f, to = t;
  if (kind === 'month') f = t.slice(0, 8) + '01';
  else if (kind === 'last') { f = monthStart(t, 1); to = addDays(t.slice(0, 8) + '01', -1); }
  else f = addDays(t, -6);
  $('#rFrom').value = f; $('#rTo').value = to; renderReports();
}
$$('[data-range]').forEach(b => b.onclick = () => setRange(b.dataset.range));
['#rFrom', '#rTo', '#rBranch'].forEach(s => $(s).onchange = renderReports);
async function renderReports() {
  if (!isMgr()) return;
  const bs = $('#rBranch'), cur = bs.value;
  bs.innerHTML = '<option value="">كل الفروع</option>' + cfg.branches.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''); bs.value = cur;
  if (!$('#rFrom').value) return setRange('month');
  const from = $('#rFrom').value, to = $('#rTo').value; if (from > to) return;
  if (from < loadedFrom) await ensureFrom(from);
  const { rows } = compute(from, to, bs.value);
  const tot = rows.reduce((a, r) => ({ a: a.a + r.absent, l: a.l + r.lateN, h: a.h + r.hours, o: a.o + r.ot }), { a: 0, l: 0, h: 0, o: 0 });
  $('#sums').innerHTML = `<div><b>${tot.h.toFixed(1)}</b><span>ساعات عمل</span></div><div><b>${tot.o.toFixed(1)}</b><span>ساعات إضافية</span></div><div><b>${tot.l}</b><span>مرات تأخير</span></div><div><b>${tot.a}</b><span>أيام غياب</span></div>`;
  $('#empTable').innerHTML = `<thead><tr><th>الموظف</th><th>الفروع</th><th>حضور</th><th>غياب</th><th>تأخير</th><th>دقائق التأخير</th><th>ساعات العمل</th><th>إضافي</th><th>بدون انصراف</th></tr></thead><tbody>` +
    (rows.length ? rows.map(r => `<tr><td>${esc(r.e.name)}</td><td>${esc(bnames(r.e))}</td><td class="num">${r.present}</td><td class="num">${r.absent}</td><td class="num">${r.lateN}</td><td class="num">${r.lateMin}</td><td class="num">${h2(r.hours)}</td><td class="num">${h2(r.ot)}</td><td class="num">${r.noOut}</td></tr>`).join('') : '<tr><td colspan="9" class="muted">لا يوجد موظفون.</td></tr>') + '</tbody>';
  const { log } = compute(from, to, '');
  $('#branchTable').innerHTML = `<thead><tr><th>الفرع</th><th>الموظفون</th><th>أيام الحضور</th><th>الغياب</th><th>التأخير</th><th>ساعات العمل</th><th>إضافي</th></tr></thead><tbody>` +
    cfg.branches.map(b => { const t = { emps: staff().filter(e => inBranch(e, b.id)).length, p: 0, a: 0, l: 0, h: 0, o: 0 };
      log.forEach(x => { if (x.rec) { if (x.rec.branchId !== b.id) return; t.p++; if (x.lm) t.l++; t.h += x.w; t.o += x.o; } else if (empBranches(x.e)[0] === b.id) t.a++; });
      return `<tr><td>${esc(b.name)}</td><td class="num">${t.emps}</td><td class="num">${t.p}</td><td class="num">${t.a}</td><td class="num">${t.l}</td><td class="num">${h2(t.h)}</td><td class="num">${h2(t.o)}</td></tr>`; }).join('') + '</tbody>';
  const mode = cfg.payMode || 'deduct';
  $('#payNote').textContent = mode === 'deduct' ? `راتب كامل لمن يداوم ${Number(cfg.workDays) || 26} يوماً. يُخصم عن كل يوم ناقص، ويُضاف عن كل يوم زيادة.` : `يُدفع عن كل يوم حضور، مع مكافأة ${Number(cfg.bonusDays) || 0} أيام لمن يحضر ${Number(cfg.bonusAt) || 30} يوماً.`;
  const T = rows.reduce((a, r) => ({ s: a.s + r.salary, b: a.b + r.bonus, n: a.n + r.net, c: a.c + (r.bonus ? 1 : 0) }), { s: 0, b: 0, n: 0, c: 0 });
  $('#paySums').innerHTML = `<div><b>${money(T.n)}</b><span>إجمالي المستحق</span></div><div><b>${money(T.s)}</b><span>إجمالي الرواتب</span></div><div><b>${money(T.b)}</b><span>${mode === 'deduct' ? 'قيمة الأيام الزيادة' : 'المكافآت'}</span></div><div><b>${T.c}</b><span>${mode === 'deduct' ? 'داوموا أيام زيادة' : 'حصلوا على المكافأة'}</span></div>`;
  $('#payTable').innerHTML = `<thead><tr><th>الموظف</th><th>الراتب</th><th>قيمة اليوم</th><th>أيام الحضور</th>${mode === 'deduct' ? '<th>أيام الخصم</th><th>أيام زيادة</th>' : ''}<th>${mode === 'deduct' ? 'قيمة الزيادة' : 'المكافأة'}</th><th>المستحق</th></tr></thead><tbody>` +
    (rows.length ? rows.map(r => `<tr><td>${esc(r.e.name)}</td><td class="num">${r.salary ? money(r.salary) : '<span class="muted">غير محدد</span>'}</td><td class="num">${money(r.daily)}</td><td class="num">${r.present}</td>${mode === 'deduct' ? `<td class="num">${r.deductDays}</td><td class="num">${r.extraDays}</td>` : ''}<td class="num">${r.bonus ? money(r.bonus) : '—'}</td><td class="num pay">${money(r.net)}</td></tr>`).join('') : '<tr><td colspan="8" class="muted">لا يوجد موظفون.</td></tr>') + '</tbody>';
}
$('#exportBtn').onclick = async () => {
  const out = $('#exportMsg'), from = $('#rFrom').value, to = $('#rTo').value, bid = $('#rBranch').value;
  if (typeof XLSX === 'undefined') return msg(out, 'err', 'مكتبة Excel لم تُحمّل بعد. انتظر لحظة وحاول مرة أخرى.');
  if (from < loadedFrom) await ensureFrom(from);
  const { rows, log } = compute(from, to, bid), bn = id => branchById(id)?.name || '', dm = (cfg.payMode || 'deduct') === 'deduct';
  const pr = rows.map(r => { const o = { 'الموظف': r.e.name, 'البريد': r.e.email || '', 'الفروع': bnames(r.e), 'الراتب الشهري': r.salary, 'قيمة اليوم': +r.daily.toFixed(2), 'أيام الحضور': r.present };
    if (dm) { o['أيام الخصم'] = r.deductDays; o['أيام زيادة'] = r.extraDays; } o['الأساسي المستحق'] = +r.base.toFixed(2); o[dm ? 'قيمة الأيام الزيادة' : 'مكافأة الحضور الكامل'] = +r.bonus.toFixed(2); o['صافي المستحق'] = +r.net.toFixed(2); return o; });
  const sum = rows.map(r => ({ 'الموظف': r.e.name, 'الفروع': bnames(r.e), 'أيام الحضور': r.present, 'أيام الغياب': r.absent, 'مرات التأخير': r.lateN, 'دقائق التأخير': r.lateMin, 'ساعات العمل': +h2(r.hours), 'ساعات إضافية': +h2(r.ot), 'أيام بدون انصراف': r.noOut }));
  const det = log.sort((a, b) => a.d < b.d ? -1 : 1).map(x => ({ 'التاريخ': x.d, 'اليوم': DAYS[dow(x.d)], 'الموظف': x.e.name, 'الفرع': x.rec ? bn(x.rec.branchId) : bn(empBranches(x.e)[0]), 'الحالة': x.state + (x.missing ? ' (بدون انصراف)' : ''), 'الحضور': x.rec ? fmtT(x.rec.inAt) : '', 'الانصراف': x.rec ? fmtT(x.rec.outAt) : '', 'دقائق التأخير': x.lm, 'ساعات العمل': +h2(x.w), 'إضافي': +h2(x.o) }));
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pr), 'الرواتب');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sum), 'الملخص');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), 'السجل اليومي');
  XLSX.writeFile(wb, `RQ-attendance_${from}_${to}.xlsx`);
  msg(out, 'ok', 'تم تصدير الملف.');
};

/* ======================= manager: settings ======================= */
let draft = null, payDraft = {};
function startDraft() {
  draft = { settings: { grace: cfg.grace, openLead: cfg.openLead, payMode: cfg.payMode, workDays: cfg.workDays, bonusAt: cfg.bonusAt, bonusDays: cfg.bonusDays, requireApproval: cfg.requireApproval },
    branches: JSON.parse(JSON.stringify(cfg.branches)), employees: JSON.parse(JSON.stringify(staff().filter(e => e.status === 'active'))) };
  payDraft = Object.assign({}, pay);
}
function toggleMode(m) { show('#restWrap', m === 'deduct'); $$('.bonusF').forEach(x => x.classList.toggle('hidden', m === 'deduct')); }
function renderSettings() {
  if (!isMgr()) return;
  if (!draft) startDraft();
  const S = draft.settings;
  $('#sGrace').value = S.grace; $('#sLead').value = S.openLead; $('#sApprove').checked = !!S.requireApproval;
  $('#sMode').value = S.payMode; $('#sBonusAt').value = S.bonusAt; $('#sBonusDays').value = S.bonusDays; $('#sWork').value = S.workDays; toggleMode(S.payMode);
  // pending registrations
  const pend = cfg.employees.filter(e => e.status === 'pending');
  $('#newEmps').innerHTML = pend.length ? `<p class="small muted" style="margin:0 0 8px">سجّلوا بأنفسهم من الرابط. راجع بياناتهم ثم اعتمدهم.</p>` + pend.map(e => `<div class="newrow"><div class="who"><b>${esc(e.name)}</b><span class="small muted" dir="ltr">${esc(e.email || '')}</span>
      <span class="tag late" style="margin-top:6px">بانتظار موافقتك</span></div>
      <div style="display:flex;gap:6px"><button class="btn small mustard" data-appr="${esc(e.id)}">اعتماد</button><button class="btn small danger" data-rej="${esc(e.id)}">رفض</button></div></div>`).join('') : '';
  $$('[data-appr]').forEach(el => el.onclick = () => setStatus(el.dataset.appr, 'active'));
  $$('[data-rej]').forEach(el => el.onclick = () => { if (confirm('رفض هذا الطلب؟')) setStatus(el.dataset.rej, 'disabled'); });
  // branches
  $('#branchEdit').innerHTML = draft.branches.map((b, i) => `<div class="emp-row">
    <div class="row"><div><label>اسم الفرع</label><input data-b="${i}" data-k="name" value="${esc(b.name)}"></div>
    <div><label>النطاق (متر)</label><input type="number" data-b="${i}" data-k="radius" value="${esc(b.radius ?? 10)}"></div></div>
    <div class="row" style="margin-top:10px"><div><label>بداية الدوام</label><input type="time" data-b="${i}" data-k="start" value="${esc(branchShift(b).start)}"></div>
    <div><label>نهاية الدوام</label><input type="time" data-b="${i}" data-k="end" value="${esc(branchShift(b).end)}"></div></div>
    <p class="small ${b.lat == null ? '' : 'muted'}" style="margin:10px 0 0;${b.lat == null ? 'color:var(--out)' : ''}">${b.lat == null ? 'الموقع غير محدد' : `الموقع: ${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}`}</p>
    <div class="actions"><button class="btn alt" data-here="${i}">استخدم موقعي الآن</button><button class="btn danger" data-delb="${i}">حذف الفرع</button></div></div>`).join('');
  $$('[data-b]').forEach(el => el.oninput = () => { const k = el.dataset.k, v = el.value; draft.branches[el.dataset.b][k] = ['name', 'start', 'end'].includes(k) ? v : (v === '' ? null : Number(v)); });
  $$('[data-delb]').forEach(el => el.onclick = () => { const b = draft.branches[+el.dataset.delb];
    if (!confirm(`حذف فرع ${b.name}؟ سجلات الحضور السابقة تبقى محفوظة.`)) return;
    draft.branches.splice(+el.dataset.delb, 1); draft.employees.forEach(e => e.branchIds = e.branchIds.filter(x => x !== b.id)); renderSettings(); });
  $$('[data-here]').forEach(el => el.onclick = async () => {
    el.disabled = true; el.textContent = 'جاري التحديد…';
    try { const p = await getPos(); const b = draft.branches[+el.dataset.here]; b.lat = +p.coords.latitude.toFixed(6); b.lng = +p.coords.longitude.toFixed(6); renderSettings();
      msg($('#saveMsg'), 'info', `تم تحديد موقع ${b.name} (دقة ±${Math.round(p.coords.accuracy)} م). اضغط «حفظ الإعدادات».`); }
    catch (x) { el.disabled = false; el.textContent = 'استخدم موقعي الآن'; msg($('#saveMsg'), 'err', 'تعذّر تحديد الموقع. فعّل صلاحية الموقع وحاول مرة أخرى.'); }
  });
  // employees
  const offOpts = '<option value="-1">لا يوجد</option>' + DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('');
  $('#empEdit').innerHTML = draft.employees.length ? draft.employees.map((e, i) => `<div class="emp-row">
    <div class="row"><div><label>الاسم</label><input data-e="${i}" data-k="name" value="${esc(e.name)}"></div>
    <div><label>الراتب الشهري (درهم)</label><input type="number" min="0" data-sal="${esc(e.id)}" value="${esc(payDraft[e.id] ?? '')}"></div></div>
    <p class="small muted" style="margin:8px 0 0" dir="ltr">${esc(e.email || '')}</p>
    <div style="margin-top:10px"><label>فروعه الأساسية للتقارير (يستطيع التسجيل من أي فرع)</label><div class="checks">${draft.branches.filter(b => !String(b.id).startsWith('new-')).map(b => `<label><input type="checkbox" data-eb="${i}" value="${esc(b.id)}" ${e.branchIds.includes(b.id) ? 'checked' : ''}>${esc(b.name)}</label>`).join('')}</div></div>
    <div class="row" style="margin-top:10px"><div><label>يوم الإجازة الأسبوعي</label><select data-e="${i}" data-k="off">${offOpts}</select></div>
    <div style="display:flex;align-items:flex-end;gap:6px"><button class="btn alt" data-pin="${esc(e.id)}">رقم سري جديد</button><button class="btn danger" data-stop="${esc(e.id)}">إيقاف</button></div></div></div>`).join('')
    : '<p class="muted small">لا يوجد موظفون معتمدون بعد. أرسل رابط التطبيق للموظفين ليسجلوا حساباتهم.</p>';
  draft.employees.forEach((e, i) => { const el = $(`select[data-e="${i}"][data-k="off"]`); if (el) el.value = String(e.off ?? -1); });
  $$('[data-e]').forEach(el => el.onchange = el.oninput = () => { const k = el.dataset.k; draft.employees[el.dataset.e][k] = k === 'off' ? Number(el.value) : el.value; });
  $$('[data-eb]').forEach(el => el.onchange = () => { const e = draft.employees[+el.dataset.eb];
    if (el.checked) { if (!e.branchIds.includes(el.value)) e.branchIds.push(el.value); } else e.branchIds = e.branchIds.filter(x => x !== el.value); });
  $$('[data-sal]').forEach(el => el.oninput = () => { if (el.value === '') delete payDraft[el.dataset.sal]; else payDraft[el.dataset.sal] = Number(el.value); });
  $$('[data-pin]').forEach(el => el.onclick = async () => {
    const e = empById(el.dataset.pin), p = prompt(`رقم سري جديد لـ ${e ? e.name : 'الموظف'} (4 إلى 6 أرقام):`); if (p == null) return;
    if (!pinOk(p.trim())) return msg($('#saveMsg'), 'err', ACC_ERR.pin);
    try { const r = await call('att_mgr_reset_pin', { p_id: el.dataset.pin, p_pin: p.trim() }); msg($('#saveMsg'), r.ok ? 'ok' : 'err', r.ok ? 'تم تعيين الرقم السري الجديد. أعطه للموظف.' : ACC_ERR.pin); }
    catch (x) { msg($('#saveMsg'), 'err', 'لم يتم التنفيذ. حاول مرة أخرى.'); }
  });
  $$('[data-stop]').forEach(el => el.onclick = () => { if (confirm('إيقاف هذا الحساب؟ لن يستطيع الدخول، وتبقى سجلاته محفوظة.')) setStatus(el.dataset.stop, 'disabled'); });
}
$('#sGrace').oninput = e => draft && (draft.settings.grace = Number(e.target.value) || 0);
$('#sLead').oninput = e => draft && (draft.settings.openLead = Math.max(0, Number(e.target.value) || 0));
$('#sApprove').onchange = e => draft && (draft.settings.requireApproval = e.target.checked);
$('#sMode').onchange = e => { if (draft) { draft.settings.payMode = e.target.value; toggleMode(e.target.value); } };
$('#sBonusAt').oninput = e => draft && (draft.settings.bonusAt = Number(e.target.value) || 30);
$('#sBonusDays').oninput = e => draft && (draft.settings.bonusDays = Number(e.target.value) || 0);
$('#sWork').oninput = e => draft && (draft.settings.workDays = Number(e.target.value) || 26);
$('#addBranch').onclick = () => { draft.branches.push({ id: 'new-' + Date.now(), name: 'فرع جديد', lat: null, lng: null, radius: 10, start: '14:00', end: '00:30', sort: draft.branches.length + 1 }); renderSettings(); };
async function setStatus(id, status) {
  try { await call('att_mgr_employee', { p_id: id, p: { status } }); }
  catch (e) { return msg($('#saveMsg'), 'err', 'لم يتم التنفيذ. حاول مرة أخرى.'); }
  draft = null; await loadAll(); renderAll();
  msg($('#saveMsg'), 'ok', status === 'active' ? 'تم اعتماد الموظف، ووصله تنبيه. أضف راتبه وفروعه ثم احفظ.' : 'تم إيقاف الحساب.');
}
$('#saveCfg').onclick = async () => {
  if (!isMgr() || !draft) return;
  const out = $('#saveMsg'), btn = $('#saveCfg'); btn.disabled = true; msg(out, 'info', 'جاري الحفظ…');
  try {
    const S = draft.settings;
    await call('att_mgr_settings', { p: { grace_min: S.grace, open_lead_min: S.openLead, pay_mode: S.payMode, work_days: S.workDays, bonus_at: S.bonusAt, bonus_days: S.bonusDays, require_approval: S.requireApproval } });
    const keepIds = draft.branches.map(b => b.id);
    for (const [i, b] of draft.branches.entries()) {
      const row = { name: b.name.trim() || 'فرع', lat: b.lat, lng: b.lng, radius_m: Math.max(5, Number(b.radius) || 10), start_time: b.start || '14:00', end_time: b.end || '00:30', sort: i + 1 };
      const o = branchById(b.id);
      if (String(b.id).startsWith('new-')) await call('att_mgr_branch', { p: row });
      else if (!o || o.name !== row.name || o.lat !== row.lat || o.lng !== row.lng || o.radius !== row.radius_m || o.start !== row.start_time || o.end !== row.end_time || o.sort !== row.sort)
        await call('att_mgr_branch', { p: Object.assign({ id: b.id }, row) });
    }
    for (const b of cfg.branches) if (!keepIds.includes(b.id)) await call('att_mgr_branch_delete', { p_id: b.id });
    for (const e of draft.employees) {
      const o = empById(e.id); if (!o) continue;
      const ch = {};
      if (o.name !== e.name.trim()) ch.name = e.name.trim();
      const nb = e.branchIds.filter(id => keepIds.includes(id));
      if (JSON.stringify(o.branchIds) !== JSON.stringify(nb)) ch.branch_ids = nb;
      if (Number(o.off) !== Number(e.off)) ch.weekly_off = Number(e.off);
      const a = pay[e.id], b = payDraft[e.id];
      if (b != null && a !== b) ch.salary = b; else if (b == null && a != null) ch.salary = null;
      if (Object.keys(ch).length) await call('att_mgr_employee', { p_id: e.id, p: ch });
    }
    draft = null; await loadAll(); renderAll();
    msg(out, 'ok', 'تم حفظ الإعدادات، ووصلت التنبيهات للموظفين المعنيين.');
  } catch (e) { msg(out, 'err', 'لم يتم حفظ كل التغييرات. تحقق من الاتصال وحاول مرة أخرى.'); }
  btn.disabled = false;
};

/* ======================= render all ======================= */
function renderAll() {
  applyRole(); renderBadges();
  if (!me || me.status !== 'active') return;
  renderPunch();
  if (isEmp() && curTab === 'mine') renderMine();
  if (isMgr()) {
    if (curTab === 'today') renderToday();
    if (curTab === 'sched') renderSched();
    if (curTab === 'reports') renderReports();
    if (curTab === 'settings') renderSettings();
  }
}

/* ======================= PWA: install + service worker ======================= */
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (standalone) document.body.classList.add('standalone');
let deferred = null;
const dismissed = () => { try { return localStorage.getItem('rq_install_x') === '1'; } catch (e) { return false; } };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (!dismissed()) { show('#installBar', true); show('#installBtn', true); } });
$('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; show('#installBar', false); };
$('#installClose').onclick = () => { show('#installBar', false); try { localStorage.setItem('rq_install_x', '1'); } catch (e) {} };
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent) && !dismissed()) {
  show('#installBar', true); show('#installBtn', false);
  $('#installHint').innerHTML = 'من Safari اضغط زر المشاركة <svg class="ios-share" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> ثم «إضافة إلى الشاشة الرئيسية».';
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

if (token) afterAuth(); else onlyBox('#loginBox');
})();
