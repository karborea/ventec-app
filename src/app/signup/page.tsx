import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Créer un compte · Ventec",
};

export default function SignupPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
      <div className="mb-8">
        <Image
          src="/img/logo.png"
          alt="Ventec"
          width={196}
          height={56}
          priority
          className="h-14 w-auto"
        />
      </div>

      <main className="w-full max-w-[480px] rounded-2xl bg-white border border-[#e3e6ec] p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-extrabold mb-1.5 tracking-tight">
          Créer votre compte
        </h1>
        <p className="text-sm text-[#5a6278] mb-6">
          Gérez vos devis de Polymat, suivez vos commandes et recevez vos
          documents directement dans votre espace.
        </p>

        <SignupForm />

        <p className="mt-5 text-center text-xs text-[#5a6278]">
          Vos coordonnées complètes (adresse, livraison) sont demandées plus
          tard, au moment de soumettre votre premier devis.
        </p>
      </main>

      <p className="mt-6 text-sm text-[#5a6278]">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#0f7bb5] hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
