-- Draft inicial de RLS. Ajustar apos confirmar claims e estrategia final de memberships.
-- Nao aplicar em producao sem revisar com o schema migrado.

alter table tenants enable row level security;
alter table branches enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table documents enable row level security;
alter table audit_logs enable row level security;

-- Exemplo de politica usando profiles como fonte do tenant do usuario.
-- create policy "tenant members can read members"
-- on members
-- for select
-- using (
--   tenant_id in (
--     select tenant_id
--     from profiles
--     where auth_user_id = auth.uid()
--   )
-- );
