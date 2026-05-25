import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { DOCUMENTS_BUCKET } from "@/lib/documents/storage";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authContext = await requirePermission("documents.read");
  const { documentId } = await context.params;
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId: authContext.tenantId
    },
    select: {
      filePath: true
    }
  });

  if (!document) {
    return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.filePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Nao foi possivel gerar o link seguro." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
