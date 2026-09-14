-- Defence in depth for the server-controlled authority table. No client policy is
-- intentionally defined; SECURITY DEFINER service functions remain its sole API.
alter table private.marketplace_admins enable row level security;
alter table private.marketplace_admins force row level security;
