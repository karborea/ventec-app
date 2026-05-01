import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SoumissionPdf,
  type PdfClient,
  type PdfSoumission,
} from "./pdf-document";

const STORAGE_BUCKET = "soumission-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type GeneratedPdf = {
  path: string;
  signedUrl: string;
};

/** Renders the soumission PDF, uploads it to the bucket, persists the
 *  path on the soumission row, and returns a 30-day signed URL.
 *  Throws on any step failure — callers should catch and continue. */
export async function generateAndStorePdf(
  supabase: SupabaseClient,
  soumissionId: string,
  soumission: PdfSoumission,
  client: PdfClient,
): Promise<GeneratedPdf> {
  const buffer = await renderToBuffer(
    SoumissionPdf({ soumission, client }),
  );

  const path = `${soumissionId}/quote-${soumission.soumission_number}.pdf`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) {
    throw new Error(`PDF upload failed: ${upErr.message}`);
  }

  const { error: updErr } = await supabase
    .from("soumissions")
    .update({ pdf_path: path })
    .eq("id", soumissionId);
  if (updErr) {
    throw new Error(`PDF path persist failed: ${updErr.message}`);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed) {
    throw new Error(`Signed URL failed: ${signErr?.message ?? "unknown"}`);
  }

  return { path, signedUrl: signed.signedUrl };
}
