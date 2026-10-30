/**
 * PHYMECH Online Modules: RTU-only student site and instructor admin site.
 *
 * One Apps Script project, bound to the results Google Sheet, serves two pages:
 *   <web app URL>              student site (lessons, video, activity), @rtu.edu.ph accounts only
 *   <web app URL>?page=admin   admin site (settings, sections, modules, answer key, records), instructor only
 *
 * Deploy as a web app with "Execute as: Me" and "Who has access: Anyone within Rizal Technological
 * University". Google then tells this script who the visitor is, so nobody types an email.
 * Setup steps: INSTRUCTOR-SETUP.md in the GitHub repository.
 */

var CONFIG = {
  // Who may open the admin site. Add co-teachers here if needed.
  ADMIN_EMAILS: ['rmvitalez@rtu.edu.ph'],
  DOMAIN: 'rtu.edu.ph',
  CONTENT_BASE: 'https://raw.githubusercontent.com/mrvitalez/PHYMECH-online-module/main/content/',
  TZ: 'Asia/Manila',
  ARCHIVE_FOLDER: 'PHYMECH Archives',
  // Browser-tab icons (PNG files in the GitHub repository)
  ICON_STUDENT: 'https://raw.githubusercontent.com/mrvitalez/PHYMECH-online-module/main/img/icon-student.png',
  ICON_ADMIN: 'https://raw.githubusercontent.com/mrvitalez/PHYMECH-online-module/main/img/icon-admin.png'
};

var TABS = {
  SETTINGS: 'Settings', SECTIONS: 'Block Sections', MODULES: 'Modules', KEY: 'Answer Key',
  STUDENTS: 'Students', VIDEO: 'Video Responses', RECORD: 'Recordbook', LOG: 'Archive Log'
};

var SUB_HEAD = ['Submission ID', 'Timestamp', 'Email', 'Student No.', 'Last Name', 'First Name', 'Middle Name',
                'Block and Section', 'Attempt', 'Score', 'Total', 'Percent', 'Final Score', 'Instructor Remarks'];
var COL = { ID: 1, TIME: 2, EMAIL: 3, NO: 4, LAST: 5, FIRST: 6, MIDDLE: 7, SECTION: 8, ATTEMPT: 9,
            SCORE: 10, TOTAL: 11, PERCENT: 12, FINAL: 13, REMARKS: 14 };
var STUDENT_HEAD = ['Email', 'Student No.', 'Last Name', 'First Name', 'Middle Name', 'Block and Section',
                    'First Seen', 'Last Updated'];
var VIDEO_HEAD = ['Timestamp', 'Email', 'Student No.', 'Last Name', 'First Name', 'Block and Section',
                  'Module', 'Checkpoint', 'Answer', 'Correct'];
var MODULE_HEAD = ['Module', 'Title', 'Visible', 'Opens On', 'Due On', 'Video ID', 'Video Title', 'Video Speaker',
                   'Video Source', 'Source URL', 'License', 'Checkpoints (JSON)'];
var KEY_HEAD = ['Module', 'Item', 'Type', 'Answer', 'Tolerance %'];
var DEFAULT_SETTINGS = [
  ['studentUrl', '', 'Web app address ending in /exec (Deploy > Manage deployments). Used for all links.'],
  ['semesterName', '1st Semester, AY 2026-2027', 'Shown to students on the home page'],
  ['startDate', '', 'Semester start (YYYY-MM-DD). Before this date the modules are closed.'],
  ['endDate', '', 'Semester end (YYYY-MM-DD). After this date activities no longer accept submissions.'],
  ['maxAttempts', '2', 'Attempts allowed per student per activity (0 = unlimited)'],
  ['revealAnswers', 'TRUE', 'Show correct answers to a student after their last attempt'],
  ['autoArchive', 'TRUE', 'Archive and clear the records automatically after the semester ends'],
  ['archiveDelayDays', '7', 'Days after the end date before the automatic archive runs'],
  ['announcement', '', 'Optional message shown at the top of the student home page'],
  ['contentVersion', '1', 'Raised by "Refresh lesson content" in the admin site'],
  ['lastArchivedEnd', '', 'Set automatically: end date of the semester last archived']
];

// ---------------------------------------------------------------------------
// Web app entry point
// ---------------------------------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  var email = currentEmail_();
  if (!isRtu_(email)) {
    return message_('RTU account required',
      'This site is for Rizal Technological University students. Please sign in to Google with your ' +
      '<b>@' + CONFIG.DOMAIN + '</b> account, then open the link again.' +
      (email ? '<br><br>You are signed in as <b>' + esc_(email) + '</b>.' : ''));
  }
  if (p.page === 'admin') {
    if (!isAdmin_(email)) return message_('Instructors only', 'This page is only for the course instructor.');
    return app_('Admin', 'PHYMECH Admin', { email: email, url: appUrl_(), sheetUrl: ss_().getUrl() });
  }
  var boot = { email: email, url: appUrl_(), module: Number(p.module) || 0 };
  try {
    boot.data = boot.module ? api_module(boot.module) : api_home();
  } catch (err) {
    boot.error = err.message;
  }
  return app_('Student', 'PHYMECH · Mechanics', boot);
}

