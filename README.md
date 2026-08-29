# Facturas Crypto

Outil **local** de facturation pour un autónomo en Espagne qui crée des publications sociales pour des **marques hors UE**, et qui encaisse en **crypto** (USDT, BTC, ETH…).

La devise légale des facturas est l’**EUR**. La crypto est le moyen de paiement : tu enregistres le montant reçu, l’équivalent EUR au taux du jour (saisi à la main) et, si tu veux, le hash de transaction.

## Ce que c’est

- Carnet de **clients** (marques hors Europe) et de **facturas** numérotées.
- PDF / impression A4 avec mentions légales (NIF, operación no sujeta a IVA, etc.).
- Tableau de bord trimestriel indicatif : **modelo 303** et **modelo 130**, encaissé vs facturé.
- Données uniquement dans **ton navigateur** (localStorage). Pas de compte, pas de serveur.

## Ce que ce n’est pas

Ceci n’est **pas** un dépôt AEAT / Verifactu, ni un conseil fiscal. Les montants « à déclarer » sont un **aide-mémoire**. Parle à ta gestoría.

## Lancer en local

Dans ce dossier :

```
npm install
npm run dev
```

Ouvre ensuite http://localhost:3000

Scripts :

- `npm run dev` — développement
- `npm run build` — build de production
- `npm start` — servir le build

## Données

Export / import JSON depuis **Paramètres**. Vide le stockage du site pour tout effacer.

## Mentions IVA (v1)

Pour un service B2B à un entrepreneur établi **hors UE**, la factura indique une **operación no sujeta a IVA** (art. 69.Uno.1º Ley 37/1992). La retención IRPF est à 0 par défaut (le client étranger ne retient pas).
