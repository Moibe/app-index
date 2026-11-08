# app-index

Dashboard personal para ver **todos los dominios** (vencimiento, auto-renew, dónde vive su DNS) y **qué app corre en cada uno**, cruzando tres fuentes por nombre de dominio:

| Fuente | De dónde sale | Qué aporta |
|---|---|---|
| Namecheap | API (`domains.getList`, `getInfo`, `dns.getHosts`) | vencimiento, auto-renew, lock, nameservers, registros si el DNS es de Namecheap |
| DigitalOcean | API de solo lectura (`/domains`, `/records`, `/droplets`, `/reserved_ips`) | dominios dados de alta en Networking, registros DNS, IPs de los droplets |
| Servidor | archivos de `nx-routes` (nginx), dump de pm2 y `ss` | host → puerto → app, si nginx lo carga y si algo escucha |

Páginas: **Dominios**, **Apps ↔ Dominios**, **Alertas** (lo que no cuadra al cruzar las fuentes) y **Sincronización**.

En producción: <https://app-index.moibe.me> (droplet `gradioFish`, puerto 4600, pm2 + nginx).

## Cómo funciona

- Cada fuente se guarda como *snapshot* en SQLite (Drizzle). Se reemplaza completa cuando su sync sale bien; si falla, se conservan los datos anteriores.
- El sync corre solo en el servidor, una vez al día por fuente (revisa cada hora cuáles llevan más de 24 h). También hay un botón en la página de Sincronización.
- **Namecheap solo responde desde IPs en su whitelist.** El droplet (`165.22.53.200`) ya está; desde la laptop hay que agregar la IP del momento o simplemente no sincronizar Namecheap en local.
- El `ApiKey` de Namecheap **no tiene modo solo-lectura**: puede renovar, cambiar DNS y transferir. Vive solo en el `.env`, y el sitio exige login (`ADMIN_PASSWORD`).
- El token de DigitalOcean sí es de solo lectura.

## Local

```bash
npm install
cp .env.example .env     # y llena los valores; el .env nunca se commitea
npm run db:migrate
npm run dev              # http://localhost:4600
```

En desarrollo el sync automático no arranca solo (cada reinicio pegaría a las APIs): usa el botón, o `AUTO_SYNC=1`. Para leer las rutas de nginx en local apunta `NX_ROUTES_DIR` al repo `nx-routes`; sin pm2 ni `ss` (Windows) las columnas de app y proceso salen vacías.

## Deploy

Push a `main` → GitHub Action: clona o actualiza en `~/code/app-index`, `npm ci`, `npm run db:migrate`, build y `pm2`. El `.env` del droplet se crea a mano una vez (ver `.env.example`). Las migraciones de `./drizzle` se commitean.

## Estructura

- `src/lib/server/sync/` — un lector por fuente + el orquestador y el programador diario.
- `src/lib/server/overview.ts` — cruce de fuentes y reglas de alerta.
- `src/lib/server/auth.ts`, `src/hooks.server.ts` — login por contraseña con cookie firmada.
- `src/routes/` — las cuatro páginas.
