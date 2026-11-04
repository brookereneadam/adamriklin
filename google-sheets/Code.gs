/**
 * Adam Riklin website → Google Sheets
 * Saves every form submission to its own tab and keeps one
 * de-duplicated contact list ("אנשי קשר"), keyed by phone number.
 * Also emails people who opted in when a new event appears on the site.
 * Setup: see SETUP.md in this folder.
 */
const TABS = {
  "פנייה": "פניות",
  "הרשמה לאירוע": "הרשמות לאירועים",
  "הרשמה לקורס חי": "הרשמות לקורסים",
  "קורס מוקלט": "קורס מוקלט – מתעניינים",
};
const DETAIL_HEADERS = ["תאריך", "שם", "טלפון", "אימייל", "פריט", "תאריך פריט", "נושא", "העדפה", "משתתפים", "הודעה / הערות", "דיוור", "עמוד"];
const CONTACT_HEADERS = ["שם", "טלפון", "אימייל", "פנייה ראשונה", "פנייה אחרונה", "מס׳ פניות", "מקורות", "מאשר/ת דיוור"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action === "unsubscribe") return jsonOut_({ ok: unsubscribe_(d.u, d.t) });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();
    const phone = normalizePhone(d.phone);
    const optIn = d.consent ? "כן" : "לא";

    const tab = getTab(ss, TABS[d.type] || "אחר", DETAIL_HEADERS);
    tab.appendRow([now, d.name || "", phone, d.email || "", d.item || "", d.itemDate || "",
      d.topic || "", d.format || "", d.count || "", d.message || d.notes || "", optIn, d.page || ""]);

    upsertContact(getTab(ss, "אנשי קשר", CONTACT_HEADERS), d, phone, now, optIn);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function upsertContact(sheet, d, phone, now, optIn) {
  const source = d.item ? `${d.type}: ${d.item}` : d.type;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const samePhone = phone && String(rows[i][1]) === phone;
    const sameEmail = !phone && d.email && String(rows[i][2]).toLowerCase() === String(d.email).toLowerCase();
    if (samePhone || sameEmail) {
      const r = i + 1;
      if (d.name) sheet.getRange(r, 1).setValue(d.name);
      if (d.email) sheet.getRange(r, 3).setValue(d.email);
      sheet.getRange(r, 5).setValue(now);
      sheet.getRange(r, 6).setValue((Number(rows[i][5]) || 0) + 1);
      const sources = String(rows[i][6] || "").split(" | ").filter(String);
      if (sources.indexOf(source) === -1) sources.push(source);
      sheet.getRange(r, 7).setValue(sources.join(" | "));
      if (optIn === "כן") sheet.getRange(r, 8).setValue("כן");
      return;
    }
  }
  sheet.appendRow([d.name || "", phone, d.email || "", now, now, 1, source, optIn]);
}

function getTab(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.setRightToLeft(true);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e9dfd0");
    sh.setFrozenRows(1);
    sh.getRange("B:B").setNumberFormat("@"); // keep phone leading zeros
  }
  return sh;
}

function normalizePhone(p) {
  if (!p) return "";
  let s = String(p).replace(/[^\d+]/g, "");
  if (s.startsWith("+972")) s = "0" + s.slice(4);
  else if (s.startsWith("972")) s = "0" + s.slice(3);
  return s;
}

// Run once from the editor to check everything works.
function testPost() {
  doPost({ postData: { contents: JSON.stringify({ type: "פנייה", name: "בדיקה", phone: "050-0000000", email: "test@example.com", message: "הודעת בדיקה", consent: true, page: "/test" }) } });
}

// ===== Email updates when a new event appears on the site =====
// Setup: see "Email updates for new events" in SETUP.md.
const SITE_URL = "https://brookereneadam.github.io/adamriklin";
const SENDER_NAME = "אדם ריקלין";
const REPLY_TO = "brookereneco@gmail.com";
const SEEN_KEY = "SEEN_EVENT_IDS";
const SECRET_KEY = "UNSUBSCRIBE_SECRET";
const CONTACTS_TAB = "אנשי קשר";
const LOG_TAB = "מיילים שנשלחו";
const LOG_HEADERS = ["תאריך", "מזהה אירוע", "אירוע", "אימייל", "סטטוס"];
const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// Run once from the editor. Everything on the site right now counts as already
// announced, so only events added after this get emailed.
function setupEventEmails() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(SECRET_KEY)) props.setProperty(SECRET_KEY, Utilities.getUuid());
  props.setProperty(SEEN_KEY, JSON.stringify(fetchLiveEvents_().map(e => e.id)));
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "checkForNewEvents")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("checkForNewEvents").timeBased().everyHours(1).create();
}

// Runs every hour. Emails the opted-in list once for each new upcoming event.
function checkForNewEvents() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const stored = props.getProperty(SEEN_KEY);
    if (!stored) return; // setup hasn't run, so never email everyone by accident
    const seen = JSON.parse(stored);
    const today = Utilities.formatDate(new Date(), "Asia/Jerusalem", "yyyy-MM-dd");
    fetchLiveEvents_().forEach(ev => {
      if (seen.indexOf(ev.id) !== -1) return;
      // If the daily limit runs out, the event stays new and the rest go out next time.
      if (ev.date < today || emailEvent_(ev)) {
        seen.push(ev.id);
        props.setProperty(SEEN_KEY, JSON.stringify(seen));
      }
    });
  } finally {
    lock.releaseLock();
  }
}

