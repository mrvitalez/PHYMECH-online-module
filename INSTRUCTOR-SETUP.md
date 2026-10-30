# Instructor setup (one time, about 15 minutes)

The course runs as two Google Apps Script sites, both limited to **@rtu.edu.ph** accounts, plus this GitHub
site as the public entry point:

| What | Address | Who can open it |
|------|---------|-----------------|
| Entry point | https://mrvitalez.github.io/PHYMECH-online-module/ | Anyone. It immediately sends visitors to the student site. |
| Student site | your web app URL (ends in `/exec`) | Only signed-in **@rtu.edu.ph** accounts. Google tells the site who the student is, so nobody types an email. |
| Admin site | the same URL + `?page=admin` | Only **rmvitalez@rtu.edu.ph** (edit `ADMIN_EMAILS` at the top of `Code.gs` to add co-teachers). |

All records are kept in a Google Sheet in your Drive: submissions (one tab per module, sorted by block section and
last name), video answers, the student list, the recordbook, settings, block sections, modules and the answer key.

Do every step signed in to Google as **rmvitalez@rtu.edu.ph**.

## 1. Create the Sheet and the Apps Script project

1. In Google Drive, create a new blank Google Sheet named **PHYMECH Online Modules (records)**.
2. In the Sheet: **Extensions → Apps Script**. Name the project **PHYMECH**.

## 2. Add the five files

In the Apps Script editor, create these files and paste in their contents. For each file in `apps-script/` of this
repository, open its **Raw** view on GitHub, select all (Ctrl+A), copy, and paste it into the editor file.

| Editor file | Type (the **+** next to *Files*) | Copy from |
|-------------|------|-----------|
| `Code.gs` | already exists; replace its contents | [`apps-script/Code.gs`](apps-script/Code.gs) |
| `Seed.gs` | Script | the **private** Drive file *PHYMECH Seed.gs - PRIVATE answer key* shared with you (it holds the answer key, so it is not on GitHub) |
| `Student` | HTML | [`apps-script/Student.html`](apps-script/Student.html) |
| `Admin` | HTML | [`apps-script/Admin.html`](apps-script/Admin.html) |
| `Styles` | HTML | [`apps-script/Styles.html`](apps-script/Styles.html) |

The editor adds `.html` to HTML files by itself: name them exactly `Student`, `Admin` and `Styles`. Click **Save**.

## 3. Run setup once

1. In the editor's function menu (top bar) choose **setup**, then click **Run**.
2. Google asks for permission the first time: **Review permissions →** your account **→ Allow**. If you see
   "Google hasn't verified this app", click **Advanced → Go to PHYMECH (unsafe)**; it is your own script.
3. When it finishes, the Sheet has the tabs *Settings, Block Sections, Modules, Answer Key, Students,
   Video Responses, Recordbook, Archive Log* and *M01 … M14*. Setup also installs the daily check that archives the
   records after the semester. It is safe to run setup again; it never overwrites your data.

## 4. Deploy the web app

1. **Deploy → New deployment →** gear icon **→ Web app**.
2. Description: `PHYMECH`. **Execute as: Me (rmvitalez@rtu.edu.ph)**.
   **Who has access: Anyone within Rizal Technological University.**
3. **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
4. Open `URL?page=admin` in your browser. This is your admin site; bookmark it.

## 5. Point the GitHub site at the student site

1. In GitHub, open `assets/config.js`, click the pencil (Edit), paste the web app URL between the quotes:
   ```js
   window.PHYMECH_STUDENT_URL = "https://script.google.com/a/macros/rtu.edu.ph/s/XXXXXXXX/exec";
   ```
   and commit.
2. Make sure GitHub Pages is on: **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
3. Give students https://mrvitalez.github.io/PHYMECH-online-module/ (or the web app URL directly).

## 6. First things to do in the admin site

1. **Semester:** set the semester name, start date and end date. Check attempts, answer reveal and automatic archive.
2. **Block sections:** type your sections, one per line (they appear as a dropdown in every activity).
3. **Modules & videos:** choose which modules are visible, optional open and due dates, and check each video.
4. Open the student site yourself and submit one activity as a test. Then, in **Results**, use **Allow retake** to
   delete your test attempt.

## Using the admin site

- **Overview:** semester status, number of students and submissions, which activities are open.
- **Semester:** dates, attempts (0 = unlimited), show correct answers after the last attempt, automatic archive.
  Before the start date students see a "semester starts on …" message. After the end date lessons can still be
  reviewed but activities are closed.
- **Block sections:** the dropdown list students choose from. Change it every semester.
- **Modules & videos:** show or hide a module, set an *opens on* date (hidden until then) and a *due on* date (last
  day the activity accepts submissions). **Edit video** changes the YouTube video, its citation, and the questions
  that pause the video. A question's *pause at* time can be seconds (`95`), minutes:seconds (`1:35`) or a
  percentage of the video (`40%`, `100%` = at the end).
- **Answer key:** change an answer or tolerance; new submissions are graded with it.
- **Results:** every submission for a module, sorted by block section and last name. Filter by section, search,
  view each student's answers and written solutions (equations are shown rendered), set a **Final score** that
  overrides the automatic score, add **Remarks**, or **Allow retake** (deletes that attempt).
- **Recordbook:** one row per student with the best score in each module (your final score if you set one), the
  average, and video questions answered correctly; sorted by block section, last name, first name. It is also
  written to the *Recordbook* tab of the Sheet, and refreshed every night.
- **Archive:** shows when the automatic archive will run (default: 7 days after the end date). Archiving saves a full
  copy of the Sheet in the Drive folder **PHYMECH Archives**, then clears submissions, video answers, students and
  the recordbook. Settings, sections, modules, videos and the answer key stay, ready for the next semester.
  You can also archive manually by typing ARCHIVE.

## Updating the lessons or the code

- **Lesson text and activity questions** are read from the `content/` folder of this repository. After you change a
  file there, click **Refresh lesson content from GitHub** on the admin Overview tab.
- **Code changes** (a new version of `Code.gs`, `Student.html`, `Admin.html` or `Styles.html`): paste the new file
  into the editor, then **Deploy → Manage deployments →** pencil **→ Version: New version → Deploy**. The URL
  stays the same.

## Good to know

- **Videos:** each module embeds one free lecture with its citation (MIT OpenCourseWare 8.01, Fall 2016, CC BY-NC-SA
  4.0, or Khan Academy, CC BY-NC-SA 3.0 US). The questions pause the video at 35%, 70% and the end, and ask about
  the video's topic. After watching a video, you may move them to exact times in **Modules & videos**. If YouTube is
  blocked on a network, students get an "open on YouTube" link and can answer the same questions below the player.
- **What is public:** the lesson text, figures and activity questions in `content/` are in this public repository,
  so they are readable on GitHub. Answers, scores and student data never are: they live only in your Sheet and in
  the private `Seed.gs`.
- **Quotas:** Apps Script handles a class of a few hundred students comfortably. If many students submit in the same
  second, each submission waits its turn (up to 25 seconds) rather than failing.
