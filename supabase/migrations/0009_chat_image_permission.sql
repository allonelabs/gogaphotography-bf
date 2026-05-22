-- Seed the `chat.image` permission granted to admin + manager.
-- Idempotent — safe to run repeatedly.

insert into permission (code, description)
values ('chat.image', 'Generate images via chat (Vertex Imagen)')
on conflict (code) do nothing;

insert into role_permission (role_id, permission_id)
select r.id, p.id
from role r
cross join permission p
where r.name in ('admin', 'manager')
  and p.code = 'chat.image'
on conflict do nothing;

notify pgrst, 'reload schema';
