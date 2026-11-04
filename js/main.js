document.addEventListener("DOMContentLoaded", () => {
  // תפריט במובייל
  const btn = document.querySelector(".menu-btn");
  const menu = document.querySelector(".nav ul");
  if (btn && menu) btn.addEventListener("click", () => btn.setAttribute("aria-expanded", menu.classList.toggle("open")));
  if (btn && menu) document.addEventListener("keydown", e => {
    if (e.key === "Escape" && menu.classList.contains("open")) {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  });

  // אזור הודעות שקוראי מסך מקריאים
  document.body.insertAdjacentHTML("beforeend", `<p class="site-status" id="site-status" role="status"></p>`);

  // כפתורי וואטסאפ כלליים
  document.querySelectorAll("[data-wa]").forEach(el => {
    el.href = waLink(el.dataset.wa || "שלום אדם, אשמח לשמוע פרטים נוספים 🙂");
    el.target = "_blank"; el.rel = "noopener"; markNewWindow(el);
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

// תנועה ועומק: נטען בנפרד כדי שהאתר יעבוד גם בלעדיו
document.head.appendChild(Object.assign(document.createElement("script"), { src: "js/motion.js" }));

// אייקון קישוטי שקוראי מסך מדלגים עליו
const ICONS = { "📅": "calendar", "🕖": "clock", "📍": "pin", "👥": "people" };
function icon(emoji) {
  return `<span class="ico ico-${ICONS[emoji]}" aria-hidden="true"></span>`;
}

// מודיע לקוראי מסך שהקישור נפתח בחלון חדש
function markNewWindow(el) {
  const note = " (נפתח בחלון חדש)";
  if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.getAttribute("aria-label") + note);
  else el.insertAdjacentHTML("beforeend", `<span class="sr-only">${note}</span>`);
}

// הודעה שנשארת על המסך עד שסוגרים אותה
function showStatus(html) {
  const box = document.getElementById("site-status");
  box.innerHTML = `<span>${html}</span><button class="status-close" type="button" aria-label="סגירת ההודעה">×</button>`;
  box.querySelector("button").onclick = () => { box.innerHTML = ""; };
}

// חלונית הרשמה: מכניסה את המיקוד פנימה, שומרת אותו בתוכה ומחזירה אותו בסגירה
function setupModal(modal) {
  const background = [...document.body.children].filter(el => el !== modal && el.tagName !== "SCRIPT");
  const isOpen = () => modal.classList.contains("open");
  let opener = null;
  const open = from => {
    opener = from;
    modal.classList.add("open");
    background.forEach(el => { el.inert = true; });
    modal.querySelector("input").focus();
  };
  const close = () => {
    if (!isOpen()) return;
    modal.classList.remove("open");
    background.forEach(el => { el.inert = false; });
    if (opener) opener.focus();
  };
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  modal.querySelector(".modal-close").onclick = close;
  document.addEventListener("keydown", e => {
    if (!isOpen()) return;
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const items = [...modal.querySelectorAll("a[href],button,input,select,textarea")];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return { open, close };
}

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
  const link = waLink(waText);
  showStatus(window.open(link, "_blank")
    ? `הודעת וואטסאפ מוכנה נפתחה בחלון חדש. כדי לסיים, לחצו בה על "שלח".`
    : `וואטסאפ לא נפתח אוטומטית. <a href="${link}" target="_blank" rel="noopener">לפתיחת ההודעה המוכנה<span class="sr-only"> (נפתח בחלון חדש)</span></a>`);
}
