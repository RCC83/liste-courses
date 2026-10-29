# Liste de courses — version Docker (homelab)

Même app que sur Vercel, dans un conteneur : un petit serveur Node sert l'interface.
Le serveur ne stocke rien et n'a besoin d'aucune clé ni d'aucun service externe.

## Installation

```bash
cp .env.example .env        # optionnel : change PORT si 3000 est déjà pris
docker compose up -d --build
```

L'app est disponible sur `http://<ip-du-homelab>:3000`.

## Commandes utiles

```bash
docker compose logs -f          # voir les logs
git pull && docker compose up -d --build   # mettre à jour
docker compose down             # arrêter
curl localhost:3000/healthz     # test de santé : {"ok":true}
```

## Sauvegarder et restaurer les listes

Les listes sont stockées **dans le navigateur** de chaque appareil (localStorage),
pas sur le serveur. Pour les sauvegarder ou les copier d'un téléphone à l'autre :

- **Exporter** : ouvre « Mes listes » (en haut de l'app), puis **Exporter**. Un fichier
  `liste-courses-AAAA-MM-JJ.json` est enregistré (sur iPhone : feuille de partage →
  « Enregistrer dans Fichiers »).
- **Importer** : « Mes listes » → **Importer**, puis choisis le fichier.
  L'import **ajoute** ce qui manque et ne modifie ni ne supprime jamais rien : tu peux
  donc importer le même fichier plusieurs fois sans créer de doublons.

Pense à exporter de temps en temps : vider les données du navigateur efface les listes.

## À savoir

- **Installation en PWA** (« Ajouter à l'écran d'accueil ») : les navigateurs n'activent
  le service worker qu'en **HTTPS** (ou sur `localhost`). Avec Tailscale :
  `sudo tailscale serve --bg 3000` donne une adresse `https://….ts.net`.
- Les données sont liées à l'adresse exacte de l'app : si l'adresse change, l'app
  s'affiche vide (les listes restent sous l'ancienne adresse). Utilise Exporter / Importer.
- **Autre port** : mets `PORT=8080` dans `.env`.
