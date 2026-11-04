// נצנוצים, עומק ותנועה עם הגלילה. הכול קישוטי, והתוכן נשאר נגיש גם בלי הקובץ הזה.
(function () {
  const root = document.documentElement;
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let userOff = false;
  try { userOff = localStorage.getItem("motion-off") === "1"; } catch (e) {}
  const isOn = () => !userOff && !reducedQuery.matches;

  const decos = [], threads = [];
  let canvas, ctx, motes = [], W = 0, H = 0, running = false, lastY = -1, hero, heroText, heroArch, photo, revealObserver, toggle;

  // שכבות קישוט בעומקים שונים
  const SETS = [
    [["mandala", "end", "6%", 360, .16, .05], ["glow-gold", "start", "50%", 420, .08, 0], ["branch", "start", -.32, 200, .12, 0, -75]],
    [["moon", "start", "10%", 240, .24, -.02], ["glow-lilac", "end", "30%", 460, .1, 0], ["branch", "end", "36%", 210, .3, .01]],
    [["mandala", "start", "30%", 300, .2, -.05], ["glow-gold", "end", "4%", 380, .1, 0], ["moon", "end", "56%", 150, .32, .02]]
  ];

  function buildDepth() {
    let eligible = 0;
    document.querySelectorAll("main > section").forEach((section, i) => {
      const layer = document.createElement("div");
      layer.className = "depth";
      layer.setAttribute("aria-hidden", "true");
      SETS[i % SETS.length].forEach(([kind, side, top, size, speed, rot, base = 0]) => {
        // הענף התלוי מתאים רק לראש העמוד, בשאר המקומות הוא נוגע בכותרות
        if (base && !section.classList.contains("hero")) return;
        const el = document.createElement("div");
        const px = size * (innerWidth < 760 ? .55 : 1);
        el.className = "deco deco-" + kind;
        const edge = kind !== "branch" ? -px * .35 : base ? px * .15 : -px * .22;
        el.style.cssText = `top:${typeof top === "number" ? px * top + "px" : top};width:${px}px;height:${kind === "branch" ? px * 2 : px}px;inset-inline-${side}:${edge}px`;
        if (base) el.style.transform = `rotate(${base}deg)`;
        layer.appendChild(el);
        decos.push({ el, section, speed, rot, base });
      });
      // הקו רק בחלק מהאזורים, והכוכב רק בראשון שבהם
      if (section.classList.contains("section") && i > 0 && eligible++ % 2 === 0) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "thread");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        svg.appendChild(path);
        layer.append(svg);
        let tip = null;
        if (!threads.length) {
          tip = document.createElement("div");
          tip.className = "thread-tip";
          layer.append(tip);
        }
        threads.push({ section, svg, path, tip, len: 0 });
      }
      section.prepend(layer);
    });
  }

  function sizeThreads() {
    threads.forEach(t => {
      const w = t.section.clientWidth, x = n => (n / 1200 * w).toFixed(1);
      t.svg.setAttribute("viewBox", `0 0 ${w} 80`);
      t.path.setAttribute("d", `M${x(1215)} 46C${x(1040)} 4 ${x(930)} 74 ${x(770)} 42S${x(560)} 8 ${x(430)} 44S${x(170)} 76 ${x(-15)} 26`);
      t.len = t.path.getTotalLength();
      t.path.style.strokeDasharray = t.len;
    });
  }

  function show(el) {
    el.classList.add("in");
    setTimeout(() => { el.style.transitionDelay = ""; }, 1400);
  }

  function buildReveal() {
    const items = document.querySelectorAll("main .section h1, main .section h2:not(.h3), main .section .lead, main .section .card, main .section .two-col > div:not(.card) > p, main .section .steps");
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      revealObserver.unobserve(entry.target);
    }), { rootMargin: "100000px 0px -8% 0px", threshold: .08 }); // גם מה שנגלל מעליו מיד מוצג
    items.forEach(el => {
      el.classList.add("reveal");
      if (el.getBoundingClientRect().top < innerHeight) { el.classList.add("in"); return; }
      const index = [...el.parentElement.children].indexOf(el);
      el.style.transitionDelay = Math.min(index, 4) * 90 + "ms";
      revealObserver.observe(el);
    });
    // מי שמגיע עם המקלדת לא יישאר מול תוכן מוסתר
    document.addEventListener("focusin", e => {
      const hidden = e.target.closest && e.target.closest(".reveal:not(.in)");
      if (hidden) show(hidden);
    });
  }

  // נצנוצים שנעים בעומקים שונים
  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = W < 760 ? 14 : 32;
    motes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      z: .3 + Math.random() * .7,
      r: 1 + Math.random() * 1.7,
      phase: Math.random() * 6.28,
      speed: .5 + Math.random() * 1.2,
      star: i % 3 === 0,
      color: ["200,150,62", "200,150,62", "138,111,194", "201,139,94"][i % 4]
    }));
  }

  function drawMote(m, t, scroll) {
    m.y -= .14 * m.z;
    if (m.y < -20) { m.y = H + 20; m.x = Math.random() * W; }
    const x = m.x + Math.sin(t / 2600 + m.phase) * 16 * m.z;
    const y = (((m.y - scroll * m.z * .42) % (H + 40)) + H + 40) % (H + 40) - 20;
    if (photo && x > photo.left && x < photo.right && y > photo.top && y < photo.bottom) return; // לא על הפנים של אדם
    const glow = Math.pow(Math.abs(Math.sin(t / 1000 * m.speed + m.phase)), 2.4);
    const alpha = .12 + glow * .78, r = m.r * (m.star ? 1 + glow * .9 : 1);
    ctx.fillStyle = `rgba(${m.color},${alpha})`;
    ctx.beginPath();
    if (m.star) {
      const k = r * .14;
      ctx.moveTo(x, y - r * 2);
      ctx.quadraticCurveTo(x + k, y - k, x + r * 2, y);
      ctx.quadraticCurveTo(x + k, y + k, x, y + r * 2);
      ctx.quadraticCurveTo(x - k, y + k, x - r * 2, y);
      ctx.quadraticCurveTo(x - k, y - k, x, y - r * 2);
    } else ctx.arc(x, y, r * .6, 0, 6.29);
    ctx.fill();
    if (!m.star) {
      ctx.fillStyle = `rgba(${m.color},${alpha * .18})`;
      ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 6.29); ctx.fill();
    }
  }

  function updateScroll() {
    const vh = innerHeight, y = scrollY;
    decos.forEach(d => {
      const box = d.section.getBoundingClientRect();
      if (box.bottom < -300 || box.top > vh + 300) return;
      const c = box.top + box.height / 2 - vh / 2;
      d.el.style.transform = `translate3d(0,${(-c * d.speed).toFixed(1)}px,0) rotate(${(d.base - c * d.rot).toFixed(1)}deg)`;
    });
    threads.forEach(t => {
      const top = t.section.getBoundingClientRect().top;
      const p = clamp((vh - top) / (vh * .92), 0, 1);
      t.path.style.strokeDashoffset = t.len * (1 - p);
      if (!t.tip) return;
      const point = t.path.getPointAtLength(t.len * p);
      t.tip.style.opacity = p > .01 && p < .99 ? 1 : 0;
      t.tip.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0) rotate(${(p * 90).toFixed(0)}deg)`;
    });
    if (hero) {
      const p = clamp(y / hero.offsetHeight, 0, 1);
      hero.style.setProperty("--spin", (p * 70).toFixed(1) + "deg");
      if (heroText) { heroText.style.transform = `translate3d(0,${(p * 90).toFixed(1)}px,0)`; heroText.style.opacity = (1 - p * 1.1).toFixed(3); }
      if (heroArch) {
        heroArch.style.transform = `translate3d(0,${(-p * 50).toFixed(1)}px,0) scale(${(1 + p * .06).toFixed(3)})`;
        photo = heroArch.getBoundingClientRect();
      }
    }
  }

  function frame(t) {
    if (!running) return;
    if (scrollY !== lastY) { lastY = scrollY; updateScroll(); }
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) drawMote(m, t, lastY);
    requestAnimationFrame(frame);
  }

  function apply() {
    const on = isOn();
    root.classList.toggle("motion", on);
    canvas.hidden = !on;
    toggle.hidden = reducedQuery.matches;
    toggle.setAttribute("aria-pressed", String(userOff));
    toggle.setAttribute("aria-label", "עצירת התנועה באתר");
    toggle.title = userOff ? "הפעלת התנועה באתר" : "עצירת התנועה באתר";
    toggle.classList.toggle("is-off", userOff);
    if (on && !running) { running = true; lastY = -1; requestAnimationFrame(frame); }
    if (!on) {
      running = false;
      decos.forEach(d => { d.el.style.transform = d.base ? `rotate(${d.base}deg)` : ""; });
      threads.forEach(t => { t.path.style.strokeDashoffset = 0; if (t.tip) t.tip.style.opacity = 0; });
      [heroText, heroArch].forEach(el => { if (el) { el.style.transform = ""; el.style.opacity = ""; } });
      if (hero) hero.style.removeProperty("--spin");
    }
  }

  function buildToggle() {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "motion-toggle";
    toggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pause" d="M9 6v12M15 6v12"/><path class="i-play" d="M9 6l9 6-9 6Z"/></svg>`;
    toggle.addEventListener("click", () => {
      userOff = !userOff;
      try { localStorage.setItem("motion-off", userOff ? "1" : "0"); } catch (e) {}
      apply();
    });
    document.body.appendChild(toggle);
  }

  function init() {
    hero = document.querySelector(".hero");
    heroText = document.querySelector(".hero-grid > div:first-child");
    heroArch = document.querySelector(".hero .arch");
    canvas = document.createElement("canvas");
    canvas.className = "sparkles";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    buildDepth();
    sizeThreads();
    resizeCanvas();
    buildReveal();
    buildToggle();
    apply();
    let timer;
    addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { resizeCanvas(); sizeThreads(); lastY = -1; }, 150);
    });
    reducedQuery.addEventListener("change", apply);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
