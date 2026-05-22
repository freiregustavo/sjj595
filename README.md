# SJJ595

SaaS multi-tenant para gestao administrativa, financeira, documental e de estoque de entidades e lojas.

## Escolha arquitetural

A primeira versao usa Next.js full-stack como decisao definitiva:

- Frontend moderno com App Router.
- Backend seguro via Route Handlers e Server Actions.
- Supabase Auth para autenticacao.
- Supabase PostgreSQL com Prisma.
- Supabase Storage para documentos privados.
- Deploy no Railway.

NestJS fica reservado para uma evolucao futura, caso a API precise ser separada do frontend ou consumida por varios clientes externos.

## Comecando

Instale as dependencias quando Node.js/npm estiverem disponiveis:

```bash
npm install
npm run prisma:generate
npm run db:seed
npm run dev
```

Copie `.env.example` para `.env` e preencha as variaveis do Supabase e PostgreSQL.

## Primeiro acesso

Depois de configurar `SUPABASE_SERVICE_ROLE_KEY` e os dados reais da entidade no
`.env`, crie o primeiro Super Admin com:

```bash
npm run bootstrap:super-admin
```

Esse comando cria ou reutiliza:

- usuario no Supabase Auth
- organizacao
- tenant
- filial matriz
- profile
- papel `SUPER_ADMIN`
- log de auditoria

## Documentacao

- `docs/architecture.md`
- `docs/security.md`
- `docs/database.md`
- `docs/deployment.md`

## Regra de seguranca

Nenhuma operacao sensivel deve confiar em `tenant_id` enviado pelo frontend. O servidor deve resolver tenant, filial e permissoes a partir do usuario autenticado.
