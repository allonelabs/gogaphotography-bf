-- Security: close a privilege-escalation path.
--
-- Supabase Auth signup was open, a trigger creates a `profiles` row for every
-- new user, and `profiles_self_update` let that user rewrite their own row -
-- including `role`. The retired gogaphotography-next admin authorises by
-- profiles.role = 'admin' with the service role behind it, so a stranger could
-- sign up, set role = 'admin' and reach leads, bookings and contracts there.
--
-- Nobody signs in with Supabase Auth (0 users; the live admin uses its own
-- password login), so users lose the ability to edit their profile at all and
-- the role column is off-limits to them. Signup is also disabled in the project
-- auth config (Management API, disable_signup = true).

drop policy if exists profiles_self_update on public.profiles;
revoke update on public.profiles from authenticated, anon;
revoke insert, delete on public.profiles from authenticated, anon;
