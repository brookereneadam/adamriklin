(() => {
  const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const fmt = d => `${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const today = new Date(); today.setHours(0,0,0,0);
  const list = document.getElementById("live-list");
  const upcoming = LIVE_COURSES.filter(c => parse(c.startDate) >= today).sort((a,b) => parse(a.startDate) - parse(b.startDate));

  list.innerHTML = upcoming.length ? upcoming.map(c => `
    <article class="event">
      <h3>${c.title}</h3>
      <div class="meta">${icon("📅")} מתחיל ב־${fmt(parse(c.startDate))}<br>${icon("🕖")} <bdi>${c.schedule}</bdi><br>${icon("📍")} ${c.location}${c.price ? ` · ${c.price}` : ""}${c.spots ? `<br>${icon("👥")} ${c.spots}` : ""}</div>
      <button class="btn btn-primary" data-signup="${c.id}">להרשמה למחזור</button>
    </article>`).join("")
    : `<div class="empty-state">אין כרגע מחזור פתוח להרשמה.<br><a data-wa="שלום אדם, אשמח לקבל עדכון כשייפתח מחזור חדש של קורס המבוא לבודהיזם" href="#">לקבלת עדכון על המחזור הבא ${icon("←")}</a></div>`;

  // הרשמה למחזור חי
  const modal = document.getElementById("signup-modal");
  const form = document.getElementById("signup-form");
  let current = null;
  const dialog = setupModal(modal);
  list.querySelectorAll("[data-signup]").forEach(b => b.onclick = () => {
    current = LIVE_COURSES.find(c => c.id === b.dataset.signup);
    document.getElementById("signup-title").textContent = current.title;
    document.getElementById("signup-meta").textContent = `מתחיל ב־${fmt(parse(current.startDate))} · ${current.location}`;
    form.reset(); dialog.open(b);
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const msg = [
      "שלום אדם, אני רוצה להירשם לקורס:", `*${current.title}*`, `מתחיל ב־${fmt(parse(current.startDate))}`, "",
      `שם: ${d.name}`, `טלפון: ${d.phone}`, d.email ? `אימייל: ${d.email}` : "",
      d.notes ? `הערות: ${d.notes}` : "",
    ].filter(Boolean).join("\n");
    submitLead("הרשמה לקורס חי", { ...d, item: current.title, itemDate: current.startDate }, msg);
    dialog.close();
  });

  // קורס מוקלט
  document.getElementById("recorded-price").textContent = SITE_CONFIG.recordedCoursePrice;
  const buy = document.getElementById("buy-recorded");
  if (SITE_CONFIG.recordedCourseUrl) {
    buy.href = SITE_CONFIG.recordedCourseUrl; buy.target = "_blank"; buy.rel = "noopener"; markNewWindow(buy);
  } else {
    buy.textContent = "לרכישה בוואטסאפ"; markNewWindow(buy);
    buy.href = "#";
    buy.onclick = e => { e.preventDefault(); window.open(waLink("שלום אדם, אני רוצה לרכוש את הקורס המוקלט \"מבוא לבודהיזם\" 🙏"), "_blank"); };
  }
})();
