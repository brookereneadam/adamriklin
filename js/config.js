// ===== הגדרות האתר =====
const SITE_CONFIG = {
  // מספר וואטסאפ בפורמט בינלאומי, ספרות בלבד (לדוגמה: 972501234567)
  whatsappNumber: "972500000000", // TODO: להחליף במספר של אדם

  // כתובת ה-Web App של Google Apps Script (ראו google-sheets/SETUP.md)
  // כל עוד ריק – הטפסים ישלחו רק לוואטסאפ ולא יישמרו בגיליון
  sheetsWebAppUrl: "",

  // קישור לרכישת הקורס המוקלט (פלטפורמת קורסים / דף תשלום)
  // כל עוד ריק – הכפתור יפתח הודעת וואטסאפ לאדם
  recordedCourseUrl: "",
  recordedCoursePrice: "₪___",
};
