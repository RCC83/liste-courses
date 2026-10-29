# Liste de courses — version Docker (homelab)

Même app que sur Vercel, dans un conteneur. Le serveur enregistre tes listes sur
le homelab : elles sont **partagées entre tous tes appareils** et survivent aux
redémarrages, aux mises à jour et au vidage du navigateur.

## Installation

```bash
cp .env.example .env
nano .env                   # écris ton mot de passe après APP_PASSWORD=
docker compose up -d --build
```

L'app est disponible sur `http://<ip-du-homelab>:3000`.

## Commandes utiles

```bash
docker compose logs -f                      # voir les logs
git pull && docker compose up -d --build    # mettre à jour (les données sont conservées)
docker compose down                         # arrêter (les données sont conservées)
curl localhost:3000/healthz                 # test de santé : {"ok":true}
```

## Où sont mes listes ?

- **Sur le serveur** : dans le volume Docker `liste-courses-data` (fichier `data.json`,
  avec la version précédente en `data.json.bak`). `docker compose down` ne l'efface pas ;
  seul `docker compose down -v` le supprime.
- **Sur chaque appareil** : une copie de travail (localStorage). C'est ce qui permet
  d'utiliser l'app **sans connexion** (au supermarché, sans réseau) : les modifications
  sont envoyées au serveur dès que la connexion revient.
- Une petite icône de nuage en haut de l'app montre l'état : nuage = enregistré,
  nuage barré = serveur injoignable (tes modifications sont gardées et seront envoyées).
  Le détail est dans « Mes listes ».
- Plusieurs appareils peuvent modifier en même temps : les changements sont fusionnés
  élément par élément, et la modification la plus récente gagne. Pour que ça marche bien,
  garde l'heure automatique activée sur tes appareils.
- **Premier lancement** : ce que tu avais déjà dans le navigateur d'un téléphone est
  envoyé au serveur la première fois que tu ouvres l'app, puis apparaît sur les autres.

## Sauvegardes

Fichier à garder de côté (copie de tout le serveur) :

```bash
docker run --rm -v liste-courses-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/liste-courses-data.tgz -C /data .
```

Pour restaurer : `docker compose down`, puis
`docker run --rm -v liste-courses-data:/data -v "$PWD":/backup alpine tar xzf /backup/liste-courses-data.tgz -C /data`,
puis `docker compose up -d`.

Dans l'app, **Mes listes → Exporter / Importer** crée ou relit un fichier `.json` de tes
listes (utile pour une sauvegarde à part ou pour passer d'un serveur à un autre).
L'import ajoute ce qui manque et ne supprime jamais rien.

## Mot de passe

- Il se définit dans `.env` (`APP_PASSWORD=...`). **Laissé vide, il n'y a pas de mot de
  passe** : le serveur l'indique dans ses logs (`docker compose logs`).
- Chaque appareil le tape **une seule fois** : il est ensuite reconnu pendant 90 jours
  (et la durée se prolonge tant que tu utilises l'app).
- **Changer le mot de passe** : modifie `.env`, puis `docker compose up -d`. Tous les
  appareils (y compris un téléphone perdu) sont déconnectés et doivent retaper le nouveau.
- **Se déconnecter** d'un appareil : « Mes listes » → « Se déconnecter de cet appareil ».
- Après 5 essais faux, l'appareil est bloqué 15 minutes.
- Ce que ça protège : les **listes enregistrées sur le serveur**. La page de l'app
  elle-même (le code) reste publique, et les données déjà présentes dans le navigateur
  d'un appareil restent sur cet appareil.

## Installation en PWA et sécurité

- Pour « Ajouter à l'écran d'accueil », il faut du **HTTPS**. Avec Tailscale :
  `sudo tailscale serve --bg 3000` donne une adresse `https://….ts.net`.
- Le mot de passe est envoyé tel quel : sur du simple `http://` il circule en clair sur
  ton réseau local. Utilise l'adresse HTTPS de Tailscale, et ne lance pas
  `tailscale funnel` (accès depuis tout Internet) sauf si tu sais pourquoi.
- Pour que seul Tailscale puisse atteindre l'app, remplace dans `docker-compose.yml`
  `"${PORT:-3000}:3000"` par `"127.0.0.1:${PORT:-3000}:3000"`.
- **Autre port** : mets `PORT=8080` dans `.env`.
