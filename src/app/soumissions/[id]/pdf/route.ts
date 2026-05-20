import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStorePdf } from "@/lib/soumissions/generate-pdf";
import type {
  PdfClient,
  PdfOuverture,
  PdfSoumission,
} from "@/lib/soumissions/pdf-document";

const STORAGE_BUCKET = "soumission-files";
const SHORT_TTL_SECONDS = 60 * 5; // 5 minutes — just enough for the browser to fetch the redirect target

type SoumissionRow = {
  id: string;
  user_id: string;
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  model: string | null;
  manufacturier_origine: string | null;
  manufacturier_autre_nom: string | null;
  submitted_at: string | null;
  pdf_path: string | null;
};

type OuvertureRow = {
  order_index: number | null;
  longueur_po: number | null;
  longueur_totale_po: number | null;
  materiau_haut: string | null;
  materiau_bas: string | null;
  rideau_type: string | null;
  rideau_grandeur: string | null;
  polymat_unique_hauteur_po: number | null;
  polymat_haut_hauteur_po: number | null;
  polymat_bas_hauteur_po: number | null;
  souffleurs_count: number | null;
  souffleurs_count_haut: number | null;
  souffleurs_count_bas: number | null;
  souffleurs_aux_deux_extremites: boolean | null;
  souffleurs_instructions_speciales: string | null;
  systeme: string | null;
  rideau_a_remplacer: string | null;
  hauteur_support_simple_po: number | null;
  hauteur_support_haut_po: number | null;
  hauteur_support_bas_po: number | null;
  modele_polymat: string | null;
  nb_cellules_simple: number | null;
  nb_cellules_haut: number | null;
  nb_cellules_bas: number | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  billing_address: PdfClient["billing_address"];
};

function toPdfOuverture(r: OuvertureRow): PdfOuverture {
  return {
    order_index: r.order_index ?? 0,
    longueur_po: r.longueur_po,
    longueur_totale_po: r.longueur_totale_po,
    materiau_haut: r.materiau_haut,
    materiau_bas: r.materiau_bas,
    rideau_type: r.rideau_type,
    rideau_grandeur: r.rideau_grandeur,
    polymat_unique_hauteur_po: r.polymat_unique_hauteur_po,
    polymat_haut_hauteur_po: r.polymat_haut_hauteur_po,
    polymat_bas_hauteur_po: r.polymat_bas_hauteur_po,
    souffleurs_count: r.souffleurs_count,
    souffleurs_count_haut: r.souffleurs_count_haut,
    souffleurs_count_bas: r.souffleurs_count_bas,
    souffleurs_aux_deux_extremites: r.souffleurs_aux_deux_extremites,
    souffleurs_instructions_speciales: r.souffleurs_instructions_speciales,
    systeme: r.systeme,
    rideau_a_remplacer: r.rideau_a_remplacer,
    hauteur_support_simple_po: r.hauteur_support_simple_po,
    hauteur_support_haut_po: r.hauteur_support_haut_po,
    hauteur_support_bas_po: r.hauteur_support_bas_po,
    modele_polymat: r.modele_polymat,
    nb_cellules_simple: r.nb_cellules_simple,
    nb_cellules_haut: r.nb_cellules_haut,
    nb_cellules_bas: r.nb_cellules_bas,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: s } = await supabase
    .from("soumissions")
    .select(
      "id, user_id, soumission_number, project_name, type, model, manufacturier_origine, manufacturier_autre_nom, submitted_at, pdf_path",
    )
    .eq("id", id)
    .maybeSingle<SoumissionRow>();

  if (!s) {
    return NextResponse.redirect(new URL("/mes-soumissions", request.url));
  }

  // Reuse cached PDF if it exists.
  if (s.pdf_path) {
    const { data: signed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(s.pdf_path, SHORT_TTL_SECONDS);
    if (signed?.signedUrl) {
      return NextResponse.redirect(signed.signedUrl);
    }
  }

  // Generate fresh.
  const [oRes, pRes] = await Promise.all([
    supabase
      .from("ouvertures")
      .select(
        "order_index, longueur_po, longueur_totale_po, materiau_haut, materiau_bas, rideau_type, rideau_grandeur, polymat_unique_hauteur_po, polymat_haut_hauteur_po, polymat_bas_hauteur_po, souffleurs_count, souffleurs_count_haut, souffleurs_count_bas, souffleurs_aux_deux_extremites, souffleurs_instructions_speciales, systeme, rideau_a_remplacer, hauteur_support_simple_po, hauteur_support_haut_po, hauteur_support_bas_po, modele_polymat, nb_cellules_simple, nb_cellules_haut, nb_cellules_bas",
      )
      .eq("soumission_id", id)
      .order("order_index"),
    supabase
      .from("profiles")
      .select("first_name, last_name, company, phone, billing_address")
      .eq("id", s.user_id)
      .maybeSingle<ProfileRow>(),
  ]);

  // Owner email — use the session if it's their own quote, else service role.
  let ownerEmail = "";
  if (user.id === s.user_id) {
    ownerEmail = user.email ?? "";
  } else {
    try {
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.getUserById(s.user_id);
      ownerEmail = data.user?.email ?? "";
    } catch {
      /* ignore */
    }
  }

  const profile: ProfileRow = pRes.data ?? {
    first_name: null,
    last_name: null,
    company: null,
    phone: null,
    billing_address: null,
  };

  const pdfSoumission: PdfSoumission = {
    soumission_number: s.soumission_number,
    project_name: s.project_name,
    type: s.type,
    model: s.model,
    manufacturier_origine: s.manufacturier_origine,
    manufacturier_autre_nom: s.manufacturier_autre_nom,
    submitted_at: s.submitted_at,
    ouvertures: ((oRes.data ?? []) as OuvertureRow[]).map(toPdfOuverture),
  };

  const pdfClient: PdfClient = {
    email: ownerEmail,
    first_name: profile.first_name,
    last_name: profile.last_name,
    company: profile.company,
    phone: profile.phone,
    billing_address: profile.billing_address,
  };

  try {
    const { signedUrl } = await generateAndStorePdf(
      supabase,
      id,
      pdfSoumission,
      pdfClient,
    );
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    console.error("[pdf route] generation failed:", e);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 },
    );
  }
}
