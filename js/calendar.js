// לוח אירועים + הרשמה בוואטסאפ
(() => {
  const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const DOW = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const today = new Date(); today.setHours(0,0,0,0);
  const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fmt = d => `${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const events = [...EVENTS].sort((a,b) => parse(a.date) - parse(b.date));
  const upcoming = events.filter(e => parse(e.date) >= today);

  // לפתוח בחודש של האירוע הקרוב
  let view = upcoming.length ? parse(upcoming[0].date) : new Date();
  view = new Date(view.getFullYear(), view.getMonth(), 1);

  const grid = document.getElementById("cal-grid");
  const title = document.getElementById("cal-title");
  const list = document.getElementById("event-list");
  const listTitle = document.getElementById("list-title");

  function render() {
    title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    grid.innerHTML = DOW.map(d => `<div class="cal-dow">${d}</div>`).join("");
    const first = view.getDay();
    const days = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    for (let i = 0; i < first; i++) grid.insertAdjacentHTML("beforeend", `<div class="cal-day empty"></div>`);
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const evs = events.filter(e => e.date === key(date));
      const cls = ["cal-day"];
      if (+date === +today) cls.push("today");
      if (date < today) cls.push("past");
      if (evs.length) cls.push("has-event");
      const el = document.createElement("div");
      el.className = cls.join(" ");
      el.innerHTML = `${d}${evs.length ? '<span class="dot"></span>' : ""}`;
      if (evs.length) {
        el.title = evs.map(e => e.title).join(", ");
        el.addEventListener("click", () => focusEvent(evs[0].id));
      }
      grid.appendChild(el);
    }
    renderList();
  }

  function renderList() {
    const inMonth = events.filter(e => { const d = parse(e.date); return d.getMonth() === view.getMonth() && d.getFullYear() === view.getFullYear(); });
    listTitle.textContent = `אירועים ב${MONTHS[view.getMonth()]}`;
    if (!inMonth.length) {
      const next = upcoming.find(e => parse(e.date) > view);
      list.innerHTML = `<div class="empty-state">אין אירועים בחודש הזה.${next ? `<br><a href="#" id="jump-next">לאירוע הקרוב ←</a>` : ""}</div>`;
      const j = document.getElementById("jump-next");
      if (j) j.onclick = ev => { ev.preventDefault(); const d = parse(next.date); view = new Date(d.getFullYear(), d.getMonth(), 1); render(); };
      return;
    }
    list.innerHTML = inMonth.map(e => {
      const past = parse(e.date) < today;
      return `<article class="event" id="ev-${e.id}">
        <h3>${e.title}</h3>
        <div class="meta">📅 ${fmt(parse(e.date))} · 🕖 <bdi dir="ltr">${e.time}</bdi><br>📍 ${e.location}${e.price ? ` · ${e.price}` : ""}</div>
        <div>${(e.tags||[]).map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <p style="margin-top:10px">${e.description}</p>
        ${past ? `<span class="form-note">האירוע הסתיים</span>` : `<button class="btn btn-primary" data-signup="${e.id}">להרשמה</button>`}
      </article>`;
    }).join("");
    list.querySelectorAll("[data-signup]").forEach(b => b.onclick = () => openSignup(b.dataset.signup));
  }

  function focusEvent(id) {
    const el = document.getElementById(`ev-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight"); setTimeout(() => el.classList.remove("highlight"), 1600);
  }

  // הרשמה
  const modal = document.getElementById("signup-modal");
  const form = document.getElementById("signup-form");
  let current = null;
  function openSignup(id) {
    current = events.find(e => e.id === id);
    document.getElementById("signup-title").textContent = current.title;
    document.getElementById("signup-meta").innerHTML = `${fmt(parse(current.date))} · <bdi dir="ltr">${current.time}</bdi> · ${current.location}`;
    form.reset(); modal.classList.add("open");
  }
  const close = () => modal.classList.remove("open");
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.querySelector(".modal-close").onclick = close;
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = new FormData(form);
    const msg = [
      `שלום אדם, אני רוצה להירשם לאירוע:`,
      `*${current.title}*`,
      `${fmt(parse(current.date))} · ${current.time}`,
      ``,
      `שם: ${d.get("name")}`,
      `טלפון: ${d.get("phone")}`,
      `מספר משתתפים: ${d.get("count")}`,
      d.get("notes") ? `הערות: ${d.get("notes")}` : "",
    ].filter(x => x !== "").join("\n");
    window.open(waLink(msg), "_blank");
    close();
  });

  document.getElementById("cal-prev").onclick = () => { view.setMonth(view.getMonth()-1); render(); };
  document.getElementById("cal-next").onclick = () => { view.setMonth(view.getMonth()+1); render(); };
  render();
})();