function app_(file, title, boot) {
  var json = JSON.stringify(boot).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // Pass the page data with a template scriptlet (<?!= boot ?> in the HTML file). Google may rewrite
  // comments in plain HTML files, so a text placeholder is not reliable there.
  var page = HtmlService.createTemplateFromFile(file);
  page.boot = json;
  var html = HtmlService.createHtmlOutputFromFile('Styles').getContent() + page.evaluate().getContent();
  return HtmlService.createHtmlOutput(html).setTitle(title)
    .setFaviconUrl(file === 'Admin' ? CONFIG.ICON_ADMIN : CONFIG.ICON_STUDENT)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function message_(title, body) {
  var html = HtmlService.createHtmlOutputFromFile('Styles').getContent() +
    '<body class="landing"><header class="hero"><div class="inner"><div class="txt">' +
    '<span class="eyebrow">PHYMECH · Rizal Technological University</span><h1>' + esc_(title) + '</h1>' +
    '<p>' + body + '</p></div></div></header></body>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setFaviconUrl(CONFIG.ICON_STUDENT)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------------------
// Student API (called with google.script.run; the email always comes from Google, never the page)
// ---------------------------------------------------------------------------

function api_home() {
  var email = requireRtu_();
  var s = settings_();
  var today = today_();
  var man = manifest_();
  var rows = moduleRows_();
  var progress = progressFor_(email);
  var mods = man.modules.map(function (m) {
    var st = moduleState_(rows[m.n], s, today);
    var pr = progress[m.n] || { attempts: 0, best: null, total: null };
    return { n: m.n, title: m.title, icon: m.icon, overview: m.overview, topics: m.topics, state: st,
             attempts: pr.attempts, best: pr.best, total: pr.total, video: !!(rows[m.n] && rows[m.n].videoId) };
  });
  return { view: 'home', email: email, url: appUrl_(), manifest: { parts: man.parts, course: man.course, courseTitle: man.courseTitle,
           instructor: man.instructor, university: man.university, department: man.department,
           program: man.program, logo: man.logo },
           semester: semesterInfo_(s, today), modules: mods, profile: profile_(email),
           maxAttempts: Number(s.maxAttempts) || 0 };
}

function api_module(n) {
  var email = requireRtu_();
  n = Number(n);
  var s = settings_();
  var today = today_();
  var man = manifest_();
  var m = findModule_(man, n);
  var row = moduleRows_()[n];
  var st = moduleState_(row, s, today);
  var out = { view: 'module', email: email, url: appUrl_(), module: { n: n, title: m.title, icon: m.icon, overview: m.overview,
              activityTitle: m.activityTitle, sections: m.sections },
              manifest: { logo: man.logo, course: man.course, courseTitle: man.courseTitle,
                          instructor: man.instructor, university: man.university, count: man.modules.length,
                          titles: man.modules.map(function (x) { return x.title; }) },
              semester: semesterInfo_(s, today), state: st, profile: profile_(email), sections: sectionsList_(),
              maxAttempts: Number(s.maxAttempts) || 0 };
  if (!st.canView) return out;
  out.lessonHtml = content_('lesson-' + pad_(n) + '.html');
  out.activityHtml = content_('activity-' + pad_(n) + '.html');
  out.video = publicVideo_(row);
  out.videoAnswers = videoAnswersFor_(email, n);
  var pr = progressFor_(email)[n] || { attempts: 0, best: null, total: null, last: null };
  out.attempts = pr.attempts;
  out.best = pr.best;
  out.total = pr.total;
  return out;
}

function api_submit(n, payload) {
  var email = requireRtu_();
  n = Number(n);
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var s = settings_();
    var st = moduleState_(moduleRows_()[n], s, today_());
    if (!st.canSubmit) throw new Error(st.reason || 'This activity is not accepting submissions.');
    var man = manifest_();
    var m = findModule_(man, n);
    var p = payload || {};
    var who = cleanProfile_(p.student || {});
    var sections = sectionsList_();
    if (sections.length && sections.indexOf(who.blockSection) < 0) throw new Error('Please choose your block and section from the list.');
    if (!who.lastName || !who.firstName || !who.studentNo || !who.blockSection) throw new Error('Please complete your details.');

    var sheet = moduleSheet_(m);
    var attempt = attemptsFor_(sheet, email) + 1;
    var max = Number(s.maxAttempts) || 0;
    if (max > 0 && attempt > max) {
      throw new Error('You have already used all ' + max + ' attempts for this activity. Message your instructor if you need another one.');
    }
    var key = answerKey_(n);
    var answers = p.answers || {};
    var solutions = p.solutions || {};
    var results = {}, cells = [], reflection = '', score = 0, total = 0;
    m.items.forEach(function (item) {
      if (item.type === 'text') { reflection = clean_(answers[item.id], 3000); return; }
      total++;
      var k = key[item.id];
      var raw = answers[item.id];
      var correct = false, shown = '';
      if (item.type === 'numeric') {
        var x = parseNumber_(raw);
        shown = String(raw == null ? '' : raw).trim().slice(0, 40);
        if (k && isFinite(x) && k.answer !== '') {
          var tol = Math.max(Math.abs(Number(k.answer)) * Number(k.tol || 2) / 100, 1e-12);
          correct = Math.abs(x - Number(k.answer)) <= tol;
        }
      } else {
        var c = Number(raw);
        correct = !!k && raw !== '' && raw != null && c === Number(k.answer);
        shown = raw === '' || raw == null ? '' : String.fromCharCode(65 + c);
      }
      if (correct) score++;
      results[item.id] = correct;
      cells.push((correct ? '✓ ' : '✗ ') + shown, clean_(solutions[item.id], 5000));
    });
    var percent = total ? Math.round(score / total * 1000) / 10 : 0;
    var id = Utilities.getUuid().slice(0, 8);
    sheet.appendRow([id, new Date(), email, "'" + who.studentNo, who.lastName, who.firstName, who.middleName,
                     who.blockSection, attempt, score, total, percent, '', ''].concat(cells, [reflection]));
    sortSubmissions_(sheet);
    saveProfile_(email, who);

    var left = max > 0 ? max - attempt : -1;
    var reply = { ok: true, score: score, total: total, attempt: attempt, attemptsLeft: left, results: results };
    if (truthy_(s.revealAnswers) && left === 0) {
      reply.key = {};
      Object.keys(key).forEach(function (id) { reply.key[id] = key[id].answer; });
    }
    return reply;
  } finally {
    lock.releaseLock();
  }
}

function api_checkpoint(n, index, choice) {
  var email = requireRtu_();
  n = Number(n);
  index = Number(index);
  choice = Number(choice);
  var row = moduleRows_()[n];
  var cps = row ? row.checkpoints : [];
  var cp = cps[index];
  if (!cp) throw new Error('Unknown video question.');
  var correct = choice === Number(cp.answer);
  var prof = profile_(email) || {};
  sheetFor_(TABS.VIDEO, VIDEO_HEAD).appendRow([new Date(), email, prof.studentNo ? "'" + prof.studentNo : '',
    prof.lastName || '', prof.firstName || '', prof.blockSection || '', n, index + 1,
    String.fromCharCode(65 + choice), correct ? 'TRUE' : 'FALSE']);
  return { correct: correct, answer: Number(cp.answer), explain: cp.explain || '' };
}

// ---------------------------------------------------------------------------
// Admin API (every function checks the instructor's account first)
// ---------------------------------------------------------------------------

function admin_load() {
  requireAdmin_();
  var s = settings_();
  var man = manifest_();
  var rows = moduleRows_();
  var counts = {};
  man.modules.forEach(function (m) {
    var sh = ss_().getSheetByName(m.tab);
    var data = sh && sh.getLastRow() > 1 ? sh.getRange(2, COL.EMAIL, sh.getLastRow() - 1, 1).getValues() : [];
    var uniq = {};
    data.forEach(function (r) { if (r[0]) uniq[r[0]] = 1; });
    counts[m.n] = { submissions: data.length, students: Object.keys(uniq).length };
  });
  var students = sheetFor_(TABS.STUDENTS, STUDENT_HEAD).getLastRow() - 1;
  return {
    email: currentEmail_(), settings: s, sections: sectionsList_(), today: today_(), semester: semesterInfo_(s, today_()),
    modules: man.modules.map(function (m) {
      var r = rows[m.n] || {};
      return { n: m.n, title: m.title, tab: m.tab, items: m.items, visible: !!r.visible, opensOn: r.opensOn || '',
               dueOn: r.dueOn || '', video: r.videoId ? { youtubeId: r.videoId, title: r.videoTitle, speaker: r.videoSpeaker,
               source: r.videoSource, sourceUrl: r.sourceUrl, license: r.license } : null,
               checkpoints: r.checkpoints || [], counts: counts[m.n],
               state: moduleState_(r, s, today_()) };
    }),
    students: Math.max(students, 0), autoArchiveTrigger: hasTrigger_('dailyMaintenance'),
    archives: archiveLog_(), sheetUrl: ss_().getUrl(), studentUrl: appUrl_()
  };
}

function admin_saveSettings(obj) {
  requireAdmin_();
  var allowed = ['studentUrl', 'semesterName', 'startDate', 'endDate', 'maxAttempts', 'revealAnswers', 'autoArchive',
                 'archiveDelayDays', 'announcement'];
  var clean = {};
  allowed.forEach(function (k) { if (obj && obj[k] !== undefined) clean[k] = String(obj[k]).trim(); });
  ['startDate', 'endDate'].forEach(function (k) {
    if (clean[k] && !/^\d{4}-\d{2}-\d{2}$/.test(clean[k])) throw new Error(k + ' must look like 2026-08-15.');
  });
  if (clean.studentUrl && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(clean.studentUrl)) {
    throw new Error('The student site address must be the web app URL that ends in /exec (Deploy > Manage deployments).');
  }
  if (clean.startDate && clean.endDate && clean.endDate < clean.startDate) throw new Error('The end date is before the start date.');
  if (clean.maxAttempts !== undefined && !/^\d+$/.test(clean.maxAttempts)) throw new Error('Attempts must be a whole number.');
  if (clean.archiveDelayDays !== undefined && !/^\d+$/.test(clean.archiveDelayDays)) throw new Error('Archive delay must be a whole number of days.');
  writeSettings_(clean);
  if (clean.autoArchive !== undefined) setAutoArchive_(truthy_(clean.autoArchive));
  return admin_load();
}

function admin_saveSections(list) {
  requireAdmin_();
  var seen = {};
  var clean = (list || []).map(function (x) { return String(x).trim().slice(0, 60); })
    .filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; });
  var sh = sheetFor_(TABS.SECTIONS, ['Block and Section']);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).clearContent();
  if (clean.length) sh.getRange(2, 1, clean.length, 1).setNumberFormat('@').setValues(clean.map(function (x) { return [x]; }));
  return sectionsList_();
}

