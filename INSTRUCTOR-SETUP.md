# Instructor setup (one time, about 10 minutes)

The modules are plain web pages hosted free on GitHub Pages. Activity submissions go to a small
Google Apps Script that grades them and writes one row per attempt into a Google Sheet in your Drive.

## 1. Turn on the student site (GitHub Pages)

1. Open https://github.com/mrvitalez/PHYMECH-online-module/settings/pages
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at https://mrvitalez.github.io/PHYMECH-online-module/
   Share that link with your students.

## 2. Put the results sheet in your Drive (rmvitalez@rtu.edu.ph)

The workbook **PHYMECH Online Modules: Activity Results** has already been shared with
rmvitalez@rtu.edu.ph as an editor. It has a *Summary* tab and one tab per module
(`M01 Vectors` … `M14 Periodic Motion`) with the column headers ready. Open it here:
https://docs.google.com/spreadsheets/d/1HQKFK1ASk_DgDvQPlw4aR_6eGsyb10psXrXeqam0tnM/edit

Signed in as **rmvitalez@rtu.edu.ph**:

1. Open the sheet from **Shared with me** in Google Drive.
2. **File → Make a copy**. Name it *PHYMECH Online Modules: Activity Results* and save it in **My Drive**.
   The copy is owned by you and lives in your Drive. Use this copy from now on.

## 3. Connect the sheet to the site (Apps Script)

1. In **your copy** of the sheet: **Extensions → Apps Script**.
2. Delete the sample code in `Code.gs`. Open the file
   **PHYMECH Apps Script (Code.gs) - PRIVATE, contains answer key.txt** (shared with you in Drive),
   copy all of its text and paste it into `Code.gs`. Click **Save**.
3. Click **Deploy → New deployment**. Click the gear next to *Select type* and choose **Web app**.
   - Description: `PHYMECH activities`
   - Execute as: **Me (rmvitalez@rtu.edu.ph)**
   - Who has access: **Anyone**
4. Click **Deploy**, then **Authorize access** and allow the permissions (Google may show
   "Google hasn't verified this app": click **Advanced → Go to (project name)**; it is your own script).
5. Copy the **Web app URL** (it ends in `/exec`).
6. In GitHub, open `assets/config.js`, click the pencil (Edit), and paste the URL between the quotes:

   ```js
   window.PHYMECH_SUBMIT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```

   Commit the change. The site updates within a minute or two.

**Test it:** open any module, fill in your own details with a test student number such as `TEST-001`,
answer the items and submit. A row should appear in that module's tab. Delete the test row afterwards.

## Day-to-day

- **Where results go:** each module tab gets one row per submission: timestamp, student number,
  last / first / middle name, block and section, attempt number, score, percent, then for each item the
  student's answer (marked ✓ or ✗) followed by the student's written solution, and finally the reflection.
  Solutions keep any LaTeX the student typed between `$` signs (for example `$v = \sqrt{2gh}$`).
- **What students see:** right after submitting, their score and which items are correct or wrong.
  After their last attempt they also see the correct answer for each item they missed. To hide the
  correct answers, set `REVEAL_ANSWERS_AFTER_LAST_ATTEMPT = false` in the script.
  The *Summary* tab shows the number of submissions and the average percent per module.
- **Attempts:** students may submit each activity up to **2** times (counted by student number).
  To change this, edit `MAX_ATTEMPTS` at the top of the script. To give one student another try,
  delete one of their rows.
- **Closing submissions:** set `ACCEPTING_SUBMISSIONS = false` in the script.
- **After editing the script** you must publish the change: **Deploy → Manage deployments →**
  pencil icon **→ Version: New version → Deploy**. The URL stays the same.
- **Keep the script private.** It holds the answer key. Do not paste it into the GitHub repository,
  which is public.
