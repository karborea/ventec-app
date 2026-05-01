import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type PdfOuverture = {
  order_index: number;
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

export type PdfSoumission = {
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  model: string | null;
  manufacturier_origine: string | null;
  submitted_at: string | null;
  ouvertures: PdfOuverture[];
};

export type PdfClient = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  billing_address: {
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1f2e",
    lineHeight: 1.4,
  },
  header: {
    borderBottom: "2 solid #F37021",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#F37021",
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#5a6278",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
    fontSize: 9,
    color: "#5a6278",
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 8,
    color: "#5a6278",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1f2e",
    marginTop: 1,
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 8,
    color: "#5a6278",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  block: {
    border: "1 solid #e3e6ec",
    borderRadius: 4,
    padding: 10,
  },
  blockHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  kvRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  kvKey: {
    width: 130,
    color: "#5a6278",
  },
  kvValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  ouverture: {
    border: "1 solid #e3e6ec",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  ouvertureHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#F37021",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#5a6278",
    textAlign: "center",
    borderTop: "1 solid #e3e6ec",
    paddingTop: 6,
  },
});

const TYPE_LABEL: Record<PdfSoumission["type"], string> = {
  nouvelle_commande: "Nouvelle commande",
  remplacement: "Remplacement",
};

const MODEL_LABEL: Record<string, string> = {
  polymat_g3: "Polymat G3",
  polymat_xl: "Polymat XL",
  xl_a: "XL-A",
  xl_b: "XL-B",
  xl_c: "XL-C",
  xl_d: "XL-D",
  g3_e: "G3-E",
  g3_f: "G3-F",
  autre: "Autre",
};

const MATERIAU_LABEL: Record<string, string> = {
  bois: "Bois",
  acier: "Acier",
  beton: "Béton",
};

function formatAddress(a: PdfClient["billing_address"]): string {
  if (!a) return "—";
  const cityProv = [a.city, a.province].filter(Boolean).join(", ");
  const tail = [cityProv, a.postal_code].filter(Boolean).join("  ");
  return [a.street, tail, a.country].filter(Boolean).join(" · ") || "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtNum(n: number | null | undefined, suffix = ""): string {
  return n !== null && n !== undefined ? `${n}${suffix}` : "—";
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvValue}>{v}</Text>
    </View>
  );
}

function NouvelleCommandeOuverture({ o }: { o: PdfOuverture }) {
  const isDouble = o.rideau_type === "double";
  return (
    <View style={styles.ouverture} wrap={false}>
      <Text style={styles.ouvertureHeader}>Ouverture {o.order_index}</Text>
      <KV k="Type de rideau" v={isDouble ? "Double" : "Simple"} />
      {isDouble && (
        <KV
          k="Grandeur"
          v={
            o.rideau_grandeur === "standard"
              ? "Standard"
              : o.rideau_grandeur === "hors_standard"
                ? "Hors-standard"
                : "—"
          }
        />
      )}
      <KV k="Longueur" v={fmtNum(o.longueur_po, " po")} />
      {isDouble && (
        <KV
          k="Hauteur ouverture totale"
          v={fmtNum(o.longueur_totale_po, " po")}
        />
      )}
      {!isDouble && (
        <KV
          k="Hauteur Polymat"
          v={fmtNum(o.polymat_unique_hauteur_po, " po")}
        />
      )}
      {isDouble && o.rideau_grandeur === "hors_standard" && (
        <>
          <KV
            k="Hauteur haut"
            v={fmtNum(o.polymat_haut_hauteur_po, " po")}
          />
          <KV k="Hauteur bas" v={fmtNum(o.polymat_bas_hauteur_po, " po")} />
        </>
      )}
      <KV
        k="Matériau haut"
        v={o.materiau_haut ? (MATERIAU_LABEL[o.materiau_haut] ?? "—") : "—"}
      />
      <KV
        k="Matériau bas"
        v={o.materiau_bas ? (MATERIAU_LABEL[o.materiau_bas] ?? "—") : "—"}
      />
      <KV k="Souffleurs" v={fmtNum(o.souffleurs_count)} />
      <KV
        k="Aux deux extrémités"
        v={o.souffleurs_aux_deux_extremites ? "Oui" : "Non"}
      />
    </View>
  );
}