function admin_saveModule(n, obj) {
  requireAdmin_();
  n = Number(n);
  obj = obj || {};
  ['opensOn', 'dueOn'].forEach(function (k) {
    if (obj[k] && !/^\d{4}-\d{2}-\d{2}$/.test(obj[k])) throw new Error('Dates must look like 2026-08-15.');
  });
  var cps = obj.checkpoints || [];
  cps.forEach(function (c, i) {
    if (!c.q || !c.choices || c.choices.length < 2) throw new Error('Video question ' + (i + 1) + ' needs a question and at least two choices.');
    if (!(Number(c.answer) >= 0 && Number(c.answer) < c.choices.length)) throw new Error('Video question ' + (i + 1) + ' has no valid correct choice.');
    if (!/^\d+(\.\d+)?%?$/.test(String(c.at).trim()) && !/^\d+:\d{2}$/.test(String(c.at).trim())) {
      throw new Error('Video question ' + (i + 1) + ': "pause at" must be seconds (95), mm:ss (1:35) or a percent (40%).');
    }
  });
  var v = obj.video || {};
  var id = youtubeId_(v.youtubeId || '');
  if (v.youtubeId && !id) throw new Error('That does not look like a YouTube link or video ID.');
  var sh = sheetFor_(TABS.MODULES, MODULE_HEAD);
  var r = findRow_(sh, 1, n);
  if (!r) throw new Error('Module ' + n + ' is missing from the Modules tab. Run setup() again.');
  sh.getRange(r, 3, 1, 10).setValues([[obj.visible ? 'TRUE' : 'FALSE', obj.opensOn || '', obj.dueOn || '', id,
    v.title || '', v.speaker || '', v.source || '', v.sourceUrl || '', v.license || '', JSON.stringify(cps)]]);
  return admin_load();
}

