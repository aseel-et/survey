(function () {
  var cfg = window.SURVEY_CONFIG;
  var Q = window.QUESTIONS;
  var esc = window.esc;
  var form = document.getElementById('survey');
  var alertBox = document.getElementById('alert');

  document.title = cfg.title;
  document.getElementById('title').textContent = cfg.title;
  document.getElementById('intro').textContent = cfg.intro;

  var configured = cfg.supabaseUrl.indexOf('YOUR-') === -1 && cfg.supabaseKey.indexOf('YOUR-') === -1;
  var db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false } }) : null;

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = !msg;
  }

  if (!configured) showAlert('لم يتم ربط الاستبيان بقاعدة البيانات بعد (assets/config.js).');

  // ===== عرض الأسئلة =====
  document.getElementById('questions').innerHTML = Q.map(function (q, i) {
    var multi = q.type === 'multi';
    return '<section class="q" data-id="' + q.id + '" role="group" aria-labelledby="t-' + q.id + '">' +
      '<div class="q-head"><span class="num">' + (i + 1) + '</span><div>' +
        '<h2 id="t-' + q.id + '">' + esc(q.title) + '</h2>' +
        (multi ? '<p class="hint">يمكن اختيار أكثر من إجابة.</p>' : '') +
      '</div></div>' +
      '<div class="opts ' + q.layout + '">' +
        q.options.map(function (o) {
          return '<label class="opt"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + q.id + '" value="' + esc(o) + '"' +
            (q.exclusive === o ? ' data-exclusive' : '') + (q.other === o ? ' data-other' : '') + '>' +
            '<span>' + esc(o) + '</span></label>';
        }).join('') +
      '</div>' +
      (q.other ? '<div class="other-input" hidden><input type="text" maxlength="500" placeholder="يرجى التوضيح…"></div>' : '') +
      '<p class="err"></p>' +
    '</section>';
  }).join('');

  function otherText(sec) {
    return sec.querySelector('.other-input input');
  }

  // يعيد رسالة الخطأ أو نصًا فارغًا إن كان السؤال مُجابًا
  function problem(sec) {
    if (!sec.querySelector('input:checked')) {
      return sec.querySelector('input[type=checkbox]') ? 'يرجى اختيار إجابة واحدة على الأقل.' : 'يرجى اختيار إجابة.';
    }
    var other = sec.querySelector('[data-other]');
    if (other && other.checked && otherText(sec).value.trim() === '') {
      return 'يرجى توضيح الإجابة «' + other.value + '».';
    }
    return '';
  }

  function collect() {
    var answers = {};
    Q.forEach(function (q) {
      var sec = form.querySelector('.q[data-id="' + q.id + '"]');
      var vals = [].map.call(sec.querySelectorAll('input:checked'), function (i) { return i.value; });
      var oi = q.other ? vals.indexOf(q.other) : -1;
      if (oi > -1) vals[oi] = q.other + ': ' + otherText(sec).value.trim().slice(0, 500);
      answers[q.id] = q.type === 'multi' ? vals : vals[0];
    });
    return answers;
  }

  function showThanks() {
    document.getElementById('app').innerHTML =
      '<section class="card thanks"><div class="tick">✓</div><h1>شكرًا لمشاركتك</h1><p>تم حفظ إجاباتك بنجاح.</p></section>';
    window.scrollTo(0, 0);
  }

  form.addEventListener('change', function (e) {
    var input = e.target;
    var sec = input.closest('.q');
    if (!sec) return;
    if (input.type === 'checkbox' && input.checked) {
      sec.querySelectorAll('input[type=checkbox]').forEach(function (b) {
        if (b !== input && (input.hasAttribute('data-exclusive') || b.hasAttribute('data-exclusive'))) b.checked = false;
      });
    }
    var other = sec.querySelector('[data-other]');
    if (other) {
      sec.querySelector('.other-input').hidden = !other.checked;
      if (other.checked && input === other) otherText(sec).focus();
    }
    if (!problem(sec)) sec.classList.remove('has-error');
  });

  form.addEventListener('input', function (e) {
    var sec = e.target.closest('.q');
    if (sec && e.target.type === 'text' && !problem(sec)) sec.classList.remove('has-error');
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var first = null;
    form.querySelectorAll('.q').forEach(function (sec) {
      var msg = problem(sec);
      sec.classList.toggle('has-error', !!msg);
      if (msg) {
        sec.querySelector('.err').textContent = msg;
        if (!first) first = sec;
      }
    });
    if (first) {
      showAlert('يرجى إكمال الأسئلة المحددة باللون الأحمر.');
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (form.website.value) return showThanks(); // حقل مخفي لاصطياد البرامج الآلية
    if (!db) return showAlert('لم يتم ربط الاستبيان بقاعدة البيانات بعد (assets/config.js).');

    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'جارٍ الإرسال…';
    showAlert('');

    var res = await db.from('responses').insert({ answers: collect() });
    if (res.error) {
      btn.disabled = false;
      btn.textContent = 'إرسال الإجابات';
      showAlert('تعذّر حفظ الإجابات، تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
      return;
    }
    showThanks();
  });
})();
