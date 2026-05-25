import { Download, FileText, FolderPlus, Upload } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { createDocumentCategory, uploadDocument } from "./actions";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
}

export default async function DocumentsPage() {
  const context = await requirePermission("documents.read");
  const canUpload =
    context.isSuperAdmin || context.permissions.includes("documents.upload");
  const [documents, categories, branches, entities, members] = await Promise.all([
    prisma.document.findMany({
      where: { tenantId: context.tenantId },
      include: {
        branch: true,
        category: true,
        entity: true,
        member: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.documentCategory.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.branch.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.masonicEntity.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: [{ isRequired: "desc" }, { name: "asc" }]
    }),
    prisma.member.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      take: 200
    })
  ]);

  return (
    <AppShell title="Documentos">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <section
          id="arquivos"
          className="rounded-md border border-border bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Arquivos privados
              </h2>
              <p className="mt-1 text-sm text-muted">
                Documentos do tenant com acesso por link assinado.
              </p>
            </div>
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Vinculo</th>
                  <th className="px-3 py-2">Tamanho</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">
                        {document.title}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs text-muted">
                        {document.fileName}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {document.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {document.member?.fullName ??
                        document.entity?.name ??
                        document.branch?.name ??
                        "-"}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {formatFileSize(document.sizeBytes)}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {formatDate(document.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/documentos/${document.id}/download`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-background"
                        title="Baixar documento"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Baixar documento</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted" colSpan={6}>
                      Nenhum documento enviado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-md border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Novo upload
              </h2>
              <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            {canUpload ? (
              <form
                action={uploadDocument}
                className="mt-4 grid gap-3"
                encType="multipart/form-data"
              >
                <input
                  name="title"
                  required
                  placeholder="Titulo do documento"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
                <textarea
                  name="description"
                  placeholder="Descricao"
                  className="min-h-20 rounded-md border border-border px-3 py-2 text-sm"
                />
                <input
                  name="file"
                  required
                  type="file"
                  className="rounded-md border border-border px-3 py-2 text-sm"
                />
                <select
                  name="categoryId"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  name="entityId"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                >
                  <option value="">Sem entidade</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
                <select
                  name="memberId"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                >
                  <option value="">Sem membro</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
                <select
                  name="branchId"
                  defaultValue={context.branchId ?? ""}
                  className="h-10 rounded-md border border-border px-3 text-sm"
                >
                  <option value="">Sem filial</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">
                  Enviar documento
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Seu perfil permite visualizar documentos, mas nao enviar novos.
              </p>
            )}
          </section>

          <section
            id="categorias"
            className="rounded-md border border-border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Categorias
              </h2>
              <FolderPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            {canUpload ? (
              <form action={createDocumentCategory} className="mt-4 grid gap-3">
                <input
                  name="name"
                  required
                  placeholder="Nome da categoria"
                  className="h-10 rounded-md border border-border px-3 text-sm"
                />
                <textarea
                  name="description"
                  placeholder="Descricao"
                  className="min-h-20 rounded-md border border-border px-3 py-2 text-sm"
                />
                <button className="h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-background">
                  Criar categoria
                </button>
              </form>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.id}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted"
                >
                  {category.name}
                </span>
              ))}
              {categories.length === 0 ? (
                <span className="text-sm text-muted">
                  Nenhuma categoria cadastrada.
                </span>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