function admin_getKey(n) {
  requireAdmin_();
  n = Number(n);
  var m = findModule_(manifest_(), n);
  var key = answerKey_(n);
  return { n: n, title: m.title, activityHtml: content_('activity-' + pad_(n) + '.html'),
           items: m.items.filter(function (it) { return it.type !== 'text'; }).map(function (it, i) {
             var k = key[it.id] || {};
             return { id: it.id, label: 'Item ' + (i + 1), type: it.type, unit: it.unit, choices: it.choices,
                      answer: k.answer === undefined ? '' : k.answer, tol: k.tol === undefined ? '' : k.tol };
           }) };
}

function admin_saveKey(n, items) {
  requireAdmin_();
  n = Number(n);
  var m = findModule_(manifest_(), n);
  var types = {};
  m.items.forEach(function (it) { types[it.id] = it; });
  var sh = sheetFor_(TABS.KEY, KEY_HEAD);
  var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  (items || []).forEach(function (it) {
    var t = types[it.id];
    if (!t || t.type === 'text') return;
    var ans = t.type === 'numeric' ? parseNumber_(it.answer) : Number(it.answer);
    if (!isFinite(ans)) throw new Error(it.id + ': the answer must be a number.');
    if (t.type === 'mc' && !(ans >= 0 && ans < t.choices)) throw new Error(it.id + ': choose one of the options.');
    var tol = t.type === 'numeric' ? Number(it.tol === '' ? 2 : it.tol) : '';
    if (t.type === 'numeric' && !(tol >= 0)) throw new Error(it.id + ': tolerance must be 0 or more.');
    var found = false;
    for (var i = 0; i < data.length; i++) {
      if (Number(data[i][0]) === n && data[i][1] === it.id) { data[i] = [n, it.id, t.type, ans, tol]; found = true; }
    }
    if (!found) data.push([n, it.id, t.type, ans, tol]);
  });
  if (data.length) sh.getRange(2, 1, data.length, 5).setValues(data);
  return admin_getKey(n);
}

function admin_results(n) {
  requireAdmin_();
  var m = findModule_(manifest_(), Number(n));
  var sh = moduleSheet_(m);
  var last = sh.getLastRow();
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, head.length).getDisplayValues() : [];
  return { n: m.n, title: m.title, head: head, rows: rows, sheetUrl: ss_().getUrl() + '#gid=' + sh.getSheetId() };
}

