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

## Observacao

O ambiente local atual precisa de Node.js/npm para instalar dependencias, gerar lockfile e validar build.
