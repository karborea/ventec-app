// Helper for uploading installation photos attached to a soumission.
// Lives outside any "use server" file so the export isn't exposed as
// a server action.

import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "soumission-files";
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/avif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

/** Best-effort upload of files attached as `installation_files` in the
 *  form data. Errors are logged but never raised — files are optional. */
export async function uploadInstallationFiles(
  supabase: SupabaseClient,
  soumissionId: string,
  formData: FormData,
): Promise<void> {
  const raw = formData.getAll("installation_files");
  const files: File[] = [];
  for (const f of raw) {
    if (typeof f !== "object" || f === null) continue;
    const file = f as File;
    if (typeof file.size !== "number" || file.size === 0) continue;
    if (!ALLOWED_MIME.has(file.type)) continue;
    if (file.size > MAX_FILE_SIZE) continue;
    files.push(file);
    if (files.length >= MAX_FILES) break;
  }
  if (files.length === 0) return;

  for (const file of files) {
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${soumissionId}/${ts}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) {
      console.error("uploadInstallationFiles", path, upErr.message);
      continue;
    }
    await supabase.from("soumission_files").insert({
      soumission_id: soumissionId,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });
  }
}
