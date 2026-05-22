-- Per-organization memory — the chatbot's long-term context for each org.
-- Mirrors the founder-brain `~/.claude-account1/projects/-Users-macintoshi/memory/`
-- pattern (slug + frontmatter + description + 4 types), but stored in Postgres
-- so it's multi-tenant and survives ephemeral Lambda filesystems.

create table org_memory (
  id bigserial primary key,
  organization_id bigint not null references organization(id) on delete cascade,
  slug text not null,
  type text not null check (type in ('preference', 'fact', 'playbook', 'reference')),
  description text not null,
  body text not null,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, slug)
);

create index org_memory_org_idx on org_memory (organization_id, type, updated_at desc);
create index org_memory_search_idx
  on org_memory using gin (to_tsvector('simple', description || ' ' || body));

alter table org_memory enable row level security;

create policy org_memory_org_isolation on org_memory
  for all
  using (organization_id = current_setting('app.current_org_id', true)::bigint)
  with check (organization_id = current_setting('app.current_org_id', true)::bigint);

create trigger org_memory_set_updated_at
  before update on org_memory
  for each row execute function set_updated_at();

-- Attach the audit trigger (it's user-facing data)
create trigger org_memory_audit
  after insert or update or delete on org_memory
  for each row execute function audit_trigger();

notify pgrst, 'reload schema';
