export const DOCUMENTS_BUCKET = "tenant-documents";
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export function sanitizeFileName(fileName: string) {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return `${baseName
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "documento"}${extension.toLowerCase()}`;
}

export function buildDocumentPath(input: {
  tenantId: string;
  fileName: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeName = sanitizeFileName(input.fileName);

  return `${input.tenantId}/${year}/${month}/${now.getTime()}-${safeName}`;
}
