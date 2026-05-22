(function () {
  // The About-section dial: a flex container that already has perspective preserved.
  // Locate it by finding any img-15.svg ancestor we can grab.
  const probe = document.querySelector('img[src="/images/img-15.svg"]');
  if (!probe) return;
  // Walk up to the flex wrapper that holds all dial layers
  let dial = probe.parentElement;
  while (dial && !dial.className.includes('flex justify-center items-center relative')) {
    dial = dial.parentElement;
  }
  if (!dial) dial = probe.parentElement;

  dial.style.transformStyle = 'preserve-3d';
  dial.style.willChange = 'transform';
  dial.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

  // Tilt range — small, editorial. Max ±10° each axis.
  const MAX_TILT = 10;
  const FALLOFF  = 1.6;   // how far outside the dial the cursor still tilts (1 = at edge)

  let targetX = 0, targetY = 0;
  let curX = 0, curY = 0;
  let raf = null;

  function onMove(e) {
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    // -1..1 across the dial, falls off beyond it
    const dx = (e.clientX - cx) / (r.width  / 2 * FALLOFF);
    const dy = (e.clientY - cy) / (r.height / 2 * FALLOFF);
    const ndx = Math.max(-1.4, Math.min(1.4, dx));
    const ndy = Math.max(-1.4, Math.min(1.4, dy));
    targetY =  ndx * MAX_TILT;        // rotateY follows horizontal cursor
    targetX = -ndy * MAX_TILT;        // rotateX follows vertical cursor (inverted)
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function onLeave() {
    targetX = 0; targetY = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    curX += (targetX - curX) * 0.14;
    curY += (targetY - curY) * 0.14;
    dial.style.transform = 'perspective(1100px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
    if (Math.abs(curX - targetX) > 0.01 || Math.abs(curY - targetY) > 0.01) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
  window.addEventListener('blur', onLeave);
})();
