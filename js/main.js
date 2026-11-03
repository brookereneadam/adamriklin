// תפריט במובייל
document.addEventListener("DOMContentLoaded", () => {
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
    const d = new FormData(form);
    const lines = [
      "שלום אדם, הגעתי דרך האתר ואשמח ליצור קשר.",
      "",
      `שם: ${d.get("name")}`,
      `טלפון: ${d.get("phone")}`,
      d.get("topic") ? `נושא: ${d.get("topic")}` : "",
      d.get("format") ? `העדפה: ${d.get("format")}` : "",
      d.get("message") ? `\n${d.get("message")}` : "",
    ].filter(Boolean);
    window.open(waLink(lines.join("\n")), "_blank");
  });
});

function waLink(text) {
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
