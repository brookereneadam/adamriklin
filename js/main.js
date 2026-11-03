document.addEventListener("DOMContentLoaded", () => {
  // תפריט במובייל
  const btn = document.querySelector(".menu-btn");
  const menu = document.querySelector(".nav ul");
  if (btn && menu) btn.addEventListener("click", () => menu.classList.toggle("open"));

  // כפתורי וואטסאפ כלליים
  document.querySelectorAll("[data-wa]").forEach(el => {
    el.href = waLink(el.dataset.wa || "שלום אדם, אשמח לשמוע פרטים נוספים 🙂");
    el.target = "_blank"; el.rel = "noopener";
  });

  // טופס פנייה
  const form = document.getElementById("inquiry-form");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const text = [
      "שלום אדם, הגעתי דרך האתר ואשמח ליצור קשר.", "",
      `שם: ${d.name}`, `טלפון: ${d.phone}`,
      d.email ? `אימייל: ${d.email}` : "",
      d.topic ? `נושא: ${d.topic}` : "",
      d.format ? `העדפה: ${d.format}` : "",
      d.message ? `\n${d.message}` : "",
    ].filter(Boolean).join("\n");
    submitLead("פנייה", d, text);
    form.reset();
  });
});

function waLink(text) {
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

// שומר את הפרטים בגיליון (אם הוגדר) ופותח וואטסאפ עם הודעה מוכנה
function submitLead(type, data, waText) {
  const url = SITE_CONFIG.sheetsWebAppUrl;
  if (url) {
    const payload = JSON.stringify({ type, page: location.pathname, ...data });
    try {
      fetch(url, { method: "POST", mode: "no-cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" }, body: payload });
    } catch (_) {}
  }
  window.open(waLink(waText), "_blank");
}
