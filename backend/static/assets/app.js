/* FACE ID portal - plain JavaScript, no build step.
 * Pages (hash routes):
 *   #/login  #/dashboard  #/students  #/students/new  #/students/:id/face
 *   #/classes  #/classes/:name  #/attendance/take  #/attendance/records  #/audit
 * Talks to the FastAPI backend on the same address.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- settings
  var CONFIG = {
    college: 'GM University',            // shown in the header and banner
    campus: 'Smart Classroom Attendance',
    api: '',                             // '' = same address as this page
    editWindowMinutes: 60,
    maxEnrollShots: 6
  };

  // ---------------------------------------------------------------- icons
  var I = {
    logo: '<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0fa3a3"/><path d="M10 15v-3a2 2 0 012-2h3M25 10h3a2 2 0 012 2v3M30 25v3a2 2 0 01-2 2h-3M15 30h-3a2 2 0 01-2-2v-3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="20" cy="18" r="4" fill="#fff"/><path d="M13.5 27c1.3-3 3.6-4.4 6.5-4.4s5.2 1.4 6.5 4.4" fill="#fff"/></svg>',
    dashboard: '<svg viewBox="0 0 64 64"><rect x="8" y="8" width="21" height="21" rx="6" fill="#4f7cf7"/><rect x="35" y="8" width="21" height="21" rx="6" fill="#22b573"/><rect x="8" y="35" width="21" height="21" rx="6" fill="#f5a524"/><rect x="35" y="35" width="21" height="21" rx="6" fill="#ef4444"/><rect x="13" y="13" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="40" y="13" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="13" y="40" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="40" y="40" width="11" height="11" rx="3" fill="#fff" opacity=".85"/></svg>',
    students: '<svg viewBox="0 0 64 64"><circle cx="22" cy="20" r="9" fill="#f7c59f"/><path d="M13 18c0-7 5-11 10-11s9 3 9 8c-3-2-7-2-10 0-3 2-6 3-9 3z" fill="#7a3e1d"/><circle cx="42" cy="21" r="8.5" fill="#f2b48a"/><path d="M33.5 19c0-6 4-10 9-10s8.5 4 8.5 9c-4 0-8-2-10-5-2 3-5 5-7.5 6z" fill="#2b2f3a"/><path d="M8 44c0-9 6-14 14-14s14 5 14 14z" fill="#e5533d"/><path d="M28 44c0-9 6-14 14-14s14 5 14 14z" fill="#2f5bd3"/><rect x="5" y="42" width="54" height="9" rx="3" fill="#d98b3a"/><rect x="5" y="49" width="54" height="7" rx="3" fill="#b8691f"/></svg>',
    addStudent: '<svg viewBox="0 0 64 64"><circle cx="26" cy="20" r="10" fill="#f7c59f"/><path d="M16 18c0-7 5-12 11-12s10 4 10 9c-4-2-8-1-11 1s-7 2-10 2z" fill="#2b2f3a"/><path d="M8 52c0-11 8-18 18-18s18 7 18 18z" fill="#4f7cf7"/><circle cx="48" cy="44" r="12" fill="#22b573"/><path d="M48 38v12M42 44h12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
    camera: '<svg viewBox="0 0 64 64"><rect x="6" y="16" width="52" height="38" rx="9" fill="#2b2f3a"/><path d="M22 16l4-7h12l4 7z" fill="#2b2f3a"/><circle cx="32" cy="35" r="13" fill="#d9a441"/><circle cx="32" cy="35" r="8" fill="#4f7cf7"/><circle cx="29" cy="32" r="2.5" fill="#fff"/><circle cx="49" cy="24" r="2.5" fill="#ef4444"/></svg>',
    classes: '<svg viewBox="0 0 64 64"><rect x="26" y="6" width="32" height="24" rx="3" fill="#2b2f3a"/><rect x="29" y="9" width="26" height="18" rx="2" fill="#fff"/><rect x="33" y="19" width="4" height="6" fill="#22b573"/><rect x="40" y="15" width="4" height="10" fill="#4f7cf7"/><rect x="47" y="12" width="4" height="13" fill="#ef4444"/><circle cx="15" cy="16" r="6" fill="#f7c59f"/><path d="M8 40V28c0-4 3-6 7-6s7 2 7 6v12z" fill="#e5533d"/><path d="M20 27l10-6" stroke="#f7c59f" stroke-width="3" stroke-linecap="round"/><rect x="9" y="40" width="4" height="14" rx="2" fill="#d98b3a"/><rect x="15" y="40" width="4" height="14" rx="2" fill="#d98b3a"/><circle cx="34" cy="44" r="4.5" fill="#2f5bd3"/><circle cx="44" cy="44" r="4.5" fill="#2f5bd3"/><circle cx="54" cy="44" r="4.5" fill="#2f5bd3"/><path d="M28 56c0-4 3-6 6-6s6 2 6 6M38 56c0-4 3-6 6-6s6 2 6 6M48 56c0-4 3-6 6-6s6 2 6 6" stroke="#2f5bd3" stroke-width="3" fill="none"/></svg>',
    take: '<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="44" rx="8" fill="#fff" stroke="#2b2f3a" stroke-width="3"/><path d="M8 20a8 8 0 018-8h32a8 8 0 018 8v4H8z" fill="#ef4444"/><rect x="18" y="6" width="5" height="12" rx="2.5" fill="#2b2f3a"/><rect x="41" y="6" width="5" height="12" rx="2.5" fill="#2b2f3a"/><circle cx="40" cy="42" r="11" fill="#22b573"/><path d="M35 42l4 4 7-8" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="15" y="31" width="6" height="5" rx="1.5" fill="#4f7cf7"/><rect x="15" y="40" width="6" height="5" rx="1.5" fill="#f5a524"/></svg>',
    records: '<svg viewBox="0 0 64 64"><rect x="10" y="8" width="44" height="50" rx="7" fill="#fff" stroke="#2b2f3a" stroke-width="3"/><rect x="22" y="4" width="20" height="9" rx="4" fill="#d9a441"/><rect x="18" y="22" width="7" height="7" rx="2" fill="#22b573"/><rect x="29" y="24" width="18" height="3.5" rx="1.7" fill="#9aa3b5"/><rect x="18" y="34" width="7" height="7" rx="2" fill="#ef4444"/><rect x="29" y="36" width="18" height="3.5" rx="1.7" fill="#9aa3b5"/><rect x="18" y="46" width="7" height="7" rx="2" fill="#22b573"/><rect x="29" y="48" width="14" height="3.5" rx="1.7" fill="#9aa3b5"/></svg>',
    audit: '<svg viewBox="0 0 64 64"><path d="M32 5l21 8v17c0 14-9 24-21 29C20 54 11 44 11 30V13z" fill="#ef4444"/><path d="M32 10l16 6v14c0 11-7 19-16 23-9-4-16-12-16-23V16z" fill="#fff"/><circle cx="32" cy="31" r="10" fill="none" stroke="#2b2f3a" stroke-width="3"/><path d="M32 25v6l4 3" stroke="#2b2f3a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
    face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-3 3-4 5-4s4 1 5 4"/></svg>'
  };


  // line icons (navy/teal theme)
  function li(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
  var L = {
    home: li('<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>'),
    users: li('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 4.9"/>'),
    userPlus: li('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M19 8v6M16 11h6"/>'),
    layers: li('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    scan: li('<path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17.5c1-2.2 2.6-3.2 4.5-3.2s3.5 1 4.5 3.2"/>'),
    clipboard: li('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>'),
    shield: li('<path d="M12 3l8 3v6c0 5-3.4 8.3-8 9.5C7.4 20.3 4 17 4 12V6z"/><path d="M9 12l2 2 4-4"/>'),
    arrow: li('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    calendar: li('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
    key: li('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
    user: li('<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5"/>'),
    camera: li('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13.5" r="3.5"/>')
  };

  // ---------------------------------------------------------------- helpers
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      if (val === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function badgeText(cls) {
    var parts = String(cls).split(/[-_\s/]+/).filter(Boolean);
    for (var i = 0; i < parts.length; i++) if (/^[A-Z0-9]{2,4}$/.test(parts[i])) return parts[i];
    var m = String(cls).match(/\d+/);
    if (m) return m[0].slice(0, 3);
    return String(cls).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'C';
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  var toastTimer;
  function toast(msg, isErr) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3800);
  }

  function modal(opts) {
    return new Promise(function (resolve) {
      var root = $('#modal-root');
      root.innerHTML =
        '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title) + '</h3><p>' + esc(opts.text || '') + '</p>' +
        (opts.input ? '<div class="field"><label for="m-in">' + esc(opts.input) + '</label><input id="m-in" class="input" /></div>' : '') +
        '<div class="actions"><button class="btn btn-ghost" data-x="0">Cancel</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-primary' : 'btn-primary') + '" data-x="1">' + esc(opts.ok || 'Confirm') + '</button></div>' +
        '</div></div>';
      var input = $('#m-in', root);
      if (input) input.focus();
      root.onclick = function (e) {
        var x = e.target.getAttribute('data-x');
        if (x === null && !e.target.classList.contains('modal-backdrop')) return;
        var ok = x === '1';
        if (ok && input && !input.value.trim()) { input.focus(); return; }
        var val = input ? input.value.trim() : true;
        root.innerHTML = '';
        root.onclick = null;
        resolve(ok ? val : null);
      };
    });
  }

  // ---------------------------------------------------------------- API
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {} };
    if (opts.json !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
    if (opts.form) init.body = opts.form;
    if (session && session.token) init.headers['Authorization'] = 'Bearer ' + session.token;
    return fetch(CONFIG.api + path, init).then(function (res) {
      return res.text().then(function (text) {
        var body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
        if (!res.ok) {
          var d = body && body.detail !== undefined ? body.detail : body;
          var msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map(function (x) { return x.msg || x; }).join('; ') : 'Request failed (' + res.status + ')';
          var err = new Error(msg); err.status = res.status;
          if (res.status === 401 && path.indexOf('/auth/') !== 0 && session) { signOut('Your session ended. Please sign in again.'); }
          throw err;
        }
        return body;
      });
    }, function () {
      throw new Error('Cannot reach the FACE ID server. Check that it is running.');
    });
  }
  function blobForm(blob, name) {
    var f = new FormData();
    f.append('file', blob, name || 'photo.jpg');
    return f;
  }

  // ---------------------------------------------------------------- camera
  var activeStream = null;
  function stopCamera() {
    if (activeStream) { activeStream.getTracks().forEach(function (t) { t.stop(); }); activeStream = null; }
  }
  function startCamera(video, facing) {
    stopCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Camera needs a secure address (https or localhost). Use Upload instead.'));
    }
    var c = { video: { facingMode: facing || 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false };
    return navigator.mediaDevices.getUserMedia(c).catch(function () {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }).then(function (stream) {
      activeStream = stream;
      video.srcObject = stream;
      return video.play().catch(function () {});
    }).catch(function (e) {
      if (e && e.name === 'NotAllowedError') throw new Error('Camera permission was denied. Allow it in the browser and try again.');
      throw e instanceof Error ? e : new Error('Could not open the camera.');
    });
  }
  function grabFrame(video, mirror) {
    return new Promise(function (resolve, reject) {
      var w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return reject(new Error('Camera is not ready yet.'));
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var ctx = c.getContext('2d');
      if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, w, h);
      c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Capture failed.')); }, 'image/jpeg', 0.92);
    });
  }

  // ---------------------------------------------------------------- session + layout
  var session = store('faceid-session');
  function signOut(msg) {
    stopCamera();
    store('faceid-session', null);
    session = null;
    if (msg) toast(msg, true);
    if (location.hash !== '#/login') location.hash = '#/login'; else route();
  }
  function startSession(res) {
    session = { token: res.token, role: res.user.role, name: res.user.name, username: res.user.username };
    store('faceid-session', session);
    location.hash = '#/dashboard';
  }

  var NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'home', href: '#/dashboard', roles: ['admin', 'lecturer'] },
    { key: 'students', label: 'Students', icon: 'users', href: '#/students', roles: ['admin'] },
    { key: 'enroll', label: 'Add Student', icon: 'userPlus', href: '#/students/new', roles: ['admin'] },
    { key: 'classes', label: 'Classes', icon: 'layers', href: '#/classes', roles: ['admin', 'lecturer'] },
    { key: 'take', label: 'Take Attendance', icon: 'scan', href: '#/attendance/take', roles: ['admin', 'lecturer'] },
    { key: 'records', label: 'Records', icon: 'clipboard', href: '#/attendance/records', roles: ['admin', 'lecturer'] },
    { key: 'audit', label: 'Audit Log', icon: 'shield', href: '#/audit', roles: ['admin'] },
    { key: 'users', label: 'Users', icon: 'key', href: '#/users', roles: ['admin'] },
    { key: 'account', label: 'My Account', icon: 'user', href: '#/account', roles: ['admin', 'lecturer'] }
  ];

  function layout(activeKey, inner) {
    var nav = NAV.filter(function (n) { return n.roles.indexOf(session.role) >= 0; });
    var current = nav.filter(function (n) { return n.key === activeKey; })[0];
    var items = nav.map(function (n) {
      return '<a class="nav-item' + (n.key === activeKey ? ' active' : '') + '" href="' + n.href + '">' +
        '<span class="nav-ico">' + L[n.icon] + '</span><span class="nav-label">' + esc(n.label) + '</span></a>';
    }).join('');
    var d = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    return '<aside class="sidebar"><div class="side-brand"><span class="logo">' + I.logo + '</span><div><div class="brand-name">FACE ID</div><div class="brand-sub">' + esc(CONFIG.college) + '</div></div></div>' +
      '<div class="nav-caption">Menu</div><nav class="nav" aria-label="Main">' + items + '</nav>' +
      '<div class="side-foot"><span class="avatar">' + esc(initials(session.name)) + '</span><div class="side-user"><div class="user-name">' + esc(session.name) + '</div><div class="user-role">' + esc(session.role) + '</div></div>' +
      '<button class="icon-btn" id="logout" title="Sign out" aria-label="Sign out">' + I.logout + '</button></div></aside>' +
      '<header class="header"><div><div class="crumb">' + esc(CONFIG.campus) + '</div><div class="header-title">' + esc(current ? current.label : 'FACE ID') + '</div></div>' +
      '<div class="header-spacer"></div><div class="header-date">' + L.calendar + esc(d) + '</div>' +
      '<span class="role-pill">' + esc(session.role) + '</span><button class="icon-btn hdr-logout mobile-only" id="logout2" title="Sign out" aria-label="Sign out">' + I.logout + '</button></header>' +
      '<main class="main">' + inner + '</main>';
  }
  function pageHead(title, sub, backHref, actions) {
    return '<div class="page-head">' +
      (backHref ? '<a class="back" href="' + backHref + '" aria-label="Back">' + I.back + '</a>' : '') +
      '<div><h1 class="page-title">' + esc(title) + '</h1>' + (sub ? '<div class="page-sub">' + sub + '</div>' : '') + '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }
  function loadingHtml(text) { return '<div class="loading"><span class="spinner"></span>' + esc(text || 'Loading…') + '</div>'; }
  function emptyHtml(text, icon) { var map = { students: 'users', classes: 'layers', records: 'clipboard', audit: 'shield' }; return '<div class="empty"><span class="empty-ico">' + L[map[icon || 'students'] || 'users'] + '</span><div>' + text + '</div></div>'; }

  function mount(activeKey, inner) {
    stopCamera();
    $('#app').innerHTML = layout(activeKey, inner);
    $('#logout').onclick = function () { signOut(); };
    $('#logout2').onclick = function () { signOut(); };
    window.scrollTo(0, 0);
  }

  function classOptions(classes, selected, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') +
      classes.map(function (c) {
        var n = c.class_name || c;
        return '<option value="' + esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + esc(n) + '</option>';
      }).join('');
  }
  function query() {
    var q = {}, s = location.hash.split('?')[1] || '';
    s.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return q;
  }

  // ---------------------------------------------------------------- pages
  function pageLogin() {
    stopCamera();
    var hero = '<section class="login-hero"><div class="login-brand"><span class="logo">' + I.logo + '</span><span>FACE ID</span></div>' +
      '<h1>Attendance in<br><em>one photo.</em></h1>' +
      '<p>One classroom photo, every student recognised. AI attendance for ' + esc(CONFIG.college) + ', with lecturer review and a full audit trail.</p>' +
      '<div class="feature-list"><div>' + I.check.replace('<svg', '<svg width="20" height="20"') + ' Face detection (SCRFD) + our trained ArcFace model</div>' +
      '<div>' + I.check.replace('<svg', '<svg width="20" height="20"') + ' Enroll students with the camera in seconds</div>' +
      '<div>' + I.check.replace('<svg', '<svg width="20" height="20"') + ' 1-hour correction window, every change audited</div></div></section>';
    $('#app').innerHTML = '<div class="login">' + hero + '<section class="login-side" id="login-side">' + loadingHtml('Connecting…') + '</section></div>';

    function showLogin() {
      $('#login-side').innerHTML = '<form class="login-card" id="login-form" autocomplete="on">' +
        '<h2>Sign in</h2><div class="hint">Use the account given to you by the admin</div>' +
        '<div class="field"><label for="u">Username</label><input id="u" class="input" autocomplete="username" autocapitalize="none" required /></div>' +
        '<div class="field"><label for="p">Password</label><input id="p" type="password" class="input" autocomplete="current-password" required /></div>' +
        '<button class="btn btn-primary btn-block" type="submit" id="go">Sign in</button>' +
        '<div class="demo-note">Forgot your password? Ask the admin to reset it.</div></form>';
      $('#u').focus();
      $('#login-form').onsubmit = function (e) {
        e.preventDefault();
        var btn = $('#go'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Signing in…';
        api('/auth/login', { method: 'POST', json: { username: $('#u').value.trim(), password: $('#p').value } })
          .then(startSession)
          .catch(function (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Sign in'; $('#p').select(); });
      };
    }
    function showSetup() {
      $('#login-side').innerHTML = '<form class="login-card" id="setup-form" autocomplete="off">' +
        '<h2>Create admin account</h2><div class="hint">First time setup. This account manages students, lecturers and records.</div>' +
        '<div class="field"><label for="n">Your full name</label><input id="n" class="input" required /></div>' +
        '<div class="field"><label for="u">Username</label><input id="u" class="input" placeholder="e.g. amrutha" autocapitalize="none" required /></div>' +
        '<div class="field"><label for="p">Password</label><input id="p" type="password" class="input" autocomplete="new-password" placeholder="At least 8 characters" required /></div>' +
        '<div class="field"><label for="p2">Confirm password</label><input id="p2" type="password" class="input" autocomplete="new-password" required /></div>' +
        '<button class="btn btn-primary btn-block" type="submit" id="go">Create admin account</button>' +
        '<div class="demo-note">The password is stored securely (hashed) on the server. Keep it safe.</div></form>';
      $('#n').focus();
      $('#setup-form').onsubmit = function (e) {
        e.preventDefault();
        if ($('#p').value !== $('#p2').value) { toast('Passwords do not match', true); return; }
        var btn = $('#go'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Creating…';
        api('/auth/setup', { method: 'POST', json: { name: $('#n').value.trim(), username: $('#u').value.trim(), password: $('#p').value } })
          .then(function (res) { toast('Admin account created'); startSession(res); })
          .catch(function (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Create admin account'; if (err.status === 409) showLogin(); });
      };
    }
    api('/auth/status').then(function (st) { st.needs_setup ? showSetup() : showLogin(); })
      .catch(function (err) { $('#login-side').innerHTML = '<div class="login-card"><div class="alert alert-err">' + esc(err.message) + '</div><button class="btn btn-ghost btn-block" onclick="location.reload()">Try again</button></div>'; });
  }

  function pageDashboard() {
    var isAdmin = session.role === 'admin';
    var mods = [
      { icon: 'scan', name: 'Take Attendance', desc: 'Camera or classroom photo', href: '#/attendance/take' },
      { icon: 'userPlus', name: 'Add Student', desc: 'Register and capture face', href: '#/students/new', admin: true },
      { icon: 'users', name: 'Students', desc: 'Roster and face status', href: '#/students', admin: true },
      { icon: 'layers', name: 'Classes', desc: 'Class-wise students', href: '#/classes' },
      { icon: 'clipboard', name: 'Records', desc: 'View and correct attendance', href: '#/attendance/records' },
      { icon: 'shield', name: 'Audit Log', desc: 'Every correction, who and why', href: '#/audit', admin: true }
    ].filter(function (m) { return isAdmin || !m.admin; });
    var first = session.name.split(' ')[0];
    mount('dashboard',
      '<section class="hero"><div><div class="eyebrow">' + greeting() + '</div><h1>Welcome back, ' + esc(first) + '</h1>' +
      '<p>' + (isAdmin ? 'Enroll students with the camera and keep attendance records accurate.' : 'Take a classroom photo and FACE ID marks attendance for you.') + '</p></div>' +
      '<div class="hero-actions"><a class="btn btn-primary" href="#/attendance/take">' + L.scan + 'Take attendance</a>' +
      (isAdmin ? '<a class="btn btn-ghost" href="#/students/new">' + L.userPlus + 'Add student</a>' : '') + '</div></section>' +
      '<div class="stats" id="stats">' + loadingHtml('Loading summary…') + '</div>' +
      '<div class="section-title"><h2>Quick actions</h2></div>' +
      '<div class="actions-grid">' + mods.map(function (m) {
        return '<a class="action-card" href="' + m.href + '"><span class="action-ico">' + L[m.icon] + '</span><span class="action-text"><span class="action-name">' + esc(m.name) + '</span><span class="action-desc">' + esc(m.desc) + '</span></span><span class="action-go">' + L.arrow + '</span></a>';
      }).join('') + '</div>');

    api('/admin/stats').then(function (s) {
      var pct = s.today_marked ? Math.round(100 * s.today_present / s.today_marked) : null;
      var enrolledPct = s.students ? Math.round(100 * s.enrolled_students / s.students) : 0;
      var cards = [
        ['users', s.students, 'Students', plural(s.classes, 'class').replace('classs', 'classes')],
        ['scan', s.enrolled_students + '/' + s.students, 'Faces enrolled', enrolledPct + '% ready'],
        ['layers', s.classes, 'Classes', s.faces + ' face photos stored'],
        ['clipboard', pct === null ? '—' : pct + '%', 'Present today', s.today_marked ? s.today_present + ' of ' + s.today_marked + ' marked' : 'No attendance yet today']
      ];
      $('#stats').innerHTML = cards.map(function (c) {
        return '<div class="stat"><div class="stat-top"><span class="stat-label">' + c[2] + '</span><span class="stat-icon">' + L[c[0]] + '</span></div><div class="stat-value">' + esc(c[1]) + '</div><div class="stat-note">' + esc(c[3]) + '</div></div>';
      }).join('');
    }).catch(function (e) {
      $('#stats').innerHTML = '<div class="alert alert-err" style="grid-column:1/-1">' + esc(e.message) + '</div>';
    });
  }

  function pageStudents() {
    var q = query();
    mount('students', pageHead('Students', '<span id="st-sub">Loading…</span>', '#/dashboard',
      '<a class="btn btn-primary" href="#/students/new">' + I.plus + 'Add student</a>') +
      '<div class="toolbar"><input id="search" class="input" placeholder="Search name or ID…" />' +
      '<select id="cls" class="select"></select></div><div id="list">' + loadingHtml() + '</div>');

    var all = [];
    function draw() {
      var s = $('#search').value.trim().toLowerCase(), c = $('#cls').value;
      var rows = all.filter(function (st) {
        return (!c || st.class_name === c) && (!s || st.name.toLowerCase().indexOf(s) >= 0 || st.student_id.toLowerCase().indexOf(s) >= 0);
      });
      if (!rows.length) { $('#list').innerHTML = '<div class="table-wrap">' + emptyHtml(all.length ? 'No students match.' : 'No students yet. Add your first student and capture their face.') + '</div>'; return; }
      $('#list').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Student</th><th class="hide-sm">ID</th><th>Class</th><th>Face</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
        rows.map(function (st) {
          var face = st.face_count > 0
            ? '<span class="pill pill-green">' + I.check.replace('<svg', '<svg width="14" height="14"') + st.face_count + ' photo' + (st.face_count > 1 ? 's' : '') + '</span>'
            : '<span class="pill pill-amber">Not enrolled</span>';
          return '<tr><td><div class="who"><span class="avatar">' + esc(initials(st.name)) + '</span><div><div style="font-weight:600">' + esc(st.name) + '</div><div class="mono">' + esc(st.email || '') + '</div></div></div></td>' +
            '<td class="mono hide-sm">' + esc(st.student_id) + '</td><td>' + esc(st.class_name) + '</td><td>' + face + '</td>' +
            '<td><div class="actions"><a class="btn btn-ghost btn-sm" href="#/students/' + encodeURIComponent(st.student_id) + '/face">' + I.cam + 'Capture face</a>' +
            '<button class="btn btn-danger btn-sm" data-del="' + esc(st.student_id) + '" data-name="' + esc(st.name) + '">' + I.trash + '<span class="hide-sm">Remove</span></button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      $all('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-del'), name = b.getAttribute('data-name');
          modal({ title: 'Remove ' + name + '?', text: 'Their face data and attendance records are deleted. Audit history is kept.', ok: 'Remove', danger: true }).then(function (ok) {
            if (!ok) return;
            api('/admin/students/' + encodeURIComponent(id), { method: 'DELETE' }).then(function (r) { toast(r.message); load(); }).catch(function (e) { toast(e.message, true); });
          });
        };
      });
    }
    function load() {
      api('/admin/students').then(function (d) {
        all = d.students;
        var classes = []; all.forEach(function (s) { if (classes.indexOf(s.class_name) < 0) classes.push(s.class_name); });
        var keep = $('#cls').value || q['class'] || '';
        $('#cls').innerHTML = classOptions(classes, keep, 'All classes');
        var enrolled = all.filter(function (s) { return s.face_count > 0; }).length;
        $('#st-sub').textContent = plural(all.length, 'student') + ' · ' + plural(classes.length, 'class').replace('classs', 'classes') + ' · ' + enrolled + ' with face enrolled';
        draw();
      }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    $('#search').oninput = draw;
    $('#cls').onchange = draw;
    load();
  }

  // Add student (new) or capture more faces for an existing student
  function pageEnroll(existingId) {
    var isNew = !existingId;
    var shots = []; // {blob, url, status, note}
    mount(isNew ? 'enroll' : 'students',
      pageHead(isNew ? 'Add Student' : 'Capture Face', isNew ? 'Register the student and capture their face with the camera' : 'Add face photos for <b id="who">' + esc(existingId) + '</b>', isNew ? '#/dashboard' : '#/students') +
      '<div class="grid2"><div class="panel"><h3>1 · Student details</h3><div class="hint">' + (isNew ? 'Use the roll number as the Student ID.' : 'This student is already registered.') + '</div>' +
      '<div class="field"><label for="sid">Student ID / Roll number</label><input id="sid" class="input" placeholder="e.g. 23DS001" ' + (isNew ? '' : 'disabled') + ' /></div>' +
      '<div class="field"><label for="sname">Full name</label><input id="sname" class="input" placeholder="Student name" ' + (isNew ? '' : 'disabled') + ' /></div>' +
      '<div class="field"><label for="scls">Class</label><input id="scls" class="input" list="cls-list" placeholder="e.g. BSc-DS-A" ' + (isNew ? '' : 'disabled') + ' /><datalist id="cls-list"></datalist></div>' +
      (isNew ? '<div class="field"><label for="semail">Email (optional)</label><input id="semail" class="input" type="email" placeholder="student@example.com" /></div>' : '') +
      '<ul class="tips"><li>Only one person in front of the camera, face fully visible.</li><li>Good light on the face, no strong light behind.</li><li>Take 4–6 photos: straight, slightly left, slightly right, slightly up.</li><li>Remove glasses or masks if possible.</li></ul></div>' +
      '<div class="panel"><h3>2 · Capture face</h3><div class="hint">Photos are checked and enrolled when you save.</div>' +
      '<div class="camera" id="cam"><div class="camera-empty" id="cam-empty">' + I.face.replace('<svg', '<svg width="56" height="56"') + '<div>Camera is off</div></div>' +
      '<video id="video" class="hidden" playsinline muted></video><div class="face-guide hidden" id="guide"></div></div>' +
      '<div class="camera-bar"><button class="btn btn-ghost" id="start">' + I.cam + 'Start camera</button>' +
      '<button class="btn btn-gold" id="snap" disabled>' + I.cam + 'Capture photo</button>' +
      '<label class="btn btn-ghost">' + I.upload + 'Upload<input type="file" id="file" accept="image/jpeg,image/png" multiple class="hidden" /></label></div>' +
      '<div class="shots" id="shots"></div>' +
      '<div id="msg"></div>' +
      '<button class="btn btn-primary btn-block" id="save" style="margin-top:16px" disabled>' + I.check + (isNew ? 'Save student & enroll face' : 'Enroll photos') + '</button></div></div>');

    if (!isNew) {
      api('/admin/students').then(function (d) {
        var st = d.students.filter(function (s) { return s.student_id === existingId; })[0];
        if (!st) { $('#msg').innerHTML = '<div class="alert alert-err">Student not found.</div>'; return; }
        $('#sid').value = st.student_id; $('#sname').value = st.name; $('#scls').value = st.class_name;
        $('#who').textContent = st.name + ' (' + st.student_id + ') · ' + st.face_count + ' photo(s) enrolled';
      }).catch(function (e) { toast(e.message, true); });
    } else {
      api('/admin/classes').then(function (d) {
        $('#cls-list').innerHTML = d.classes.map(function (c) { return '<option value="' + esc(c.class_name) + '">'; }).join('');
        var q = query(); if (q['class']) $('#scls').value = q['class'];
      }).catch(function () {});
    }

    function drawShots() {
      var html = shots.map(function (s, i) {
        return '<div class="shot ' + (s.status || '') + '" title="' + esc(s.note || '') + '"><img src="' + s.url + '" alt="Photo ' + (i + 1) + '" />' +
          (s.status ? '<span class="tag">' + (s.status === 'ok' ? 'Enrolled' : 'Rejected') + '</span>' : '<button data-rm="' + i + '" aria-label="Remove photo">×</button>') + '</div>';
      }).join('');
      for (var k = shots.length; k < CONFIG.maxEnrollShots; k++) html += '<div class="shot empty-shot">' + (k + 1) + '</div>';
      $('#shots').innerHTML = html;
      $all('[data-rm]').forEach(function (b) { b.onclick = function () { shots.splice(+b.getAttribute('data-rm'), 1); drawShots(); }; });
      var pending = shots.filter(function (s) { return !s.status; }).length;
      $('#save').disabled = pending === 0;
      $('#snap').disabled = !activeStream || shots.length >= CONFIG.maxEnrollShots;
    }
    function addBlob(blob) {
      if (shots.length >= CONFIG.maxEnrollShots) { toast('Maximum ' + CONFIG.maxEnrollShots + ' photos'); return; }
      shots.push({ blob: blob, url: URL.createObjectURL(blob) });
      drawShots();
    }
    drawShots();

    $('#start').onclick = function () {
      var v = $('#video');
      startCamera(v, 'user').then(function () {
        v.classList.remove('hidden'); $('#guide').classList.remove('hidden'); $('#cam-empty').classList.add('hidden');
        $('#start').innerHTML = I.cam + 'Restart camera';
        drawShots();
      }).catch(function (e) { $('#msg').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    };
    $('#snap').onclick = function () { grabFrame($('#video'), true).then(addBlob).catch(function (e) { toast(e.message, true); }); };
    $('#file').onchange = function (e) { Array.prototype.forEach.call(e.target.files, function (f) { addBlob(f); }); e.target.value = ''; };

    $('#save').onclick = function () {
      var sid = $('#sid').value.trim().toUpperCase(), name = $('#sname').value.trim(), cls = $('#scls').value.trim();
      if (!sid || !name || !cls) { toast('Fill Student ID, name and class first', true); return; }
      var btn = $('#save'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Saving…';
      $('#msg').innerHTML = '';
      var first = isNew
        ? api('/students', { method: 'POST', json: { student_id: sid, name: name, class_name: cls, email: ($('#semail').value.trim() || null) } })
          .catch(function (e) { if (e.status === 409) throw new Error('Student ID ' + sid + ' already exists. Open it from Students → Capture face.'); throw e; })
        : Promise.resolve();
      first.then(function () {
        isNew = false;
        $('#sid').disabled = $('#sname').disabled = $('#scls').disabled = true;
        var pending = shots.filter(function (s) { return !s.status; });
        return pending.reduce(function (p, s) {
          return p.then(function () {
            return api('/students/' + encodeURIComponent(sid) + '/faces', { method: 'POST', form: blobForm(s.blob, 'face.jpg') })
              .then(function () { s.status = 'ok'; }, function (e) { s.status = 'bad'; s.note = e.message; })
              .then(drawShots);
          });
        }, Promise.resolve());
      }).then(function () {
        var ok = shots.filter(function (s) { return s.status === 'ok'; }).length;
        var bad = shots.filter(function (s) { return s.status === 'bad'; });
        if (ok && !bad.length) {
          stopCamera();
          toast(name + ': ' + ok + ' face photo(s) enrolled');
          location.hash = '#/students';
          return;
        }
        $('#msg').innerHTML =
          (ok ? '<div class="alert alert-ok">' + ok + ' photo(s) enrolled.</div>' : '') +
          (bad.length ? '<div class="alert alert-warn">' + bad.length + ' photo(s) rejected: ' + esc(bad[0].note) + ' Remove them or capture new ones and save again.</div>' : '');
        shots = shots.filter(function (s) { return s.status !== 'bad'; });
        btn.innerHTML = I.check + 'Enroll more photos';
        drawShots();
      }).catch(function (e) {
        $('#msg').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>';
        btn.innerHTML = I.check + 'Save student & enroll face';
        drawShots();
      });
    };
  }

  function pageClasses() {
    var add = session.role === 'admin' ? '<a class="btn btn-primary" href="#/students/new">' + I.plus + 'Add student to new class</a>' : '';
    mount('classes', pageHead('Classes', '<span id="cl-sub">Loading…</span>', '#/dashboard', add) + '<div id="list">' + loadingHtml() + '</div>');
    api('/admin/classes').then(function (d) {
      var total = d.classes.reduce(function (a, c) { return a + c.students; }, 0);
      $('#cl-sub').textContent = CONFIG.college + ' · ' + plural(d.classes.length, 'class').replace('classs', 'classes') + ' · ' + plural(total, 'student');
      if (!d.classes.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No classes yet. A class appears when you add its first student.', 'classes') + '</div>'; return; }
      $('#list').innerHTML = '<div class="cards3">' + d.classes.map(function (c, i) {
        var pct = c.students ? Math.round(100 * c.enrolled / c.students) : 0;
        return '<a class="class-card" href="#/classes/' + encodeURIComponent(c.class_name) + '"><div class="class-top"><span class="class-badge c' + (i % 4) + '">' + esc(badgeText(c.class_name)) + '</span><span class="action-go">' + L.arrow + '</span></div>' +
          '<div class="class-name">' + esc(c.class_name) + '</div><div class="class-meta">' + plural(c.students, 'student') + '</div>' +
          '<div class="progress"><i style="width:' + pct + '%"></i></div><div class="class-meta small">' + c.enrolled + ' of ' + c.students + ' faces enrolled</div></a>';
      }).join('') + '</div>';
    }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
  }

  function pageClass(name) {
    var isAdmin = session.role === 'admin';
    mount('classes', pageHead(name, '<span id="c-sub">Loading…</span>', '#/classes',
      '<a class="btn btn-gold" href="#/attendance/take?class=' + encodeURIComponent(name) + '">' + I.cam + 'Take attendance</a>' +
      '<a class="btn btn-ghost" href="#/attendance/records?class=' + encodeURIComponent(name) + '">Records</a>' +
      (isAdmin ? '<a class="btn btn-primary" href="#/students/new?class=' + encodeURIComponent(name) + '">' + I.plus + 'Add student</a>' : '')) +
      '<div id="list">' + loadingHtml() + '</div>');
    api('/admin/students').then(function (d) {
      var rows = d.students.filter(function (s) { return s.class_name === name; });
      var enrolled = rows.filter(function (s) { return s.face_count > 0; }).length;
      $('#c-sub').textContent = plural(rows.length, 'student') + ' · ' + enrolled + ' with face enrolled';
      if (!rows.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No students in this class.') + '</div>'; return; }
      $('#list').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Face</th>' + (isAdmin ? '<th></th>' : '') + '</tr></thead><tbody>' +
        rows.map(function (st) {
          return '<tr><td><div class="who"><span class="avatar">' + esc(initials(st.name)) + '</span><span style="font-weight:600">' + esc(st.name) + '</span></div></td><td class="mono">' + esc(st.student_id) + '</td>' +
            '<td>' + (st.face_count > 0 ? '<span class="pill pill-green">Enrolled</span>' : '<span class="pill pill-amber">Not enrolled</span>') + '</td>' +
            (isAdmin ? '<td><div class="actions"><a class="btn btn-ghost btn-sm" href="#/students/' + encodeURIComponent(st.student_id) + '/face">' + I.cam + 'Capture face</a></div></td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
  }

  function pageTake() {
    var q = query();
    var photos = []; // {blob, url, name}
    var mode = 'camera';
    mount('take', pageHead('Take Attendance', 'Capture or upload the classroom photo. Students are recognised and attendance is saved.', '#/dashboard') +
      '<div class="grid2"><div class="panel"><h3>1 · Session</h3><div class="hint">Choose the class and date.</div>' +
      '<div class="field"><label for="cls">Class</label><select id="cls" class="select"><option>Loading…</option></select></div>' +
      '<div class="field"><label for="date">Date</label><input id="date" type="date" class="input" value="' + (q.date || today()) + '" /></div>' +
      '<div class="alert alert-warn" style="font-weight:500">Attendance for a class and date can be changed for ' + CONFIG.editWindowMinutes + ' minutes after it is first saved. After that it is locked.</div>' +
      '<ul class="tips"><li>Whole class in one photo works for small rooms.</li><li>For big rooms take one photo per row and analyse them together.</li><li>Faces should be clear and not too small.</li></ul></div>' +
      '<div class="panel"><h3>2 · Classroom photo</h3><div class="hint">One photo = whole class. Several photos = row by row.</div>' +
      '<div class="tabs"><button class="tab active" data-mode="camera">' + 'Camera</button><button class="tab" data-mode="upload">Upload</button></div>' +
      '<div class="camera env" id="cam"><div class="camera-empty" id="cam-empty">' + I.cam.replace('<svg', '<svg width="56" height="56"') + '<div id="cam-text">Camera is off</div></div>' +
      '<video id="video" class="hidden" playsinline muted></video></div>' +
      '<div class="camera-bar" id="cam-bar"><button class="btn btn-ghost" id="start">' + I.cam + 'Start camera</button>' +
      '<button class="btn btn-ghost" id="flip" disabled>Switch camera</button>' +
      '<button class="btn btn-gold" id="snap" disabled>' + I.cam + 'Capture</button></div>' +
      '<div class="camera-bar hidden" id="up-bar"><label class="btn btn-gold">' + I.upload + 'Choose photo(s)<input type="file" id="file" accept="image/jpeg,image/png" multiple class="hidden" /></label></div>' +
      '<div class="shots" id="shots"></div>' +
      '<button class="btn btn-primary btn-block" id="go" style="margin-top:16px" disabled>' + I.check + 'Analyze & save attendance</button></div></div>' +
      '<div id="result" style="margin-top:22px"></div>');

    api('/admin/classes').then(function (d) {
      if (!d.classes.length) { $('#cls').innerHTML = '<option value="">No classes yet</option>'; return; }
      $('#cls').innerHTML = classOptions(d.classes, q['class'] || d.classes[0].class_name);
    }).catch(function (e) { toast(e.message, true); });

    var facing = 'environment';
    function drawShots() {
      $('#shots').innerHTML = photos.map(function (p, i) {
        return '<div class="shot"><img src="' + p.url + '" alt="Photo ' + (i + 1) + '" /><button data-rm="' + i + '" aria-label="Remove photo">×</button></div>';
      }).join('');
      $all('[data-rm]').forEach(function (b) { b.onclick = function () { photos.splice(+b.getAttribute('data-rm'), 1); drawShots(); }; });
      $('#go').disabled = !photos.length;
      $('#go').innerHTML = I.check + (photos.length > 1 ? 'Analyze ' + photos.length + ' row photos & save' : 'Analyze & save attendance');
    }
    $all('.tab').forEach(function (t) {
      t.onclick = function () {
        mode = t.getAttribute('data-mode');
        $all('.tab').forEach(function (x) { x.classList.toggle('active', x === t); });
        $('#cam').classList.toggle('hidden', mode !== 'camera');
        $('#cam-bar').classList.toggle('hidden', mode !== 'camera');
        $('#up-bar').classList.toggle('hidden', mode !== 'upload');
        if (mode !== 'camera') stopCamera();
      };
    });
    function openCam() {
      var v = $('#video');
      $('#cam').classList.toggle('env', facing === 'environment');
      startCamera(v, facing).then(function () {
        v.classList.remove('hidden'); $('#cam-empty').classList.add('hidden');
        $('#snap').disabled = false; $('#flip').disabled = false;
      }).catch(function (e) { $('#cam-text').textContent = e.message; });
    }
    $('#start').onclick = openCam;
    $('#flip').onclick = function () { facing = facing === 'user' ? 'environment' : 'user'; openCam(); };
    $('#snap').onclick = function () {
      grabFrame($('#video'), facing === 'user').then(function (b) {
        photos.push({ blob: b, url: URL.createObjectURL(b), name: 'classroom_' + (photos.length + 1) + '.jpg' }); drawShots();
      }).catch(function (e) { toast(e.message, true); });
    };
    $('#file').onchange = function (e) {
      Array.prototype.forEach.call(e.target.files, function (f) { photos.push({ blob: f, url: URL.createObjectURL(f), name: f.name }); });
      e.target.value = ''; drawShots();
    };
    drawShots();

    $('#go').onclick = function () {
      var cls = $('#cls').value, date = $('#date').value;
      if (!cls) { toast('Choose a class', true); return; }
      if (!date) { toast('Choose a date', true); return; }
      var btn = $('#go'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Recognising faces… (10–40 s)';
      var qs = '?attendance_date=' + encodeURIComponent(date) + '&confirm_review=true';
      var req;
      if (photos.length === 1) {
        req = api('/attendance/mark-from-recognition/' + encodeURIComponent(cls) + qs, { method: 'POST', form: blobForm(photos[0].blob, photos[0].name) });
      } else {
        var f = new FormData();
        photos.forEach(function (p) { f.append('files', p.blob, p.name); });
        req = api('/attendance/mark-from-rows/' + encodeURIComponent(cls) + qs, { method: 'POST', form: f });
      }
      Promise.all([req, api('/admin/students')]).then(function (r) {
        showResult(r[0], cls, date, r[1].students.filter(function (s) { return s.class_name === cls; }));
        stopCamera();
      }).catch(function (e) {
        $('#result').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>';
      }).then(function () { drawShots(); });
    };
  }

  function showResult(res, cls, date, roster) {
    var rec = res.recognition || {};
    var present = rec.present_students || [];
    var presentIds = present.map(function (p) { return p.student_id; });
    var absent = roster.filter(function (s) { return presentIds.indexOf(s.student_id) < 0; });
    var flags = res.review_reasons || [];
    var stats = [
      [rec.total_faces_detected != null ? rec.total_faces_detected : '—', 'Faces detected'],
      [present.length + ' / ' + roster.length, 'Present'],
      [absent.length, 'Absent'],
      [rec.unknown_faces || 0, 'Unknown faces'],
      [rec.duplicate_matches || 0, 'Duplicates']
    ];
    $('#result').innerHTML = '<div class="panel"><div class="page-head" style="margin-bottom:6px"><div><h2 class="page-title" style="font-size:22px">Attendance saved</h2>' +
      '<div class="page-sub">' + esc(cls) + ' · ' + fmtDate(date) + (rec.model ? ' · model ' + esc(rec.model) : '') + '</div></div>' +
      '<div class="page-actions"><a class="btn btn-primary" href="#/attendance/records?class=' + encodeURIComponent(cls) + '&date=' + date + '">Review & correct</a></div></div>' +
      (flags.length ? '<div class="alert alert-warn">Please review: ' + esc(flags.join(' · ')) + '</div>' : '<div class="alert alert-ok">' + I.check.replace('<svg', '<svg width="18" height="18"') + ' All faces matched enrolled students.</div>') +
      '<div class="result-stats">' + stats.map(function (s) { return '<div class="mini"><div class="v">' + esc(s[0]) + '</div><div class="l">' + s[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="grid2" style="grid-template-columns:1fr 1fr"><div><h3 style="margin-bottom:10px">Present (' + present.length + ')</h3><div class="table-wrap"><table><tbody>' +
      (present.length ? present.map(function (p) {
        var c = p.confidence != null ? Math.round(p.confidence * 1000) / 10 : null;
        return '<tr><td><div class="who"><span class="avatar">' + esc(initials(p.name)) + '</span><div><div style="font-weight:600">' + esc(p.name) + '</div><div class="mono">' + esc(p.student_id) + '</div></div></div></td>' +
          '<td style="text-align:right">' + (c != null ? '<div style="font-weight:700">' + c + '%</div><div class="bar" style="margin-left:auto"><i style="width:' + Math.min(100, c) + '%"></i></div>' : '') + '</td></tr>';
      }).join('') : '<tr><td class="empty">Nobody recognised</td></tr>') + '</tbody></table></div></div>' +
      '<div><h3 style="margin-bottom:10px">Absent (' + absent.length + ')</h3><div class="table-wrap"><table><tbody>' +
      (absent.length ? absent.map(function (s) {
        return '<tr><td><div class="who"><span class="avatar">' + esc(initials(s.name)) + '</span><div><div style="font-weight:600">' + esc(s.name) + '</div><div class="mono">' + esc(s.student_id) + '</div></div></div></td><td style="text-align:right"><span class="pill pill-red">Absent</span></td></tr>';
      }).join('') : '<tr><td class="empty">Everyone is present</td></tr>') + '</tbody></table></div></div></div></div>';
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pageRecords() {
    var q = query();
    mount('records', pageHead('Attendance Records', 'View saved attendance and correct mistakes within ' + CONFIG.editWindowMinutes + ' minutes', '#/dashboard') +
      '<div class="toolbar"><select id="cls" class="select"><option>Loading…</option></select><select id="dates" class="select"></select>' +
      '<input id="date" type="date" class="input" value="' + (q.date || '') + '" title="Or pick any date" /></div>' +
      '<div id="list"></div>');

    function loadDates(cls, pick) {
      return api('/admin/attendance-dates/' + encodeURIComponent(cls)).then(function (d) {
        $('#dates').innerHTML = d.dates.length
          ? d.dates.map(function (x) { return '<option value="' + x.date + '">' + fmtDate(x.date) + ' — ' + x.present + '/' + x.total + ' present</option>'; }).join('')
          : '<option value="">No attendance saved yet</option>';
        var date = pick || (d.dates[0] && d.dates[0].date) || '';
        if (date && d.dates.some(function (x) { return x.date === date; })) $('#dates').value = date;
        $('#date').value = date;
        load();
      });
    }
    function load() {
      var cls = $('#cls').value, date = $('#date').value;
      if (!cls || !date) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('Choose a class and a date.', 'records') + '</div>'; return; }
      $('#list').innerHTML = loadingHtml();
      api('/attendance/' + encodeURIComponent(cls) + '/' + date).then(function (d) {
        if (!d.records.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No attendance saved for ' + esc(cls) + ' on ' + fmtDate(date) + '.', 'records') + '</div>'; return; }
        var marked = d.records.map(function (r) { return r.marked_at; }).filter(Boolean).sort()[0];
        var deadline = marked ? new Date(new Date(marked).getTime() + CONFIG.editWindowMinutes * 60000) : null;
        var locked = !deadline || Date.now() > deadline.getTime();
        var p = d.records.filter(function (r) { return r.status === 'Present'; }).length;
        $('#list').innerHTML =
          (locked ? '<div class="alert alert-warn">' + I.lock + ' Locked — the ' + CONFIG.editWindowMinutes + '-minute correction window ended' + (deadline ? ' at ' + fmtTime(deadline.toISOString()) : '') + '.</div>'
            : '<div class="alert alert-ok">Corrections open until ' + fmtTime(deadline.toISOString()) + '. Every change is recorded in the audit log.</div>') +
          '<div class="result-stats" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="mini"><div class="v">' + p + '</div><div class="l">Present</div></div><div class="mini"><div class="v">' + (d.records.length - p) + '</div><div class="l">Absent</div></div><div class="mini"><div class="v">' + Math.round(100 * p / d.records.length) + '%</div><div class="l">Attendance</div></div></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Student</th><th class="hide-sm">ID</th><th>Status</th><th class="hide-sm">Marked at</th><th style="text-align:right">Correction</th></tr></thead><tbody>' +
          d.records.map(function (r) {
            var other = r.status === 'Present' ? 'Absent' : 'Present';
            return '<tr><td><div class="who"><span class="avatar">' + esc(initials(r.name)) + '</span><span style="font-weight:600">' + esc(r.name) + '</span></div></td><td class="mono hide-sm">' + esc(r.student_id) + '</td>' +
              '<td><span class="pill ' + (r.status === 'Present' ? 'pill-green' : 'pill-red') + '">' + esc(r.status) + '</span></td><td class="hide-sm mono">' + fmtTime(r.marked_at) + '</td>' +
              '<td><div class="actions">' + (locked ? '<span class="pill pill-grey">' + I.lock + ' Locked</span>' : '<button class="btn btn-ghost btn-sm" data-fix="' + esc(r.student_id) + '" data-to="' + other + '" data-name="' + esc(r.name) + '">Mark ' + other + '</button>') + '</div></td></tr>';
          }).join('') + '</tbody></table></div>';
        $all('[data-fix]').forEach(function (b) {
          b.onclick = function () {
            var sid = b.getAttribute('data-fix'), to = b.getAttribute('data-to');
            modal({ title: 'Mark ' + b.getAttribute('data-name') + ' ' + to + '?', text: 'This correction is saved in the audit log.', input: 'Reason', ok: 'Save correction' }).then(function (reason) {
              if (!reason) return;
              api('/attendance/correct/' + encodeURIComponent(sid) + '?class_name=' + encodeURIComponent(cls) + '&attendance_date=' + date,
                { method: 'PATCH', json: { new_status: to, edited_by: session.name, reason: reason } })
                .then(function () { toast('Correction saved'); loadDates(cls, date); })
                .catch(function (e) { toast(e.message, true); });
            });
          };
        });
      }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    api('/admin/classes').then(function (d) {
      if (!d.classes.length) { $('#cls').innerHTML = '<option value="">No classes</option>'; load(); return; }
      $('#cls').innerHTML = classOptions(d.classes, q['class'] || d.classes[0].class_name);
      loadDates($('#cls').value, q.date);
    }).catch(function (e) { toast(e.message, true); });
    $('#cls').onchange = function () { loadDates($('#cls').value); };
    $('#dates').onchange = function () { $('#date').value = $('#dates').value; load(); };
    $('#date').onchange = load;
  }

  function pageAudit() {
    mount('audit', pageHead('Audit Log', 'Every attendance correction: who changed it, when and why', '#/dashboard') +
      '<div class="toolbar"><select id="stu" class="select"><option>Loading…</option></select></div><div id="list"></div>');
    function load() {
      var sid = $('#stu').value;
      if (!sid) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No students yet.', 'audit') + '</div>'; return; }
      $('#list').innerHTML = loadingHtml();
      api('/attendance/audit/' + encodeURIComponent(sid)).then(function (d) {
        if (!d.history.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No corrections for this student.', 'audit') + '</div>'; return; }
        $('#list').innerHTML = '<div class="table-wrap"><table><thead><tr><th>When</th><th>Class · Date</th><th>Change</th><th>By</th><th>Reason</th></tr></thead><tbody>' +
          d.history.map(function (h) {
            return '<tr><td class="mono">' + fmtDate(h.edited_at) + ' ' + fmtTime(h.edited_at) + '</td><td>' + esc(h.class_name) + ' · ' + fmtDate(h.attendance_date) + '</td>' +
              '<td><span class="pill ' + (h.old_status === 'Present' ? 'pill-green' : 'pill-red') + '">' + esc(h.old_status) + '</span> → <span class="pill ' + (h.new_status === 'Present' ? 'pill-green' : 'pill-red') + '">' + esc(h.new_status) + '</span></td>' +
              '<td>' + esc(h.edited_by) + '</td><td>' + esc(h.reason) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    api('/admin/students').then(function (d) {
      $('#stu').innerHTML = d.students.length ? d.students.map(function (s) {
        return '<option value="' + esc(s.student_id) + '">' + esc(s.name) + ' (' + esc(s.student_id) + ') · ' + esc(s.class_name) + '</option>';
      }).join('') : '<option value="">No students</option>';
      load();
    }).catch(function (e) { toast(e.message, true); });
    $('#stu').onchange = load;
  }

  function pageUsers() {
    mount('users', pageHead('Users', 'Accounts that can sign in to FACE ID', '#/dashboard') +
      '<div class="grid2"><div class="panel"><h3>Add an account</h3><div class="hint">Give the person their username and this first password. They can change it under My Account.</div>' +
      '<form id="new-user" autocomplete="off"><div class="field"><label for="nu-name">Full name</label><input id="nu-name" class="input" required /></div>' +
      '<div class="field"><label for="nu-user">Username</label><input id="nu-user" class="input" placeholder="e.g. ravi.k" autocapitalize="none" required /></div>' +
      '<div class="field"><label for="nu-role">Role</label><select id="nu-role" class="select"><option value="lecturer">Lecturer — take attendance, view records</option><option value="admin">Admin — everything</option></select></div>' +
      '<div class="field"><label for="nu-pass">First password</label><input id="nu-pass" class="input" placeholder="At least 8 characters" required /></div>' +
      '<button class="btn btn-primary btn-block" type="submit">' + I.plus + 'Create account</button></form></div>' +
      '<div><div id="list">' + loadingHtml() + '</div></div></div>');

    function load() {
      api('/admin/users').then(function (d) {
        $('#list').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
          d.users.map(function (u) {
            var me = u.username === session.username;
            return '<tr><td><div class="who"><span class="avatar">' + esc(initials(u.name)) + '</span><div><div style="font-weight:600">' + esc(u.name) + (me ? ' <span class="pill pill-grey">You</span>' : '') + '</div><div class="mono">' + esc(u.username) + '</div></div></div></td>' +
              '<td style="text-transform:capitalize">' + esc(u.role) + '</td>' +
              '<td>' + (u.active ? '<span class="pill pill-green">Active</span>' : '<span class="pill pill-grey">Deactivated</span>') + '</td>' +
              '<td><div class="actions"><button class="btn btn-ghost btn-sm" data-reset="' + u.id + '" data-name="' + esc(u.name) + '">Reset password</button>' +
              (me ? '' : '<button class="btn ' + (u.active ? 'btn-danger' : 'btn-ghost') + ' btn-sm" data-active="' + u.id + '" data-to="' + (!u.active) + '" data-name="' + esc(u.name) + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button>') +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>';
        $all('[data-reset]').forEach(function (b) {
          b.onclick = function () {
            modal({ title: 'Reset password for ' + b.getAttribute('data-name'), text: 'Tell them the new password; they can change it later.', input: 'New password (at least 8 characters)', ok: 'Reset password' }).then(function (pw) {
              if (!pw) return;
              api('/admin/users/' + b.getAttribute('data-reset'), { method: 'PATCH', json: { password: pw } })
                .then(function () { toast('Password reset'); }).catch(function (e) { toast(e.message, true); });
            });
          };
        });
        $all('[data-active]').forEach(function (b) {
          b.onclick = function () {
            var to = b.getAttribute('data-to') === 'true';
            modal({ title: (to ? 'Activate ' : 'Deactivate ') + b.getAttribute('data-name') + '?', text: to ? 'They will be able to sign in again.' : 'They will be signed out and cannot sign in.', ok: to ? 'Activate' : 'Deactivate' }).then(function (ok) {
              if (!ok) return;
              api('/admin/users/' + b.getAttribute('data-active'), { method: 'PATCH', json: { active: to } })
                .then(function (r) { toast(r.message); load(); }).catch(function (e) { toast(e.message, true); });
            });
          };
        });
      }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    $('#new-user').onsubmit = function (e) {
      e.preventDefault();
      api('/admin/users', { method: 'POST', json: { name: $('#nu-name').value.trim(), username: $('#nu-user').value.trim(), role: $('#nu-role').value, password: $('#nu-pass').value } })
        .then(function (r) { toast(r.message); $('#new-user').reset(); load(); })
        .catch(function (err) { toast(err.message, true); });
    };
    load();
  }

  function pageAccount() {
    mount('account', pageHead('My Account', 'Your sign-in details', '#/dashboard') +
      '<div class="grid2"><div class="panel"><h3>Profile</h3><div class="hint">Ask an admin to change your name or role.</div>' +
      '<div class="who" style="display:flex;gap:14px;align-items:center"><span class="avatar" style="width:56px;height:56px;font-size:18px">' + esc(initials(session.name)) + '</span>' +
      '<div><div style="font-weight:700;font-size:18px">' + esc(session.name) + '</div><div class="mono">' + esc(session.username) + '</div><span class="role-pill" style="display:inline-block;margin-top:6px">' + esc(session.role) + '</span></div></div></div>' +
      '<div class="panel"><h3>Change password</h3><div class="hint">At least 8 characters.</div><form id="pw-form">' +
      '<div class="field"><label for="cur">Current password</label><input id="cur" type="password" class="input" autocomplete="current-password" required /></div>' +
      '<div class="field"><label for="np">New password</label><input id="np" type="password" class="input" autocomplete="new-password" required /></div>' +
      '<div class="field"><label for="np2">Confirm new password</label><input id="np2" type="password" class="input" autocomplete="new-password" required /></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Change password</button></form></div></div>');
    $('#pw-form').onsubmit = function (e) {
      e.preventDefault();
      if ($('#np').value !== $('#np2').value) { toast('New passwords do not match', true); return; }
      api('/auth/change-password', { method: 'POST', json: { current_password: $('#cur').value, new_password: $('#np').value } })
        .then(function () { toast('Password changed'); $('#pw-form').reset(); })
        .catch(function (err) { toast(err.message, true); });
    };
  }

  // ---------------------------------------------------------------- router
  function route() {
    if (session && !session.token) { store('faceid-session', null); session = null; }
    var path = (location.hash.replace(/^#/, '').split('?')[0]) || '/';
    $('#modal-root').innerHTML = '';
    if (!session) { if (path !== '/login') { location.hash = '#/login'; return; } return pageLogin(); }
    if (path === '/login' || path === '/') { location.hash = '#/dashboard'; return; }
    var admin = session.role === 'admin', m;
    if (path === '/dashboard') return pageDashboard();
    if (path === '/classes') return pageClasses();
    if ((m = path.match(/^\/classes\/(.+)$/))) return pageClass(decodeURIComponent(m[1]));
    if (path === '/attendance/take') return pageTake();
    if (path === '/attendance/records') return pageRecords();
    if (admin && path === '/students') return pageStudents();
    if (admin && path === '/students/new') return pageEnroll(null);
    if (admin && (m = path.match(/^\/students\/(.+)\/face$/))) return pageEnroll(decodeURIComponent(m[1]));
    if (admin && path === '/audit') return pageAudit();
    if (admin && path === '/users') return pageUsers();
    if (path === '/account') return pageAccount();
    location.hash = '#/dashboard';
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', stopCamera);
  route();
})();
