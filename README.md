# travelplace-bf

Multi-tenant tourism CRM. Forked from Business Forge (deployed-snapshot-2026-05-19), stripped to tourism modules, wired to a modern data model + agentic AI assistant.

**Production:** https://travelplace-bf.vercel.app

## Architecture

Next.js 15 App Router · TypeScript · Tailwind · Supabase (Postgres + Storage + Auth) · NextAuth v5 · Vertex AI (Gemini 2.5 Flash) for the chatbot.

### Layers

- **app/(landing)/** — Marketing + signin pages (BF inherited, lightly customized)
- **app/app/** — Operator dashboard. Wrapped in `<AppShell>` (sidebar + topbar + chat pane)
- **app/api/** — REST API routes, all auth-gated and org-scoped via `createOrgScopedSupabaseClient()`
- **app/api/\_lib/** — Generic CRUD factory (`crud-route.ts`, `sub-entity-route.ts`, `company-vertical.ts`)
- **app/lib/** — Shared client/server utilities (auth, i18n, supabase helpers, LLM dispatch)
- **supabase/migrations/** — Schema as code (0001 hotel · 0002 verticals · 0003 orders · 0004 RBAC+audit · 0005 balance view · 0006 multi-tenancy · 0007 admin FK)

### Multi-tenancy

Every data row carries `organization_id` (FK to `organization`). RLS policies + app-layer filter both enforce isolation (defense in depth). New users auto-join an org by email domain — `travelplace.ge` → "Travelplace", `allonelabs.com` → "AllOne Labs", anything else creates a new org with the signing user as admin.

The 397 legacy hotels + 1554 orders + 3226 tourists migrated from the original travelplace.ge CRM live in the `travelplace-ge` org and are invisible to other orgs.

### Auth + RBAC

NextAuth v5 with Google + dev-credential providers. JWT carries `role`, `permissions[]`, `organization_id`, `organization_name`. 5 seeded roles: `admin` (40 perms), `manager` (33), `operator` (22), `accountant` (15), `read-only` (14). Every write API call checks `userHasPermission(<code>)` before proceeding. UI buttons hide via `useHasPermission()`.

### Audit log

Generic plpgsql trigger on 46 data tables captures every insert/update/delete with `{ actor_email, action, table_name, row_id, before, after, diff }`. Viewer at `/app/audit` (gated by `audit.read`).

### Chatbot

`/api/chat` is auth-gated, org-scoped, bilingual EN/KA (auto-detected from user's message). Uses Vertex Gemini 2.5 Flash via `app/lib/llm-fallback.ts`. 15 read/write tools (list_hotels, create_hotel, add_order_line, etc.) plus 4 document-ingestion tools (upload, ingest_document, bulk_insert_hotels/contacts/orders). Permission-gated per tool. Drop a PDF / Excel / photo into the chat composer and it'll parse + insert.

### Modules

| Module                                           | Status                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Hotels                                           | Full CRUD + 5 sub-entity tabs + Excel import (legacy 25-col template) + cascading dropdowns |
| Avia · Transfer · Consul · Insurance · Excursion | Full CRUD + 3 sub-entity tabs each (contacts/banks/balance)                                 |
| Guide                                            | Person-shaped CRUD                                                                          |
| Transport                                        | Vehicle-shaped CRUD with mark→model cascading                                               |
| Orders · Refunds                                 | Cross-vertical workflow with line items + tourists tabs                                     |
| Catalogs                                         | 17 admin pages (countries/regions/cities/juridical-form + 12 vertical groups)               |
| Reports                                          | Hotel directory + price (with print views)                                                  |
| Audit log                                        | Filterable viewer                                                                           |

## Setup

```bash
pnpm install
cp .env.local.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
#   NEXTAUTH_SECRET, NEXTAUTH_URL
#   AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (optional)
#   GCP_PROJECT_ID, GCP_LOCATION, GCP_SA_JSON_B64 (chatbot)
#   ALLOW_DEV_AUTH=1 (enables credential signin in non-dev environments — convenient for invite-only beta)

pnpm dev      # port 3003
pnpm typecheck
pnpm test
```

### First-time DB setup

```bash
# Apply migrations in order (or use the Supabase CLI)
for f in supabase/migrations/000*.sql; do
  psql "$SUPABASE_DB_URL" -f "$f"
done

# Seed permissions + roles (idempotent)
# Already included in 0004; rerun if you want to re-seed.

# Optional: migrate legacy data from mariadb (requires docker-db-1 running)
MARIA_URL='mysql://root:rootpw@127.0.0.1:3306/travelpl_tm' \
SUPABASE_DB_URL="..." \
npx tsx scripts/migrate-from-mariadb.ts
```

## Deployment

GitHub auto-deploy on push to `main`. Commit author MUST be `team@allonelabs.com` (Vercel seat-attribution requires the registered owner email).

```bash
git -c user.name="allone" -c user.email="team@allonelabs.com" commit -m "..."
git push origin main
```

## Conventions

- All API routes return `{ ok: true, data }` or `{ ok: false, error: { code, message } }` with HTTP 200/4xx/5xx
- Server components do data fetching directly via `createOrgScopedSupabaseClient`; never call own routes via fetch from server
- Client components use `useLocale()` for translations; `useHasPermission()` for button gating
- All writes go through factories that handle: auth check → permission gate → audit attribution → org scope → write → response
- Mobile-first: every page tested at 390px before commit
