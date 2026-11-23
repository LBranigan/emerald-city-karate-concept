/* Emerald City Karate: page behaviour and the trial sign-up flow.
   Plain script (no modules) so the page also works when opened straight from disk. */
(function () {
  'use strict';

  var D = window.ECK;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Dates and times ---------- */

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(iso, time) {
    var p = iso.split('-').map(Number);
    var t = (time || '00:00').split(':').map(Number);
    return new Date(p[0], p[1] - 1, p[2], t[0], t[1]);
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dayDiff(a, b) { return Math.round((addDays(a, 0) - addDays(b, 0)) / 86400000); }

  function fmtTime(t) {
    var p = t.split(':').map(Number);
    return (p[0] % 12 || 12) + ':' + pad(p[1]) + ' ' + (p[0] < 12 ? 'AM' : 'PM');
  }
  function fmtRange(s, e) {
    var sameHalf = (Number(s.split(':')[0]) < 12) === (Number(e.split(':')[0]) < 12);
    var start = fmtTime(s);
    if (sameHalf) start = start.replace(/ (AM|PM)$/, '');
    return start + ' to ' + fmtTime(e);
  }
  function fmtDayShort(d) { return DAYS_S[d.getDay()] + ', ' + MONTHS_S[d.getMonth()] + ' ' + d.getDate(); }
  function fmtDayLong(d) { return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtMonthDay(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function relDay(d, now) {
    var diff = dayDiff(d, now);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff < 7) return DAYS[d.getDay()];
    return fmtDayShort(d);
  }

  /* ---------- Classes ---------- */

  function program(id) {
    for (var i = 0; i < D.programs.length; i++) if (D.programs[i].id === id) return D.programs[i];
    return null;
  }

  // Upcoming classes for a program: weekly pattern, minus closures, plus holiday-week changes.
  function slotsFor(programId, days, now) {
    var p = program(programId);
    var out = [];
    if (!p) return out;
    now = now || new Date();
    for (var i = 0; i < days; i++) {
      var day = addDays(now, i);
      var iso = isoDate(day);
      if (D.closures.indexOf(iso) !== -1) continue;
      var changed = D.overrides[iso] && D.overrides[iso][programId];
      var list = changed || p.weekly.filter(function (w) { return w.dow === day.getDay(); });
      for (var j = 0; j < list.length; j++) {
        var w = list[j];
        var when = fromIso(iso, w.start);
        if (when <= now) continue;
        var left = null;
        if (p.capacity) {
          var taken = (D.reserved[programId] || {})[iso];
          if (typeof taken === 'number') left = Math.max(0, p.capacity - taken);
        }
        out.push({ id: iso + 'T' + w.start, date: iso, start: w.start, end: w.end, room: w.room, note: w.note || '', left: left, when: when });
      }
    }
    return out;
  }

  function nextOpen(programId) {
    var list = slotsFor(programId, 21);
    for (var i = 0; i < list.length; i++) if (list[i].left !== 0) return list[i];
    return null;
  }

  function spotsText(left) {
    if (left === null) return '';
    if (left === 0) return 'Full';
    if (left === 1) return 'Last spot';
    if (left <= 4) return 'Only ' + left + ' spots left';
    return left + ' spots open';
  }

  function paintNextClass() {
    var now = new Date();
    D.programs.forEach(function (p) {
      var s = nextOpen(p.id);
      if (!s) return;
      var short = 'Next class ' + relDay(s.when, now) + ', ' + fmtTime(s.start);
      $$('[data-next="' + p.id + '"]').forEach(function (el) { el.textContent = short; });
      $$('[data-next-long="' + p.id + '"]').forEach(function (el) {
        el.textContent = 'Next class ' + relDay(s.when, now) + ' at ' + fmtTime(s.start);
        if (s.left !== null) {
          var span = document.createElement('span');
          if (s.left <= 4) span.className = 'low';
          span.textContent = ', ' + spotsText(s.left).toLowerCase();
          el.appendChild(span);
        }
      });
    });
  }

  // Say so on the page when the coming week isn't a normal one.
  function paintHolidayNote() {
    var el = $('[data-holiday-note]');
    if (!el) return;
    var now = new Date();
    var closed = [], changed = false;
    for (var i = 0; i < 7; i++) {
      var day = addDays(now, i), iso = isoDate(day);
      if (D.closures.indexOf(iso) !== -1 && day.getDay() !== 0) closed.push(fmtDayLong(day));
      if (D.overrides[iso]) changed = true;
    }
    if (!closed.length && !changed) { el.hidden = true; return; }
    var text = 'Holiday week. ';
    if (closed.length) text += 'The dojo is closed ' + (closed.length > 1 ? closed.slice(0, -1).join(', ') + ' and ' + closed[closed.length - 1] : closed[0]) + '. ';
    if (changed) text += 'Some class times are different this week. ';
    text += $('.picker') ? 'You’ll see the exact times when you choose a first class.' : 'The Zen Planner calendar shows the classes that are running.';
    el.textContent = text;
    el.hidden = false;
  }

  /* ---------- Sign-up state ---------- */

  var STORE = 'eck-trial-draft';

  function blankFields() {
    return {
      studentFirst: '', studentLast: '', dob: '',
      guardianFirst: '', guardianLast: '',
      email: '', phone: '',
      emergencySame: true, emergencyName: '', emergencyPhone: '',
      notes: '', source: ''
    };
  }
  function blankState() {
    return { step: 1, program: null, slotId: null, later: false, whofor: 'child', f: blankFields(), waiver: false, done: false };
  }

  function loadState() {
    try {
      var raw = window.sessionStorage.getItem(STORE);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !s.f) return null;
      s.f = Object.assign(blankFields(), s.f);
      return Object.assign(blankState(), s);
    } catch (e) { return null; }
  }
  function saveState() {
    try { window.sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private mode: carry on without a draft */ }
  }

  var state = loadState() || blankState();

  function currentSlot() {
    if (!state.program || !state.slotId) return null;
    var list = slotsFor(state.program, 21);
    for (var i = 0; i < list.length; i++) if (list[i].id === state.slotId) return list[i];
    return null;
  }

  /* ---------- Dialog plumbing ---------- */

  var dialog = $('#booking');
  var form = $('[data-booking-form]');
  var body = $('[data-booking-body]');
  var backBtn = $('[data-go-back]', dialog);
  var nextBtn = $('[data-go-next]', dialog);
  var summary = $('[data-summary]', dialog);
  var touched = {};

  function lockScroll(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }

  function openBooking(programId) {
    if (state.done) state = blankState();
    if (programId && program(programId)) {
      setProgram(programId);
      state.step = Math.max(state.step, 2);
      if (state.step > 2 && !state.slotId && !state.later) state.step = 2;
    }
    if (state.slotId && !currentSlot()) { state.slotId = null; if (state.step > 2) state.step = 2; }
    if (!state.program) state.step = 1;
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
    lockScroll(true);
    showStep(state.step);
  }

  function closeBooking() {
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  dialog.addEventListener('close', function () { lockScroll(false); saveState(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeBooking(); });
  $('[data-close]', dialog).addEventListener('click', closeBooking);

  function setProgram(id) {
    if (state.program !== id) {
      state.program = id;
      state.slotId = null;
      state.later = false;
      state.whofor = id === 'adults' ? 'self' : 'child';
    }
  }

  /* ---------- Step rendering ---------- */

  function showStep(n, moveFocus) {
    state.step = n;
    $$('.bstep', dialog).forEach(function (sec) { sec.hidden = Number(sec.dataset.step) !== n; });

    $$('[data-bar]', dialog).forEach(function (li) {
      var i = Number(li.dataset.bar);
      var st = n >= 5 || i < n ? 'done' : i === n ? 'current' : 'todo';
      if (li.dataset.state !== st) li.dataset.state = st;
      if (st === 'current') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });

    if (n === 1) paintStep1();
    if (n === 2) paintStep2();
    if (n === 3) paintStep3();
    if (n === 4) paintStep4();
    if (n === 5) paintStep5();

    backBtn.hidden = n === 1 || n === 5;
    nextBtn.disabled = false;
    nextBtn.textContent = n === 4 ? 'Pay $' + D.trial.price.toFixed(2) : n === 5 ? 'Done' : 'Continue';
    paintSummary();
    saveState();

    body.scrollTop = 0;
    if (moveFocus !== false) {
      var h = $('.bstep[data-step="' + n + '"] h3', dialog);
      if (h) h.focus({ preventScroll: true });
    }
  }

  function paintSummary() {
    var p = program(state.program);
    if (!p || state.step === 1 || state.step === 5) { summary.textContent = ''; return; }
    var s = currentSlot();
    summary.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = p.name;
    summary.appendChild(b);
    var rest = s ? ', ' + fmtDayShort(s.when) + ' at ' + fmtTime(s.start) : state.later ? ', first class to be arranged' : '';
    summary.appendChild(document.createTextNode(rest));
  }

  function showErr(name, msg) {
    var el = $('[data-err="' + name + '"]', dialog);
    if (!el) return;
    if (!el.id) el.id = 'err-' + name;
    if (msg) { el.textContent = msg; el.hidden = false; } else { el.hidden = true; }
    var input = form.elements[name];
    if (input && input.setAttribute) {
      if (msg) { input.setAttribute('aria-invalid', 'true'); if (el.id) input.setAttribute('aria-describedby', el.id); }
      else input.removeAttribute('aria-invalid');
    }
  }

  /* Step 1: who */

  function paintStep1() {
    $$('input[name="program"]', dialog).forEach(function (r) { r.checked = r.value === state.program; });
    $('[data-err="program"]', dialog).hidden = true;
  }

  $$('input[name="program"]', dialog).forEach(function (r) {
    r.addEventListener('change', function () { setProgram(r.value); $('[data-err="program"]', dialog).hidden = true; saveState(); });
    // A click or tap on a choice moves straight on; arrow keys only change the selection.
    r.addEventListener('click', function (e) { if (e.detail > 0) { setProgram(r.value); showStep(2); } });
  });

  /* Step 2: first class */

  function weekLabel(d, now) {
    var mondayOf = function (x) { return addDays(x, -((x.getDay() + 6) % 7)); };
    var diff = Math.round(dayDiff(mondayOf(d), mondayOf(now)) / 7);
    if (diff === 0) return 'This week';
    if (diff === 1) return 'Next week';
    return 'Week of ' + fmtMonthDay(mondayOf(d));
  }

  function paintStep2() {
    var p = program(state.program);
    var now = new Date();
    var holder = $('[data-slots]', dialog);
    $('[data-program-name]', dialog).textContent = p.name;
    holder.innerHTML = '';
    var list = slotsFor(p.id, 21, now);

    if (!list.length) {
      var empty = document.createElement('p');
      empty.className = 'slots__empty';
      empty.textContent = 'No ' + p.name + ' classes are scheduled in the next three weeks. Call ' + D.dojo.phone + ' and we’ll find you a first day.';
      holder.appendChild(empty);
    }

    var grid = null, lastWeek = '';
    list.forEach(function (s) {
      var wk = weekLabel(s.when, now);
      if (wk !== lastWeek) {
        var h = document.createElement('h4');
        h.className = 'slots__week';
        h.textContent = wk;
        holder.appendChild(h);
        grid = document.createElement('div');
        grid.className = 'slots__grid';
        holder.appendChild(grid);
        lastWeek = wk;
      }
      var label = document.createElement('label');
      label.className = 'slot';
      var input = document.createElement('input');
      input.type = 'radio'; input.name = 'slot'; input.value = s.id;
      input.checked = s.id === state.slotId;
      input.disabled = s.left === 0;
      var box = document.createElement('span');
      box.className = 'slot__box';
      var day = document.createElement('span'); day.className = 'slot__day';
      var rel = dayDiff(s.when, now);
      day.textContent = rel === 0 ? 'Today, ' + MONTHS_S[s.when.getMonth()] + ' ' + s.when.getDate()
        : rel === 1 ? 'Tomorrow, ' + MONTHS_S[s.when.getMonth()] + ' ' + s.when.getDate()
        : fmtDayShort(s.when);
      var time = document.createElement('span'); time.className = 'slot__time'; time.textContent = fmtRange(s.start, s.end);
      var meta = document.createElement('span'); meta.className = 'slot__meta';
      var where = document.createElement('span');
      where.textContent = s.note || s.room;
      meta.appendChild(where);
      if (s.left !== null) {
        var sp = document.createElement('span');
        if (s.left <= 4) sp.className = 'low';
        sp.textContent = spotsText(s.left);
        meta.appendChild(sp);
      }
      box.appendChild(day); box.appendChild(time); box.appendChild(meta);
      label.appendChild(input); label.appendChild(box);
      grid.appendChild(label);
      input.addEventListener('change', function () {
        state.slotId = s.id; state.later = false;
        form.elements.later.checked = false;
        showErr('slot', '');
        paintSummary(); saveState();
      });
    });

    form.elements.later.checked = state.later;
    $('[data-err="slot"]', dialog).hidden = true;
  }

  form.elements.later.addEventListener('change', function () {
    state.later = this.checked;
    if (state.later) {
      state.slotId = null;
      $$('input[name="slot"]', dialog).forEach(function (r) { r.checked = false; });
      showErr('slot', '');
    }
    paintSummary(); saveState();
  });

  /* Step 3: details */

  var FIELD_NAMES = ['studentFirst', 'studentLast', 'dob', 'guardianFirst', 'guardianLast', 'email', 'phone', 'emergencyName', 'emergencyPhone', 'notes', 'source'];

  function isSelf() { return state.whofor === 'self' && state.program !== 'dragons'; }

  function paintStep3() {
    var self = isSelf();
    var whofor = $('[data-whofor]', dialog);
    whofor.hidden = state.program === 'dragons';
    $$('input[name="whofor"]', dialog).forEach(function (r) { r.checked = r.value === (self ? 'self' : 'child'); });

    $('[data-label-sfirst]', dialog).textContent = self ? 'Your first name' : 'Student’s first name';
    $('[data-label-slast]', dialog).textContent = self ? 'Your last name' : 'Student’s last name';
    $('[data-label-dob]', dialog).textContent = self ? 'Your date of birth' : 'Student’s date of birth';
    form.elements.studentFirst.autocomplete = self ? 'given-name' : 'off';
    form.elements.studentLast.autocomplete = self ? 'family-name' : 'off';

    $('[data-guardian]', dialog).hidden = self;
    $('[data-emsame-wrap]', dialog).hidden = self;
    var showEmergency = self || !state.f.emergencySame;
    $$('[data-emergency]', dialog).forEach(function (el) { el.hidden = !showEmergency; });

    FIELD_NAMES.forEach(function (name) { if (form.elements[name].value !== state.f[name]) form.elements[name].value = state.f[name]; });
    form.elements.emergencySame.checked = state.f.emergencySame;
    form.elements.dob.max = isoDate(new Date());
    paintAgeCheck();
  }

  $$('input[name="whofor"]', dialog).forEach(function (r) {
    r.addEventListener('change', function () { state.whofor = r.value; paintStep3(); saveState(); });
  });

  FIELD_NAMES.forEach(function (name) {
    var el = form.elements[name];
    el.addEventListener('input', function () {
      state.f[name] = el.value;
      if (touched[name]) showErr(name, fieldError(name));
      if (name === 'dob') paintAgeCheck();
      saveState();
    });
    el.addEventListener('blur', function () {
      if (name === 'phone' || name === 'emergencyPhone') {
        var digits = el.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
        if (digits.length === 10) { el.value = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6); state.f[name] = el.value; }
      }
      if (el.value) { touched[name] = true; showErr(name, fieldError(name)); }
    });
  });

  form.elements.emergencySame.addEventListener('change', function () {
    state.f.emergencySame = this.checked;
    paintStep3(); saveState();
  });

  function ageOn(dobIso, ref) {
    var b = fromIso(dobIso);
    var a = ref.getFullYear() - b.getFullYear();
    var m = ref.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) a--;
    return a;
  }
  function studentAge() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.f.dob)) return null;
    var s = currentSlot();
    return ageOn(state.f.dob, s ? s.when : new Date());
  }

  // Which class does this age belong in? Returns null when the current choice is right.
  function betterProgram(age) {
    if (age === null || age < 4) return null;
    if (state.program === 'dragons' && age >= 7) return age >= 12 ? 'adults' : 'beginners';
    if (state.program === 'beginners' && age < 7) return 'dragons';
    if (state.program === 'adults' && age < 12) return age < 7 ? 'dragons' : 'beginners';
    return null;
  }

  function paintAgeCheck() {
    var box = $('[data-agecheck]', dialog);
    var age = studentAge();
    box.hidden = true; box.innerHTML = ''; box.className = 'agecheck';
    if (age === null || age < 0) return;
    var name = state.f.studentFirst.trim() || (isSelf() ? 'You' : 'Your child');
    var s = currentSlot();
    var onDay = s ? 'on the day of the first class' : 'today';

    if (age < 4) {
      box.classList.add('agecheck--stop');
      var p0 = document.createElement('p');
      p0.textContent = 'Little Dragons starts at age 4, and ' + name + ' will be ' + age + ' ' + onDay + '. Pick a first class on or after their 4th birthday, or call ' + D.dojo.phone + ' and we’ll help.';
      box.appendChild(p0); box.hidden = false;
      return;
    }
    var better = betterProgram(age);
    if (better) {
      var bp = program(better);
      var p1 = document.createElement('p');
      p1.textContent = (isSelf() ? 'You’ll be ' : name + ' will be ') + age + ' ' + onDay + ', so the right class is ' + bp.name + ' (' + bp.ages.toLowerCase() + ').';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn btn--line btn--sm';
      btn.textContent = 'Switch to ' + bp.name + ' and pick a time';
      btn.addEventListener('click', function () { setProgram(better); showStep(2); });
      box.appendChild(p1); box.appendChild(btn); box.hidden = false;
    }
  }

  function fieldError(name) {
    var v = (state.f[name] || '').trim();
    var self = isSelf();
    switch (name) {
      case 'studentFirst': return v ? '' : self ? 'Enter your first name.' : 'Enter the student’s first name.';
      case 'studentLast': return v ? '' : self ? 'Enter your last name.' : 'Enter the student’s last name.';
      case 'dob':
        if (!v) return self ? 'Enter your date of birth.' : 'Enter the student’s date of birth so we can confirm the class.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(fromIso(v))) return 'Enter the date as month, day and year.';
        if (fromIso(v) > new Date()) return 'That date is in the future. Check the year.';
        if (ageOn(v, new Date()) > 110) return 'Check the year of birth.';
        return '';
      case 'guardianFirst': return self || v ? '' : 'Enter your first name.';
      case 'guardianLast': return self || v ? '' : 'Enter your last name.';
      case 'email': return !v ? 'Enter an email address for the confirmation.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter an email address like name@example.com.';
      case 'phone': return !v ? 'Enter a mobile number.' : v.replace(/\D/g, '').length >= 10 ? '' : 'Enter the full number, including area code.';
      case 'emergencyName': return (self || !state.f.emergencySame) && !v ? 'Enter the name of someone we can call.' : '';
      case 'emergencyPhone':
        if (!(self || !state.f.emergencySame)) return '';
        return !v ? 'Enter a phone number for the emergency contact.' : v.replace(/\D/g, '').length >= 10 ? '' : 'Enter the full number, including area code.';
      default: return '';
    }
  }

  function validateStep3() {
    var first = null;
    ['studentFirst', 'studentLast', 'dob', 'guardianFirst', 'guardianLast', 'email', 'phone', 'emergencyName', 'emergencyPhone'].forEach(function (name) {
      touched[name] = true;
      var msg = fieldError(name);
      showErr(name, msg);
      if (msg && !first) first = form.elements[name];
    });
    if (first) { first.focus(); return false; }
    var age = studentAge();
    if (age !== null && (age < 4 || betterProgram(age))) {
      var box = $('[data-agecheck]', dialog);
      box.scrollIntoView({ block: 'center' });
      var b = $('button', box); if (b) b.focus(); else form.elements.dob.focus();
      return false;
    }
    return true;
  }

  /* Step 4: review and pay */

  function trialWindow() {
    var s = currentSlot();
    if (!s) return null;
    return { from: s.when, to: addDays(s.when, D.trial.days) };
  }

  function reviewRow(label, value, small, changeStep) {
    var row = document.createElement('div'); row.className = 'review__row';
    var dt = document.createElement('dt'); dt.textContent = label;
    var dd = document.createElement('dd'); dd.textContent = value;
    if (small) { var sm = document.createElement('small'); sm.textContent = small; dd.appendChild(sm); }
    row.appendChild(dt); row.appendChild(dd);
    if (changeStep) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'linkbtn'; b.textContent = 'Change';
      b.setAttribute('aria-label', 'Change ' + label.toLowerCase());
      b.addEventListener('click', function () { showStep(changeStep); });
      row.appendChild(b);
    }
    return row;
  }

  function paintStep4() {
    var p = program(state.program);
    var s = currentSlot();
    var win = trialWindow();
    var age = studentAge();
    var dl = $('[data-review]', dialog);
    dl.innerHTML = '';
    var student = (state.f.studentFirst + ' ' + state.f.studentLast).trim();
    dl.appendChild(reviewRow('Student', student, age !== null ? 'Age ' + age + (s ? ' at the first class' : '') : '', 3));
    dl.appendChild(reviewRow('Class', p.name, p.ages, 1));
    dl.appendChild(s
      ? reviewRow('First class', fmtDayLong(s.when) + ' at ' + fmtTime(s.start), s.room + ', ' + D.dojo.address, 2)
      : reviewRow('First class', 'To be arranged', 'We’ll email you to set a date.', 2));
    dl.appendChild(reviewRow('Trial', win ? fmtMonthDay(win.from) + ' to ' + fmtMonthDay(win.to) : 'Two weeks from your first class', 'Unlimited classes, dojo T-shirt and white belt'));
    dl.appendChild(reviewRow('Confirmation to', state.f.email, state.f.phone, 3));
    var total = reviewRow('Total today', '$' + D.trial.price.toFixed(2), 'One payment. Nothing renews.');
    total.classList.add('review__row--total');
    dl.appendChild(total);

    form.elements.waiver.checked = state.waiver;
    $('[data-err="waiver"]', dialog).hidden = true;
    $$('[data-zen-link]', dialog).forEach(function (a) { a.href = D.zen.registration(p.zenTemplate); });
  }

  form.elements.waiver.addEventListener('change', function () {
    state.waiver = this.checked;
    if (state.waiver) $('[data-err="waiver"]', dialog).hidden = true;
    saveState();
  });

  $('[data-waiver-toggle]', dialog).addEventListener('click', function (e) {
    e.preventDefault();
    var box = $('#waiver-text');
    box.hidden = !box.hidden;
    this.setAttribute('aria-expanded', String(!box.hidden));
  });

  /* Step 5: confirmation */

  function paintStep5() {
    var p = program(state.program);
    var s = currentSlot();
    var win = trialWindow();
    var who = state.f.studentFirst.trim();
    $('[data-done-title]', dialog).textContent = who ? 'You’re in, ' + who + '.' : 'You’re in.';
    $('[data-done-lede]', dialog).textContent = 'Four stripes on a belt mean you’re ready for the next test. Yours mean you’re ready for class. A confirmation is on its way to ' + state.f.email + '.';

    var t = $('[data-ticket]', dialog);
    t.innerHTML = '';
    var c = document.createElement('p'); c.className = 'ticket__class'; c.textContent = 'First class, ' + p.name;
    var w = document.createElement('p'); w.className = 'ticket__when';
    w.textContent = s ? fmtDayLong(s.when) + ' at ' + fmtTime(s.start) : 'Date to be arranged';
    var where = document.createElement('p'); where.className = 'ticket__where';
    where.textContent = (s ? s.room + ', ' : '') + D.dojo.address + '. ';
    var dir = document.createElement('a');
    dir.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(D.dojo.address);
    dir.target = '_blank'; dir.rel = 'noopener'; dir.textContent = 'Get directions';
    where.appendChild(dir);
    var tr = document.createElement('p'); tr.className = 'ticket__trial';
    tr.textContent = win
      ? 'Your trial runs ' + fmtMonthDay(win.from) + ' to ' + fmtMonthDay(win.to) + '. Come as often as you like.'
      : 'We’ll email you to set a first day. Your two weeks start then.';
    t.appendChild(c); t.appendChild(w); t.appendChild(where); t.appendChild(tr);

    $('[data-ics]', dialog).hidden = !s;
    $('[data-reserve-link]', dialog).textContent = s ? 'Reserve more classes' : 'Choose a class';
  }

  function icsStamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }

  $('[data-ics]', dialog).addEventListener('click', function () {
    var s = currentSlot(); var p = program(state.program);
    if (!s) return;
    var esc = function (t) { return t.replace(/([,;\\])/g, '\\$1'); };
    var now = new Date();
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Emerald City Karate//Two-week trial//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + s.id + '-' + now.getTime() + '@emeraldcitykarate.com',
      'DTSTAMP:' + icsStamp(new Date(now.getTime() + now.getTimezoneOffset() * 60000)) + 'Z',
      'DTSTART;TZID=America/Los_Angeles:' + icsStamp(s.when),
      'DTEND;TZID=America/Los_Angeles:' + icsStamp(fromIso(s.date, s.end)),
      'SUMMARY:' + esc('First karate class: ' + p.name),
      'LOCATION:' + esc('Emerald City Karate, ' + D.dojo.address),
      'DESCRIPTION:' + esc('Arrive 5 to 10 minutes early to collect your dojo T-shirt and white belt. Wear sweats or anything comfortable. Questions: ' + D.dojo.phone),
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'first-karate-class.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  $('[data-another]', dialog).addEventListener('click', function () {
    var keep = state.f;
    var wasSelf = isSelf();
    state = blankState();
    // Keep the adult's contact details; clear the student's.
    state.f.email = keep.email; state.f.phone = keep.phone;
    state.f.guardianFirst = wasSelf ? keep.studentFirst : keep.guardianFirst;
    state.f.guardianLast = wasSelf ? keep.studentLast : keep.guardianLast;
    state.f.studentLast = keep.studentLast;
    state.f.emergencySame = keep.emergencySame; state.f.emergencyName = keep.emergencyName; state.f.emergencyPhone = keep.emergencyPhone;
    state.f.source = keep.source;
    touched = {};
    showStep(1);
  });

  $$('[data-close-to]', dialog).forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = $(a.getAttribute('data-close-to'));
      if (!target) return; // not on this page: follow the link to the home page
      e.preventDefault();
      closeBooking();
      target.scrollIntoView();
    });
  });

  /* ---------- Back / Continue ---------- */

  function next() {
    var n = state.step;
    if (n === 1) {
      if (!state.program) { $('[data-err="program"]', dialog).hidden = false; $('input[name="program"]', dialog).focus(); return; }
      showStep(2);
    } else if (n === 2) {
      if (!state.slotId && !state.later) { $('[data-err="slot"]', dialog).hidden = false; var r = $('input[name="slot"]:not(:disabled)', dialog); if (r) r.focus(); return; }
      showStep(3);
    } else if (n === 3) {
      if (validateStep3()) showStep(4);
    } else if (n === 4) {
      if (!state.waiver) { $('[data-err="waiver"]', dialog).hidden = false; form.elements.waiver.focus(); return; }
      nextBtn.disabled = true;
      nextBtn.textContent = 'Processing…';
      setTimeout(function () { state.done = true; showStep(5); }, 900);
    } else {
      closeBooking();
    }
  }

  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', function () { if (state.step > 1 && state.step < 5) showStep(state.step - 1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') { e.preventDefault(); next(); }
  });

  var sourceSelect = form.elements.source;
  D.sources.forEach(function (s) { var o = document.createElement('option'); o.value = s; o.textContent = s; sourceSelect.appendChild(o); });

  $$('[data-book]').forEach(function (btn) {
    // Each button is a real link to the matching Zen Planner page, so sign-up still works without this script.
    btn.addEventListener('click', function (e) { e.preventDefault(); openBooking(btn.getAttribute('data-program')); });
  });

  /* ---------- Prototype notes ---------- */

  var notes = $('#notes');
  $$('[data-notes-open]').forEach(function (b) {
    b.addEventListener('click', function () { if (typeof notes.showModal === 'function') notes.showModal(); else notes.setAttribute('open', ''); lockScroll(true); });
  });
  $('[data-notes-close]').addEventListener('click', function () { notes.close(); });
  notes.addEventListener('click', function (e) { if (e.target === notes) notes.close(); });
  notes.addEventListener('close', function () { lockScroll(false); });

  /* ---------- Counting to ten ---------- */

  var keysBox = $('[data-count-keys]');
  var jaVoice = null;
  var counting = null;

  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    var voices = window.speechSynthesis.getVoices() || [];
    jaVoice = voices.filter(function (v) { return /^ja([-_]|$)/i.test(v.lang); })[0] || null;
    $('[data-count-hint]').textContent = jaVoice ? 'Tap a number to hear it.' : 'Tap a number to see how to say it.';
  }
  function say(item) {
    if (!jaVoice) return;
    try {
      var u = new SpeechSynthesisUtterance(item.kana);
      u.lang = 'ja-JP'; u.voice = jaVoice; u.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is a bonus, never required */ }
  }
  function showNumber(n, speak) {
    var item = D.count[n - 1];
    $('[data-count-kanji]').textContent = item.kanji;
    $('[data-count-romaji]').textContent = item.romaji;
    $('[data-count-kana]').textContent = item.kana;
    $('[data-count-say]').textContent = item.say;
    $$('.key', keysBox).forEach(function (k) { k.setAttribute('aria-pressed', String(Number(k.dataset.n) === n)); });
    if (speak) say(item);
  }
  function stopCounting() {
    if (counting) { clearInterval(counting); counting = null; }
    $('[data-count-all]').textContent = 'Count all ten';
  }

  if (keysBox) D.count.forEach(function (item) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'key'; b.dataset.n = item.n;
    b.setAttribute('aria-pressed', String(item.n === 1));
    b.setAttribute('aria-label', item.n + ', ' + item.romaji);
    var num = document.createElement('span'); num.className = 'key__num'; num.textContent = item.n;
    var ro = document.createElement('span'); ro.className = 'key__ro'; ro.textContent = item.romaji;
    b.appendChild(num); b.appendChild(ro);
    b.addEventListener('click', function () { stopCounting(); showNumber(item.n, true); });
    keysBox.appendChild(b);
  });

  if (keysBox) $('[data-count-all]').addEventListener('click', function () {
    if (counting) { stopCounting(); return; }
    var n = 1;
    this.textContent = 'Stop';
    showNumber(n, true);
    counting = setInterval(function () {
      n++;
      if (n > 10) { stopCounting(); return; }
      showNumber(n, true);
    }, 1100);
  });

  if (keysBox && 'speechSynthesis' in window) {
    findVoice();
    if (typeof window.speechSynthesis.addEventListener === 'function') window.speechSynthesis.addEventListener('voiceschanged', findVoice);
  }

  /* ---------- Sticky call to action (phones) ---------- */

  var sticky = $('[data-sticky]');
  if (sticky && 'IntersectionObserver' in window) {
    sticky.hidden = false;
    var seen = { picker: !!$('[data-picker]'), visit: false };
    var update = function () { sticky.classList.toggle('is-on', !seen.picker && !seen.visit); };
    update();
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (entries) { seen[key] = entries[0].isIntersecting; update(); }, { threshold: 0 }).observe(el);
    };
    watch($('[data-picker]'), 'picker');
    watch($('[data-visit-cta]'), 'visit');
  }

  /* ---------- Schedule page: pick out one class in the week ---------- */

  var week = $('[data-week]');
  if (week) {
    var levelBtns = $$('[data-level]');
    var levelStatus = $('[data-level-status]');
    var levelClear = $('[data-level-clear]');
    var setLevel = function (level) {
      var classes = $$('.wk__class', week), count = 0, shared = 0;
      levelBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === level)); });
      if (level) week.setAttribute('data-filter', level); else week.removeAttribute('data-filter');
      classes.forEach(function (c) {
        var match = !!level && c.getAttribute('data-for').split(' ').indexOf(level) !== -1;
        c.classList.toggle('is-match', match);
        if (match) { count++; if (c.classList.contains('wk__class--allcolors')) shared++; }
      });
      $$('.wk__day', week).forEach(function (d) { d.classList.toggle('is-empty', !!level && !$('.is-match', d)); });
      if (levelClear) levelClear.hidden = !level;
      if (!levelStatus) return;
      if (!level) { levelStatus.textContent = 'Showing every class.'; return; }
      var name = $('b', levelBtns.filter(function (b) { return b.getAttribute('data-level') === level; })[0]).textContent;
      levelStatus.textContent = name + ': ' + count + ' classes a week' +
        (shared ? ', including ' + shared + ' All colors classes.' : '.');
    };
    levelBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        setLevel(b.getAttribute('aria-pressed') === 'true' ? null : b.getAttribute('data-level'));
      });
    });
    if (levelClear) levelClear.addEventListener('click', function () { setLevel(null); });
  }

  /* ---------- Site navigation ---------- */

  var header = $('[data-header]');
  var menus = $$('[data-menu]');
  var menuBtn = $('[data-menu-btn]');
  var wide = window.matchMedia('(min-width: 1021px)');

  function closeMenus(except) { menus.forEach(function (m) { if (m !== except) m.open = false; }); }
  function setPanel(open) {
    if (!header || !menuBtn) return;
    if (open) header.setAttribute('data-open', ''); else header.removeAttribute('data-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    // on phones the groups work as an accordion, with the current section already open
    menus.forEach(function (m) { m.open = open && m.hasAttribute('data-current'); });
  }

  menus.forEach(function (m) {
    m.addEventListener('toggle', function () { if (m.open && wide.matches) closeMenus(m); });
  });
  document.addEventListener('click', function (e) {
    if (wide.matches) { if (!e.target.closest('[data-menu]')) closeMenus(); }
    else if (header && header.hasAttribute('data-open') && !e.target.closest('[data-header]')) setPanel(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = menus.filter(function (m) { return m.open; })[0];
    if (wide.matches && open) { open.open = false; $('summary', open).focus(); }
    else if (header && header.hasAttribute('data-open')) { setPanel(false); menuBtn.focus(); }
  });
  if (menuBtn) {
    menuBtn.setAttribute('role', 'button');
    menuBtn.addEventListener('click', function (e) { e.preventDefault(); setPanel(!header.hasAttribute('data-open')); });
    menuBtn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); menuBtn.click(); } });
  }
  var onWidth = function () { setPanel(false); closeMenus(); };
  if (wide.addEventListener) wide.addEventListener('change', onWidth); else if (wide.addListener) wide.addListener(onWidth);

  /* ---------- Start ---------- */

  paintNextClass();
  paintHolidayNote();
  // Keep "next class" honest if the page stays open across a class start.
  setInterval(paintNextClass, 5 * 60 * 1000);
})();
