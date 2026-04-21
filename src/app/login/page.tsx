import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Connexion · Ventec",
};

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
      <div className="mb-10">
        <Image
          src="/img/logo.png"
          alt="Ventec"
          width={196}
          height={56}
          priority
          className="h-14 w-auto"
        />
      </div>

      <main className="w-full max-w-[400px] rounded-2xl bg-white border border-[#e3e6ec] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <LoginForm />

        <p className="mt-6 text-center text-sm text-[#5a6278]">
          Pas encore de compte ?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#0f7bb5] hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </main>

      <footer className="mt-10 text-xs text-[#5a6278]">
        © 2026 Ventec ·{" "}
        <a
          href="https://www.ventec.ca"
          className="hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          ventec.ca
        </a>
      </footer>
    </div>
  );
}
