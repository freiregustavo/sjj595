"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import {
  buildDocumentPath,
  DOCUMENTS_BUCKET,
  MAX_DOCUMENT_SIZE_BYTES
} from "@/lib/documents/storage";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));

const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  description: z.string().optional()
});

const uploadSchema = z.object({
  title: z.string().min(2, "Informe o titulo."),
  description: z.string().optional(),
  branchId: optionalUuid,
  entityId: optionalUuid,
  memberId: optionalUuid,
  categoryId: optionalUuid
});

async function assertRecordBelongsToTenant(
  model: "branch" | "masonicEntity" | "member" | "documentCategory",
  id: string,
  tenantId: string
) {
  const where = { id, tenantId, status: "ACTIVE" as const };
  const select = { id: true };
  let record: { id: string } | null = null;

  switch (model) {
    case "branch":
      record = await prisma.branch.findFirst({ where, select });
      break;
    case "masonicEntity":
      record = await prisma.masonicEntity.findFirst({ where, select });
      break;
    case "member":
      record = await prisma.member.findFirst({ where, select });
      break;
    case "documentCategory":
      record = await prisma.documentCategory.findFirst({ where, select });
      break;
  }

  if (!record) {
    throw new Error("Registro invalido para este tenant.");
  }
}

async function ensureDocumentsBucket() {
  const supabase = createSupabaseAdminClient();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Falha ao consultar buckets: ${listError.message}`);
  }

  if (!buckets.some((bucket) => bucket.name === DOCUMENTS_BUCKET)) {
    const { error } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
      public: false
    });

    if (error) {
      throw new Error(`Falha ao criar bucket de documentos: ${error.message}`);
    }
  }

  return supabase;
}

export async function createDocumentCategory(formData: FormData) {
  const context = await requirePermission("documents.upload");
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined
  });
  const existingCategory = await prisma.documentCategory.findFirst({
    where: {
      tenantId: context.tenantId,
      name: {
        equals: parsed.name.trim(),
        mode: "insensitive"
      },
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (existingCategory) {
    revalidatePath("/documentos");
    return;
  }

  const category = await prisma.documentCategory.create({
    data: {
      tenantId: context.tenantId,
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "document_category.create",
    entityType: "DocumentCategory",
    entityId: category.id,
    payload: { name: category.name }
  });

  revalidatePath("/documentos");
}

export async function uploadDocument(formData: FormData) {
  const context = await requirePermission("documents.upload");
  const parsed = uploadSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    branchId: formData.get("branchId") || undefined,
    entityId: formData.get("entityId") || undefined,
    memberId: formData.get("memberId") || undefined,
    categoryId: formData.get("categoryId") || undefined
  });
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo para upload.");
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Arquivo acima do limite de 20 MB.");
  }

  if (parsed.branchId) {
    await assertRecordBelongsToTenant("branch", parsed.branchId, context.tenantId);
  }

  if (parsed.entityId) {
    await assertRecordBelongsToTenant(
      "masonicEntity",
      parsed.entityId,
      context.tenantId
    );
  }

  if (parsed.memberId) {
    await assertRecordBelongsToTenant("member", parsed.memberId, context.tenantId);
  }

  if (parsed.categoryId) {
    await assertRecordBelongsToTenant(
      "documentCategory",
      parsed.categoryId,
      context.tenantId
    );
  }

  const supabase = await ensureDocumentsBucket();
  const filePath = buildDocumentPath({
    tenantId: context.tenantId,
    fileName: file.name
  });
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

  if (error) {
    throw new Error(`Falha no upload do documento: ${error.message}`);
  }

  const document = await prisma.document.create({
    data: {
      tenantId: context.tenantId,
      branchId: parsed.branchId || context.branchId,
      entityId: parsed.entityId || null,
      memberId: parsed.memberId || null,
      categoryId: parsed.categoryId || null,
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      filePath,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedBy: context.profileId
    }
  });

  await auditLog({
    tenantId: context.tenantId,
    userId: context.profileId,
    action: "document.upload",
    entityType: "Document",
    entityId: document.id,
    payload: {
      title: document.title,
      fileName: document.fileName,
      sizeBytes: document.sizeBytes
    }
  });

  revalidatePath("/documentos");
  revalidatePath("/dashboard");
}
