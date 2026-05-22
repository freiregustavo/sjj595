# Deploy

## Railway

Variaveis obrigatorias:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

## Build

O comando de build gera o Prisma Client antes do build do Next.js:

```bash
npm run build
```

No modo standalone, o build tambem copia os assets estaticos para
`.next/standalone/.next/static`, que e o caminho esperado pelo servidor
standalone em producao.

## Start

O projeto usa build standalone do Next.js para Railway:

```bash
npm run start
```

Esse comando executa:

```bash
HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

## Pre-deploy

Quando o servico estiver configurado no Railway, use:

```bash
npx prisma migrate deploy
```

## Observacao

O ambiente local atual precisa de Node.js/npm para instalar dependencias, gerar lockfile e validar build.
