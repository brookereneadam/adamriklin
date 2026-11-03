/**
 * Adam Riklin website → Google Sheets
 * Saves every form submission to its own tab and keeps one
 * de-duplicated contact list ("אנשי קשר"), keyed by phone number.
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
