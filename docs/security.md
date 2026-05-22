# Seguranca

## Multi-tenant

- Tabelas operacionais devem possuir `tenant_id`.
- Queries devem ser escopadas pelo tenant resolvido no servidor.
- `tenant_id` recebido do client nao deve ser confiado.
- Super Admin deve ser tratado explicitamente e auditado.

## Supabase

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ir ao client.
- `SUPABASE_SERVICE_ROLE_KEY` nunca pode ir ao client.
- Buckets de documentos devem ser privados.
- Downloads devem usar URLs assinadas temporarias.

## Banco

- PostgreSQL deve usar SSL em producao.
- RLS deve reforcar isolamento de dados.
- Prisma nao substitui RLS; as duas camadas devem trabalhar juntas.

## Auditoria

Toda acao critica deve registrar:

- `tenant_id`
- `user_id`
- `action`
- entidade afetada
- payload relevante
- data/hora
