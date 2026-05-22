(function () {
  const svg = document.getElementById('contact-wave-svg');
  if (!svg) return;
  const allPaths = Array.from(svg.querySelectorAll('path'));
  if (!allPaths.length) return;

  // Keep only first 5 paths visible (lighter look)
  const VISIBLE = 5;
  const paths = allPaths.slice(0, VISIBLE);
  allPaths.slice(VISIBLE).forEach(p => p.remove());

  // No glow — strip any filter (and remove a previously-injected one if it exists)
  paths.forEach(p => {
    p.removeAttribute('filter');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-width', '0.9');
    p.style.opacity = String(0.55 + 0.1 * Math.random()).slice(0, 4);
  });
  const oldFilter = svg.querySelector('#wave-glow');
  if (oldFilter) oldFilter.remove();

  const VB_W = 100, VB_H = 500, MID_Y = 250;

  // Three-peak envelope mirroring the AllOnce mark — short / tall / medium bars.
  // Bar centres in viewBox-x: 30 (short), 50 (tall), 70 (medium).
  function gauss(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
  function envelope(x) {
    return Math.min(1,
        gauss(x, 30, 5.5) * 0.62   // left  · short bar
      + gauss(x, 50, 5.5) * 1.00   // mid   · tall bar
      + gauss(x, 70, 5.5) * 0.45   // right · medium bar
    );
  }

  // Mouse interactivity: track normalised cursor pos relative to SVG bounds.
  // mx in [0,1] across the wave's width, my in [-1,1] above/below center.
  // proximity 0..1 falls off as the cursor leaves a generous radius around the wave.
  let mx = 0.5, my = 0, proximity = 0;
  let targetMx = 0.5, targetMy = 0, targetProx = 0;

  function onPointer(e) {
    const r = svg.getBoundingClientRect();
    const cx = e.clientX, cy = e.clientY;
    targetMx = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    targetMy = ((cy - r.top) / r.height - 0.5) * 2; // -1 above .. +1 below
    // tight sense zone: full inside bbox, decays over a narrow ~24px band outside
    const dx = cx < r.left ? r.left - cx : (cx > r.right ? cx - r.right : 0);
    const dy = cy < r.top ? r.top - cy : (cy > r.bottom ? cy - r.bottom : 0);
    const dist = Math.hypot(dx, dy);
    const fade = 24;
    targetProx = Math.max(0, 1 - dist / fade);
  }
  function onLeave() { targetProx = 0; }
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
  window.addEventListener('blur', onLeave);

  // Per-path personality
  const params = paths.map((_, i) => ({
    phase: i * 0.85,
    ampBase: 0.30 + i * 0.10,
    freq: 0.85 + i * 0.16,
    speed: 0.0014 + i * 0.0003,
    bulgeWidth: 16 + i * 3.5,  // bulge spreads wider than the sense zone — bend ripples down the line
    bulgeStrength: 1 - i * 0.08, // front lines bend a bit more than back lines
  }));

  function buildPath(timeMs, p, mxN, myN, prox) {
    const omega = timeMs * p.speed;
    const cursorBoost = 1 + prox * 1.4;          // amplitude swells near cursor
    const cursorX = mxN * 100;                    // cursor x in viewBox units
    const sig2 = p.bulgeWidth * p.bulgeWidth * 2;
    let d = '';
    for (let x = 0; x <= 100; x++) {
      const env = envelope(x);
      const wave =
        Math.sin((x * p.freq) * 0.34 + p.phase + omega) * 0.7 +
        Math.sin((x * p.freq) * 0.19 - p.phase * 1.2 + omega * 1.4) * 0.4 +
        Math.sin((x * p.freq) * 0.55 + p.phase * 0.5 - omega * 0.8) * 0.25;
      // localized "follow the cursor" bulge — bends even on the flat ends
      const dx = x - cursorX;
      const bulge = Math.exp(-(dx * dx) / sig2);
      const follow = myN * 170 * prox * p.bulgeStrength * bulge;
      const y = MID_Y + (45 * p.ampBase * cursorBoost) * env * wave + follow;
      d += (x === 0 ? 'M ' : 'L ') + x + ',' + y.toFixed(2) + ' ';
    }
    return d;
  }

  let running = true;
  function frame(t) {
    if (!running) return;
    // ease cursor signal toward target for smooth, responsive bending
    mx += (targetMx - mx) * 0.22;
    my += (targetMy - my) * 0.22;
    proximity += (targetProx - proximity) * 0.14;
    for (let i = 0; i < paths.length; i++) {
      paths[i].setAttribute('d', buildPath(t, params[i], mx, my, proximity));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
        else if (!e.isIntersecting) { running = false; }
      });
    });
    io.observe(svg);
  }
})();
