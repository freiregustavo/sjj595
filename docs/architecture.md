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

## Modelo de dominio masonic

- `tenant` representa a LOJA principal, por exemplo `ARLS Sao Joao de Jerusalem - 595`.
- Toda loja possui ao menos uma entidade vinculada obrigatoria, que representa a propria loja operacional, por exemplo `LOJA SJJ 595`.
- Uma loja pode possuir outras entidades vinculadas, como `Arco Real Capitulo 13`.
- As entidades ficam apartadas por `masonic_entities`, sempre com `tenant_id`.
- Membros pertencem ao cadastro geral da loja (`members`) e podem ser vinculados a uma ou mais entidades por `member_entity_memberships`.
- O financeiro possui caixas/contas por loja ou entidade em `financial_accounts`.
- Movimentos financeiros, contas a pagar e contas a receber podem ser associados a uma entidade e a uma conta financeira.

Exemplo:

```txt
LOJA / tenant: ARLS Sao Joao de Jerusalem - 595
  Entidade 1: LOJA SJJ 595
    Caixa: Caixa da LOJA SJJ 595
  Entidade 2: Arco Real Capitulo 13
    Caixa: Caixa do Capitulo Arco Real
  Caixa geral da loja: Caixa Geral
```

Essa estrutura permite membros da loja que participam de outras entidades, membros apenas de uma entidade vinculada e financeiro separado por entidade.
