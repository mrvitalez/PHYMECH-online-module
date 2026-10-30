# PHYMECH Online Modules

Self-paced online modules for **Mechanics**
(Instr. Ryan M. Vitalez, LPT, Department of Earth and Space Sciences, Rizal Technological University).
Students use them on days when class cannot meet in person.

**Entry point:** https://mrvitalez.github.io/PHYMECH-online-module/ sends students to the student site, which is a
Google Apps Script web app open only to **@rtu.edu.ph** accounts. The instructor has a separate admin site on the
same deployment (`?page=admin`). Setup: [INSTRUCTOR-SETUP.md](INSTRUCTOR-SETUP.md).

Each of the 14 modules follows one chapter of the course book:

1. **Discussion**: a short review of each section, with key equations and figures.
2. **Worked examples**: three solved problems, solutions hidden until opened.
3. **Lecture video**: one free lecture (MIT OpenCourseWare or Khan Academy, cited on the page) that pauses for
   three multiple-choice questions; answers are recorded.
4. **Activity**: 8 graded items plus a reflection. The student's RTU email is detected automatically; they enter
   their name, student number and choose their block and section from a list, write solutions with a symbol/LaTeX
   toolbar and live preview, and see their score and per-item results on submit.

| # | Module | Video |
|---|--------|-------|
| 1 | Vectors | 0.5 Vector Decomposition into Components (MIT OCW 8.01) |
| 2 | Motion along a Straight Line | 1.4 Average Velocity in 1D (MIT OCW 8.01) |
| 3 | Motion in Two or Three Dimensions | 3.4 Projectile Motion (MIT OCW 8.01) |
| 4 | Newton's Laws of Motion | 4.1 Newton's First and Second Laws (MIT OCW 8.01) |
| 5 | Applying Newton's Laws | Applying Newton's 2nd Law (MIT OCW 8.01) |
| 6 | Work and Kinetic Energy | 22.5 Summary of Work and Kinetic Energy (MIT OCW 8.01) |
| 7 | Potential Energy and Energy Conservation | 24.1 Mechanical Energy and Energy Conservation (MIT OCW 8.01) |
| 8 | Momentum, Impulse, and Collisions | 15.1 Momentum and Impulse (MIT OCW 8.01) |
| 9 | Rotation of Rigid Bodies | 29.2 Moment of Inertia of a Rod (MIT OCW 8.01) |
| 10 | Dynamics of Rotational Motion | 30.1 Introduction to Torque and Rotational Dynamics (MIT OCW 8.01) |
| 11 | Equilibrium and Elasticity | Moments (Khan Academy) |
| 12 | Fluid Mechanics | Archimedes principle and buoyant force (Khan Academy) |
| 13 | Gravitation | 5.1 Universal Law of Gravitation (MIT OCW 8.01) |
| 14 | Periodic Motion | Intuition about simple harmonic oscillators (Khan Academy) |

MIT OCW 8.01 is *MIT 8.01 Classical Mechanics, Fall 2016*, https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/,
licensed CC BY-NC-SA 4.0. Khan Academy videos are licensed CC BY-NC-SA 3.0 US. Videos can be changed in the admin site.

## Files

```
index.html, modules/      Entry pages that send visitors to the RTU-only student site
assets/config.js          The student site URL (set once by the instructor)
assets/style.css          Shared styles (plum and amber theme)
content/                  Lesson and activity fragments + manifest, loaded by the student site (no answers)
img/                      Figures from the course book and the university seal
apps-script/              Code for the Apps Script project: Code.gs, Student.html, Admin.html, Styles.html
```

The answer key and the video question answers are **not** in this repository. They are seeded from a private
`Seed.gs` file and then kept only in the instructor's Google Sheet.