function admin_saveResult(n, id, finalScore, remarks) {
  requireAdmin_();
  var m = findModule_(manifest_(), Number(n));
  var sh = moduleSheet_(m);
  var r = findRow_(sh, COL.ID, id);
  if (!r) throw new Error('Submission not found. It may have been deleted.');
  var fs = String(finalScore == null ? '' : finalScore).trim();
  if (fs !== '' && !isFinite(Number(fs))) throw new Error('Final score must be a number or blank.');
  sh.getRange(r, COL.FINAL, 1, 2).setValues([[fs === '' ? '' : Number(fs), clean_(remarks, 1000)]]);
  return admin_results(n);
}

function admin_deleteSubmission(n, id) {
  requireAdmin_();
  var m = findModule_(manifest_(), Number(n));
  var sh = moduleSheet_(m);
  var r = findRow_(sh, COL.ID, id);
  if (!r) throw new Error('Submission not found.');
  sh.deleteRow(r);
  return admin_results(n);
}

function admin_recordbook() {
  requireAdmin_();
  return buildRecordbook_();
}

function admin_archiveNow(confirmWord) {
  requireAdmin_();
  if (String(confirmWord).trim().toUpperCase() !== 'ARCHIVE') throw new Error('Type ARCHIVE to confirm.');
  var res = archive_('manual');
  var out = admin_load();
  out.archived = res;
  return out;
}

function admin_refreshContent() {
  requireAdmin_();
  var s = settings_();
  writeSettings_({ contentVersion: String((Number(s.contentVersion) || 1) + 1) });
  manifest_();
  return admin_load();
}

function admin_studentPreview() {
  requireAdmin_();
  return appUrl_();
}

// ---------------------------------------------------------------------------
// Setup and scheduled maintenance
// ---------------------------------------------------------------------------

/** Run once from the Apps Script editor (select "setup", click Run). Safe to run again. */
function setup() {
  var who = currentEmail_();
  if (who && !isAdmin_(who)) throw new Error('Only the instructor can run setup.');
  var ss = ss_();
  ss.setSpreadsheetTimeZone(CONFIG.TZ);
  var man = manifest_(true);

  var st = sheetFor_(TABS.SETTINGS, ['Setting', 'Value', 'Notes']);
  var have = {};
  if (st.getLastRow() > 1) st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().forEach(function (r) { have[r[0]] = 1; });
  DEFAULT_SETTINGS.forEach(function (row) { if (!have[row[0]]) st.appendRow(row); });
  st.getRange(2, 2, Math.max(st.getLastRow() - 1, 1), 1).setNumberFormat('@');

  var sec = sheetFor_(TABS.SECTIONS, ['Block and Section']);
  if (sec.getLastRow() < 2) sec.getRange(2, 1, 2, 1).setNumberFormat('@').setValues([['BS Astronomy 1-1'], ['BS Astronomy 1-2']]);

  var seed = typeof SEED !== 'undefined' ? SEED : { answerKey: {}, videos: {} };
  var mod = sheetFor_(TABS.MODULES, MODULE_HEAD);
  mod.getRange(2, 4, 40, 2).setNumberFormat('@');
  man.modules.forEach(function (m) {
    if (findRow_(mod, 1, m.n)) return;
    var v = seed.videos[String(m.n)] || {};
    mod.appendRow([m.n, m.title, 'TRUE', '', '', v.youtubeId || '', v.title || '', v.speaker || '', v.source || '',
                   v.sourceUrl || '', v.license || '', JSON.stringify(v.checkpoints || [])]);
  });

  var key = sheetFor_(TABS.KEY, KEY_HEAD);
  if (key.getLastRow() < 2) {
    var rows = [];
    Object.keys(seed.answerKey).forEach(function (n) {
      seed.answerKey[n].forEach(function (it) { rows.push([Number(n), it.id, it.type, it.answer, it.tol]); });
    });
    if (rows.length) key.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  sheetFor_(TABS.STUDENTS, STUDENT_HEAD);
  sheetFor_(TABS.VIDEO, VIDEO_HEAD);
  sheetFor_(TABS.LOG, ['Archived On', 'Reason', 'Semester', 'Start', 'End', 'Archive File']);
  man.modules.forEach(function (m) { moduleSheet_(m); });
  buildRecordbook_();
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);
  setAutoArchive_(truthy_(settings_().autoArchive));
  return 'Setup complete: ' + man.modules.length + ' modules ready.';
}

/** Runs once a day (installed by setup): refreshes the recordbook and archives after the semester. */
function dailyMaintenance() {
  var who = currentEmail_();
  if (who && !isAdmin_(who)) return;
  var s = settings_();
  if (truthy_(s.autoArchive) && s.endDate && s.lastArchivedEnd !== s.endDate) {
    var due = addDays_(s.endDate, Number(s.archiveDelayDays) || 7);
    if (today_() >= due) { archive_('automatic'); return; }
  }
  buildRecordbook_();
}

function setAutoArchive_(on) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyMaintenance') ScriptApp.deleteTrigger(t);
  });
  if (on) ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(1).inTimezone(CONFIG.TZ).create();
}

function hasTrigger_(fn) {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fn; });
}

