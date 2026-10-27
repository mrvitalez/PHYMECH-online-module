(function () {
  "use strict";

  // Numeric items must have a written solution before the activity can be submitted.
  var REQUIRE_NUMERIC_SOLUTIONS = true;

  var form = document.getElementById("activity-form");
  if (!form) return;

  var moduleNo = form.dataset.module;
  var draftKey = "phymech-draft-" + moduleNo;
  var studentKey = "phymech-student";
  var statusBox = document.getElementById("activity-status");
  var submitBtn = document.getElementById("submit-btn");

  function show(kind, html) {
    statusBox.className = "status show " + kind;
    statusBox.innerHTML = html;
    statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }

  // ----- Equation editor: symbol / LaTeX buttons and live preview -----

  function insertAtCursor(ta, text, isLatex) {
    var start = ta.selectionStart, end = ta.selectionEnd, v = ta.value;
    if (isLatex) {
      // Wrap a LaTeX snippet in $...$ unless the cursor is already inside a $...$ pair.
      var before = v.slice(0, start);
      var inside = (before.match(/\$/g) || []).length % 2 === 1;
      if (!inside) text = "$" + text + "$";
    }
    ta.value = v.slice(0, start) + text + v.slice(end);
    var caret = start + text.length - (isLatex && text.charAt(text.length - 1) === "$" ? 1 : 0);
    ta.focus();
    ta.setSelectionRange(caret, caret);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  var previewTimers = {};
  function renderPreview(ta) {
    var box = ta.closest(".solution-box").querySelector(".sol-preview");
    clearTimeout(previewTimers[ta.id]);
    previewTimers[ta.id] = setTimeout(function () {
      // textContent keeps student input as plain text; MathJax then typesets the $...$ parts.
      box.textContent = ta.value.replace(/\$\$([^$]+)\$\$/g, "\\[$1\\]").replace(/\$([^$]+)\$/g, "\\($1\\)");
      if (window.MathJax && MathJax.typesetPromise) {
        if (MathJax.typesetClear) MathJax.typesetClear([box]);
        MathJax.typesetPromise([box]).catch(function () { /* show raw text on error */ });
      }
    }, 300);
  }

  form.querySelectorAll(".solution-box").forEach(function (sb) {
    var ta = sb.querySelector("textarea");
    sb.querySelectorAll(".sym").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep the cursor in the textarea
      b.addEventListener("click", function () {
        insertAtCursor(ta, b.dataset.insert, b.dataset.latex === "1");
      });
    });
    ta.addEventListener("input", function () { renderPreview(ta); });
  });

  // ----- Collect, save drafts, restore -----

  function collect() {
    var data = { student: {}, answers: {}, solutions: {} };
    form.querySelectorAll("[data-student]").forEach(function (el) {
      data.student[el.dataset.student] = el.value.trim();
    });
    form.querySelectorAll(".item").forEach(function (item) {
      var id = item.dataset.id;
      if (item.dataset.type === "mc") {
        var picked = item.querySelector("input[type=radio]:checked");
        data.answers[id] = picked ? Number(picked.value) : "";
      } else if (item.dataset.type === "numeric") {
        data.answers[id] = item.querySelector(".answer-row input").value.trim();
      } else {
        data.answers[id] = item.querySelector("textarea.reflection").value.trim();
      }
      var sol = item.querySelector(".sol-input");
      if (sol) data.solutions[id] = sol.value.trim();
    });
    return data;
  }

  var savedStudent = load(studentKey) || {};
  form.querySelectorAll("[data-student]").forEach(function (el) {
    if (savedStudent[el.dataset.student]) el.value = savedStudent[el.dataset.student];
  });
  var draft = load(draftKey) || {};
  var draftAnswers = draft.answers || {};
  var draftSolutions = draft.solutions || {};
  form.querySelectorAll(".item").forEach(function (item) {
    var id = item.dataset.id;
    var v = draftAnswers[id];
    if (v !== undefined && v !== "") {
      if (item.dataset.type === "mc") {
        var r = item.querySelector('input[type=radio][value="' + v + '"]');
        if (r) r.checked = true;
      } else if (item.dataset.type === "numeric") {
        item.querySelector(".answer-row input").value = v;
      } else {
        item.querySelector("textarea.reflection").value = v;
      }
    }
    var sol = item.querySelector(".sol-input");
    if (sol && draftSolutions[id]) {
      sol.value = draftSolutions[id];
      renderPreview(sol);
    }
  });
  form.addEventListener("input", function () {
    var d = collect();
    store(draftKey, { answers: d.answers, solutions: d.solutions });
    store(studentKey, d.student);
  });

  function parseNumber(s) {
    // Accept "3.77", "3,77", "2,124", "1.5e3", "1.5 x 10^3", "1.5×10^3"
    var t = String(s).replace(/\s+/g, "").replace(/[−–]/g, "-");
    // "2,124" or "1,234.5" use a thousands comma; otherwise a comma is a decimal comma ("3,77").
    t = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, "") : t.replace(/,/g, ".");
    var m = t.match(/^([-+]?\d*\.?\d+)(?:[x×*]10\^?([-+]?\d+))?$/i);
    if (m) return Number(m[1]) * Math.pow(10, m[2] ? Number(m[2]) : 0);
    return Number(t);
  }

  function itemLabel(n) { return "Item " + n; }

  // ----- Feedback after grading -----

  function showFeedback(res) {
    var right = [], wrong = [];
    form.querySelectorAll(".item").forEach(function (item, i) {
      var id = item.dataset.id;
      var verdict = res.results ? res.results[id] : undefined;
      var v = item.querySelector(".verdict");
      item.classList.remove("correct", "wrong");
      v.textContent = "";
      if (verdict === true) {
        item.classList.add("correct");
        v.textContent = "✓ Correct";
        right.push(i + 1);
      } else if (verdict === false) {
        item.classList.add("wrong");
        wrong.push(i + 1);
        var msg = "✗ Mistake.";
        if (res.key && res.key[id] !== undefined) {
          if (item.dataset.type === "mc") {
            var choice = item.querySelectorAll(".choice-text")[res.key[id]];
            msg += " Correct answer: " + String.fromCharCode(65 + res.key[id]) + ". " + (choice ? choice.textContent : "");
          } else {
            var unit = item.querySelector(".unit");
            msg += " Correct answer: " + Number(res.key[id].toPrecision(4)) + (unit ? " " + unit.textContent : "");
          }
        } else {
          msg += " Check your solution against the discussion and the worked examples.";
        }
        v.textContent = msg;
      }
    });
    return { right: right, wrong: wrong };
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = collect();
    var s = data.student;

    if (!s.lastName || !s.firstName || !s.studentNo || !s.blockSection) {
      show("err", "Please fill in your last name, first name, student number, and block and section at the top of the activity.");
      return;
    }
    var missing = [], bad = [], noSolution = [];
    form.querySelectorAll(".item").forEach(function (item, i) {
      var id = item.dataset.id;
      var v = data.answers[id];
      if (v === "" || v === undefined) missing.push(i + 1);
      else if (item.dataset.type === "numeric" && !isFinite(parseNumber(v))) bad.push(i + 1);
      if (REQUIRE_NUMERIC_SOLUTIONS && item.dataset.type === "numeric" && !data.solutions[id]) noSolution.push(i + 1);
    });
    if (missing.length) {
      show("err", "Please answer every item before submitting. Missing: item " + missing.join(", ") + ".");
      return;
    }
    if (bad.length) {
      show("err", "Final answers must be plain numbers (for example 3.77 or 1.5e3). Check item " + bad.join(", ") + ".");
      return;
    }
    if (noSolution.length) {
      show("err", "Please write your solution for item " + noSolution.join(", ") + " in its solution box.");
      return;
    }

    var url = window.PHYMECH_SUBMIT_URL;
    if (!url) {
      show("info", "Submissions are not open yet. Your answers are saved on this device; come back later to submit them.");
      return;
    }

    var payload = {
      module: Number(moduleNo),
      student: s,
      answers: data.answers,
      solutions: data.solutions
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    show("info", "Sending your answers to your instructor…");

    fetch(url, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || "The server rejected the submission.");
        var fb = showFeedback(res);
        var left = res.attemptsLeft > 0
          ? "You have " + res.attemptsLeft + " attempt" + (res.attemptsLeft === 1 ? "" : "s") +
            " left. Fix the items marked ✗ and submit again if you wish."
          : "This was your last attempt." + (res.key ? " The correct answers are now shown under your mistakes." : "");
        show("ok",
          "<strong>Submitted!</strong> Attempt " + res.attempt + ". Your score: <strong>" + res.score + " / " + res.total + "</strong>" +
          "<br>Correct: " + (fb.right.length ? fb.right.map(itemLabel).join(", ") : "none") +
          "<br>Mistakes: " + (fb.wrong.length ? fb.wrong.map(itemLabel).join(", ") : "none. Excellent work!") +
          "<br>" + left +
          "<br><small>Your result has been recorded. Take a screenshot of this message as proof of submission.</small>");
      })
      .catch(function (err) {
        show("err", "Submission failed: " + err.message +
          " Check your internet connection and try again. If it keeps failing, message your instructor.");
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit activity";
      });
  });
})();
