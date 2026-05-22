(function () {
  const prev = document.querySelector('button[aria-label="Previous slide"]');
  const next = document.querySelector('button[aria-label="Next slide"]');
  if (!prev || !next) return;

  // The track is the nearest ancestor that already has translateX applied.
  let track = null, container = null;
  let el = prev;
  while (el && el !== document.body) {
    el = el.parentElement;
    if (!el) break;
    const candidate = el.querySelector('[style*="translateX"]');
    if (candidate) { track = candidate; container = candidate.parentElement; break; }
  }
  if (!track) {
    track = document.querySelector('[style*="translateX(0px)"]');
    container = track && track.parentElement;
  }
  if (!track || !container) return;

  const slides = Array.from(track.children);
  if (!slides.length) return;

  // step = slide width + gap (read computed gap from track)
  function stepPx() {
    const slideRect = slides[0].getBoundingClientRect();
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.columnGap || cs.gap || '20') || 20;
    return slideRect.width + gap;
  }

  let offset = 0;
  function maxOffset() {
    return Math.max(0, track.scrollWidth - container.clientWidth);
  }
  function apply() {
    track.style.transform = 'translateX(' + (-offset) + 'px)';
    prev.disabled = offset <= 0;
    next.disabled = offset >= maxOffset() - 1;
    prev.style.opacity = prev.disabled ? '0.4' : '1';
    next.style.opacity = next.disabled ? '0.4' : '1';
    prev.style.cursor = prev.disabled ? 'not-allowed' : 'pointer';
    next.style.cursor = next.disabled ? 'not-allowed' : 'pointer';
  }

  prev.addEventListener('click', () => {
    offset = Math.max(0, offset - stepPx());
    apply();
  });
  next.addEventListener('click', () => {
    offset = Math.min(maxOffset(), offset + stepPx());
    apply();
  });

  // Drag to scrub
  let dragStartX = null, startOffset = 0;
  container.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragStartX = e.clientX;
    startOffset = offset;
    container.setPointerCapture(e.pointerId);
    track.style.transition = 'none';
  });
  container.addEventListener('pointermove', (e) => {
    if (dragStartX === null) return;
    const dx = e.clientX - dragStartX;
    offset = Math.max(0, Math.min(maxOffset(), startOffset - dx));
    track.style.transform = 'translateX(' + (-offset) + 'px)';
  });
  function endDrag(e) {
    if (dragStartX === null) return;
    dragStartX = null;
    track.style.transition = '';
    // snap to nearest slide
    const s = stepPx();
    offset = Math.round(offset / s) * s;
    offset = Math.max(0, Math.min(maxOffset(), offset));
    apply();
  }
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', () => {
    offset = Math.min(offset, maxOffset());
    apply();
  });
  apply();
})();
