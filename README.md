# PHYMECH Online Modules

Self-paced online modules for **Fundamentals of Physics I: Mechanics for Astronomers**
(Ryan M. Vitalez, Department of Earth and Space Sciences). Students use them on days when
class cannot meet in person.

**Student site:** https://mrvitalez.github.io/PHYMECH-online-module/

Each of the 14 modules follows one chapter of the course book and has three parts:

1. **Discussion**: a short review of the chapter's main ideas and key equations.
2. **Worked examples**: three solved problems, with solutions hidden until the student opens them.
3. **Activity**: 8 graded items (numeric and multiple choice) and a short reflection. The student enters
   their details and submits. The submission is graded and recorded in the instructor's Google Sheet,
   one tab per module.

| # | Module |
|---|--------|
MODULE_TABLE

## Files

```
index.html             Course home page (list of modules)
modules/module-NN.html One page per module
assets/style.css       Site styles (light and dark mode, phone friendly)
assets/module.js       Activity form: saves drafts on the device, submits to Google
assets/config.js       The Google Apps Script URL that receives submissions
img/                   Figures taken from the course book
```

The answer key is **not** in this repository. It lives only in the Google Apps Script attached
to the results sheet, so students cannot read the answers from the page source.

Instructor setup (turning on the site and the Google Sheet connection): see
[INSTRUCTOR-SETUP.md](INSTRUCTOR-SETUP.md).
