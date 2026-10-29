# Liste de courses — version Docker (homelab)

Même app que sur Vercel, dans un conteneur : un petit serveur Node sert l'interface
et la route `/api/extract-items` (import par photo via Gemini).

## Installation

```bash
cp .env.example .env        # puis renseigne GEMINI_API_KEY (optionnel)
docker compose up -d --build
```

L'app est disponible sur `http://<ip-du-homelab>:3000`.

## Commandes utiles

```bash
docker compose logs -f          # voir les logs
docker compose up -d --build    # mettre à jour après un changement du code
docker compose down             # arrêter
curl localhost:3000/healthz     # test de santé : {"ok":true}
```

## À savoir

- **Les listes sont stockées dans le navigateur** (localStorage), pas sur le serveur.
  Chaque téléphone ou ordinateur a donc ses propres listes, et rien n'est à sauvegarder
  côté Docker. Un conteneur sans volume est normal ici.
- **« Ajouter à l'écran d'accueil » / installation en PWA** : les navigateurs n'activent
  le service worker qu'en **HTTPS** (ou sur `localhost`). En `http://192.168.x.x:3000`
  l'app s'affiche et fonctionne, mais sans installation ni mode hors-ligne. Pour avoir
  le HTTPS, place l'app derrière un reverse proxy (Caddy, Traefik, Nginx Proxy Manager)
  ou utilise Tailscale / Cloudflare Tunnel.
- **Clé Gemini** : elle ne sort jamais du conteneur. Si tu exposes l'app sur Internet,
  protège-la (reverse proxy avec authentification), sinon n'importe qui pourra utiliser
  ta clé via `/api/extract-items`.
- **Autre port** : mets `PORT=8080` dans `.env`.
