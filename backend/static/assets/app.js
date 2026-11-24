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
    logo: '<svg viewBox="0 0 64 64"><path d="M32 4l22 8v18c0 15-9.5 25-22 30C19.5 55 10 45 10 30V12z" fill="#a3161b"/><path d="M32 9l17 6.2V30c0 12-7.4 20.2-17 24.4C22.4 50.2 15 42 15 30V15.2z" fill="#fff"/><circle cx="32" cy="27" r="7" fill="#d9a441"/><path d="M20 46c2-7 7-10 12-10s10 3 12 10" fill="#d9a441"/><path d="M19 19h5M19 19v5M45 19h-5M45 19v5M19 43v-4M45 43v-4" stroke="#a3161b" stroke-width="2.5" stroke-linecap="round"/></svg>',
    dashboard: '<svg viewBox="0 0 64 64"><rect x="8" y="8" width="21" height="21" rx="6" fill="#4f7cf7"/><rect x="35" y="8" width="21" height="21" rx="6" fill="#22b573"/><rect x="8" y="35" width="21" height="21" rx="6" fill="#f5a524"/><rect x="35" y="35" width="21" height="21" rx="6" fill="#ef4444"/><rect x="13" y="13" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="40" y="13" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="13" y="40" width="11" height="11" rx="3" fill="#fff" opacity=".85"/><rect x="40" y="40" width="11" height="11" rx="3" fill="#fff" opacity=".85"/></svg>',
    students: '<svg viewBox="0 0 64 64"><circle cx="22" cy="20" r="9" fill="#f7c59f"/><path d="M13 18c0-7 5-11 10-11s9 3 9 8c-3-2-7-2-10 0-3 2-6 3-9 3z" fill="#7a3e1d"/><circle cx="42" cy="21" r="8.5" fill="#f2b48a"/><path d="M33.5 19c0-6 4-10 9-10s8.5 4 8.5 9c-4 0-8-2-10-5-2 3-5 5-7.5 6z" fill="#2b2f3a"/><path d="M8 44c0-9 6-14 14-14s14 5 14 14z" fill="#e5533d"/><path d="M28 44c0-9 6-14 14-14s14 5 14 14z" fill="#2f5bd3"/><rect x="5" y="42" width="54" height="9" rx="3" fill="#d98b3a"/><rect x="5" y="49" width="54" height="7" rx="3" fill="#b8691f"/></svg>',
    addStudent: '<svg viewBox="0 0 64 64"><circle cx="26" cy="20" r="10" fill="#f7c59f"/><path d="M16 18c0-7 5-12 11-12s10 4 10 9c-4-2-8-1-11 1s-7 2-10 2z" fill="#2b2f3a"/><path d="M8 52c0-11 8-18 18-18s18 7 18 18z" fill="#4f7cf7"/><circle cx="48" cy="44" r="12" fill="#22b573"/><path d="M48 38v12M42 44h12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
    camera: '<svg viewBox="0 0 64 64"><rect x="6" y="16" width="52" height="38" rx="9" fill="#2b2f3a"/><path d="M22 16l4-7h12l4 7z" fill="#2b2f3a"/><circle cx="32" cy="35" r="13" fill="#d9a441"/><circle cx="32" cy="35" r="8" fill="#4f7cf7"/><circle cx="29" cy="32" r="2.5" fill="#fff"/><circle cx="49" cy="24" r="2.5" fill="#ef4444"/></svg>',
    classes: '<svg viewBox="0 0 64 64"><rect x="26" y="6" width="32" height="24" rx="3" fill="#2b2f3a"/><rect x="29" y="9" width="26" height="18" rx="2" fill="#fff"/><rect x="33" y="19" width="4" height="6" fill="#22b573"/><rect x="40" y="15" width="4" height="10" fill="#4f7cf7"/><rect x="47" y="12" width="4" height="13" fill="#ef4444"/><circle cx="15" cy="16" r="6" fill="#f7c59f"/><path d="M8 40V28c0-4 3-6 7-6s7 2 7 6v12z" fill="#e5533d"/><path d="M20 27l10-6" stroke="#f7c59f" stroke-width="3" stroke-linecap="round"/><rect x="9" y="40" width="4" height="14" rx="2" fill="#d98b3a"/><rect x="15" y="40" width="4" height="14" rx="2" fill="#d98b3a"/><circle cx="34" cy="44" r="4.5" fill="#2f5bd3"/><circle cx="44" cy="44" r="4.5" fill="#2f5bd3"/><circle cx="54" cy="44" r="4.5" fill="#2f5bd3"/><path d="M28 56c0-4 3-6 6-6s6 2 6 6M38 56c0-4 3-6 6-6s6 2 6 6M48 56c0-4 3-6 6-6s6 2 6 6" stroke="#2f5bd3" stroke-width="3" fill="none"/></svg>',
    take: '<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="44" rx="8" fill="#fff" stroke="#2b2f3a" stroke-width="3"/><path d="M8 20a8 8 0 018-8h32a8 8 0 018 8v4H8z" fill="#ef4444"/><rect x="18" y="6" width="5" height="12" rx="2.5" fill="#2b2f3a"/><rect x="41" y="6" width="5" height="12" rx="2.5" fill="#2b2f3a"/><circle cx="40" cy="42" r="11" fill="#22b573"/><path d="M35 42l4 4 7-8" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="15" y="31" width="6" height="5" rx="1.5" fill="#4f7cf7"/><rect x="15" y="40" width="6" height="5" rx="1.5" fill="#f5a524"/></svg>',
    records: '<svg viewBox="0 0 64 64"><rect x="10" y="8" width="44" height="50" rx="7" fill="#fff" stroke="#2b2f3a" stroke-width="3"/><rect x="22" y="4" width="20" height="9" rx="4" fill="#d9a441"/><rect x="18" y="22" width="7" height="7" rx="2" fill="#22b573"/><rect x="29" y="24" width="18" height="3.5" rx="1.7" fill="#9aa3b5"/><rect x="18" y="34" width="7" height="7" rx="2" fill="#ef4444"/><rect x="29" y="36" width="18" height="3.5" rx="1.7" fill="#9aa3b5"/><rect x="18" y="46" width="7" height="7" rx="2" fill="#22b573"/><rect x="29" y="48" width="14" height="3.5" rx="1.7" fill="#9aa3b5"/></svg>',
    audit: '<svg viewBox="0 0 64 64"><path d="M32 5l21 8v17c0 14-9 24-21 29C20 54 11 44 11 30V13z" fill="#ef4444"/><path d="M32 10l16 6v14c0 11-7 19-16 23-9-4-16-12-16-23V16z" fill="#fff"/><circle cx="32" cy="31" r="10" fill="none" stroke="#2b2f3a" stroke-width="3"/><path d="M32 25v6l4 3" stroke="#2b2f3a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    usersAdmin: '<svg viewBox="0 0 64 64"><circle cx="24" cy="20" r="9" fill="#f7c59f"/><path d="M15 18c0-6 4-10 9-10s9 4 9 9c-4-2-8-1-11 1-2 1-5 1-7 0z" fill="#2b2f3a"/><path d="M8 50c0-10 7-16 16-16s16 6 16 16z" fill="#2f5bd3"/><circle cx="46" cy="40" r="10" fill="#d9a441"/><circle cx="46" cy="40" r="4" fill="#fff"/><path d="M46 28v4M46 48v4M34 40h4M54 40h4M37.5 31.5l2.8 2.8M51.7 45.7l2.8 2.8M37.5 48.5l2.8-2.8M51.7 34.3l2.8-2.8" stroke="#d9a441" stroke-width="3" stroke-linecap="round"/></svg>',
    account: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#fbeceb"/><circle cx="32" cy="25" r="10" fill="#f7c59f"/><path d="M22 23c0-7 5-12 11-12s10 4 10 10c-4-2-9-2-13 0-3 1-5 2-8 2z" fill="#7a3e1d"/><path d="M14 50c3-9 10-13 18-13s15 4 18 13c-5 5-11 8-18 8s-13-3-18-8z" fill="#a3161b"/></svg>',
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

  // ---------------------------------------------------------------- PU structure: year -> stream -> section
  // Classes are stored as YEAR-STREAM-SECTION, e.g. 1PU-PCMB-A, 2PU-PCMCS-B, LT-PCMB-A
  var YEARS = [
    { k: '1PU', label: '1st PU', badge: '1st', desc: 'First year PU Science' },
    { k: '2PU', label: '2nd PU', badge: '2nd', desc: 'Second year PU Science' },
    { k: 'LT', label: 'Long Term', badge: 'LT', desc: 'Long-term batch' }
  ];
  var STREAMS = [
    { k: 'PCMB', label: 'PCMB', desc: 'Physics · Chemistry · Maths · Biology' },
    { k: 'PCMCS', label: 'PCMCs', desc: 'Physics · Chemistry · Maths · Computer Science' }
  ];
  var SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var OTHER = { k: 'OTHER', label: 'Other classes', badge: '…', desc: 'Classes outside the PU structure' };
  function yearOf(k) { return YEARS.filter(function (y) { return y.k === k; })[0] || OTHER; }
  function streamOf(k) { return STREAMS.filter(function (x) { return x.k === k; })[0] || { k: k, label: k, desc: '' }; }
  function parseClass(n) {
    var m = /^(1PU|2PU|LT)-(PCMB|PCMCS)-([A-Z0-9]{1,3})$/.exec(String(n || '').toUpperCase());
    return m ? { year: m[1], stream: m[2], section: m[3] } : null;
  }
  function makeClass(y, st, sec) { return y + '-' + st + '-' + sec; }
  function classLabel(n) {
    var p = parseClass(n);
    return p ? yearOf(p.year).label + ' · ' + streamOf(p.stream).label + ' · Section ' + p.section : String(n);
  }
  function classShort(n) {
    var p = parseClass(n);
    return p ? yearOf(p.year).label + ' ' + streamOf(p.stream).label + '-' + p.section : String(n);
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function cardGrid(items) {
    return '<div class="cards3">' + items.map(function (it) {
      var b = String(it.badge);
      return '<a class="class-card" href="' + it.href + '"><div class="class-badge' + (it.gold ? ' gold' : '') + '"><span' + (b.length > 2 ? ' class="sm"' : '') + '>' + esc(b) + '</span></div>' +
        '<div class="class-name">' + esc(it.title) + '</div>' + (it.lines || []).map(function (l) { return '<div class="class-meta">' + esc(l) + '</div>'; }).join('') + '</a>';
    }).join('') + '</div>';
  }

  // Year / Stream / Section dropdowns. classNames = existing classes.
  // opts.allowNew: offer all sections (for adding students); otherwise only classes that exist.
  function pickerHtml(id, inline) {
    return '<div class="picker' + (inline ? ' inline' : '') + '" id="' + id + '">' +
      '<div class="field"><label>Year</label><select class="select" data-p="year"></select></div>' +
      '<div class="field" data-f="stream"><label>Stream</label><select class="select" data-p="stream"></select></div>' +
      '<div class="field"><label data-l="section">Section</label><select class="select" data-p="section"></select></div></div>';
  }
  function bindPicker(id, classNames, opts) {
    opts = opts || {};
    var root = $('#' + id), ys = $('[data-p=year]', root), ss = $('[data-p=stream]', root), xs = $('[data-p=section]', root);
    var parsed = classNames.map(parseClass).filter(Boolean);
    var others = classNames.filter(function (c) { return !parseClass(c); }).sort();
    var sel = parseClass(opts.selected);
    ys.innerHTML = YEARS.map(function (y) { return opt(y.k, y.label); }).join('') + (!opts.allowNew && others.length ? opt('OTHER', OTHER.label) : '');
    ss.innerHTML = STREAMS.map(function (x) { return opt(x.k, x.label + ' (' + x.desc.replace(/ · /g, ', ') + ')'); }).join('');
    if (sel) { ys.value = sel.year; ss.value = sel.stream; }
    else if (opts.selected && others.indexOf(opts.selected) >= 0) ys.value = 'OTHER';
    else {
      if (opts.year) ys.value = opts.year;
      if (opts.stream) ss.value = opts.stream;
      if (!opts.year && !opts.allowNew) {
        var first = parsed.slice().sort(function (a, b) { return makeClass(a.year, a.stream, a.section) < makeClass(b.year, b.stream, b.section) ? -1 : 1; })[0];
        if (first) { ys.value = first.year; ss.value = first.stream; } else if (others.length) ys.value = 'OTHER';
      }
    }
    function fill(keep) {
      var other = ys.value === 'OTHER';
      $('[data-f=stream]', root).classList.toggle('hidden', other);
      $('[data-l=section]', root).textContent = other ? 'Class' : 'Section';
      var list;
      if (other) list = others.map(function (c) { return [c, c]; });
      else {
        var have = parsed.filter(function (p) { return p.year === ys.value && p.stream === ss.value; }).map(function (p) { return p.section; });
        var secs = opts.allowNew ? uniq(SECTIONS.concat(have)).sort() : uniq(have).sort();
        list = secs.map(function (x) { return [x, 'Section ' + x + (opts.allowNew && have.indexOf(x) < 0 ? ' (new)' : '')]; });
      }
      xs.innerHTML = list.length ? list.map(function (o) { return opt(o[0], o[1]); }).join('') : '<option value="">No classes yet</option>';
      if (keep && list.some(function (o) { return o[0] === keep; })) xs.value = keep;
    }
    fill(sel ? sel.section : opts.selected);
    function changed() { if (opts.onChange) opts.onChange(api_.value()); }
    ys.onchange = function () { fill(); changed(); };
    ss.onchange = function () { fill(); changed(); };
    xs.onchange = changed;
    var api_ = {
      value: function () {
        if (ys.value === 'OTHER') return xs.value;
        return xs.value ? makeClass(ys.value, ss.value, xs.value) : '';
      },
      disable: function (on) { [ys, ss, xs].forEach(function (e) { e.disabled = on; }); }
    };
    return api_;
  }

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
    session = { token: res.token, role: res.user.role, name: res.user.name, username: res.user.username, student_id: res.user.student_id || null };
    store('faceid-session', session);
    location.hash = session.role === 'student' ? '#/me' : '#/dashboard';
  }

  var ROLES = {
    admin: { badge: 'ADMIN', group: 'Admin', one: 'Admin' },
    lecturer: { badge: 'LECTURER', group: 'Professor / Lecturer', one: 'Professor / Lecturer' },
    student: { badge: 'STUDENT', group: 'Student', one: 'Student' }
  };
  var ROLE_ORDER = ['admin', 'lecturer', 'student'];

  var NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/dashboard', roles: ['admin', 'lecturer'] },
    { key: 'students', label: 'Students', icon: 'students', href: '#/students', roles: ['admin'] },
    { key: 'enroll', label: 'Add Student', icon: 'addStudent', href: '#/students/new', roles: ['admin'] },
    { key: 'classes', label: 'Classes', icon: 'classes', href: '#/classes', roles: ['admin', 'lecturer'] },
    { key: 'take', label: 'Take Attendance', icon: 'take', href: '#/attendance/take', roles: ['admin', 'lecturer'] },
    { key: 'records', label: 'Records', icon: 'records', href: '#/attendance/records', roles: ['admin', 'lecturer'] },
    { key: 'audit', label: 'Audit Log', icon: 'audit', href: '#/audit', roles: ['admin'] },
    { key: 'users', label: 'Users', icon: 'usersAdmin', href: '#/users', roles: ['admin'] },
    { key: 'myatt', label: 'My Attendance', icon: 'records', href: '#/me', roles: ['student'] },
    { key: 'account', label: 'My Account', icon: 'account', href: '#/account', roles: ['admin', 'lecturer', 'student'] }
  ];

  function layout(activeKey, inner) {
    var items = NAV.filter(function (n) { return n.roles.indexOf(session.role) >= 0; }).map(function (n) {
      return '<a class="nav-item' + (n.key === activeKey ? ' active' : '') + '" href="' + n.href + '">' +
        '<span class="nav-tile">' + I[n.icon] + '</span>' + esc(n.label) + '</a>';
    }).join('');
    return '<aside class="sidebar"><div class="logo-wrap"><div class="logo">' + I.logo + '</div></div>' +
      '<nav class="nav" aria-label="Main">' + items + '</nav></aside>' +
      '<header class="header"><div class="brand"><div class="brand-row"><span class="brand-name">FACE ID</span>' +
      '<span class="chip chip-gold">Smart Attendance</span></div><div class="brand-sub">' + esc(CONFIG.college) + '</div></div>' +
      '<div class="header-spacer"></div>' +
      '<div class="umenu-wrap"><button type="button" class="user-chip" id="umenu-btn" aria-haspopup="true" aria-expanded="false"><span class="avatar">' + esc(initials(session.name)) + '</span><span class="user-text">' +
      '<div class="user-name">' + esc(session.name) + '</div><div class="user-role">' + esc((ROLES[session.role] || { badge: session.role }).badge) + '</div></span>' +
      '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="umenu hidden" id="umenu" role="menu"></div></div>' +
      '<button class="icon-btn" id="logout" title="Sign out" aria-label="Sign out">' + I.logout + '</button><span id="logout2" class="hidden"></span></header>' +
      '<main class="main">' + inner + '</main>';
  }
  function pageHead(title, sub, backHref, actions) {
    return '<div class="page-head">' +
      (backHref ? '<a class="back" href="' + backHref + '" aria-label="Back">' + I.back + '</a>' : '') +
      '<div><h1 class="page-title">' + esc(title) + '</h1>' + (sub ? '<div class="page-sub">' + sub + '</div>' : '') + '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }
  function loadingHtml(text) { return '<div class="loading"><span class="spinner"></span>' + esc(text || 'Loading…') + '</div>'; }
  function emptyHtml(text, icon) { return '<div class="empty">' + (I[icon || 'students']) + '<div>' + text + '</div></div>'; }

  function mount(activeKey, inner) {
    stopCamera();
    $('#app').innerHTML = layout(activeKey, inner);
    $('#logout').onclick = function () { signOut(); };
    $('#umenu-btn').onclick = function (e) { e.stopPropagation(); toggleUserMenu(); };
    $('#logout2').onclick = function () { signOut(); };
    window.scrollTo(0, 0);
  }

  function classOptions(classes, selected, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') +
      classes.map(function (c) {
        var n = c.class_name || c;
        return '<option value="' + esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + esc(classShort(n)) + '</option>';
      }).join('');
  }
  function query() {
    var q = {}, s = location.hash.split('?')[1] || '';
    s.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return q;
  }


  // ---------------------------------------------------------------- account menu (top right)
  function roleBadge(role) { return '<span class="role-badge role-' + esc(role) + '">' + esc((ROLES[role] || { badge: String(role).toUpperCase() }).badge) + '</span>'; }
  function closeUserMenu() {
    var m = $('#umenu'); if (!m) return;
    m.classList.add('hidden'); $('#umenu-btn').setAttribute('aria-expanded', 'false');
  }
  function toggleUserMenu() {
    var m = $('#umenu');
    if (!m.classList.contains('hidden')) { closeUserMenu(); return; }
    m.classList.remove('hidden'); $('#umenu-btn').setAttribute('aria-expanded', 'true');
    var admin = session.role === 'admin';
    var me = { name: session.name, username: session.username, role: session.role, student_id: session.student_id, active: true };
    function item(u) {
      var cur = u.username === session.username;
      return '<button type="button" class="umenu-item' + (cur ? ' current' : '') + (u.active === false ? ' off' : '') + '" data-switch="' + esc(u.username) + '" data-name="' + esc(u.name) + '">' +
        '<span class="um-text"><span class="um-name">' + esc(u.name) + (cur ? ' <span class="um-tick">&#10003;</span>' : '') + '</span><span class="um-user mono">' + esc(u.username) +
        (u.student_id ? ' · ' + esc(u.student_id) : '') + (u.active === false ? ' · deactivated' : '') + '</span></span>' + roleBadge(u.role) + '</button>';
    }
    function draw(users, loading) {
      var groups = admin ? ROLE_ORDER : [session.role];
      var list = groups.map(function (r) {
        var g = users.filter(function (u) { return u.role === r; });
        var head = '<div class="umenu-group"><span class="ug-dot role-' + r + '"></span>' + esc(ROLES[r].group) + '<span class="ug-count">' + (loading && r !== session.role ? '…' : g.length) + '</span></div>';
        var body = g.length ? g.map(item).join('')
          : '<div class="umenu-empty">' + (loading ? 'Loading…' : 'No ' + esc(ROLES[r].group.toLowerCase()) + ' accounts yet') +
            (admin && !loading ? '<a href="#/users/' + r + '/new">+ Add</a>' : '') + '</div>';
        return head + body;
      }).join('');
      m.innerHTML = '<div class="umenu-head"><span><b>&#10022;</b> ' + (admin ? 'Switch account' : 'Signed in as') + '</span>' +
        '<span class="mono">' + (loading ? '…' : plural(users.length, 'account')) + '</span></div><div class="umenu-list">' + list + '</div>' +
        '<div class="umenu-foot"><a href="#/account" role="menuitem">' + I.account.replace('<svg', '<svg width="22" height="22"') + 'My Account</a>' +
        (admin ? '<a href="#/users" role="menuitem">' + I.usersAdmin.replace('<svg', '<svg width="22" height="22"') + 'Users &amp; roles</a>' : '') +
        '<button type="button" id="um-out" role="menuitem">' + I.logout.replace('<svg', '<svg width="18" height="18"') + 'Sign out</button></div>';
      $all('[data-switch]', m).forEach(function (b) {
        b.onclick = function () {
          var un = b.getAttribute('data-switch');
          if (un === session.username) { closeUserMenu(); return; }
          closeUserMenu();
          modal({ title: 'Switch to ' + b.getAttribute('data-name') + '?', text: 'You will be signed out. Sign in as ' + un + ' with that account\'s password.', ok: 'Switch account' }).then(function (ok) {
            if (!ok) return;
            store('faceid-prefill', un);
            signOut();
          });
        };
      });
      $all('a', m).forEach(function (a) { a.onclick = closeUserMenu; });
      $('#um-out').onclick = function () { signOut(); };
    }
    draw([me], admin);
    if (admin) {
      api('/admin/users').then(function (d) {
        if (m.classList.contains('hidden')) return;
        var list = d.users.slice().sort(function (a, b) { return (a.username === session.username ? -1 : 0) - (b.username === session.username ? -1 : 0) || a.name.localeCompare(b.name); });
        draw(list);
      }).catch(function () { draw([me]); });
    }
  }
  document.addEventListener('click', function (e) {
    var w = e.target.closest ? e.target.closest('.umenu-wrap') : null;
    if (!w) closeUserMenu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeUserMenu(); });

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
      var pre = store('faceid-prefill');
      store('faceid-prefill', null);
      if (pre) { $('#u').value = pre; $('#p').focus(); } else $('#u').focus();
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
      { icon: 'students', name: 'Students', desc: 'Roster & face status', href: '#/students', admin: true },
      { icon: 'addStudent', name: 'Add Student', desc: 'Register + capture face', href: '#/students/new', admin: true },
      { icon: 'classes', name: 'Classes', desc: 'Class-wise students', href: '#/classes' },
      { icon: 'take', name: 'Take Attendance', desc: 'Camera or classroom photo', href: '#/attendance/take' },
      { icon: 'records', name: 'Records', desc: 'View & correct attendance', href: '#/attendance/records' },
      { icon: 'audit', name: 'Audit Log', desc: 'Every correction', href: '#/audit', admin: true },
      { icon: 'usersAdmin', name: 'Users', desc: 'Admin, lecturer & student logins', href: '#/users', admin: true },
      { icon: 'account', name: 'My Account', desc: 'Profile & password', href: '#/account' }
    ].filter(function (m) { return isAdmin || !m.admin; });
    var first = session.name.split(' ')[0];
    mount('dashboard',
      '<section class="banner"><div class="banner-text"><div class="banner-meta"><span class="chip chip-role">' + esc(session.role.toUpperCase()) + '</span>• ' + esc(CONFIG.college) + '</div>' +
      '<h1>' + greeting() + ', <em>' + esc(first) + '</em></h1><div class="banner-sub">' + esc(CONFIG.campus) + '</div>' +
      '<div class="banner-desc">' + (isAdmin ? 'Manage students, enroll faces and oversee attendance records.' : 'Capture a classroom photo and the system marks attendance for you.') + '</div></div>' +
      '<div class="banner-card"><span class="avatar">' + esc(initials(session.name)) + '</span><div><div class="user-name">' + esc(session.name) + '</div><div style="color:#f2d9d9;font-size:13px">' + esc(session.username) + '</div></div></div></section>' +
      '<div class="stats" id="stats">' + loadingHtml('Loading summary…') + '</div>' +
      '<div class="section-title"><h2>Your workspace</h2><span class="count-pill">' + mods.length + ' modules</span></div>' +
      '<div class="modules">' + mods.map(function (m) {
        return '<a class="module" href="' + m.href + '">' + I[m.icon] + '<div class="module-name">' + esc(m.name) + '</div><div class="module-desc">' + esc(m.desc) + '</div></a>';
      }).join('') + '</div>');

    api('/admin/stats').then(function (s) {
      var pct = s.today_marked ? Math.round(100 * s.today_present / s.today_marked) + '%' : '—';
      var cards = [
        ['students', '#eef3ff', s.students, 'Students'],
        ['classes', '#fff4e5', s.classes, 'Classes'],
        ['camera', '#e8f7ef', s.enrolled_students + ' / ' + s.students, 'Faces enrolled'],
        ['take', '#fdecec', pct, 'Present today']
      ];
      $('#stats').innerHTML = cards.map(function (c) {
        return '<div class="stat"><div class="stat-icon" style="background:' + c[1] + '">' + I[c[0]] + '</div><div><div class="stat-value">' + esc(c[2]) + '</div><div class="stat-label">' + c[3] + '</div></div></div>';
      }).join('');
    }).catch(function (e) {
      $('#stats').innerHTML = '<div class="alert alert-err" style="grid-column:1/-1">' + esc(e.message) + '</div>';
    });
  }

  // Students: years -> streams -> list
  function pageStudents(year, stream) {
    var isList = year === 'OTHER' || (year && stream);
    var y = yearOf(year), st = streamOf(stream);
    var title = !year ? 'Students' : year === 'OTHER' ? OTHER.label : stream ? y.label + ' · ' + st.label : y.label + ' Students';
    var back = !year ? '#/dashboard' : (stream ? '#/students/y/' + year : '#/students');
    var addHref = '#/students/new' + (year && year !== 'OTHER' ? '?year=' + year + (stream ? '&stream=' + stream : '') : '');
    mount('students', pageHead(title, '<span id="st-sub">Loading…</span>', back,
      '<a class="btn btn-primary" href="' + addHref + '">' + I.plus + 'Add student</a>') +
      (isList ? '<div class="toolbar"><input id="search" class="input" placeholder="Search name or ID…" /><select id="sec" class="select"></select></div>' : '') +
      '<div id="list">' + loadingHtml() + '</div>');

    var all = [], rows = [];
    function inYear(s, yk) { var p = parseClass(s.class_name); return yk === 'OTHER' ? !p : p && p.year === yk; }
    function draw() {
      var q = $('#search').value.trim().toLowerCase(), c = $('#sec').value;
      var shown = rows.filter(function (x) {
        return (!c || x.class_name === c) && (!q || x.name.toLowerCase().indexOf(q) >= 0 || x.student_id.toLowerCase().indexOf(q) >= 0);
      });
      if (!shown.length) { $('#list').innerHTML = '<div class="table-wrap">' + emptyHtml(rows.length ? 'No students match.' : 'No students here yet. Click Add student to register one and capture their face.') + '</div>'; return; }
      $('#list').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Student</th><th class="hide-sm">ID</th><th>' + (year === 'OTHER' ? 'Class' : 'Section') + '</th><th>Face</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
        shown.map(function (x) {
          var p = parseClass(x.class_name);
          var face = x.face_count > 0
            ? '<span class="pill pill-green">' + I.check.replace('<svg', '<svg width="14" height="14"') + x.face_count + ' photo' + (x.face_count > 1 ? 's' : '') + '</span>'
            : '<span class="pill pill-amber">Not enrolled</span>';
          return '<tr><td><div class="who"><span class="avatar">' + esc(initials(x.name)) + '</span><div><div style="font-weight:600">' + esc(x.name) + '</div><div class="mono">' + esc(x.email || '') + '</div></div></div></td>' +
            '<td class="mono hide-sm">' + esc(x.student_id) + '</td><td>' + esc(p ? 'Section ' + p.section : x.class_name) + '</td><td>' + face + '</td>' +
            '<td><div class="actions"><a class="btn btn-ghost btn-sm" href="#/students/' + encodeURIComponent(x.student_id) + '/face">' + I.cam + '<span class="hide-sm">Capture face</span></a>' +
            '<a class="btn btn-ghost btn-sm" href="#/students/' + encodeURIComponent(x.student_id) + '/edit">Edit</a>' +
            '<button class="btn btn-danger btn-sm" data-del="' + esc(x.student_id) + '" data-name="' + esc(x.name) + '">' + I.trash + '<span class="hide-sm">Remove</span></button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      $all('[data-del]').forEach(function (bt) {
        bt.onclick = function () {
          var id = bt.getAttribute('data-del'), name = bt.getAttribute('data-name');
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
        if (!year) {
          var items = YEARS.map(function (yy, i) {
            var list = all.filter(function (x) { return inYear(x, yy.k); });
            var secs = uniq(list.map(function (x) { return x.class_name; })).length;
            return { href: '#/students/y/' + yy.k, badge: yy.badge, gold: i === 2, title: yy.label + ' · ' + yy.desc, lines: [plural(secs, 'class').replace('classs', 'classes') + ' · ' + plural(list.length, 'student')] };
          });
          var oth = all.filter(function (x) { return !parseClass(x.class_name); });
          if (oth.length) items.push({ href: '#/students/y/OTHER', badge: OTHER.badge, title: OTHER.label, lines: [plural(oth.length, 'student')] });
          $('#st-sub').textContent = CONFIG.college + ' · ' + plural(all.length, 'student');
          $('#list').innerHTML = cardGrid(items);
          return;
        }
        if (!isList) {
          var yl = all.filter(function (x) { return inYear(x, year); });
          $('#st-sub').textContent = y.desc + ' · ' + plural(yl.length, 'student');
          $('#list').innerHTML = cardGrid(STREAMS.map(function (ss, i) {
            var list = yl.filter(function (x) { return parseClass(x.class_name).stream === ss.k; });
            var secs = uniq(list.map(function (x) { return x.class_name; })).length;
            return { href: '#/students/y/' + year + '/' + ss.k, badge: ss.label, gold: i === 1, title: ss.label + ' · ' + y.label, lines: [ss.desc, plural(secs, 'section') + ' · ' + plural(list.length, 'student')] };
          }));
          return;
        }
        rows = all.filter(function (x) {
          var p = parseClass(x.class_name);
          return year === 'OTHER' ? !p : p && p.year === year && p.stream === stream;
        });
        var classes = uniq(rows.map(function (x) { return x.class_name; })).sort();
        var keep = $('#sec').value;
        $('#sec').innerHTML = opt('', year === 'OTHER' ? 'All classes' : 'All sections') + classes.map(function (c) { var p = parseClass(c); return opt(c, p ? 'Section ' + p.section : c, c === keep); }).join('');
        var enrolled = rows.filter(function (x) { return x.face_count > 0; }).length;
        $('#st-sub').textContent = (year === 'OTHER' ? '' : st.desc + ' · ') + plural(rows.length, 'student') + ' · ' + enrolled + ' with face enrolled';
        draw();
      }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    if (isList) { $('#search').oninput = draw; $('#sec').onchange = draw; }
    load();
  }

  // Edit a student's name or class (year / stream / section)
  function pageEdit(id) {
    mount('students', pageHead('Edit Student', '<span id="ed-sub">' + esc(id) + '</span>', '#/students') +
      '<div class="panel" style="max-width:760px"><h3>Student details</h3><div class="hint">Changing the class moves the student\'s attendance history with them.</div>' +
      '<div class="field"><label for="ename">Full name</label><input id="ename" class="input" /></div>' +
      '<div id="epick-wrap">' + loadingHtml() + '</div>' +
      '<div class="row" style="margin-top:8px"><button class="btn btn-primary" id="esave">' + I.check + 'Save changes</button><a class="btn btn-ghost" id="ecancel" href="#/students">Cancel</a></div></div>');
    Promise.all([api('/admin/students'), api('/admin/classes')]).then(function (r) {
      var stu = r[0].students.filter(function (x) { return x.student_id === id; })[0];
      if (!stu) { $('#epick-wrap').innerHTML = '<div class="alert alert-err">Student not found.</div>'; return; }
      var p = parseClass(stu.class_name);
      var back = p ? '#/students/y/' + p.year + '/' + p.stream : '#/students/y/OTHER';
      $('.back').setAttribute('href', back); $('#ecancel').setAttribute('href', back);
      $('#ename').value = stu.name;
      $('#ed-sub').textContent = stu.student_id + ' · currently ' + classLabel(stu.class_name);
      $('#epick-wrap').innerHTML = pickerHtml('epick');
      var pk = bindPicker('epick', r[1].classes.map(function (c) { return c.class_name; }), { allowNew: true, selected: p ? stu.class_name : '' });
      $('#esave').onclick = function () {
        var cls = pk.value(), name = $('#ename').value.trim();
        if (!name || !cls) { toast('Enter the name and choose year, stream and section', true); return; }
        api('/admin/students/' + encodeURIComponent(id), { method: 'PATCH', json: { name: name, class_name: cls } }).then(function (res) {
          toast(res.message + ' · ' + classLabel(res.class_name));
          var q = parseClass(res.class_name);
          location.hash = q ? '#/students/y/' + q.year + '/' + q.stream : '#/students';
        }).catch(function (e) { toast(e.message, true); });
      };
    }).catch(function (e) { $('#epick-wrap').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
  }

  function stepsBar(n, labels) {
    labels = labels || ['Student details', 'Capture face'];
    return '<div class="steps">' + labels.map(function (l, i) {
      var k = i + 1;
      return (i ? '<div class="step-line' + (k <= n ? ' on' : '') + '"></div>' : '') +
        '<div class="step' + (k === n ? ' active' : (k < n ? ' done' : '')) + '"><span>' + (k < n ? '&#10003;' : k) + '</span><b class="sl">' + esc(l) + '</b></div>';
    }).join('') + '</div>';
  }
  var TAKE_STEPS = ['Session', 'Classroom photo', 'Result'];
  var REC_STEPS = ['Class & date', 'Records'];
  function qs(o) {
    return '?' + Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&');
  }

  // Add Student, page 1: details -> registers the student -> page 2 (capture face)
  function pageAddStudent() {
    var q = query();
    mount('enroll', pageHead('Add Student', 'Step 1 of 2 · Enter the student\'s details', '#/students') + stepsBar(1) +
      '<div class="panel" style="max-width:820px"><h3>Student details</h3><div class="hint">Use the roll number as the Student ID. Next, you will capture the student\'s face.</div>' +
      '<div class="row"><div class="field"><label for="sid">Student ID / Roll number</label><input id="sid" class="input" placeholder="e.g. 26PU1001" /></div>' +
      '<div class="field"><label for="sname">Full name</label><input id="sname" class="input" placeholder="Student name" /></div></div>' +
      '<div id="pick-wrap">' + loadingHtml() + '</div>' +
      '<div class="field"><label for="semail">Email (optional)</label><input id="semail" class="input" type="email" placeholder="student@example.com" /></div>' +
      '<div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/students">Cancel</a>' +
      '<button class="btn btn-primary" id="next">Next: Capture face ' + L.arrow.replace('<svg', '<svg width="18" height="18"') + '</button></div></div>');
    var picker = null;
    function done(names) {
      $('#pick-wrap').innerHTML = pickerHtml('pick');
      picker = bindPicker('pick', names, { allowNew: true, selected: q['class'], year: q.year, stream: q.stream });
    }
    api('/admin/classes').then(function (d) { done(d.classes.map(function (c) { return c.class_name; })); }).catch(function () { done([]); });
    $('#sid').focus();
    $('#next').onclick = function () {
      var sid = $('#sid').value.trim().toUpperCase(), name = $('#sname').value.trim(), cls = picker ? picker.value() : '';
      if (!sid || !name || !cls) { toast('Fill Student ID and name, and choose year, stream and section', true); return; }
      var btn = $('#next'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Saving…';
      api('/students', { method: 'POST', json: { student_id: sid, name: name, class_name: cls, email: ($('#semail').value.trim() || null) } })
        .then(function () { toast(name + ' registered. Now capture the face.'); location.hash = '#/students/' + encodeURIComponent(sid) + '/face?step=2'; })
        .catch(function (e) {
          toast(e.status === 409 ? 'Student ID ' + sid + ' already exists. Open it from Students → Capture face.' : e.message, true);
          btn.disabled = false; btn.innerHTML = 'Next: Capture face ' + L.arrow.replace('<svg', '<svg width="18" height="18"');
        });
    };
  }

  // Add student (new) or capture more faces for an existing student
  function pageEnroll(existingId) {
    var isNew = !existingId;
    var picker = null;
    var savedClass = '';
    var shots = []; // {blob, url, status, note}
    var fromStep1 = query().step === '2';
    mount(fromStep1 ? 'enroll' : 'students',
      pageHead(fromStep1 ? 'Add Student' : 'Capture Face', (fromStep1 ? 'Step 2 of 2 · Capture face for ' : 'Add face photos for ') + '<b id="who">' + esc(existingId) + '</b>', fromStep1 ? '#/students/new' : '#/students') +
      (fromStep1 ? stepsBar(2) : '') +
      '<div class="grid2"><div class="panel"><h3>1 · Student details</h3><div class="hint">' + (isNew ? 'Use the roll number as the Student ID.' : 'This student is already registered.') + '</div>' +
      '<div class="field"><label for="sid">Student ID / Roll number</label><input id="sid" class="input" placeholder="e.g. 23DS001" ' + (isNew ? '' : 'disabled') + ' /></div>' +
      '<div class="field"><label for="sname">Full name</label><input id="sname" class="input" placeholder="Student name" ' + (isNew ? '' : 'disabled') + ' /></div>' +
      (isNew ? '<div id="pick-wrap">' + loadingHtml() + '</div>' : '<div class="field"><label for="scls">Class</label><input id="scls" class="input" disabled /></div>') +
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
        $('#sid').value = st.student_id; $('#sname').value = st.name; $('#scls').value = classLabel(st.class_name); savedClass = st.class_name;
        $('#who').textContent = st.name + ' (' + st.student_id + ') · ' + st.face_count + ' photo(s) enrolled';
      }).catch(function (e) { toast(e.message, true); });
    } else {
      var finishPicker = function (names) {
        var q = query();
        $('#pick-wrap').innerHTML = pickerHtml('pick');
        picker = bindPicker('pick', names, { allowNew: true, selected: q['class'], year: q.year, stream: q.stream });
      };
      api('/admin/classes').then(function (d) { finishPicker(d.classes.map(function (c) { return c.class_name; })); })
        .catch(function () { finishPicker([]); });
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
      var sid = $('#sid').value.trim().toUpperCase(), name = $('#sname').value.trim();
      var cls = isNew ? (picker ? picker.value() : '') : savedClass || 'existing';
      if (!sid || !name || !cls) { toast('Fill Student ID and name, and choose year, stream and section', true); return; }
      var btn = $('#save'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Saving…';
      $('#msg').innerHTML = '';
      var first = isNew
        ? api('/students', { method: 'POST', json: { student_id: sid, name: name, class_name: cls, email: ($('#semail').value.trim() || null) } })
          .catch(function (e) { if (e.status === 409) throw new Error('Student ID ' + sid + ' already exists. Open it from Students → Capture face.'); throw e; })
        : Promise.resolve();
      first.then(function () {
        if (isNew) savedClass = cls;
        isNew = false;
        $('#sid').disabled = $('#sname').disabled = true;
        if (picker) picker.disable(true);
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
          var pc = parseClass(savedClass);
          location.hash = pc ? '#/students/y/' + pc.year + '/' + pc.stream : '#/students';
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

  function pageClasses(year, stream) {
    var y = yearOf(year), st = streamOf(stream);
    var title = !year ? 'Classes' : year === 'OTHER' ? OTHER.label : stream ? y.label + ' · ' + st.label : y.label + ' Classes';
    var back = !year ? '#/dashboard' : (stream ? '#/classes/y/' + year : '#/classes');
    var add = session.role === 'admin'
      ? '<a class="btn btn-primary" href="#/students/new' + (year && year !== 'OTHER' ? '?year=' + year + (stream ? '&stream=' + stream : '') : '') + '">' + I.plus + 'Add student</a>' : '';
    mount('classes', pageHead(title, '<span id="cl-sub">Loading…</span>', back, add) + '<div id="list">' + loadingHtml() + '</div>');
    api('/admin/classes').then(function (d) {
      var cls = d.classes;
      function sum(list, k) { return list.reduce(function (a, c) { return a + c[k]; }, 0); }
      function inYear(c, yk) { var p = parseClass(c.class_name); return yk === 'OTHER' ? !p : p && p.year === yk; }
      if (!year) {
        var items = YEARS.map(function (yy, i) {
          var list = cls.filter(function (c) { return inYear(c, yy.k); });
          return { href: '#/classes/y/' + yy.k, badge: yy.badge, gold: i === 2, title: yy.label + ' · ' + yy.desc,
            lines: [plural(list.length, 'section') + ' · PCMB & PCMCs', plural(sum(list, 'students'), 'student')] };
        });
        var oth = cls.filter(function (c) { return !parseClass(c.class_name); });
        if (oth.length) items.push({ href: '#/classes/y/OTHER', badge: OTHER.badge, title: OTHER.label, lines: [plural(oth.length, 'class').replace('classs', 'classes'), plural(sum(oth, 'students'), 'student')] });
        $('#cl-sub').textContent = CONFIG.college + ' · ' + plural(cls.length, 'class').replace('classs', 'classes') + ' · ' + plural(sum(cls, 'students'), 'student');
        $('#list').innerHTML = cardGrid(items);
        return;
      }
      if (year !== 'OTHER' && !stream) {
        var yl = cls.filter(function (c) { return inYear(c, year); });
        $('#cl-sub').textContent = y.desc + ' · ' + plural(yl.length, 'section');
        $('#list').innerHTML = cardGrid(STREAMS.map(function (ss, i) {
          var list = yl.filter(function (c) { return parseClass(c.class_name).stream === ss.k; });
          return { href: '#/classes/y/' + year + '/' + ss.k, badge: ss.label, gold: i === 1, title: ss.label + ' · ' + y.label,
            lines: [ss.desc, plural(list.length, 'section') + ' · ' + plural(sum(list, 'students'), 'student')] };
        }));
        return;
      }
      var list = cls.filter(function (c) {
        var p = parseClass(c.class_name);
        return year === 'OTHER' ? !p : p && p.year === year && p.stream === stream;
      });
      $('#cl-sub').textContent = (year === 'OTHER' ? '' : st.desc + ' · ') + plural(list.length, 'section') + ' · ' + plural(sum(list, 'students'), 'student');
      if (!list.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No sections yet. A section appears when you add its first student.', 'classes') + '</div>'; return; }
      $('#list').innerHTML = cardGrid(list.map(function (c, i) {
        var p = parseClass(c.class_name);
        return { href: '#/classes/' + encodeURIComponent(c.class_name), badge: p ? p.section : badgeText(c.class_name), gold: i % 3 === 2,
          title: p ? 'Section ' + p.section : c.class_name, lines: [plural(c.students, 'student'), c.enrolled + ' with face enrolled'] };
      }));
    }).catch(function (e) { $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
  }

  function pageClass(name) {
    var isAdmin = session.role === 'admin';
    var pcl = parseClass(name);
    mount('classes', pageHead(classLabel(name), '<span id="c-sub">Loading…</span>', pcl ? '#/classes/y/' + pcl.year + '/' + pcl.stream : '#/classes/y/OTHER',
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

  // Take Attendance, page 1: session (class + date)
  function pageTake() {
    var q = query();
    mount('take', pageHead('Take Attendance', 'Step 1 of 3 · Choose the session', '#/dashboard') + stepsBar(1, TAKE_STEPS) +
      '<div class="panel narrow"><h3>Session</h3><div class="hint">Which class are you taking attendance for, and on which date?</div>' +
      '<div id="tpick-wrap">' + loadingHtml() + '</div>' +
      '<div class="field"><label for="date">Date</label><input id="date" type="date" class="input" value="' + esc(q.date || today()) + '" max="' + today() + '" /></div>' +
      '<div class="alert alert-warn" style="font-weight:500">Attendance for a class and date can be changed for ' + CONFIG.editWindowMinutes + ' minutes after it is first saved. After that it is locked.</div>' +
      '<div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/dashboard">Cancel</a>' +
      '<button class="btn btn-primary" id="next">Next: Classroom photo ' + L.arrow.replace('<svg', '<svg width="18" height="18"') + '</button></div></div>');
    var tpick = null;
    api('/admin/classes').then(function (d) {
      $('#tpick-wrap').innerHTML = pickerHtml('tpick');
      tpick = bindPicker('tpick', d.classes.map(function (c) { return c.class_name; }), { selected: q['class'] });
    }).catch(function (e) { $('#tpick-wrap').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    $('#next').onclick = function () {
      var cls = tpick ? tpick.value() : '', date = $('#date').value;
      if (!cls) { toast('Choose year, stream and section', true); return; }
      if (!date) { toast('Choose a date', true); return; }
      location.hash = '#/attendance/take/photo' + qs({ 'class': cls, date: date });
    };
  }

  function sessionStrip(cls, date, changeHref) {
    return '<div class="session-strip"><span class="ss-icon">' + I.classes + '</span><div><div class="ss-title">' + esc(classLabel(cls)) + '</div>' +
      '<div class="ss-sub">' + fmtDate(date) + '</div></div><a class="btn btn-ghost btn-sm" href="' + changeHref + '">Change</a></div>';
  }

  // Take Attendance, page 2: classroom photo (camera or upload) -> analyse
  var lastTake = null;
  function pageTakePhoto() {
    var q = query(), cls = q['class'], date = q.date;
    if (!cls || !date) { location.hash = '#/attendance/take'; return; }
    var back = '#/attendance/take' + qs({ 'class': cls, date: date });
    var photos = []; // {blob, url, name}
    var mode = 'camera';
    mount('take', pageHead('Classroom Photo', 'Step 2 of 3 · Capture or upload the classroom photo', back) + stepsBar(2, TAKE_STEPS) +
      '<div class="grid2 take-grid"><div class="panel">' + sessionStrip(cls, date, back) +
      '<h3 style="margin-top:18px">Tips for a good photo</h3>' +
      '<ul class="tips"><li>Whole class in one photo works for small rooms.</li><li>For big rooms take one photo per row and analyse them together.</li><li>Faces should be clear, facing the camera, not too small.</li><li>Good light; avoid strong light behind the students.</li></ul></div>' +
      '<div class="panel"><h3>Classroom photo</h3><div class="hint">One photo = whole class. Several photos = row by row.</div>' +
      '<div class="tabs"><button class="tab active" data-mode="camera">Camera</button><button class="tab" data-mode="upload">Upload</button></div>' +
      '<div class="camera env" id="cam"><div class="camera-empty" id="cam-empty">' + I.cam.replace('<svg', '<svg width="56" height="56"') + '<div id="cam-text">Camera is off</div></div>' +
      '<video id="video" class="hidden" playsinline muted></video></div>' +
      '<div class="camera-bar" id="cam-bar"><button class="btn btn-ghost" id="start">' + I.cam + 'Start camera</button>' +
      '<button class="btn btn-ghost" id="flip" disabled>Switch camera</button>' +
      '<button class="btn btn-gold" id="snap" disabled>' + I.cam + 'Capture</button></div>' +
      '<div class="camera-bar hidden" id="up-bar"><label class="btn btn-gold">' + I.upload + 'Choose photo(s)<input type="file" id="file" accept="image/jpeg,image/png" multiple class="hidden" /></label></div>' +
      '<div class="shots" id="shots"></div>' +
      '<div id="err"></div>' +
      '<button class="btn btn-primary btn-block" id="go" style="margin-top:16px" disabled>' + I.check + 'Analyze & save attendance</button></div></div>');

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
      var btn = $('#go'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Recognising faces… (10–40 s)';
      $('#err').innerHTML = '';
      var q2 = '?attendance_date=' + encodeURIComponent(date) + '&confirm_review=true';
      var req;
      if (photos.length === 1) {
        req = api('/attendance/mark-from-recognition/' + encodeURIComponent(cls) + q2, { method: 'POST', form: blobForm(photos[0].blob, photos[0].name) });
      } else {
        var f = new FormData();
        photos.forEach(function (p) { f.append('files', p.blob, p.name); });
        req = api('/attendance/mark-from-rows/' + encodeURIComponent(cls) + q2, { method: 'POST', form: f });
      }
      Promise.all([req, api('/admin/students')]).then(function (r) {
        lastTake = { res: r[0], cls: cls, date: date, roster: r[1].students.filter(function (s) { return s.class_name === cls; }) };
        stopCamera();
        location.hash = '#/attendance/take/result' + qs({ 'class': cls, date: date });
      }).catch(function (e) {
        $('#err').innerHTML = '<div class="alert alert-err" style="margin-top:14px">' + esc(e.message) + '</div>';
        drawShots();
      });
    };
  }

  // Take Attendance, page 3: result
  function pageTakeResult() {
    var q = query();
    if (!lastTake || lastTake.cls !== q['class'] || lastTake.date !== q.date) {
      location.hash = q['class'] && q.date ? '#/attendance/records/view' + qs({ 'class': q['class'], date: q.date }) : '#/attendance/take';
      return;
    }
    mount('take', pageHead('Attendance Saved', 'Step 3 of 3 · Check who was marked present', '#/attendance/take/photo' + qs({ 'class': lastTake.cls, date: lastTake.date })) +
      stepsBar(3, TAKE_STEPS) + '<div id="result"></div>');
    showResult(lastTake.res, lastTake.cls, lastTake.date, lastTake.roster);
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
    $('#result').innerHTML = '<div class="panel"><div class="page-head" style="margin-bottom:6px"><div><h2 class="page-title" style="font-size:22px">' + esc(classLabel(cls)) + '</h2>' +
      '<div class="page-sub">' + fmtDate(date) + (rec.model ? ' · model ' + esc(rec.model) : '') + '</div></div>' +
      '<div class="page-actions"><a class="btn btn-ghost" href="#/attendance/take">Take another</a><a class="btn btn-primary" href="#/attendance/records/view' + qs({ 'class': cls, date: date }) + '">Review & correct</a></div></div>' +
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
  }

  // Records, page 1: class + date
  function pageRecords() {
    var q = query();
    mount('records', pageHead('Attendance Records', 'Step 1 of 2 · Choose the class and date', '#/dashboard') + stepsBar(1, REC_STEPS) +
      '<div class="panel narrow"><h3>Class & date</h3><div class="hint">Pick a class, then one of the dates that has saved attendance.</div>' +
      '<div id="rpick-wrap">' + loadingHtml() + '</div>' +
      '<div class="row"><div class="field"><label for="dates">Saved dates</label><select id="dates" class="select"><option value="">Choose a class first</option></select></div>' +
      '<div class="field"><label for="date">Or any date</label><input id="date" type="date" class="input" value="' + esc(q.date || '') + '" /></div></div>' +
      '<div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/dashboard">Cancel</a>' +
      '<button class="btn btn-primary" id="next">View records ' + L.arrow.replace('<svg', '<svg width="18" height="18"') + '</button></div></div>');
    function loadDates(cls, pick) {
      $('#dates').innerHTML = '<option value="">Loading…</option>';
      return api('/admin/attendance-dates/' + encodeURIComponent(cls)).then(function (d) {
        $('#dates').innerHTML = d.dates.length
          ? d.dates.map(function (x) { return '<option value="' + x.date + '">' + fmtDate(x.date) + ' — ' + x.present + '/' + x.total + ' present</option>'; }).join('')
          : '<option value="">No attendance saved yet</option>';
        var date = pick || (d.dates[0] && d.dates[0].date) || '';
        if (date && d.dates.some(function (x) { return x.date === date; })) $('#dates').value = date;
        $('#date').value = date;
      }).catch(function (e) { toast(e.message, true); });
    }
    var rpick = null;
    api('/admin/classes').then(function (d) {
      $('#rpick-wrap').innerHTML = pickerHtml('rpick');
      rpick = bindPicker('rpick', d.classes.map(function (c) { return c.class_name; }), {
        selected: q['class'],
        onChange: function (v) { if (v) loadDates(v); else { $('#dates').innerHTML = '<option value="">Choose a class first</option>'; $('#date').value = ''; } }
      });
      if (rpick.value()) loadDates(rpick.value(), q.date);
    }).catch(function (e) { toast(e.message, true); });
    $('#dates').onchange = function () { $('#date').value = $('#dates').value; };
    $('#next').onclick = function () {
      var cls = rpick ? rpick.value() : '', date = $('#date').value;
      if (!cls) { toast('Choose year, stream and section', true); return; }
      if (!date) { toast('Choose a date', true); return; }
      location.hash = '#/attendance/records/view' + qs({ 'class': cls, date: date });
    };
  }

  // Records, page 2: the list with corrections
  function pageRecordsView() {
    var q = query(), cls = q['class'], date = q.date;
    if (!cls || !date) { location.hash = '#/attendance/records'; return; }
    var back = '#/attendance/records' + qs({ 'class': cls, date: date });
    mount('records', pageHead('Records', 'Step 2 of 2 · Correct mistakes within ' + CONFIG.editWindowMinutes + ' minutes', back) + stepsBar(2, REC_STEPS) +
      sessionStrip(cls, date, back) + '<div id="list" style="margin-top:18px">' + loadingHtml() + '</div>');
    var box = $('#list');
    function gone() { return !document.body.contains(box); }
    function load() {
      api('/attendance/' + encodeURIComponent(cls) + '/' + date).then(function (d) {
        if (gone()) return;
        if (!d.records.length) { $('#list').innerHTML = '<div class="panel">' + emptyHtml('No attendance saved for ' + esc(classLabel(cls)) + ' on ' + fmtDate(date) + '.', 'records') + '</div>'; return; }
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
                .then(function () { toast('Correction saved'); load(); })
                .catch(function (e) { toast(e.message, true); });
            });
          };
        });
      }).catch(function (e) { if (gone()) return; $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    load();
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
        return '<option value="' + esc(s.student_id) + '">' + esc(s.name) + ' (' + esc(s.student_id) + ') · ' + esc(classShort(s.class_name)) + '</option>';
      }).join('') : '<option value="">No students</option>';
      load();
    }).catch(function (e) { toast(e.message, true); });
    $('#stu').onchange = load;
  }

  // Users: section cards -> one role's accounts -> that role's own add page
  var ROLE_PAGE = {
    admin: { badge: 'A', gold: false, title: 'Admins', add: 'Add Admin', desc: 'Everything: students, faces, accounts, records' },
    lecturer: { badge: 'P', gold: true, title: 'Professors / Lecturers', add: 'Add Professor', desc: 'Take attendance and view records' },
    student: { badge: 'S', gold: false, title: 'Students', add: 'Add Student Login', desc: 'See only their own attendance' }
  };
  function pageUsers(role) {
    if (!role) {
      mount('users', pageHead('Users', 'Choose who you want to see or add', '#/dashboard') + '<div id="list">' + loadingHtml() + '</div>');
      var box0 = $('#list');
      api('/admin/users').then(function (d) {
        box0.innerHTML = cardGrid(ROLE_ORDER.map(function (r) {
          var n = d.users.filter(function (u) { return u.role === r; }).length;
          return { href: '#/users/' + r, badge: ROLE_PAGE[r].badge, gold: ROLE_PAGE[r].gold, title: ROLES[r].group, lines: [ROLE_PAGE[r].desc, plural(n, 'account')] };
        }));
      }).catch(function (e) { box0.innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
      return;
    }
    var rp = ROLE_PAGE[role];
    mount('users', pageHead(rp.title, '<span id="u-sub">Loading…</span>', '#/users',
      '<a class="btn btn-primary" href="#/users/' + role + '/new">' + I.plus + esc(rp.add) + '</a>') +
      '<div id="list">' + loadingHtml() + '</div>');

    function row(u) {
      var me = u.username === session.username;
      return '<tr><td><div class="who"><span class="avatar">' + esc(initials(u.name)) + '</span><div><div style="font-weight:600">' + esc(u.name) + (me ? ' <span class="pill pill-grey">You</span>' : '') + '</div>' +
        '<div class="mono">' + esc(u.username) + '</div></div></div></td>' +
        (role === 'student' ? '<td class="mono hide-sm">' + esc(u.student_id || '') + '</td>' : '') +
        '<td>' + (u.active ? '<span class="pill pill-green">Active</span>' : '<span class="pill pill-grey">Deactivated</span>') + '</td>' +
        '<td><div class="actions"><button class="btn btn-ghost btn-sm" data-reset="' + u.id + '" data-name="' + esc(u.name) + '">Reset password</button>' +
        (me ? '' : '<button class="btn ' + (u.active ? 'btn-danger' : 'btn-ghost') + ' btn-sm" data-active="' + u.id + '" data-to="' + (!u.active) + '" data-name="' + esc(u.name) + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button>') +
        '</div></td></tr>';
    }
    var box = $('#list'), sub = $('#u-sub');
    function load() {
      api('/admin/users').then(function (d) {
        if (!document.body.contains(box)) return;
        var g = d.users.filter(function (u) { return u.role === role; });
        sub.textContent = plural(g.length, 'account') + ' · ' + rp.desc;
        $('#list').innerHTML = g.length
          ? '<div class="table-wrap"><table><thead><tr><th>Account</th>' + (role === 'student' ? '<th class="hide-sm">Student ID</th>' : '') + '<th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>' + g.map(row).join('') + '</tbody></table></div>'
          : '<div class="panel">' + emptyHtml('No ' + esc(ROLES[role].group.toLowerCase()) + ' accounts yet. Click ' + esc(rp.add) + ' to create one.', 'usersAdmin') + '</div>';
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
      }).catch(function (e) { box.innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
    }
    load();
  }

  // Add page for one role (Add Admin / Add Professor / Add Student Login)
  function pageUserNew(role) {
    var rp = ROLE_PAGE[role], isStu = role === 'student';
    mount('users', pageHead(rp.add, isStu ? 'Give a registered student their own login' : 'Create a sign-in for a ' + ROLES[role].one.toLowerCase(), '#/users/' + role) +
      '<div class="panel narrow"><div class="role-head">' + roleBadge(role) + '<span>' + esc(rp.desc) + '</span></div>' +
      '<form id="new-user" autocomplete="off">' +
      (isStu ? '<div class="field"><label for="nu-sid">Which student?</label><select id="nu-sid" class="select"><option value="">Loading students…</option></select>' +
        '<div class="hint" style="margin-top:6px">The student must be added first (Add Student). One login per student.</div></div>' : '') +
      '<div class="row"><div class="field"><label for="nu-name">Full name</label><input id="nu-name" class="input" required /></div>' +
      '<div class="field"><label for="nu-user">Username</label><input id="nu-user" class="input" placeholder="' + (isStu ? 'e.g. 26pu1001' : role === 'admin' ? 'e.g. principal' : 'e.g. ravi.k') + '" autocapitalize="none" required /></div></div>' +
      '<div class="field"><label for="nu-pass">First password</label><input id="nu-pass" class="input" placeholder="At least 8 characters" required /></div>' +
      '<div class="hint">Give the person their username and this first password. They can change it under My Account.</div>' +
      '<div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/users/' + role + '">Cancel</a>' +
      '<button class="btn btn-primary" type="submit">' + I.plus + 'Create ' + esc(ROLES[role].one.toLowerCase()) + ' account</button></div></form></div>');

    if (isStu) {
      var byId = {}, sel = $('#nu-sid');
      $('#nu-sid').onchange = function () {
        var st = byId[$('#nu-sid').value];
        if (!st) return;
        $('#nu-name').value = st.name;
        $('#nu-user').value = st.student_id.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      };
      Promise.all([api('/admin/students'), api('/admin/users')]).then(function (r) {
        var taken = {};
        r[1].users.forEach(function (u) { if (u.student_id) taken[u.student_id] = true; });
        var free = r[0].students.filter(function (st) { return !taken[st.student_id]; });
        free.forEach(function (st) { byId[st.student_id] = st; });
        sel.innerHTML = free.length
          ? '<option value="">Choose a student…</option>' + free.map(function (st) {
              return '<option value="' + esc(st.student_id) + '">' + esc(st.name) + ' · ' + esc(st.student_id) + ' · ' + esc(classShort(st.class_name)) + '</option>';
            }).join('')
          : '<option value="">' + (r[0].students.length ? 'Every student already has a login' : 'No students yet — add one first') + '</option>';
      }).catch(function () { sel.innerHTML = '<option value="">Could not load students</option>'; });
    }

    $('#new-user').onsubmit = function (e) {
      e.preventDefault();
      if (isStu && !$('#nu-sid').value) { toast('Choose which student this login is for', true); return; }
      api('/admin/users', { method: 'POST', json: { name: $('#nu-name').value.trim(), username: $('#nu-user').value.trim(), role: role, password: $('#nu-pass').value, student_id: isStu ? $('#nu-sid').value : null } })
        .then(function (res) { toast(res.message); location.hash = '#/users/' + role; })
        .catch(function (err) { toast(err.message, true); });
    };
  }

  // Student home: their own attendance
  function pageMyAttendance() {
    var first = session.name.split(' ')[0];
    mount('myatt',
      '<section class="banner"><div class="banner-text"><div class="banner-meta"><span class="chip chip-role">STUDENT</span>• ' + esc(CONFIG.college) + '</div>' +
      '<h1>' + greeting() + ', <em>' + esc(first) + '</em></h1><div class="banner-sub" id="me-class">' + esc(CONFIG.campus) + '</div>' +
      '<div class="banner-desc">Your attendance, marked by face recognition in class.</div></div>' +
      '<div class="banner-card"><span class="avatar">' + esc(initials(session.name)) + '</span><div><div class="user-name">' + esc(session.name) + '</div><div style="color:#f2d9d9;font-size:13px">' + esc(session.student_id || session.username) + '</div></div></div></section>' +
      '<div class="stats" id="stats">' + loadingHtml('Loading your attendance…') + '</div>' +
      '<div class="section-title"><h2>Attendance history</h2><span class="count-pill" id="me-count">—</span></div>' +
      '<div id="list"></div>');
    api('/me/attendance').then(function (d) {
      $('#me-class').textContent = classLabel(d.student.class_name);
      var pct = d.total ? Math.round(100 * d.present / d.total) + '%' : '—';
      var cards = [
        ['take', '#e8f7ef', d.present, 'Days present'],
        ['records', '#fdecec', d.total - d.present, 'Days absent'],
        ['classes', '#eef3ff', d.total, 'Days recorded'],
        ['dashboard', '#fff4e5', pct, 'Attendance']
      ];
      $('#stats').innerHTML = cards.map(function (c) {
        return '<div class="stat"><div class="stat-icon" style="background:' + c[1] + '">' + I[c[0]] + '</div><div><div class="stat-value">' + esc(c[2]) + '</div><div class="stat-label">' + c[3] + '</div></div></div>';
      }).join('');
      $('#me-count').textContent = plural(d.total, 'day');
      $('#list').innerHTML = d.records.length
        ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th class="hide-sm">Class</th><th>Status</th><th class="hide-sm">Marked at</th></tr></thead><tbody>' +
          d.records.map(function (r) {
            return '<tr><td style="font-weight:600">' + fmtDate(r.date) + '</td><td class="hide-sm">' + esc(classShort(r.class_name)) + '</td>' +
              '<td><span class="pill ' + (r.status === 'Present' ? 'pill-green' : 'pill-red') + '">' + esc(r.status) + '</span></td><td class="hide-sm mono">' + fmtTime(r.marked_at) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="panel">' + emptyHtml('No attendance has been taken for you yet.', 'records') + '</div>';
    }).catch(function (e) {
      $('#stats').innerHTML = '';
      $('#list').innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>';
    });
  }

  // My Account, page 1: profile
  function pageAccount() {
    var home = session.role === 'student' ? '#/me' : '#/dashboard';
    mount('account', pageHead('My Account', 'Your sign-in details', home) +
      '<div class="panel narrow"><div class="who" style="display:flex;gap:16px;align-items:center"><span class="avatar" style="width:64px;height:64px;font-size:20px">' + esc(initials(session.name)) + '</span>' +
      '<div><div style="font-weight:800;font-size:20px">' + esc(session.name) + '</div><div class="mono">' + esc(session.username) + (session.student_id ? ' · ' + esc(session.student_id) : '') + '</div>' +
      '<div style="margin-top:8px">' + roleBadge(session.role) + '</div></div></div>' +
      '<div class="hint" style="margin-top:16px">Ask an admin to change your name or role.</div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" id="acc-out">' + I.logout.replace('<svg', '<svg width="18" height="18"') + 'Sign out</button>' +
      '<a class="btn btn-primary" href="#/account/password">' + I.lock + 'Change password</a></div></div>');
    $('#acc-out').onclick = function () { signOut(); };
  }

  // My Account, page 2: change password
  function pagePassword() {
    mount('account', pageHead('Change Password', 'At least 8 characters', '#/account') +
      '<div class="panel narrow"><form id="pw-form">' +
      '<div class="field"><label for="cur">Current password</label><input id="cur" type="password" class="input" autocomplete="current-password" required /></div>' +
      '<div class="field"><label for="np">New password</label><input id="np" type="password" class="input" autocomplete="new-password" required /></div>' +
      '<div class="field"><label for="np2">Confirm new password</label><input id="np2" type="password" class="input" autocomplete="new-password" required /></div>' +
      '<div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/account">Cancel</a><button class="btn btn-primary" type="submit">Change password</button></div></form></div>');
    $('#pw-form').onsubmit = function (e) {
      e.preventDefault();
      if ($('#np').value !== $('#np2').value) { toast('New passwords do not match', true); return; }
      api('/auth/change-password', { method: 'POST', json: { current_password: $('#cur').value, new_password: $('#np').value } })
        .then(function () { toast('Password changed'); location.hash = '#/account'; })
        .catch(function (err) { toast(err.message, true); });
    };
  }

  // ---------------------------------------------------------------- router
  function route() {
    if (session && !session.token) { store('faceid-session', null); session = null; }
    var path = (location.hash.replace(/^#/, '').split('?')[0]) || '/';
    $('#modal-root').innerHTML = '';
    if (!session) { if (path !== '/login') { location.hash = '#/login'; return; } return pageLogin(); }
    if (path === '/login' || path === '/') { location.hash = session.role === 'student' ? '#/me' : '#/dashboard'; return; }
    if (path === '/account') return pageAccount();
    if (path === '/account/password') return pagePassword();
    if (session.role === 'student') {
      if (path === '/me') return pageMyAttendance();
      location.hash = '#/me'; return;
    }
    var admin = session.role === 'admin', m;
    if (path === '/dashboard') return pageDashboard();
    if (path === '/classes') return pageClasses();
    if ((m = path.match(/^\/classes\/y\/(1PU|2PU|LT|OTHER)(?:\/(PCMB|PCMCS))?$/))) return pageClasses(m[1], m[2]);
    if ((m = path.match(/^\/classes\/(.+)$/))) return pageClass(decodeURIComponent(m[1]));
    if (path === '/attendance/take') return pageTake();
    if (path === '/attendance/take/photo') return pageTakePhoto();
    if (path === '/attendance/take/result') return pageTakeResult();
    if (path === '/attendance/records') return pageRecords();
    if (path === '/attendance/records/view') return pageRecordsView();
    if (admin && path === '/students') return pageStudents();
    if (admin && (m = path.match(/^\/students\/y\/(1PU|2PU|LT|OTHER)(?:\/(PCMB|PCMCS))?$/))) return pageStudents(m[1], m[2]);
    if (admin && (m = path.match(/^\/students\/(.+)\/edit$/))) return pageEdit(decodeURIComponent(m[1]));
    if (admin && path === '/students/new') return pageAddStudent();
    if (admin && (m = path.match(/^\/students\/(.+)\/face$/))) return pageEnroll(decodeURIComponent(m[1]));
    if (admin && path === '/audit') return pageAudit();
    if (admin && path === '/users') return pageUsers();
    if (admin && (m = path.match(/^\/users\/(admin|lecturer|student)$/))) return pageUsers(m[1]);
    if (admin && (m = path.match(/^\/users\/(admin|lecturer|student)\/new$/))) return pageUserNew(m[1]);
    if (admin && path === '/users/new') { var r0 = query().role; location.hash = '#/users/' + (ROLES[r0] ? r0 : 'lecturer') + '/new'; return; }
    location.hash = '#/dashboard';
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', stopCamera);
  route();
})();