// Run from the editor to see the email. It goes only to the account running the script.
function sendTestEmail() {
  const events = fetchLiveEvents_();
  if (!events.length) throw new Error("No events found on the site");
  sendOne_(events[events.length - 1], Session.getEffectiveUser().getEmail());
}

function fetchLiveEvents_() {
  const res = UrlFetchApp.fetch(`${SITE_URL}/js/events-data.js?t=${Date.now()}`, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(`Could not read events: ${res.getResponseCode()}`);
  const events = parseEvents_(res.getContentText("UTF-8"));
  if (!events.length) throw new Error("No events found in events-data.js");
  return events;
}

function parseEvents_(text) {
  const body = text.slice(text.indexOf("const EVENTS"));
  const field = (block, name) => {
    const m = block.match(new RegExp(`\\b${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? m[1].replace(/\\u200[eE]/g, "‎").replace(/\\(.)/g, "$1") : "";
  };
  return (body.match(/\{[^{}]*\}/g) || []).map(b => ({
    id: field(b, "id"), title: field(b, "title"), date: field(b, "date"), time: field(b, "time"),
    location: field(b, "location"), price: field(b, "price"), description: field(b, "description"),
  })).filter(e => e.id && e.title && e.date);
}

function getRecipients_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACTS_TAB);
  if (!sheet) return [];
  const list = sheet.getDataRange().getValues().slice(1)
    .filter(r => r[7] === "כן" && String(r[2]).indexOf("@") > 0)
    .map(r => String(r[2]).trim().toLowerCase());
  return list.filter((email, i) => list.indexOf(email) === i);
}

// Returns true once everyone on the list has been handled.
function emailEvent_(ev) {
  const log = getTab(SpreadsheetApp.getActiveSpreadsheet(), LOG_TAB, LOG_HEADERS);
  const done = log.getDataRange().getValues().filter(r => r[1] === ev.id).map(r => r[3]);
  const todo = getRecipients_().filter(email => done.indexOf(email) === -1);
  for (let i = 0; i < todo.length; i++) {
    if (MailApp.getRemainingDailyQuota() < 1) return false;
    let status = "נשלח";
    try {
      sendOne_(ev, todo[i]);
    } catch (err) {
      status = `נכשל: ${err}`;
    }
    log.appendRow([new Date(), ev.id, ev.title, todo[i], status]);
  }
  return true;
}

function sendOne_(ev, email) {
  const u = Utilities.base64EncodeWebSafe(email, Utilities.Charset.UTF_8);
  const unsubscribe = `${SITE_URL}/unsubscribe.html#u=${u}&t=${unsubscribeToken_(email)}`;
  const eventsPage = `${SITE_URL}/events.html`;
  const [y, m, d] = ev.date.split("-").map(Number);
  const when = `יום ${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d}.${m}.${y}${ev.time ? ` · ${ev.time}` : ""}`;
  const where = [ev.location, ev.price].filter(String).join(" · ");
  const contact = `נשלח על ידי ${SENDER_NAME}. לשאלות: ${REPLY_TO}`;
  const plain = [`אירוע חדש: ${ev.title}`, when, where, ev.description, "", `לפרטים ולהרשמה: ${eventsPage}`, "",
    "קיבלתם את המייל כי ביקשתם עדכונים באתר.", contact, `להסרה מהרשימה: ${unsubscribe}`].join("\n");
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d352e;max-width:560px">
    <h2 style="color:#4d5639;margin:0 0 12px">${esc_(ev.title)}</h2>
    <p style="margin:0 0 4px"><strong>${esc_(when)}</strong></p>
    ${where ? `<p style="margin:0 0 12px">${esc_(where)}</p>` : ""}
    ${ev.description ? `<p>${esc_(ev.description)}</p>` : ""}
    <p><a href="${eventsPage}" style="color:#86431f"><strong>לפרטים ולהרשמה</strong></a></p>
    <hr style="border:0;border-top:1px solid #e9dfd0;margin:24px 0 12px">
    <p style="font-size:13px;color:#62584e">קיבלתם את המייל כי ביקשתם עדכונים באתר.<br>${esc_(contact)}<br>
    <a href="${unsubscribe}" style="color:#62584e">להסרה מהרשימה</a></p></div>`;
  MailApp.sendEmail({ to: email, subject: `פרסומת: אירוע חדש – ${ev.title}`, body: plain, htmlBody: html, name: SENDER_NAME, replyTo: REPLY_TO });
}

function unsubscribeToken_(email) {
  const secret = PropertiesService.getScriptProperties().getProperty(SECRET_KEY);
  if (!secret) throw new Error("Run setupEventEmails first");
  const sig = Utilities.computeHmacSha256Signature(email.toLowerCase(), secret);
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, "");
}

function unsubscribe_(u, token) {
  let email = "";
  try {
    email = Utilities.newBlob(Utilities.base64DecodeWebSafe(u)).getDataAsString().toLowerCase();
  } catch (err) {
    return false;
  }
  if (!email || token !== unsubscribeToken_(email)) return false;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACTS_TAB);
  if (!sheet) return true;
  sheet.getDataRange().getValues().forEach((r, i) => {
    if (i > 0 && String(r[2]).trim().toLowerCase() === email) sheet.getRange(i + 1, 8).setValue("לא");
  });
  return true;
}

function jsonOut_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
