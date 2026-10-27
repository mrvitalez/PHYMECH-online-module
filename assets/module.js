(function () {
  "use strict";

  var form = document.getElementById("activity-form");
  if (!form) return;

  var moduleNo = form.dataset.module;
  var draftKey = "phymech-draft-" + moduleNo;
  var studentKey = "phymech-student";
  var statusBox = document.getElementById("activity-status");
  var submitBtn = document.getElementById("submit-btn");

  // Show / hide worked solutions
  document.querySelectorAll(".solution-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sol = document.getElementById(btn.getAttribute("aria-controls"));
      var open = sol.hidden;
      sol.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Hide solution" : "Show solution";
    });
  });

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

  function collect() {
    var data = { student: {}, answers: {} };
    form.querySelectorAll("[data-student]").forEach(function (el) {
      data.student[el.dataset.student] = el.value.trim();
    });
    form.querySelectorAll(".item").forEach(function (item) {
      var id = item.dataset.id;
      if (item.dataset.type === "mc") {
        var picked = item.querySelector("input[type=radio]:checked");
        data.answers[id] = picked ? Number(picked.value) : "";
      } else {
        var input = item.querySelector("input[type=text], textarea");
        data.answers[id] = input.value.trim();
      }
    });
    return data;
  }

  // Restore saved student details and draft answers
  var savedStudent = load(studentKey) || {};
  form.querySelectorAll("[data-student]").forEach(function (el) {
    if (savedStudent[el.dataset.student]) el.value = savedStudent[el.dataset.student];
  });
  var draft = load(draftKey) || {};
  form.querySelectorAll(".item").forEach(function (item) {
    var v = draft[item.dataset.id];
    if (v === undefined || v === "") return;
    if (item.dataset.type === "mc") {
      var r = item.querySelector('input[type=radio][value="' + v + '"]');
      if (r) r.checked = true;
    } else {
      item.querySelector("input[type=text], textarea").value = v;
    }
  });
  form.addEventListener("input", function () {
    var d = collect();
    store(draftKey, d.answers);
    store(studentKey, d.student);
  });

  function parseNumber(s) {
    // Accept "3.77", "3,77", "1.5e3", "1.5 x 10^3", "1.5×10^3"
    var t = String(s).replace(/\s+/g, "").replace(/,/g, ".").replace(/[−–]/g, "-");
    var m = t.match(/^([-+]?\d*\.?\d+)(?:[x×*]10\^?([-+]?\d+))?$/i);
    if (m) return Number(m[1]) * Math.pow(10, m[2] ? Number(m[2]) : 0);
    return Number(t);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = collect();
    var s = data.student;

    if (!s.studentNo || !s.lastName || !s.firstName || !s.section || !s.email) {
      show("err", "Please fill in all of your student details at the top of the activity.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) {
      show("err", "Please enter a valid email address.");
      return;
    }
    var missing = [];
    var bad = [];
    form.querySelectorAll(".item").forEach(function (item, i) {
      var v = data.answers[item.dataset.id];
      if (v === "" || v === undefined) missing.push(i + 1);
      else if (item.dataset.type === "numeric" && !isFinite(parseNumber(v))) bad.push(i + 1);
    });
    if (missing.length) {
      show("err", "Please answer every item before submitting. Missing: item " + missing.join(", ") + ".");
      return;
    }
    if (bad.length) {
      show("err", "Numeric answers must be plain numbers (for example 3.77 or 1.5e3). Check item " + bad.join(", ") + ".");
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
      userAgent: navigator.userAgent.slice(0, 200)
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    show("info", "Sending your answers to your instructor…");

    fetch(url, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || "The server rejected the submission.");
        form.querySelectorAll(".item").forEach(function (item) {
          var verdict = res.results ? res.results[item.dataset.id] : undefined;
          item.classList.remove("correct", "wrong");
          var v = item.querySelector(".verdict");
          if (verdict === true) { item.classList.add("correct"); v.textContent = "✓ Correct"; }
          else if (verdict === false) { item.classList.add("wrong"); v.textContent = "✗ Not quite. Review the discussion and the examples."; }
          else { v.textContent = ""; }
        });
        var left = res.attemptsLeft > 0
          ? " You have " + res.attemptsLeft + " attempt" + (res.attemptsLeft === 1 ? "" : "s") + " left."
          : " This was your last attempt.";
        show("ok", "<strong>Submitted!</strong> Attempt " + res.attempt + ". Score: <strong>" +
          res.score + " / " + res.total + "</strong>." + left +
          "<br>Your result has been recorded. Take a screenshot of this message as proof of submission.");
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
