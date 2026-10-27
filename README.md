# PHYMECH Online Modules

Self-paced online modules for **Fundamentals of Physics I: Mechanics for Astronomers**
(Ryan M. Vitalez, Department of Earth and Space Sciences). Students use them on days when
class cannot meet in person.

**Student site:** https://mrvitalez.github.io/PHYMECH-online-module/

Each of the 14 modules follows one chapter of the course book and has three parts:

1. **Discussion**: a short review of the chapter's main ideas and key equations.
2. **Worked examples**: three solved problems, with solutions hidden until the student opens them.
3. **Activity**: 8 graded items (numeric and multiple choice) and a short reflection. Students enter their
   name (last, first, middle), student number, and block and section; write a solution for each item in a
   box with a symbol / LaTeX toolbar and live equation preview; and enter their final answers. On submit,
   the activity is graded immediately (score plus correct / wrong per item) and recorded in the
   instructor's Google Sheet, one tab per module.

| # | Module |
|---|--------|
| 1 | [Vectors](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-01.html) |
| 2 | [Motion along a Straight Line](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-02.html) |
| 3 | [Motion in Two or Three Dimensions](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-03.html) |
| 4 | [Newton's Laws of Motion](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-04.html) |
| 5 | [Applying Newton's Laws](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-05.html) |
| 6 | [Work and Kinetic Energy](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-06.html) |
| 7 | [Potential Energy and Energy Conservation](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-07.html) |
| 8 | [Momentum, Impulse, and Collisions](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-08.html) |
| 9 | [Rotation of Rigid Bodies](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-09.html) |
| 10 | [Dynamics of Rotational Motion](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-10.html) |
| 11 | [Equilibrium and Elasticity](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-11.html) |
| 12 | [Fluid Mechanics](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-12.html) |
| 13 | [Gravitation](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-13.html) |
| 14 | [Periodic Motion](https://mrvitalez.github.io/PHYMECH-online-module/modules/module-14.html) |

## Files

```
index.html             Course home page (list of modules)
modules/module-NN.html One page per module
assets/style.css       Site styles (plum and amber theme, phone friendly)
assets/module.js       Activity form: saves drafts on the device, submits to Google
assets/config.js       The Google Apps Script URL that receives submissions
img/                   Figures taken from the course book, university seal
```

The answer key is **not** in this repository. It lives only in the Google Apps Script attached
to the results sheet, so students cannot read the answers from the page source.

Instructor setup (turning on the site and the Google Sheet connection): see
[INSTRUCTOR-SETUP.md](INSTRUCTOR-SETUP.md).
