-- 0007_admin_role_fkey.sql
-- Capture the administration.role_id -> role(id) FK that was added directly to
-- the live database during multi-tenancy rollout. Idempotent so applying it
-- against an already-migrated DB is a no-op.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'administration_role_id_fkey'
  ) then
    alter table administration
      add constraint administration_role_id_fkey
      foreign key (role_id) references role(id);
  end if;
end $$;

notify pgrst, 'reload schema';