function RemplacementOuverture({ o }: { o: PdfOuverture }) {
  const isDouble = o.systeme === "double";
  return (
    <View style={styles.ouverture} wrap={false}>
      <Text style={styles.ouvertureHeader}>Ouverture {o.order_index}</Text>
      <KV k="Système" v={isDouble ? "Double" : "Simple"} />
      {isDouble && (
        <KV
          k="Rideau à remplacer"
          v={
            o.rideau_a_remplacer === "haut"
              ? "Haut"
              : o.rideau_a_remplacer === "bas"
                ? "Bas"
                : o.rideau_a_remplacer === "les_deux"
                  ? "Les deux"
                  : "—"
          }
        />
      )}
      {o.modele_polymat && (
        <KV
          k="Modèle Polymat"
          v={MODEL_LABEL[o.modele_polymat] ?? o.modele_polymat}
        />
      )}
      <KV k="Longueur" v={fmtNum(o.longueur_po, " po")} />
      {!isDouble && (
        <>
          <KV
            k="Hauteur support"
            v={fmtNum(o.hauteur_support_simple_po, " po")}
          />
          <KV k="Cellules" v={fmtNum(o.nb_cellules_simple)} />
          <KV k="Souffleurs" v={fmtNum(o.souffleurs_count)} />
        </>
      )}
      {isDouble && (
        <>
          {o.hauteur_support_haut_po !== null && (
            <KV
              k="Hauteur support haut"
              v={fmtNum(o.hauteur_support_haut_po, " po")}
            />
          )}
          {o.hauteur_support_bas_po !== null && (
            <KV
              k="Hauteur support bas"
              v={fmtNum(o.hauteur_support_bas_po, " po")}
            />
          )}
          {o.nb_cellules_haut !== null && (
            <KV k="Cellules haut" v={fmtNum(o.nb_cellules_haut)} />
          )}
          {o.nb_cellules_bas !== null && (
            <KV k="Cellules bas" v={fmtNum(o.nb_cellules_bas)} />
          )}
          {o.souffleurs_count_haut !== null && (
            <KV k="Souffleurs haut" v={fmtNum(o.souffleurs_count_haut)} />
          )}
          {o.souffleurs_count_bas !== null && (
            <KV k="Souffleurs bas" v={fmtNum(o.souffleurs_count_bas)} />
          )}
        </>
      )}
      <KV
        k="Aux deux extrémités"
        v={o.souffleurs_aux_deux_extremites ? "Oui" : "Non"}
      />
    </View>
  );
}

export function SoumissionPdf({
  soumission,
  client,
}: {
  soumission: PdfSoumission;
  client: PdfClient;
}) {
  const fullName =
    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
    client.email;

  return (
    <Document
      title={`Soumission #${soumission.soumission_number}`}
      author="Ventec"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>VENTEC</Text>
          <Text style={styles.title}>{soumission.project_name}</Text>
          <Text style={styles.subtitle}>
            {TYPE_LABEL[soumission.type]}
            {soumission.model
              ? ` · ${MODEL_LABEL[soumission.model] ?? soumission.model}`
              : ""}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Soumission</Text>
              <Text style={styles.metaValue}>
                #{soumission.soumission_number}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Soumis le</Text>
              <Text style={styles.metaValue}>
                {formatDate(soumission.submitted_at)}
              </Text>
            </View>
            {soumission.manufacturier_origine && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Manufacturier</Text>
                <Text style={styles.metaValue}>
                  {soumission.manufacturier_origine === "ventec"
                    ? "Ventec"
                    : "Autre"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Client</Text>
          <View style={styles.block}>
            <KV k="Nom" v={fullName} />
            <KV k="Entreprise" v={client.company ?? "—"} />
            <KV k="Courriel" v={client.email} />
            <KV k="Téléphone" v={client.phone ?? "—"} />
            <KV
              k="Adresse de facturation"
              v={formatAddress(client.billing_address)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Ouvertures ({soumission.ouvertures.length})
          </Text>
          {soumission.ouvertures.map((o) =>
            soumission.type === "nouvelle_commande" ? (
              <NouvelleCommandeOuverture
                key={o.order_index}
                o={o}
              />
            ) : (
              <RemplacementOuverture key={o.order_index} o={o} />
            ),
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Soumission #${soumission.soumission_number} · Page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
