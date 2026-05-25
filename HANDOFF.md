# SJJ595 Handoff

## Estado atual

O projeto e um SaaS multi-tenant em Next.js full-stack com Supabase Auth,
Supabase PostgreSQL, Prisma e deploy Railway.

O ambiente alvo nao e local: a aplicacao roda no Railway e usa Supabase para
Auth, PostgreSQL e futuramente Storage privado. O desenvolvimento local deve
respeitar esse desenho e evitar decisoes que dependam de banco SQLite, auth
mockado ou armazenamento local de arquivos.

A regra central continua sendo: nenhuma operacao sensivel confia em `tenant_id`
do frontend. O servidor resolve usuario, tenant, filial e permissoes pela sessao
autenticada.

## Ambiente Railway + Supabase

- Supabase project ref documentado: `btcenuztvkaldvpvtiju`.
- Commit funcional `343930f` (`Build tenant operations MVP`) foi enviado para
  `origin/main`; o topo atual do remoto e `6536ce3`, com este registro
  operacional de validacao.
- Supabase e fonte de verdade para:
  - autenticacao de usuarios;
  - PostgreSQL acessado pelo Prisma;
  - service role usada apenas no servidor/bootstrap;
  - Storage privado quando o modulo de documentos for implementado.
- Railway e o runtime/deploy da aplicacao Next.js standalone.
- Variaveis obrigatorias no Railway:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_URL`
- O `.env` local contem tambem variaveis de e-mail e bootstrap, mas os valores
  reais nao devem ser versionados nem copiados para docs.
- Em ambiente sem rota IPv6, usar o pooler IPv4 do Supabase para `DATABASE_URL`
  e a conexao direta com SSL para `DIRECT_URL`, conforme `docs/login-supabase.md`.
- O build do Railway deve usar `npm run build`.
- O start do Railway deve usar `npm run start`, que executa o standalone em
  `HOSTNAME=0.0.0.0`.
- Antes de subir codigo que altere schema, aplicar migrations no Supabase com
  `npx prisma migrate deploy` no ambiente com as variaveis corretas.
- Depois de seeds ou migrations relevantes, validar no Supabase/Railway:
  - login real via Supabase Auth;
  - profile do usuario;
  - tenant e filial resolvidos pela sessao;
  - roles/permissoes;
  - escrita em tabelas com `tenant_id`;
  - auditoria em `audit_logs`.

## Validacao Supabase em 2026-05-25

- Conexao via `psql` usando `DIRECT_URL` local funcionou.
- Migrations aplicadas no Supabase:
  - `20260522172000_init`
  - `20260522183000_entities_and_financial_accounts`
- Tenant ativo inicial estava com nome provisório e foi substituido por SJJ.
- Categorias financeiras padrao foram inseridas diretamente no Supabase de forma
  idempotente para o tenant ativo:
  - receitas: `Mensalidades`, `Doacoes`, `Eventos`
  - despesas: `Administrativo`, `Manutencao`, `Fornecedores`
- Resultado apos a ultima validacao:
  - `INCOME`: 4 categorias
  - `EXPENSE`: 3 categorias
- Nao houve nova migration de schema neste commit; as mudancas foram de codigo,
  UI, actions e bootstrap.
- Em seguida, o tenant existente foi migrado preservando IDs e dados.
- Ultimo estado validado do tenant principal:
  - organizacao: `SJJ595`
  - tenant: `SJJ595`
  - slug: `sjj595`
  - filial: `Matriz`
  - entidade obrigatoria: `LOJA ARLS Sao Joao de Jerusalem 595`
  - entidade vinculada: `Capitulo Sagrado Arco Real N.13`
  - caixa da entidade: `Caixa da LOJA ARLS Sao Joao de Jerusalem 595`
- O `.env` local e o `.env.example` foram alinhados para bootstrap SJJ.

## Validacao Railway em 2026-05-25

- Os commits `343930f` e `6536ce3` foram publicados no GitHub.
- Neste shell nao ha `railway`, `node`, `npm`, `npx` ou `supabase`, entao nao
  foi possivel rodar build local, `prisma migrate deploy` via Prisma CLI, nem
  consultar deploy Railway via CLI.
- O `.env` local aponta `APP_URL` para `http://localhost:3000`; portanto ele nao
  permite validar a URL publica do Railway daqui.
- Proximo operador deve conferir no painel Railway:
  - se o deploy do commit `6536ce3` iniciou/concluiu;
  - se as variaveis obrigatorias estao configuradas;
  - logs de build/runtime;
  - login real e navegacao autenticada.

