# Facturas Crypto

Outil **local** de facturation / herramienta **local** de facturación para un autónomo en Espagne qui crée des publications sociales pour des **marques hors UE**, et qui encaisse en **crypto** (USDT, BTC, ETH…).

Interface **FR / ES** (toggle dans la barre latérale, l’accueil et les paramètres). Défaut : **espagnol**. La factura PDF est **toujours en espagnol** (document légal).

La devise légale des facturas est l’**EUR**. La crypto est le moyen de paiement.

## Ce que c’est

- Carnet de **clients** (marques hors Europe, avec **domicilio**) et de **facturas** numérotées.
- PDF / impression A4 avec mentions légales (NIF, España, operación no sujeta a IVA, etc.).
- **QR tributario** No-Verifactu : cotejo sur le site de l’AEAT (pas d’envoi du registro).
- Tableau de bord trimestriel indicatif : **modelo 303** et **modelo 130**.
- Données uniquement dans **ton navigateur** (localStorage). Pas de compte, pas de serveur.

## Ce que ce n’est pas

Ceci n’est **pas** un dépôt AEAT / Verifactu, ni un SIF homologué, ni un conseil fiscal. Les autonomos doivent disposer d’un SIF conforme à partir du **1er juillet 2027** (RDL 15/2025). Cette v1 permet de cotejar les données sur la sede AEAT ; elle ne remet pas le registro de facturación.

## Lancer en local

Voir les scripts dans package.json (dev / build / start). Ouvre ensuite http://localhost:3000

## Données

Export / import JSON depuis **Paramètres / Ajustes**.

## Mentions IVA (v1)

Pour un service B2B hors UE, la factura indique une **operación no sujeta a IVA** (art. 69.Uno.1º Ley 37/1992).

