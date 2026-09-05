# Facturas Crypto

Outil de facturation avec comptes Google (Clerk) + Neon Postgres.

## Comptes

Auth Google via Clerk. Donnees par userId.
Premier login: import localStorage une fois si compte vide.

## Setup Clerk

1. dashboard.clerk.com
2. Social Connections: activer Google
3. Cles dans .env.local (.env.example)
4. Paths /sign-in et /sign-up
5. Autoriser localhost + domaine prod

## Setup Neon

1. console.neon.tech
2. DATABASE_URL sslmode=require
3. npx prisma migrate deploy

## Env

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in, NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up,
DATABASE_URL

Vercel: ajouter ces variables manuellement.

## Local

Voir package.json scripts dev/build/start et prisma migrate deploy.