## Fundacao pronta

- Prisma schema com tenants, filiais, profiles, roles, permissions, membros,
  entidades vinculadas, financeiro, estoque, documentos, e auditoria.
- Seeds de roles/permissoes em `prisma/seed.ts`.
- Bootstrap de Super Admin em `scripts/bootstrap-super-admin.ts`.
- Bootstrap tambem cria categorias financeiras padrao para o primeiro uso.
- Supabase Auth integrado com middleware, login, logout e callback.
- App shell autenticado com tenant/filial do usuario.
- Autorizacao server-side em `lib/auth/permissions.ts`.
- Pagina de acesso negado em `app/(app)/acesso-negado/page.tsx`.

## Mudancas em andamento

- Dashboard conectado a dados reais do tenant: membros ativos, recebiveis,
  vencidos, saldo de caixa, documentos recentes e membros recentes.
- Membros conectado a dados reais, com cadastro, vinculo em entidades,
  historico e auditoria.
- Configuracoes conectado a dados reais, com criacao de entidades vinculadas e
  caixas financeiros.
- Financeiro inicial implementado com:
  - indicadores de saldo, a receber, a pagar e movimentos recentes;
  - cadastro de categorias financeiras de receita/despesa;
  - cadastro de contas a receber;
  - cadastro de contas a pagar;
  - cadastro de movimentos manuais de caixa;
  - baixa de recebiveis com data real, caixa obrigatorio e movimento `INCOME`;
  - baixa de pagaveis com data real, caixa obrigatorio e movimento `EXPENSE`;
  - listagem de recebiveis, pagaveis e fluxo de caixa;
  - validacao de tenant para filial, entidade, caixa, membro e categoria;
  - consistencia entre caixa, entidade e filial nos lancamentos;
  - auditoria e revalidacao das telas afetadas.
- Modulos Estoque, Documentos e Relatorios ainda sao placeholders, mas ja exigem
  permissao de leitura.
- Usuarios e Permissoes ja lista profiles/papeis do tenant e cria novos usuarios
  via Supabase Admin, vinculando profile, filial e role no tenant atual.
- Menu lateral filtra itens conforme permissoes do usuario.
- Menu lateral foi reorganizado em submenus por modulo. Financeiro agora mostra
  entradas como `Contas a Receber`, `Contas a Pagar` e `Relatorios`.
- Super Admin agora tem seletor de tenant no topo da aplicacao e pode trocar o
  tenant ativo via cookie seguro `active_tenant_id`.
- Configuracoes permite ao Super Admin criar novos tenants, cada um com filial
  matriz, entidade principal, caixas iniciais e categorias financeiras padrao.

## Pendencias tecnicas

- Rodar `npm run lint`, `npx prisma validate` e `npm run build` em ambiente com
  Node.js/npm disponiveis. No bash atual, `node`, `npm` e `npx` nao estao no
  PATH.
- Rodar `npx prisma migrate deploy` contra o Supabase antes de validar no
  Railway se houver migrations ainda nao aplicadas.
- Conferir no Railway se todas as variaveis acima estao configuradas com os
  mesmos nomes esperados pelo codigo.
- Melhorar UX das Server Actions para retornar mensagens amigaveis no formulario
  em vez de depender de erro de servidor.
- Categoria financeira duplicada agora e tratada como operacao idempotente para
  nao derrubar a rota com erro server-side.
- Melhorar UX das baixas para exibir mensagens de erro inline quando caixa/data
  estiverem faltando.
- Evoluir categorias financeiras para edicao/inativacao e possivel importacao
  inicial por template.
- Evoluir Usuarios e Permissoes com edicao de roles, inativacao de usuarios,
  reset de senha e envio de convite/e-mail transacional.
- Revisar e aplicar RLS real no Supabase; o arquivo atual em
  `supabase/rls/001_initial_policies.sql` ainda e rascunho.
- Implementar CRUDs reais de Estoque e Documentos, e montar os Relatorios.

## Proximo melhor passo

Validar o build em ambiente com Node.js e confirmar deploy no Railway apontando
para o Supabase. Depois disso, os proximos blocos naturais sao:

- Usuarios e Permissoes: editar roles, inativar usuarios, resetar senha e trocar
  convite manual por e-mail transacional.
- Financeiro: conciliacao basica, filtros por entidade/caixa e relatorio mensal.
- Documentos: bucket privado no Supabase Storage, upload e URL assinada.
