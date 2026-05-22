# Arquitetura SJJ595

## Decisao principal

O projeto usa Next.js full-stack como escolha definitiva para a primeira versao.

Motivos:

- Menos complexidade operacional no inicio.
- Frontend e backend seguro no mesmo deploy Railway.
- Boa integracao com Supabase Auth via middleware e server-side clients.
- Route Handlers e Server Actions cobrem as operacoes sensiveis sem expor chaves privadas.
- Permite evoluir para NestJS depois, caso a API precise virar um servico separado.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Prisma ORM
- Railway

## Modulos

- Dashboard
- Membros
- Financeiro
- Estoque
- Documentos
- Relatorios
- Configuracoes
- Usuarios e permissoes

## Regra de ouro

O frontend nunca define o tenant efetivo de uma operacao. O servidor resolve tenant, filial e permissoes a partir do usuario autenticado.
