(function () {
  var cfg = window.SURVEY_CONFIG;
  var Q = window.QUESTIONS;
  var esc = window.esc;
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  var loginView = document.getElementById('login-view');
  var dash = document.getElementById('dash');
  var loginError = document.getElementById('login-error');
  var content = document.getElementById('content');
  var rows = [];
  var view = 'stats';

  function showLogin(msg) {
    dash.hidden = true;
    loginView.hidden = false;
    loginError.textContent = msg || '';
    loginError.hidden = !msg;
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function text(v) {
    return Array.isArray(v) ? v.join(' | ') : (v == null ? '' : String(v));
  }

  async function fetchAll() {
    var all = [];
    for (var from = 0; ; from += 1000) {
      var res = await db.from('responses').select('id, created_at, answers').order('id', { ascending: false }).range(from, from + 999);
      if (res.error) throw res.error;
      all = all.concat(res.data);
      if (res.data.length < 1000) return all;
    }
  }

  async function openDashboard() {
    var adm = await db.rpc('is_admin');
    if (adm.error || !adm.data) {
      await db.auth.signOut();
      return showLogin('هذا الحساب ليس له صلاحية الاطلاع على الإجابات.');
    }
    loginView.hidden = true;
    dash.hidden = false;
    content.innerHTML = '<div class="card empty">جارٍ التحميل…</div>';
    try {
      rows = await fetchAll();
    } catch (e) {
      content.innerHTML = '<div class="alert">تعذّر تحميل الإجابات، حدّث الصفحة.</div>';
      return;
    }
    render();
  }

  function render() {
    document.getElementById('total').textContent = rows.length;
    document.getElementById('export').hidden = !rows.length;
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.view === view);
    });
    if (!rows.length) {
      content.innerHTML = '<div class="card empty">لا توجد إجابات بعد.</div>';
      return;
    }
    content.innerHTML = view === 'stats' ? statsHtml() : tableHtml();
  }

  function statsHtml() {
    var total = rows.length;
    return '<div class="stats">' + Q.map(function (q, i) {
      var counts = {};
      var notes = [];
      q.options.forEach(function (o) { counts[o] = 0; });
      rows.forEach(function (r) {
        [].concat(r.answers[q.id] || []).forEach(function (v) {
          if (q.other && v.indexOf(q.other + ': ') === 0) {
            notes.push(v.slice(q.other.length + 2));
            v = q.other;
          }
          if (v in counts) counts[v]++;
        });
      });
      return '<section class="card"><h3>' + (i + 1) + '. ' + esc(q.title) + '</h3>' +
        q.options.map(function (o) {
          var pct = Math.round(counts[o] / total * 100);
          return '<div class="row"><span>' + esc(o) + '</span>' +
            '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
            '<span class="pct">' + counts[o] + ' · ' + pct + '%</span></div>';
        }).join('') +
        (notes.length ? '<ul class="notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '</section>';
    }).join('') + '</div>';
  }

  function tableHtml() {
    return '<div class="table-wrap"><table><thead><tr><th>#</th><th>التاريخ</th>' +
      Q.map(function (q) { return '<th title="' + esc(q.title) + '">' + esc(q.short) + '</th>'; }).join('') +
      '<th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="narrow">' + r.id + '</td><td class="narrow">' + fmtDate(r.created_at) + '</td>' +
          Q.map(function (q) { return '<td>' + esc(text(r.answers[q.id])) + '</td>'; }).join('') +
          '<td class="narrow"><button type="button" class="del" data-id="' + r.id + '">حذف</button></td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function exportCsv() {
    var cell = function (v) {
      v = text(v);
      if (/^[=+\-@]/.test(v)) v = "'" + v;
      return '"' + v.replace(/"/g, '""') + '"';
    };
    var lines = [['#', 'التاريخ'].concat(Q.map(function (q) { return q.title; })).map(cell).join(',')];
    rows.slice().reverse().forEach(function (r) {
      lines.push([r.id, fmtDate(r.created_at)].concat(Q.map(function (q) { return r.answers[q.id]; })).map(cell).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'survey-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('login').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = this.querySelector('button');
    btn.disabled = true;
    var res = await db.auth.signInWithPassword({
      email: document.getElementById('email').value.trim().toLowerCase(),
      password: document.getElementById('pass').value.trim()
    });
    btn.disabled = false;
    if (res.error) {
      return showLogin(res.error.code === 'invalid_credentials' || res.error.status === 400
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        : 'تعذّر تسجيل الدخول، تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
    }
    openDashboard();
  });

  document.getElementById('logout').addEventListener('click', async function () {
    await db.auth.signOut();
    rows = [];
    showLogin();
  });

  document.getElementById('export').addEventListener('click', exportCsv);

  document.querySelector('.tabs').addEventListener('click', function (e) {
    if (e.target.dataset.view) {
      view = e.target.dataset.view;
      render();
    }
  });

  content.addEventListener('click', async function (e) {
    var id = e.target.dataset && e.target.dataset.id;
    if (!id || !confirm('حذف هذه الإجابة نهائيًا؟')) return;
    var res = await db.from('responses').delete().eq('id', id);
    if (res.error) return alert('تعذّر الحذف.');
    rows = rows.filter(function (r) { return String(r.id) !== id; });
    render();
  });

  db.auth.getSession().then(function (res) {
    if (res.data.session) openDashboard();
    else showLogin();
  });
})();