function archive_(reason) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_();
    var s = settings_();
    buildRecordbook_();
    SpreadsheetApp.flush();
    var folders = DriveApp.getFoldersByName(CONFIG.ARCHIVE_FOLDER);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.ARCHIVE_FOLDER);
    var name = 'PHYMECH Results - ' + (s.semesterName || 'semester') + ' (archived ' + today_() + ')';
    var copy = DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
    var man = manifest_();
    var clear = [TABS.STUDENTS, TABS.VIDEO, TABS.RECORD].concat(man.modules.map(function (m) { return m.tab; }));
    clear.forEach(function (t) {
      var sh = ss.getSheetByName(t);
      if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    });
    sheetFor_(TABS.LOG, ['Archived On', 'Reason', 'Semester', 'Start', 'End', 'Archive File'])
      .appendRow([new Date(), reason, s.semesterName, s.startDate, s.endDate, copy.getUrl()]);
    writeSettings_({ lastArchivedEnd: s.endDate || today_() });
    return { name: name, url: copy.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function archiveLog_() {
  var sh = ss_().getSheetByName(TABS.LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getDisplayValues().reverse().slice(0, 20);
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function buildRecordbook_() {
  var man = manifest_();
  var people = {};
  var stu = sheetFor_(TABS.STUDENTS, STUDENT_HEAD);
  if (stu.getLastRow() > 1) {
    stu.getRange(2, 1, stu.getLastRow() - 1, 6).getDisplayValues().forEach(function (r) {
      people[r[0]] = { email: r[0], no: r[1], last: r[2], first: r[3], middle: r[4], section: r[5], mods: {} };
    });
  }
  man.modules.forEach(function (m) {
    var sh = ss_().getSheetByName(m.tab);
    if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, COL.FINAL).getValues().forEach(function (r) {
      var email = r[COL.EMAIL - 1];
      if (!email) return;
      var p = people[email] || (people[email] = { email: email, no: String(r[COL.NO - 1]).replace(/^'/, ''),
        last: r[COL.LAST - 1], first: r[COL.FIRST - 1], middle: r[COL.MIDDLE - 1], section: r[COL.SECTION - 1], mods: {} });
      var fin = r[COL.FINAL - 1];
      var score = fin === '' || fin === null ? Number(r[COL.SCORE - 1]) : Number(fin);
      var total = Number(r[COL.TOTAL - 1]) || 0;
      var cur = p.mods[m.n];
      if (!cur || score > cur.score) p.mods[m.n] = { score: score, total: total };
    });
  });
  var video = {};
  var vs = ss_().getSheetByName(TABS.VIDEO);
  if (vs && vs.getLastRow() > 1) {
    vs.getRange(2, 1, vs.getLastRow() - 1, 10).getValues().forEach(function (r) {
      var k = r[1] + '|' + r[6] + '|' + r[7];
      if (!video[k]) video[k] = String(r[9]).toUpperCase() === 'TRUE';
    });
  }
  var list = Object.keys(people).map(function (k) { return people[k]; });
  list.sort(function (a, b) {
    return cmp_(a.section, b.section) || cmp_(a.last, b.last) || cmp_(a.first, b.first);
  });
  var head = ['Block and Section', 'Last Name', 'First Name', 'Middle Name', 'Student No.', 'Email']
    .concat(man.modules.map(function (m) { return 'M' + pad_(m.n); }), ['Activities Done', 'Average %', 'Video Qs Correct']);
  var rows = list.map(function (p) {
    var done = 0, pctSum = 0;
    var cells = man.modules.map(function (m) {
      var x = p.mods[m.n];
      if (!x) return '';
      done++;
      pctSum += x.total ? x.score / x.total * 100 : 0;
      return x.score + '/' + x.total;
    });
    var vc = 0;
    Object.keys(video).forEach(function (k) { if (k.indexOf(p.email + '|') === 0 && video[k]) vc++; });
    return [p.section, p.last, p.first, p.middle, p.no, p.email].concat(cells,
      [done, done ? Math.round(pctSum / done * 10) / 10 : '', vc]);
  });
  var sh = sheetFor_(TABS.RECORD, head);
  sh.clearContents();
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
  sh.setFrozenRows(1);
  return { head: head, rows: rows, sheetUrl: ss_().getUrl() + '#gid=' + sh.getSheetId(), updated: new Date().toISOString() };
}

function progressFor_(email) {
  var out = {};
  manifest_().modules.forEach(function (m) {
    var sh = ss_().getSheetByName(m.tab);
    if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, COL.FINAL).getValues().forEach(function (r) {
      if (r[COL.EMAIL - 1] !== email) return;
      var fin = r[COL.FINAL - 1];
      var score = fin === '' || fin === null ? Number(r[COL.SCORE - 1]) : Number(fin);
      var o = out[m.n] || (out[m.n] = { attempts: 0, best: null, total: Number(r[COL.TOTAL - 1]) });
      o.attempts++;
      if (o.best === null || score > o.best) o.best = score;
    });
  });
  return out;
}

function attemptsFor_(sheet, email) {
  if (sheet.getLastRow() < 2) return 0;
  return sheet.getRange(2, COL.EMAIL, sheet.getLastRow() - 1, 1).getValues()
    .filter(function (r) { return r[0] === email; }).length;
}

function sortSubmissions_(sheet) {
  var last = sheet.getLastRow();
  if (last < 3) return;
  sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).sort([
    { column: COL.SECTION, ascending: true }, { column: COL.LAST, ascending: true },
    { column: COL.FIRST, ascending: true }, { column: COL.ATTEMPT, ascending: true }]);
}

function videoAnswersFor_(email, n) {
  var sh = ss_().getSheetByName(TABS.VIDEO);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues().forEach(function (r) {
    if (r[1] === email && Number(r[6]) === n && !out[r[7] - 1]) {
      out[r[7] - 1] = { choice: r[8].charCodeAt(0) - 65, correct: String(r[9]).toUpperCase() === 'TRUE' };
    }
  });
  return out;
}

function profile_(email) {
  var sh = sheetFor_(TABS.STUDENTS, STUDENT_HEAD);
  var r = findRow_(sh, 1, email);
  if (!r) return null;
  var v = sh.getRange(r, 1, 1, 6).getDisplayValues()[0];
  return { email: v[0], studentNo: v[1], lastName: v[2], firstName: v[3], middleName: v[4], blockSection: v[5] };
}

function saveProfile_(email, who) {
  var sh = sheetFor_(TABS.STUDENTS, STUDENT_HEAD);
  var r = findRow_(sh, 1, email);
  var vals = [email, "'" + who.studentNo, who.lastName, who.firstName, who.middleName, who.blockSection];
  if (r) {
    sh.getRange(r, 1, 1, 6).setValues([vals]);
    sh.getRange(r, 8).setValue(new Date());
  } else {
    sh.appendRow(vals.concat([new Date(), new Date()]));
  }
}

function cleanProfile_(p) {
  return { studentNo: clean_(p.studentNo, 40), lastName: clean_(p.lastName, 80), firstName: clean_(p.firstName, 80),
           middleName: clean_(p.middleName, 80), blockSection: String(p.blockSection || '').trim().slice(0, 60) };
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheetFor_(name, head) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function moduleSheet_(m) {
  var head = SUB_HEAD.slice();
  var k = 0;
  m.items.forEach(function (it) {
    if (it.type === 'text') head.push('Reflection');
    else { k++; head.push('Item ' + k, 'Item ' + k + ' Solution'); }
  });
  return sheetFor_(m.tab, head);
}

function findRow_(sh, col, value) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).replace(/^'/, '') === String(value)) return i + 2;
  }
  return 0;
}

