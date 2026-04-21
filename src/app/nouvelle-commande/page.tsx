import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { createNouvelleCommande } from "@/app/actions/soumissions";
import { NouvelleCommandeForm } from "./nouvelle-commande-form";

export const metadata = {
  title: "Nouvelle commande · Ventec",
};

export default function NouvelleCommandePage() {
  return (
    <>
      <AppHeader />

      <div className="bg-white border-b border-[#e3e6ec]">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="text-xs text-[#5a6278] mb-1">
            <Link href="/mes-soumissions" className="hover:underline">
              Mes soumissions
            </Link>{" "}
            › Nouvelle commande · Polymat G3
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Nouvelle commande
          </h1>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 pb-20">
        <NouvelleCommandeForm action={createNouvelleCommande} />
      </main>
    </>
  );
}
