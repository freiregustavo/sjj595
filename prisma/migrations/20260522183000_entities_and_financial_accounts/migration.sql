-- CreateEnum
CREATE TYPE "MasonicEntityKind" AS ENUM ('LODGE', 'APPENDANT_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialAccountKind" AS ENUM ('GENERAL', 'ENTITY', 'BRANCH');

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "account_id" UUID,
ADD COLUMN     "entity_id" UUID;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "entity_id" UUID;

-- AlterTable
ALTER TABLE "payables" ADD COLUMN     "account_id" UUID,
ADD COLUMN     "entity_id" UUID;

-- AlterTable
ALTER TABLE "receivables" ADD COLUMN     "account_id" UUID,
ADD COLUMN     "entity_id" UUID;

-- CreateTable
CREATE TABLE "masonic_entities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "kind" "MasonicEntityKind" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masonic_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_entity_memberships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" DATE,
    "left_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_entity_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "entity_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "kind" "FinancialAccountKind" NOT NULL DEFAULT 'ENTITY',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "masonic_entities_tenant_id_kind_idx" ON "masonic_entities"("tenant_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "masonic_entities_tenant_id_code_key" ON "masonic_entities"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "member_entity_memberships_tenant_id_entity_id_status_idx" ON "member_entity_memberships"("tenant_id", "entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "member_entity_memberships_tenant_id_member_id_entity_id_key" ON "member_entity_memberships"("tenant_id", "member_id", "entity_id");

-- CreateIndex
CREATE INDEX "financial_accounts_tenant_id_entity_id_status_idx" ON "financial_accounts"("tenant_id", "entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_tenant_id_code_key" ON "financial_accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_entity_id_movement_date_idx" ON "cash_movements"("tenant_id", "entity_id", "movement_date");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_account_id_movement_date_idx" ON "cash_movements"("tenant_id", "account_id", "movement_date");

-- CreateIndex
CREATE INDEX "documents_tenant_id_entity_id_idx" ON "documents"("tenant_id", "entity_id");

-- CreateIndex
CREATE INDEX "payables_tenant_id_entity_id_status_idx" ON "payables"("tenant_id", "entity_id", "status");

-- CreateIndex
CREATE INDEX "payables_tenant_id_account_id_status_idx" ON "payables"("tenant_id", "account_id", "status");

-- CreateIndex
CREATE INDEX "receivables_tenant_id_entity_id_status_idx" ON "receivables"("tenant_id", "entity_id", "status");

-- CreateIndex
CREATE INDEX "receivables_tenant_id_account_id_status_idx" ON "receivables"("tenant_id", "account_id", "status");

-- AddForeignKey
ALTER TABLE "masonic_entities" ADD CONSTRAINT "masonic_entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_entity_memberships" ADD CONSTRAINT "member_entity_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_entity_memberships" ADD CONSTRAINT "member_entity_memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_entity_memberships" ADD CONSTRAINT "member_entity_memberships_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "masonic_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

