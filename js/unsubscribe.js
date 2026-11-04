// הסרה מרשימת העדכונים לפי הקישור שבמייל
(() => {
  const btn = document.getElementById("unsub-btn");
  const text = document.getElementById("unsub-text");
  const status = document.getElementById("unsub-status");
  const params = new URLSearchParams(location.hash.slice(1));
  const u = params.get("u"), t = params.get("t");
  const mail = `<a href="mailto:brookereneco@gmail.com">brookereneco@gmail.com</a>`;

  if (!u || !t) {
    btn.style.display = "none";
    text.innerHTML = `הקישור לא שלם. כדי להסיר את עצמכם מהרשימה, פתחו את הקישור שבתחתית המייל, או כתבו אל ${mail}.`;
    return;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.textContent = "רגע אחד…";
    try {
      const res = await fetch(SITE_CONFIG.sheetsWebAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "unsubscribe", u, t }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("rejected");
      btn.style.display = "none";
      status.textContent = "הוסרתם מהרשימה ולא תקבלו מאיתנו עדכונים נוספים.";
    } catch (_) {
      btn.disabled = false;
      status.innerHTML = `לא הצלחנו להשלים את ההסרה. אפשר לכתוב אל ${mail} ונטפל בכך.`;
    }
  });
})();
