import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { generateAndStorePdf } from "./generate-pdf";
import type {
  PdfClient,
  PdfOuverture,
  PdfSoumission,
} from "./pdf-document";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

type SoumissionRow = {
  id: string;
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  model: string | null;
  manufacturier_origine: string | null;
  submitted_at: string | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  billing_address: PdfClient["billing_address"];
};

function toPdfOuverture(row: OuvertureRow): PdfOuverture {
  return {
    order_index: row.order_index ?? 0,
    longueur_po: row.longueur_po,
    longueur_totale_po: row.longueur_totale_po,
    materiau_haut: row.materiau_haut,
    materiau_bas: row.materiau_bas,
    rideau_type: row.rideau_type,
    rideau_grandeur: row.rideau_grandeur,
    polymat_unique_hauteur_po: row.polymat_unique_hauteur_po,
    polymat_haut_hauteur_po: row.polymat_haut_hauteur_po,
    polymat_bas_hauteur_po: row.polymat_bas_hauteur_po,
    souffleurs_count: row.souffleurs_count,
    souffleurs_count_haut: row.souffleurs_count_haut,
    souffleurs_count_bas: row.souffleurs_count_bas,
    souffleurs_aux_deux_extremites: row.souffleurs_aux_deux_extremites,
    systeme: row.systeme,
    rideau_a_remplacer: row.rideau_a_remplacer,
    hauteur_support_simple_po: row.hauteur_support_simple_po,
    hauteur_support_haut_po: row.hauteur_support_haut_po,
    hauteur_support_bas_po: row.hauteur_support_bas_po,
    modele_polymat: row.modele_polymat,
    nb_cellules_simple: row.nb_cellules_simple,
    nb_cellules_haut: row.nb_cellules_haut,
    nb_cellules_bas: row.nb_cellules_bas,
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clientEmailHtml(args: {
  fullName: string;
  projectName: string;
  number: number;
  pdfUrl: string;
}): string {
  const { fullName, projectName, number, pdfUrl } = args;
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f2e;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#F37021;margin:0 0 12px;">Votre soumission a été reçue</h2>
  <p>Bonjour ${escape(fullName)},</p>
  <p>Nous avons bien reçu votre soumission <strong>${escape(projectName)}</strong> (#${number}). Vous trouverez ci-dessous le récapitulatif PDF de votre demande.</p>
  <p style="margin:24px 0;">
    <a href="${escape(pdfUrl)}" style="display:inline-block;background:#F37021;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
      Télécharger le PDF
    </a>
  </p>
  <p style="color:#5a6278;font-size:13px;">Le lien est valide pendant 30 jours.</p>
  <p style="color:#5a6278;font-size:13px;">Notre équipe va analyser votre demande et reviendra vers vous avec une cotation. Merci de votre confiance.</p>
  <p style="color:#5a6278;font-size:12px;margin-top:24px;border-top:1px solid #e3e6ec;padding-top:12px;">— Ventec</p>
</body></html>`;
}

function adminEmailHtml(args: {
  projectName: string;
  number: number;
  type: SoumissionRow["type"];
  clientLabel: string;
  clientEmail: string;
  appUrl: string;
}): string {
  const { projectName, number, type, clientLabel, clientEmail, appUrl } = args;
  const typeLabel =
    type === "nouvelle_commande" ? "Nouvelle commande" : "Remplacement";
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f2e;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#F37021;margin:0 0 12px;">Nouvelle soumission reçue</h2>
  <p><strong>${escape(projectName)}</strong> (#${number}) — ${escape(typeLabel)}</p>
  <p>Client : <strong>${escape(clientLabel)}</strong> (${escape(clientEmail)})</p>
  <p style="margin:24px 0;">
    <a href="${escape(appUrl)}" style="display:inline-block;background:#F37021;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
      Voir dans l'admin
    </a>
  </p>
  <p style="color:#5a6278;font-size:12px;margin-top:24px;border-top:1px solid #e3e6ec;padding-top:12px;">— Notification automatique</p>
</body></html>`;
}

/** Post-submission orchestrator: generates the PDF, emails the client
 *  with the signed URL, and notifies all admins. Best-effort — failures
 *  are logged but never raised so they don't block the action. */
export async function onSoumissionSubmitted(
  supabase: SupabaseClient,
  soumissionId: string,
  clientUserId: string,
  clientEmail: string,
): Promise<void> {
  try {
    const [sRes, oRes, pRes] = await Promise.all([
      supabase
        .from("soumissions")
        .select(
          "id, soumission_number, project_name, type, model, manufacturier_origine, submitted_at",
        )
        .eq("id", soumissionId)
        .maybeSingle<SoumissionRow>(),
      supabase
        .from("ouvertures")
        .select(
          "order_index, longueur_po, longueur_totale_po, materiau_haut, materiau_bas, rideau_type, rideau_grandeur, polymat_unique_hauteur_po, polymat_haut_hauteur_po, polymat_bas_hauteur_po, souffleurs_count, souffleurs_count_haut, souffleurs_count_bas, souffleurs_aux_deux_extremites, systeme, rideau_a_remplacer, hauteur_support_simple_po, hauteur_support_haut_po, hauteur_support_bas_po, modele_polymat, nb_cellules_simple, nb_cellules_haut, nb_cellules_bas",
        )
        .eq("soumission_id", soumissionId)
        .order("order_index"),
      supabase
        .from("profiles")
        .select("first_name, last_name, company, phone, billing_address")
        .eq("id", clientUserId)
        .maybeSingle<ProfileRow>(),
    ]);

    if (!sRes.data) {
      console.error("[on-submitted] soumission not found", soumissionId);
      return;
    }

    const ouverturesRows: OuvertureRow[] = (oRes.data ?? []) as OuvertureRow[];
    const profile: ProfileRow = pRes.data ?? {
      first_name: null,
      last_name: null,
      company: null,
      phone: null,
      billing_address: null,
    };

    const pdfSoumission: PdfSoumission = {
      soumission_number: sRes.data.soumission_number,
      project_name: sRes.data.project_name,
      type: sRes.data.type,
      model: sRes.data.model,
      manufacturier_origine: sRes.data.manufacturier_origine,
      submitted_at: sRes.data.submitted_at,
      ouvertures: ouverturesRows.map(toPdfOuverture),
    };

    const pdfClient: PdfClient = {
      email: clientEmail,
      first_name: profile.first_name,
      last_name: profile.last_name,
      company: profile.company,
      phone: profile.phone,
      billing_address: profile.billing_address,
    };

    let signedUrl: string | null = null;
    try {
      const result = await generateAndStorePdf(
        supabase,
        soumissionId,
        pdfSoumission,
        pdfClient,
      );
      signedUrl = result.signedUrl;
    } catch (e) {
      console.error("[on-submitted] PDF generation failed:", e);
    }

    const fullName =
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
      clientEmail;
    const clientLabel = profile.company || fullName;

    if (signedUrl) {
      await sendEmail({
        to: clientEmail,
        subject: `Soumission #${sRes.data.soumission_number} reçue`,
        html: clientEmailHtml({
          fullName,
          projectName: sRes.data.project_name,
          number: sRes.data.soumission_number,
          pdfUrl: signedUrl,
        }),
      });
    }

    // Notify all admins (using service role since regular client can't
    // read auth.users emails).
    try {
      const admin = createAdminClient();
      const { data: admins } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      const ids = (admins ?? []).map((a) => a.id);
      if (ids.length > 0) {
        const adminEmails: string[] = [];
        for (const id of ids) {
          const { data } = await admin.auth.admin.getUserById(id);
          if (data.user?.email) adminEmails.push(data.user.email);
        }
        if (adminEmails.length > 0) {
          await sendEmail({
            to: adminEmails,
            subject: `Nouvelle soumission #${sRes.data.soumission_number}`,
            html: adminEmailHtml({
              projectName: sRes.data.project_name,
              number: sRes.data.soumission_number,
              type: sRes.data.type,
              clientLabel,
              clientEmail,
              appUrl: `${APP_URL}/admin/soumissions`,
            }),
          });
        }
      }
    } catch (e) {
      console.error("[on-submitted] admin notification failed:", e);
    }
  } catch (e) {
    console.error("[on-submitted] unexpected error:", e);
  }
}
