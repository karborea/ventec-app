import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { createRemplacement } from "@/app/actions/soumissions";
import { RemplacementForm } from "./remplacement-form";

export const metadata = {
  title: "Remplacement · Ventec",
};

export default function RemplacementPage() {
  return (
    <>
      <AppHeader />

      <div className="bg-white border-b border-[#e3e6ec]">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="text-xs text-[#5a6278] mb-1">
            <Link href="/mes-soumissions" className="hover:underline">
              Mes soumissions
            </Link>{" "}
            › Remplacement · Polymat existant
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Remplacement
          </h1>
        </div>
      </div>

      <main className="w-full max-w-6xl mx-auto px-6 py-8 pb-20">
        <RemplacementForm action={createRemplacement} />
      </main>
    </>
  );
}