function settings_() {
  var sh = ss_().getSheetByName(TABS.SETTINGS);
  var out = {};
  DEFAULT_SETTINGS.forEach(function (r) { out[r[0]] = r[1]; });
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0]) out[r[0]] = r[1] instanceof Date ? fmtDate_(r[1]) : String(r[1]).trim();
  });
  return out;
}

function writeSettings_(obj) {
  var sh = sheetFor_(TABS.SETTINGS, ['Setting', 'Value', 'Notes']);
  Object.keys(obj).forEach(function (k) {
    var r = findRow_(sh, 1, k);
    if (!r) { sh.appendRow([k, '', '']); r = sh.getLastRow(); }
    sh.getRange(r, 2).setNumberFormat('@').setValue(obj[k]);
  });
}

function sectionsList_() {
  var sh = ss_().getSheetByName(TABS.SECTIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues()
    .map(function (r) { return r[0].trim(); }).filter(String);
}

function moduleRows_() {
  var sh = ss_().getSheetByName(TABS.MODULES);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, MODULE_HEAD.length).getValues().forEach(function (r) {
    var cps = [];
    try { cps = JSON.parse(r[11] || '[]'); } catch (e) { cps = []; }
    out[Number(r[0])] = { n: Number(r[0]), visible: truthy_(r[2]), opensOn: dateStr_(r[3]), dueOn: dateStr_(r[4]),
      videoId: String(r[5]).trim(), videoTitle: r[6], videoSpeaker: r[7], videoSource: r[8], sourceUrl: r[9],
      license: r[10], checkpoints: cps };
  });
  return out;
}

function answerKey_(n) {
  var sh = ss_().getSheetByName(TABS.KEY);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
    if (Number(r[0]) === n) out[r[1]] = { type: r[2], answer: r[3], tol: r[4] };
  });
  return out;
}

function publicVideo_(row) {
  if (!row || !row.videoId) return null;
  return { youtubeId: row.videoId, title: row.videoTitle, speaker: row.videoSpeaker, source: row.videoSource,
           sourceUrl: row.sourceUrl, license: row.license,
           checkpoints: row.checkpoints.map(function (c) { return { at: String(c.at), q: c.q, choices: c.choices }; }) };
}

// ---------------------------------------------------------------------------
// Content from GitHub (lessons and activity items; never answers)
// ---------------------------------------------------------------------------

function manifest_(fresh) {
  return JSON.parse(content_('manifest.json', fresh));
}

function findModule_(man, n) {
  for (var i = 0; i < man.modules.length; i++) if (man.modules[i].n === n) return man.modules[i];
  throw new Error('Unknown module ' + n + '.');
}

