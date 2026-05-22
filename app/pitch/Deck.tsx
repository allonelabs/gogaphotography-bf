'use client';

// AllOnce pitch deck — slide engine.
// All 20 slides + chart helpers + styles live in Slides.tsx.
// This file owns: keyboard nav, hash routing, screen/print views, nav chrome.

import { useEffect, useState, useCallback } from 'react';
import {
  TOTAL_SLIDES,
  Slide01, Slide02, Slide03, Slide04, Slide05,
  Slide06, Slide07, Slide08, Slide09, Slide10,
  Slide11, Slide12, Slide13, Slide14, Slide15,
  Slide16, Slide17, Slide18, Slide19, Slide20,
  DeckStyles,
} from './Slides';

const SLIDES = [
  Slide01, Slide02, Slide03, Slide04, Slide05,
  Slide06, Slide07, Slide08, Slide09, Slide10,
  Slide11, Slide12, Slide13, Slide14, Slide15,
  Slide16, Slide17, Slide18, Slide19, Slide20,
];

export default function Deck() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    const n = parseInt(h, 10);
    if (!isNaN(n) && n >= 1 && n <= TOTAL_SLIDES) setIdx(n - 1);
  }, []);

  useEffect(() => {
    const next = String(idx + 1).padStart(2, '0');
    if (window.location.hash.replace('#', '') !== next) {
      window.history.replaceState(null, '', `#${next}`);
    }
  }, [idx]);

  const go = useCallback((delta: number) => {
    setIdx((i) => Math.max(0, Math.min(TOTAL_SLIDES - 1, i + delta)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault(); go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); go(-1);
      } else if (e.key === 'Home') {
        e.preventDefault(); setIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault(); setIdx(TOTAL_SLIDES - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go]);

  const ActiveSlide = SLIDES[idx];

  return (
    <div className="deck">
      <div className="deck-screen">
        <ActiveSlide />
      </div>

      <div className="deck-print">
        {SLIDES.map((S, i) => <S key={i} />)}
      </div>

      <nav className="deck-nav" aria-label="Slide navigation">
        <button onClick={() => go(-1)} disabled={idx === 0} className="deck-nav-btn" aria-label="Previous slide">←</button>
        <span className="deck-nav-counter">
          {String(idx + 1).padStart(2, '0')}{' '}
          <span className="deck-nav-counter-total">/ {String(TOTAL_SLIDES).padStart(2, '0')}</span>
        </span>
        <button onClick={() => go(1)} disabled={idx === TOTAL_SLIDES - 1} className="deck-nav-btn" aria-label="Next slide">→</button>
      </nav>

      <DeckStyles />
    </div>
  );
}
