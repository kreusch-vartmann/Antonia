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

     | Variable       | Wert                                                                         |
     | -------------- | ---------------------------------------------------------------------------- |
     | `DATABASE_URL` | interne PostgreSQL-URL aus Schritt 1                                         |
     | `REDIS_URL`    | interne Redis-URL aus Schritt 2                                              |
     | `APP_SECRET`   | mind. 32 zufällige Zeichen (`openssl rand -base64 48`). **Nie mehr ändern.** |
     | `SETUP_TOKEN`  | mind. 16 zufällige Zeichen – nur für die Ersteinrichtung, danach entfernen   |
     | `LOG_LEVEL`    | optional: `info` (Standard), `warn`, `error`, `debug`                        |

4. **Deploy**. `https://<subdomain>/healthz` muss `{"status":"ok",...}` liefern.
5. **Ersteinrichtung**: `https://<subdomain>/setup` öffnen, `SETUP_TOKEN` eingeben und das
   Lehrkraft-Konto anlegen. Danach `SETUP_TOKEN` in Coolify löschen und neu deployen.
   Empfohlen: unter _Konto_ die Zwei-Faktor-Anmeldung einrichten.

Proxy-Header (`X-Forwarded-*`) sind im Image voreingestellt (siehe `Dockerfile`).
Der Container läuft als Nicht-root-Benutzer.

## Bedienung in Kürze

1. **Kinder** anlegen (Vorname genügt, Nachname optional). Das Passwort wird nur einmal
   angezeigt; unter _Kinder → Zugangskarten_ lassen sich Karten drucken bzw. neue
   Passwörter erzeugen.
2. **Aufgaben** erzeugen (_Aufgaben → Aufgaben erzeugen_, z. B. Einmaleins-Reihe) oder
   einzeln anlegen. Jede erzeugte Aufgabe ist vor dem Speichern änderbar; Ergebnis,
   Lösung, falsche Auswahlantworten und Hilfetext können frei festgelegt werden.
3. **Aufgabenset** zusammenstellen und **zuweisen** (an ein oder mehrere Kinder,
   optional mit Zeitraum). Bei jeder Zuweisung legt die Lehrkraft fest, welche
   **Rennarten** das Kind mit diesem Set fahren darf (Normal, Fehlerfrei, Gegen die Zeit).
   „Gegen die Zeit“ erscheint nur mit eingetragener Zielzeit.
   „Bestzeit jagen“ (nur zusammen mit „Fehlerfrei“) ist eine fehlerfreie Fahrt gegen die eigene
   Bestzeit mit Geisterauto; sie ist für das Kind gesperrt, bis es „Fehlerfrei“ einmal geschafft hat.
4. **Einstellungen** hat jede Einstellung an genau einem Ort: Was das Kind braucht
   (Vorlesen, Töne, Antwortformat, Nachteilsausgleich bei Zeitlimits) steht beim **Kind**.
   Was geübt wird (Reihenfolge, Hilfen, Zeit pro Aufgabe) steht beim **Aufgabenset**.
   Was das Kind jetzt tun soll (Rennarten, Zielzeit) steht in der **Zuweisung**.
   Jede Maske zeigt bei „Voreinstellung“, welcher Wert gilt und woher er kommt.
5. Kinder melden sich an, wählen in der **Garage** ihr Auto und fahren das **Rennen**.
6. **Auswertung**: Übersicht, Lernstand je Kind (Aufgabenarten, Fehlermuster,
   Verlauf, Rennen), Detail je Rennen, CSV-Export, Druckansicht (als PDF speicherbar).

**Vorlesen** nutzt die Sprachausgabe des Browsers. Unter Linux braucht Chromium-basierte
Browser (Chromium, Vivaldi, Brave) dafür ein installiertes Sprachsystem, z. B. unter
Arch/Manjaro `sudo pacman -S speech-dispatcher espeak-ng` und danach den Browser neu starten.
Ohne Sprachsystem bleibt die Ausgabe stumm; die App zeigt dann einen Hinweis. Auf iPads und
in Safari funktioniert sie in der Regel ohne Einrichtung.

Für eine Probefahrt kann die Lehrkraft ein Test-Kind anlegen und sich in einem zweiten
Browser(-Fenster, privat) damit anmelden.

## Lokaler Komplett-Test ohne Docker

Datenbank-Tests laufen mit PGlite. Für einen E2E-Test gegen den Produktions-Build
genügt ein PGlite-Server und `REDIS_URL=memory://` (nur für Tests, siehe `ALLOW_MEMORY_KV`):

```sh
npx -y -p @electric-sql/pglite-socket pglite-server --port 55433 &
DB_POOL_MAX=1 DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/postgres \
REDIS_URL=memory:// ALLOW_MEMORY_KV=1 APP_SECRET=$(openssl rand -hex 24) \
SETUP_TOKEN=local-setup-token-123 PROTOCOL_HEADER=x-forwarded-proto PORT=3999 node build &
E2E_BASE_URL=http://localhost:3999 npx playwright test --project ipad
```

## Lizenz

Noch festzulegen.
