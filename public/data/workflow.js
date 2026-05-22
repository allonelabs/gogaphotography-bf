(function () {
  const section = document.querySelector('.workflow');
  if (!section) return;
  const stage   = section.querySelector('.workflow-stage');
  if (!stage) return;
  const caption = section.querySelector('.wf-caption');
  const scenes  = Array.from(section.querySelectorAll('.wf-scene'));

  const meta = [
    { name: 'Welcome',    caption: 'AllOnce greets you. Then asks one question.' },
    { name: 'Brief',      caption: 'You type. AllOnce reads.' },
    { name: 'Spawn',      caption: 'AllOnce reads the brief and spawns a workspace.' },
    { name: 'Bridges',    caption: 'Every tool you already pay for, wired in.' },
    { name: 'Brandbook',  caption: 'Run a prompt. AllOnce makes the assets.' },
    { name: 'Matrix',     caption: 'Every metric, in one unblinking view.' },
    { name: 'Decisions',  caption: 'Decisions arrive. The workspace handles them.' },
  ];

  // ─── Per-element entry/exit fx ─────────────────────────────
  const fxEls = Array.from(section.querySelectorAll('[data-fx]'));
  fxEls.forEach(el => {
    el.dataset.origTransform = el.getAttribute('transform') || '';
    // Map element to its parent scene index
    const scene = el.closest('.wf-scene');
    el.dataset.sceneIdx = scenes.indexOf(scene).toString();
    // Initial hidden state
    el.style.opacity = 0;
  });

  function applyFx(el, lp) {
    const type  = el.dataset.fx;
    const delay = parseFloat(el.dataset.fxDelay || '0');
    const dur   = 0.18;
    // Entry fade only — scene wrapper handles cross-scene toggle.
    const t = clamp01((lp - delay) / dur);
    const opacity = ease(t);
    const eased = ease(t);
    const orig = el.dataset.origTransform;
    let extra = '';
    switch (type) {
      case 'fade': break;
      case 'slide-up':
        extra = ' translate(0,' + ((1 - eased) * 24).toFixed(1) + ')'; break;
      case 'slide-down':
        extra = ' translate(0,' + (-(1 - eased) * 24).toFixed(1) + ')'; break;
      case 'slide-left':
        extra = ' translate(' + ((1 - eased) * 60).toFixed(1) + ',0)'; break;
      case 'slide-right':
        extra = ' translate(' + (-(1 - eased) * 60).toFixed(1) + ',0)'; break;
      case 'pop': {
        // Spring-y scale around its own translate centre — emulate via tighter curve
        const s = 0.6 + eased * 0.45;             // 0.6 → 1.05
        const final = eased < 0.85 ? s : (1 + (1 - eased) * 0.33); // settle to 1
        extra = ' scale(' + final.toFixed(3) + ')';
        // To scale "in place" we need to shift back to centre; use scale-only since translate centres are okay for our small avatars
        break;
      }
    }
    el.setAttribute('transform', orig + extra);
    el.style.opacity = opacity;
  }

  // ─── Scene 02 — Brief: typing ──────────────────────────────
  const briefText  = section.querySelector('#wf-typed');
  const briefCaret = section.querySelector('#wf-caret');
  const fullBrief  = 'I run a coffee roaster. 200 customers.';

  // ─── Scene 03 — Spawn: particles converging at hub (640, 200) ─
  const HUB_X = 640, HUB_Y = 200;
  const PARTICLE_COUNT = 36;
  const particleGroup = section.querySelector('#wf-particles');
  const particles = [];
  if (particleGroup) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const sx = 270 + (i / PARTICLE_COUNT) * 80;
      const sy = 320 + Math.sin(i) * 4;
      const r  = 220 + Math.sin(i * 1.7) * 50;
      const mx = HUB_X + Math.cos(angle) * r;
      const my = HUB_Y + Math.sin(angle) * r * 0.55 + 200;
      c.setAttribute('r', '2.4');
      c.setAttribute('fill', '#000');
      c.setAttribute('cx', sx);
      c.setAttribute('cy', sy);
      particleGroup.appendChild(c);
      particles.push({ el: c, sx, sy, mx, my, ex: HUB_X, ey: HUB_Y });
    }
  }
  const hub = section.querySelector('#wf-hub');

  // ─── Scene 04 — Bridges: tool rows slide in from right ──────
  const tools = Array.from(section.querySelectorAll('.wf-tool'));
  tools.forEach(t => {
    const m = (t.getAttribute('transform') || '').match(/translate\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*\)/);
    t.dataset.tx = m ? m[1] : '0';
    t.dataset.ty = m ? m[2] : '0';
    t.style.opacity = 0;
  });

  // ─── Scene 05 — Matrix tickers ─────────────────────────────
  const tickEls = Array.from(section.querySelectorAll('[data-tick]')).map(el => ({
    el,
    target: parseFloat(el.dataset.tick),
    prefix: el.dataset.prefix || '',
    suffix: el.dataset.suffix || '',
    digits: parseInt(el.dataset.digits || '0', 10),
  }));

  // ─── Scene 06 — Decisions notifications ───────────────────
  const notifs = Array.from(section.querySelectorAll('.wf-notif')).map(g => {
    const m = (g.getAttribute('transform') || '').match(/translate\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*\)/);
    return {
      el: g,
      tx: m ? parseFloat(m[1]) : 0,
      ty: m ? parseFloat(m[2]) : 0,
      i:  parseInt(g.dataset.i || '0', 10),
    };
  });
  notifs.forEach(n => { n.el.style.opacity = 0; });

  // ─── Helpers ───────────────────────────────────────────────
  const ease    = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const clamp01 = t => Math.max(0, Math.min(1, t));

  const SCENE_BOUNDS = [
    [0.000, 0.143], // Welcome
    [0.143, 0.286], // Brief
    [0.286, 0.429], // Spawn
    [0.429, 0.571], // Bridges
    [0.571, 0.714], // Brandbook
    [0.714, 0.857], // Matrix
    [0.857, 1.000], // Decisions
  ];
  function localProgress(p, [s, e]) { return clamp01((p - s) / (e - s)); }
  function fmt(v, d) {
    if (d === 0) return Math.round(v).toLocaleString();
    return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // ─── Pin state — fixed during section, released at proper boundary ─
  function applyPinState(rect, total) {
    const top = rect.top;
    if (top > 0) {
      stage.classList.remove('is-fixed', 'is-end');
    } else if (top + total < -1) {
      // section's bottom is above viewport top → fully past, anchor stage to section bottom
      stage.classList.remove('is-fixed');
      stage.classList.add('is-end');
    } else {
      stage.classList.add('is-fixed');
      stage.classList.remove('is-end');
    }
  }

  // ─── Main loop ─────────────────────────────────────────────
  let lastP = -2;
  function update() {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const p = clamp01(-rect.top / Math.max(1, total));
    applyPinState(rect, total);

    if (Math.abs(p - lastP) < 0.0003) { requestAnimationFrame(update); return; }
    lastP = p;

    let active = 0;
    for (let i = 0; i < SCENE_BOUNDS.length; i++) {
      if (p >= SCENE_BOUNDS[i][0] && p <= SCENE_BOUNDS[i][1] + 0.0001) { active = i; break; }
    }
    if (p > 0.999) active = SCENE_BOUNDS.length - 1;
    if (caption) caption.textContent = meta[active].caption;

    scenes.forEach((s, i) => { s.style.opacity = (i === active) ? 1 : 0; });

    // Per-element fx
    fxEls.forEach(el => {
      const idx = parseInt(el.dataset.sceneIdx, 10);
      if (idx !== active) {
        // Reset offscreen so when scene re-enters, it starts hidden
        el.style.opacity = 0;
        el.setAttribute('transform', el.dataset.origTransform);
        return;
      }
      const lp = localProgress(p, SCENE_BOUNDS[idx]);
      applyFx(el, lp);
    });

    // Scene 02 — Chat: typing happens INSIDE the input box (translate(200,560)).
    // Phase: typing 0 → 0.55, then "sent" — input clears, user bubble + delivered fade in.
    if (briefText && active === 1) {
      const lpRaw = localProgress(p, SCENE_BOUNDS[1]);
      if (lpRaw < 0.58) {
        const lp = ease(clamp01(lpRaw / 0.55));
        const charsToShow = Math.floor(lp * fullBrief.length);
        briefText.textContent = fullBrief.slice(0, charsToShow);
        const tw = briefText.getComputedTextLength ? briefText.getComputedTextLength() : (charsToShow * 8.5);
        if (briefCaret) {
          briefCaret.setAttribute('x', 32 + tw + 4);
          briefCaret.style.opacity = (Math.floor(performance.now() / 450) % 2) ? 1 : 0.2;
        }
      } else {
        // Message sent — input clears, caret hidden
        briefText.textContent = '';
        if (briefCaret) {
          briefCaret.setAttribute('x', 36);
          briefCaret.style.opacity = 0;
        }
      }
    }

    // Scene 03 — Spawn particles
    if (particles.length && active === 2) {
      const lp = ease(localProgress(p, SCENE_BOUNDS[2]));
      particles.forEach(pt => {
        let x, y;
        if (lp < 0.5) {
          const t = lp * 2;
          x = pt.sx + (pt.mx - pt.sx) * ease(t);
          y = pt.sy + (pt.my - pt.sy) * ease(t);
        } else {
          const t = (lp - 0.5) * 2;
          x = pt.mx + (pt.ex - pt.mx) * ease(t);
          y = pt.my + (pt.ey - pt.my) * ease(t);
        }
        pt.el.setAttribute('cx', x.toFixed(1));
        pt.el.setAttribute('cy', y.toFixed(1));
        pt.el.setAttribute('opacity', lp < 0.95 ? 1 : (1 - (lp - 0.95) * 20));
      });
      if (hub) {
        const r = lp < 0.6 ? 0 : Math.min(36, (lp - 0.6) * 90);
        hub.setAttribute('r', r.toFixed(1));
      }
    }

    // Scene 04 — Bridges tools slide in
    if (tools.length && active === 3) {
      const lp = ease(localProgress(p, SCENE_BOUNDS[3]));
      tools.forEach(t => {
        const idx = parseInt(t.dataset.i, 10);
        const stagger = idx * 0.07;
        const local = clamp01((lp - stagger) / 0.16);
        const localE = ease(local);
        const ty = parseFloat(t.dataset.ty);
        const xOff = 700 * (1 - localE);
        t.setAttribute('transform', 'translate(' + xOff.toFixed(1) + ',' + ty + ')');
        t.style.opacity = localE;
      });
    } else if (tools.length) {
      tools.forEach(t => {
        // hide when not active so they don't show offset
        t.style.opacity = 0;
      });
    }

    // Scene 06 — Matrix tickers (was scene 5; +1 since Brandbook scene was inserted)
    if (tickEls.length && active === 5) {
      const lp = ease(localProgress(p, SCENE_BOUNDS[5]));
      tickEls.forEach(t => {
        t.el.textContent = t.prefix + fmt(t.target * lp, t.digits) + t.suffix;
      });
    }

    // Scene 07 — Decisions notifications (was scene 6)
    if (notifs.length && active === 6) {
      const lp = localProgress(p, SCENE_BOUNDS[6]);
      notifs.forEach(n => {
        const stagger = 0.10 + n.i * 0.18;
        const t = clamp01((lp - stagger) / 0.16);
        const eased = ease(t);
        n.el.style.opacity = eased;
        const yOff = (1 - eased) * 18;
        n.el.setAttribute('transform', 'translate(' + n.tx + ',' + (n.ty + yOff).toFixed(1) + ')');
      });
    } else if (notifs.length) {
      notifs.forEach(n => { n.el.style.opacity = 0; });
    }

    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
})();
