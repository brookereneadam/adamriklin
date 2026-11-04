# Connecting the site forms to Google Sheets (about 5 minutes)

1. Go to https://sheets.new and name the sheet, for example "Adam Riklin – contacts".
2. Open **Extensions → Apps Script**.
3. Delete what's in the editor, paste in all of `Code.gs` from this folder, and save.
4. Choose `testPost` from the function list at the top and click **Run**. Approve the permissions
   (Google will show an "unverified app" warning: **Advanced → Go to … (unsafe)**; it's your own script).
   Tabs called "פניות" (inquiries) and "אנשי קשר" (contacts) should appear with a test row. You can delete that row.
5. Click **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
6. Paste that URL into `js/config.js` → `sheetsWebAppUrl: "https://script.google.com/macros/s/.../exec"`.

## Tabs that get created automatically
| Tab | Contents |
|---|---|
| אנשי קשר (contacts) | One row per person (matched by phone): name, phone, email, first/last contact, number of submissions, sources, mailing-list consent |
| פניות (inquiries) | Contact form |
| הרשמות לאירועים (event sign-ups) | Event sign-ups |
| הרשמות לקורסים (course sign-ups) | Live course sign-ups |
| קורס מוקלט – מתעניינים (recorded course interest) | Clicks on "buy the recorded course" |

> If you change `Code.gs` later: **Deploy → Manage deployments → ✏️ → Version: New version**, so the same URL stays.

## Email updates for new events (about 5 minutes)

When a new event is added to the site, everyone in "אנשי קשר" with "כן" in the last column and an email address gets one email.

1. In the sheet, delete any test rows from "אנשי קשר" so test addresses don't get emails.
2. Open **Extensions → Apps Script**, replace everything with the new `Code.gs`, and save.
3. Choose `setupEventEmails` from the function list and click **Run**. Approve the new permissions.
   Events already on the site count as announced, and an hourly check starts.
4. Click **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The address stays the same, and the unsubscribe link needs this step.
5. Choose `sendTestEmail` and click **Run**. A sample email goes only to the account running the script.

New events go out within about an hour of being live. The "מיילים שנשלחו" tab lists what was sent. Unsubscribing changes the person's last column in "אנשי קשר" to "לא". Google allows about 100 emails a day on a regular account, and anything over that goes out the next day.

If the site moves to a new domain, update `SITE_URL` in `Code.gs` and repeat step 4.
