# GOGA contract completion — design

Contract N15/05/2026-1 (Giorgi Mikeladze ↔ შპს „ოლუან", signed 2026-05-18, paid in full)
promised items the delivered site still lacks. This spec closes them, plus Luka's
2026-09-24 asks: page animations throughout, photo captions near the cursor and in the
lightbox, and everything managed from the admin panel. The chatbot stays on Gemini
(GOGA agreed).

Two repos share one Supabase (`bsmgqgcoilzghdnmafua`):

- **public** = `allonelabs/gogaphotography`: static HTML + Vercel functions `api/*.ts`
  (gogaphotography.vercel.app, auto-deploys from `main`).
- **admin** = `allonelabs/gogaphotography-bf`: Next.js admin at `/admin/*`, manual `vercel --prod`.

## Deliverables

| # | Contract item | Where |
|---|---|---|
| 1 | Price calculator | public `/book` + `/services`; admin add-ons + package extra-hour pricing |
| 2 | Booking that respects availability | public date picker + `/api/availability`; admin availability page |
| 3 | Contract e-signature on the live site | public `/sign?t=` + `/api/sign`; admin contract template |
| 4 | Workflow automation lead→consultation→contract→shoot→delivery→upsell | admin automation engine + cron; public booking email |
| 5 | Photo captions near cursor + in lightbox, all admin-editable | public grid/lightbox; manifest photos imported into DB |
| 6 | Page animations throughout | public: cross-document View Transitions + reveals |
| 7 | Admin control over all of it | admin: Add-ons, Availability, Contract template, Automations, Site settings |

## Schema — migration `goga_0013_contract_completion.sql` (applied first; shared contract)

```
packages          + extra_hour_cents int not null default 0, + max_extra_hours int not null default 0
addons            + name_ru text, + description_ru text
bookings          + extra_hours numeric not null default 0
contracts         + body_ru text, + signed_locale text
deliveries        + notified_at timestamptz
project_images    + width int, + height int
contract_templates (id smallint pk =1, body_en, body_ka, body_ru text not null default '', updated_at)
automation_rules   (key text pk, enabled bool, delay_days int, subject_en/ka/ru, body_en/ka/ru text,
                    notify_studio bool, updated_at)
automation_log     (id uuid pk, rule_key text, entity_id uuid, recipient text, status text,
                    error text, created_at, unique(rule_key, entity_id))
site_settings      (id smallint pk =1, page_transitions bool, reveal_animations bool,
                    caption_mode text in ('cursor','bottom','off'), lightbox_captions bool,
                    calculator_enabled bool, updated_at)
portfolio_albums   + row slug 'couple'
```

Enums (existing): `booking_status` inquiry,reserved,confirmed,completed,cancelled,no_show ·
`contract_status` draft,sent,signed,void · `lead_stage` lead,consultation,contract,shoot,delivery,upsell,won,lost.

## Templates

Placeholders are `{{name}}`; unknown → empty string. Plain-text bodies; email HTML =
escaped paragraphs with autolinked URLs.

Contract template placeholders: `client_name client_email client_phone shoot_date shoot_time
location package duration_hours addons extra_hours total deposit balance currency today`.

Automation rules (seeded KA/EN/RU, all editable):

| key | trigger | recipient | extra placeholders |
|---|---|---|---|
| `booking_received` | public booking submitted | client | package, shoot_date, total, deposit |
| `contract_sent` | admin "Send contract" | client | sign_url |
| `contract_signed` | client signs | client (+ studio alert) | contract_url |
| `shoot_reminder` | cron, `delay_days` before shoot_date, booking reserved/confirmed | client | shoot_date, shoot_time, location |
| `delivery_ready` | admin "Notify client" on a delivery → lead stage `delivery` | client | gallery_url |
| `upsell` | cron, `delay_days` after delivery notified → lead stage `upsell` | client | store_url, site_url |

Every rule send writes `automation_log` (unique per rule+entity = idempotent). Common
placeholders: `client_name site_url studio_email studio_phone`.

## API contracts (public repo)

- `GET /api/book` → `{packages:[{id,name_*,desc_*,price,base_price_cents,currency,duration,deposit_pct,extra_hour_cents,max_extra_hours}], addons:[{id,slug,name_*,desc_*,price_cents}], calculator_enabled}`
- `POST /api/book` body adds `addonIds: string[]`, `extraHours: int`. Server recomputes:
  subtotal = base + extraHours×extra_hour_cents + Σaddons; deposit = round(subtotal×pct/100);
  total = subtotal. Rejects unavailable dates (409). Sends `booking_received`.
- `GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{closedWeekdays:number[], blackout:string[], booked:string[]}`
  (booked = bookings with status reserved/confirmed/completed on that date).
- `GET /api/sign?t=` → `{status, client_name, bodies:{en,ka,ru}, signed_at, signer_name}` (404 unknown/void).
- `POST /api/sign` `{t, name, signature: dataURL png ≤ 600KB, agree: true, locale}` → only when
  status `sent`: store PNG in private bucket `contracts/<id>/signature-<ts>.png`, contract →
  signed (+ip, UA, locale), `bookings.contract_status='signed'`, lead → `shoot` + `lead_events`,
  send `contract_signed` + studio alert. Already signed → 409.
- `GET /api/studio` adds `settings: {page_transitions, reveal_animations, caption_mode, lightbox_captions, calculator_enabled}`.
- `GET /api/projects?slug=` photo items add `caption_ka, caption_ru, alt, width, height`.
- `GET /api/portfolio` photo items add `alt, width, height`.

Admin builds the signing link as `${PUBLIC_SITE_URL}/sign?t=<token>` (env, default
`https://gogaphotography.vercel.app`); the client gallery stays on the admin origin.

## Photos

The ~226 category photos still served from `data/goga-galleries.json` (captions derived
from file names) are imported into DB projects `site-<category>` (hidden from `/projects`
by the existing `site-*` filter), linked to their album, with originals + `_thumb.webp`
uploaded to the `projects` bucket and KA/EN/RU captions + alt text. The site then renders
DB photos; the manifest is only a fallback when the API is unreachable.

Captions: desktop — a label that follows the cursor over a tile (`caption_mode=cursor`),
or a bottom overlay (`bottom`); touch — bottom overlay. Lightbox shows the current
photo's caption. Language switches swap captions in place.

## Motion

Cross-document View Transitions (`@view-transition {navigation: auto}`) with a fade/rise
for the page and a shared element for the logo; the old 850 ms `bf-leaving` fallback stays
for browsers without support. Reveal-on-scroll for headings, text blocks and images on
every page. All motion off under `prefers-reduced-motion` and switchable in Site settings.

## Out of scope

TBC card payments (bank won't activate until the site is live), pointing goga.photography
at Vercel (registrar login needed from GOGA), Meta bot connection (needs GOGA's FB admin).
