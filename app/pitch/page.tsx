// AllOnce pitch deck — `/pitch` route. Series A investor narrative.
// Renders <Deck/> client component which owns slide state + keyboard nav.
// Indexable=false; this URL is shared privately with investors.

import type { Metadata } from 'next';
import Deck from './Deck';

export const metadata: Metadata = {
  title: 'AllOnce — Investor Pitch',
  description:
    'AllOnce financial narrative: 8.6× capital efficiency, $1.24M raised, 20-person Tbilisi team, deterministic spawn pipeline. Series A 2026.',
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return <Deck />;
}
