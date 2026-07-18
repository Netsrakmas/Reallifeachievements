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

## Optie A — Render.com (makkelijkst te klikken; gekozen optie)

De repo bevat een `render.yaml`-blueprint die alles al instelt (Docker, schijf
op `/data`, regio Frankfurt, health check). Stappen — kan volledig op je telefoon:

1. Ga naar https://render.com en maak een account (inloggen met GitHub is het
   handigst — dan is de repo-koppeling meteen geregeld).
2. Dashboard → **New → Blueprint** → kies de repo `netsrakmas/reallifeachievements`.
3. Render leest `render.yaml` en toont "pluim-en-duivel" → klik **Apply/Deploy**.
4. Wacht tot de eerste build klaar is (paar minuten; de demo-data wordt bij de
   eerste start automatisch geseed).
5. Je krijgt een adres als `https://pluim-en-duivel.onrender.com` — dat is de
   app, voor iedereen met de link. Log in met `jesse` / `demo123` of registreer
   eigen accounts, en deel de URL met je vrienden.

Kosten: het Starter-plan (± $7/mnd) + $0,25/GB voor de schijf. De blijvende
schijf is nodig zodat badges en foto's een herstart overleven — op het gratis
plan draait de app ook, maar reset de database bij elke deploy/herstart.

Elke push naar de gekoppelde branch deployt daarna automatisch opnieuw.

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
