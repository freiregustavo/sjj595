# Banco de Dados

O schema inicial esta em `prisma/schema.prisma`.

## Tabelas fundacionais

- `organizations`
- `tenants`
- `branches`
- `profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

## Tabelas operacionais

- `masonic_entities`
- `members`
- `member_entity_memberships`
- `member_history`
- `financial_categories`
- `financial_accounts`
- `receivables`
- `payables`
- `cash_movements`
- `inventory_items`
- `inventory_movements`
- `inventory_balances`
- `document_categories`
- `documents`
- `email_templates`
- `email_logs`
- `audit_logs`

## Padrao

Campos Prisma usam camelCase. Colunas no banco usam snake_case via `@map`.
