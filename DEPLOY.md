# Pluim & Duivel online zetten

De app is één Node-proces met een SQLite-bestand — hij heeft alleen een server
met een **blijvende schijf** nodig (voor `pluim.db` en de bewijsfoto's).
Serverless platforms (Vercel/Netlify) passen daarom niet.

De meegeleverde `Dockerfile` werkt overal: bij de eerste start op een leeg
volume seedt hij automatisch de demo-data. Configuratie via omgevingsvariabelen:

| Variabele | Doel | Default |
| --- | --- | --- |
| `PORT` | Luisterpoort | `3000` |
| `DATA_DIR` | Map voor database + foto's (zet dit op je volume) | `./data` |

HTTPS wordt afgehandeld door de host/reverse proxy; de app zet `trust proxy`
zodat QR-claim-links automatisch de juiste `https://…`-URL krijgen.

## Optie A — Render.com (makkelijkst te klikken)

1. Push deze repo naar GitHub (staat er al) en maak een account op render.com.
2. **New → Web Service** → koppel de repo → Render herkent de `Dockerfile` vanzelf.
3. Voeg onder **Disks** een schijf toe van 1 GB, mount path `/data`.
4. Deploy. Klaar — je krijgt een `https://…onrender.com`-adres voor op ieders telefoon.

Let op: een blijvende schijf vereist het betaalde instapplan (± $7/mnd). Het
gratis plan draait ook, maar dan reset de database bij elke deploy/herstart.

## Optie B — Fly.io (goedkoopste "echte" hosting, ± $2–3/mnd)

```bash
fly launch --no-deploy        # herkent de Dockerfile; kies een regio (ams)
fly volumes create data --size 1
# in fly.toml: [mounts] source = "data", destination = "/data"
fly deploy
```

## Optie C — Eigen VPS (Hetzner/DigitalOcean, ± €4/mnd, meeste controle)

```bash
git clone <repo> && cd Reallifeachievements
npm install && node seed.js
node server.js                # of via systemd/pm2
# HTTPS + domein in één regel met Caddy:
#   caddy reverse-proxy --from pluim.jouwdomein.nl --to localhost:3000
```

## Optie D — Thuis of op een Raspberry Pi (gratis, eigen hardware)

Draai de app zoals bij optie C en maak hem bereikbaar met een Cloudflare
Tunnel (`cloudflared tunnel --url http://localhost:3000`) — geen poorten
openzetten, wel een publieke https-URL.

## Na de eerste start

- Log in met een demo-account (`jesse` / `demo123`) of registreer direct eigen
  accounts — registratie staat open voor iedereen met de URL.
- Verse start zonder demo-data: verwijder `pluim.db` uit het volume en herstart
  zonder seed, of pas `seed.js` aan.
- Plan de anti-collusie-job dagelijks in: `node jobs/anomaly.js` (cron).
- Back-up = één bestand kopiëren: `pluim.db` (plus de map `photos/`).