function content_(name, fresh) {
  var ver = settings_().contentVersion || '1';
  var cache = CacheService.getScriptCache();
  var key = 'c' + ver + ':' + name;
  if (!fresh) {
    var meta = cache.get(key);
    if (meta !== null) {
      var parts = Number(meta);
      var keys = [];
      for (var i = 0; i < parts; i++) keys.push(key + ':' + i);
      var got = cache.getAll(keys);
      if (keys.every(function (k) { return got[k] !== undefined; })) {
        return keys.map(function (k) { return got[k]; }).join('');
      }
    }
  }
  var res = UrlFetchApp.fetch(CONFIG.CONTENT_BASE + name + '?v=' + ver, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Could not load the lesson content (' + name + '). Please try again later.');
  var text = res.getContentText('UTF-8');
  var chunks = {};
  var size = 90000;
  var n = Math.ceil(text.length / size) || 1;
  for (var j = 0; j < n; j++) chunks[key + ':' + j] = text.slice(j * size, (j + 1) * size);
  try {
    cache.putAll(chunks, 21600);
    cache.put(key, String(n), 21600);
  } catch (e) { /* too large to cache; serve uncached */ }
  return text;
}

// ---------------------------------------------------------------------------
// Rules and small utilities
// ---------------------------------------------------------------------------

function moduleState_(row, s, today) {
  var st = { visible: false, canView: false, canSubmit: false, reason: '', opensOn: '', dueOn: '' };
  if (!row) { st.reason = 'This module is not available.'; return st; }
  st.opensOn = row.opensOn;
  st.dueOn = row.dueOn;
  if (s.startDate && today < s.startDate) { st.reason = 'The semester starts on ' + nice_(s.startDate) + '.'; return st; }
  if (!row.visible) { st.reason = 'Not yet available.'; return st; }
  if (row.opensOn && today < row.opensOn) { st.reason = 'Opens on ' + nice_(row.opensOn) + '.'; return st; }
  st.visible = true;
  st.canView = true;
  if (s.endDate && today > s.endDate) { st.reason = 'The semester has ended; the activity is closed.'; return st; }
  if (row.dueOn && today > row.dueOn) { st.reason = 'The activity closed on ' + nice_(row.dueOn) + '.'; return st; }
  st.canSubmit = true;
  return st;
}

function semesterInfo_(s, today) {
  var phase = 'open';
  if (s.startDate && today < s.startDate) phase = 'before';
  else if (s.endDate && today > s.endDate) phase = 'after';
  return { name: s.semesterName, start: s.startDate, end: s.endDate, phase: phase, today: today,
           announcement: s.announcement || '' };
}

function currentEmail_() {
  try { return String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }
}

function isRtu_(email) {
  return new RegExp('@' + CONFIG.DOMAIN.replace(/\./g, '\\.') + '$', 'i').test(email || '');
}

function isAdmin_(email) {
  return CONFIG.ADMIN_EMAILS.map(function (x) { return x.toLowerCase(); }).indexOf(String(email).toLowerCase()) >= 0;
}

function requireRtu_() {
  var email = currentEmail_();
  if (!isRtu_(email)) throw new Error('Please sign in with your @' + CONFIG.DOMAIN + ' account.');
  return email;
}

function requireAdmin_() {
  var email = currentEmail_();
  if (!isAdmin_(email)) throw new Error('Instructors only.');
  return email;
}

function appUrl_() {
  // ScriptApp.getService().getUrl() is unreliable: it can return null, or the editor-only /dev test
  // address, which gives everyone else "unable to open the file". The instructor's saved address wins.
  var saved = settings_().studentUrl;
  var url = /\/exec$/.test(saved || '') ? saved : String(ScriptApp.getService().getUrl() || '');
  if (!/\/exec$/.test(url)) return '';
  // The short /macros/s/ form opens with the browser's default Google account; the /a/macros/<domain>/
  // form always uses the RTU account.
  return url.replace(/^https:\/\/script\.google\.com\/macros\/s\//, 'https://script.google.com/a/macros/' + CONFIG.DOMAIN + '/s/');
}

function today_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

function fmtDate_(d) {
  return Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd');
}

function dateStr_(v) {
  if (v instanceof Date) return fmtDate_(v);
  var t = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
}

function addDays_(ymd, days) {
  var p = ymd.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
  return d.toISOString().slice(0, 10);
}

function nice_(ymd) {
  var p = ymd.split('-').map(Number);
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
                'October', 'November', 'December'];
  return months[p[1] - 1] + ' ' + p[2] + ', ' + p[0];
}

function truthy_(v) {
  return v === true || /^(true|yes|1|on)$/i.test(String(v).trim());
}

function cmp_(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'en', { sensitivity: 'base' });
}

function pad_(n) {
  return (n < 10 ? '0' : '') + n;
}

function youtubeId_(s) {
  s = String(s || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function parseNumber_(s) {
  var t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[−–]/g, '-');
  // "2,124" or "1,234.5" use a thousands comma; otherwise a comma is a decimal comma ("3,77").
  t = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(/,/g, '.');
  if (t === '') return NaN;
  var m = t.match(/^([-+]?\d*\.?\d+)(?:[x×*]10\^?([-+]?\d+))?$/i);
  if (m) return Number(m[1]) * Math.pow(10, m[2] ? Number(m[2]) : 0);
  return Number(t);
}

function clean_(v, max) {
  var t = String(v == null ? '' : v).trim().slice(0, max);
  // Stop spreadsheet formula injection
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
