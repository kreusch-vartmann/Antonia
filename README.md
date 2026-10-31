# Antonia

Mathe-Lernapp für die Grundschule mit Fokus auf Kinder mit Förderbedarf.
Lehrkräfte erstellen Aufgaben und Aufgabensets individuell, weisen sie einzelnen
Kindern zu und sehen detaillierte Auswertungen. Geübt wird in spielerischen
Szenarien (zuerst: Autorennen).

Plan, Entscheidungen und Meilensteine: [docs/PLAN.md](docs/PLAN.md)

> **Datenschutz-Grundregel:** Niemals reale Personendaten, Zugangsdaten, Secrets,
> Datenbank-Dumps oder Exporte committen. Test- und Demodaten sind immer erfunden.

## Technik

SvelteKit 3 (TypeScript, adapter-node) · PostgreSQL (Drizzle ORM) · Redis (ioredis) ·
Vitest · Playwright · Docker · Coolify

## Entwicklung

Voraussetzungen: Node ≥ 26, Docker (für PostgreSQL/Redis), optional
[gitleaks](https://github.com/gitleaks/gitleaks).

```sh
npm ci
npm run hooks:install                          # pre-commit: Secret-Scan
cp .env.example .env                           # Werte anpassen
docker compose -f docker-compose.dev.yml up -d # PostgreSQL + Redis
MIGRATE_ON_DEV=1 npm run dev                   # Migrationen anwenden und starten
```

Wichtige Befehle:

| Befehl                            | Zweck                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run check`                   | Typprüfung                                                                         |
| `npm run lint` / `npm run format` | Prettier + ESLint                                                                  |
| `npm test`                        | Unit-/Integrationstests (DB-Tests laufen mit PGlite)                               |
| `npm run db:generate`             | SQL-Migration aus `src/lib/server/db/schema.ts` erzeugen                           |
| `npm run build`                   | Produktions-Build (benötigt `DATABASE_URL`/`REDIS_URL`-Werte, Platzhalter genügen) |

Migrationen liegen in `drizzle/` und werden beim Start der App automatisch angewendet.

## Deployment mit Coolify

1. **PostgreSQL** anlegen: _New Resource → Database → PostgreSQL_ (Version 18).
   Interne Verbindungs-URL notieren. Unter _Backups_ einen Zeitplan aktivieren
   (idealerweise mit S3-kompatiblem Ziel in der EU) und eine Wiederherstellung testen.
2. **Redis** anlegen: _New Resource → Database → Redis_. Interne URL notieren.
   Datenbank und Redis **nicht** öffentlich freigeben.
3. **App** anlegen: _New Resource → Application → Public Repository_
   `https://github.com/kreusch-vartmann/Antonia`, Branch `main`,
   Build Pack **Dockerfile**, Port **3000**.
   - Domain: eigene HTTPS-Subdomain (Coolify erzeugt das Zertifikat).
   - Healthcheck-Pfad: `/healthz`.
   - Umgebungsvariablen (nur in Coolify, nie im Repo):
     - `DATABASE_URL` – interne PostgreSQL-URL aus Schritt 1
     - `REDIS_URL` – interne Redis-URL aus Schritt 2
     - optional `LOG_LEVEL`
4. **Deploy**. `/healthz` muss `{"status":"ok"}` liefern.

Proxy-Header (`X-Forwarded-*`) sind im Image voreingestellt (siehe `Dockerfile`).
Der Container läuft als Nicht-root-Benutzer.

## Lizenz

Noch festzulegen.
