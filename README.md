# Ventec App

Espace client Ventec pour la gestion des devis Polymat (nouvelles commandes + remplacements).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (auth + Postgres)
- pnpm

## Dev

```bash
pnpm install
pnpm dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Crée un fichier `.env.local` à la racine avec :

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Structure

- `src/app/login` — page de connexion
- `src/app/mes-devis` — espace client protégé (liste des devis à venir)
- `src/app/actions/auth.ts` — server actions `login` / `signout`
- `src/lib/supabase/` — clients Supabase (browser, server, proxy)
- `src/proxy.ts` — rafraîchit la session et protège les routes
