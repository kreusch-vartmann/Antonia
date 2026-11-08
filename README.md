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

1. **Kinder** anlegen (Vorname genügt, Nachname optional). Die Lehrkraft, die ein Kind angelegt
   hat, ist dessen Besitzer:in und kann das **Passwort jederzeit wieder ansehen**
   (Kind → _Zugang_ → _Anzeigen_). Unter _Kinder → Zugangskarten_ lassen sich Karten mit
   Adresse, Benutzername, Passwort und **QR-Code** drucken. Der QR-Code öffnet die
   Anmeldeseite mit eingetragenem Benutzernamen, das Passwort tippt das Kind selbst ein.
2. **Aufgabensets** anlegen (_Aufgabensets → Set anlegen_). Es gibt keinen sichtbaren
   Aufgabenpool: Die Aufgaben leben im Set. Der Assistent fragt Rechenart, Zahlenraum
   (6, 10, 20, 100, 1000), was gesucht ist (Ergebnis, 1. Zahl, 2. Zahl), Zehner- und
   Hunderterübergang, **Zahlzerlegung** und Anzahl. Unter _Feineinstellung_ lassen sich Art
   und Größe der Zahlen festlegen (z. B. nur Zehnerzahlen oder „+6 und +7“). Statt zu
   erzeugen können die Aufgaben auch **selbst festgelegt** werden (Zeile für Zeile, beliebig
   viele). Jede erzeugte Aufgabe ist vor dem Speichern änderbar. **Wie oft alle Aufgaben**
   (1×, 2×, 3×) bestimmt die Länge des Rennens. Die Set-Liste ist nach Zahlenraum und
   Zehnerübergang sortiert.
3. Set **zuweisen** (an ein oder mehrere Kinder, optional mit Zeitraum). Bei jeder Zuweisung
   legt die Lehrkraft fest, welche **Rennarten** das Kind fahren darf (Normal, Fehlerfrei,
   Gegen die Zeit). „Gegen die Zeit“ erscheint nur mit eingetragener Zielzeit. „Bestzeit
   jagen“ (nur zusammen mit „Fehlerfrei“) ist eine fehlerfreie Fahrt gegen die eigene
   Bestzeit mit Geisterauto; sie ist für das Kind gesperrt, bis es „Fehlerfrei“ einmal
   geschafft hat. Beim Kind sind alle Zuweisungen eines Sets **gebündelt** sichtbar;
   **Spielstand zurücksetzen** startet Sterne, Bestzeit und Freischaltung neu, ohne die
   Zuweisung oder die Auswertung zu löschen.
4. **Zahlzerlegung** bei Plus und Minus, das Kind tippt 2, 5, 15. Zwei Darstellungen:
   _Kästchen_ (`8 + 7 = □` mit zwei Kästchen unter der 7) oder _neue Gleichung_ (`8 + 7` und
   darunter `= 8 + □ + □ = □`). Die erste Zahl ist blau, die zweite und ihre Zerlegung rot,
   ebenso die Plättchen im Tipp.
5. **Einstellungen** hat jede Einstellung an genau einem Ort: Was das Kind braucht
   (Vorlesen, Töne, Antwortformat, Nachteilsausgleich bei Zeitlimits) steht beim **Kind**.
   Was geübt wird (Reihenfolge, Hilfen, Zeit pro Aufgabe) steht beim **Aufgabenset**.
   Was das Kind jetzt tun soll (Rennarten, Zielzeit) steht in der **Zuweisung**.
   Jede Maske zeigt bei „Voreinstellung“, welcher Wert gilt und woher er kommt.
6. Kinder melden sich an, wählen in der **Garage** ihr Auto und fahren das **Rennen**:
   Auf dem Startbildschirm tippen sie **Los!** (danach 3-2-1), erst dann läuft die Uhr.
   Ein unterbrochenes Rennen lässt sich 10 Minuten lang fortsetzen. Mit dem Stopp-Knopf
   kann jedes Rennen (auch „Gegen die Zeit“) abgebrochen werden.
7. **Auswertung**: Übersicht, Lernstand je Kind (Aufgabenarten, Fehlermuster,
   Verlauf, Rennen), Detail je Rennen, CSV-Export, Druckansicht (als PDF speicherbar).

### Rollen

- **Lehrkraft**: sieht die Kinder, die sie angelegt hat, und die, die mit ihr **geteilt**
  wurden. Besitzer:innen verwalten das Kind (Stammdaten, Passwort, Löschen, Export, Teilen).
  Mit geteilten Kindern dürfen Kolleg:innen eigene Sets zuweisen und die Auswertung sehen.
- **Admin**: verwaltet unter _Verwaltung_ die Lehrkraft-Konten (anlegen, Passwort
  zurücksetzen, Rolle, deaktivieren) und kann alle Kinder einer Lehrkraft an eine andere
  übertragen. Das erste Konto ist Admin. Admins sehen fremde Kinder nicht automatisch.

### Geräte, Ton und Vorlesen

Unter _Konto → Gerätetest_ (Lehrkraft) bzw. in der Garage (Kinder) lässt sich prüfen, ob ein
Gerät Töne und die Vorlesestimme abspielen kann. Beim Antippen von „Los!“ werden Ton und
Sprache freigeschaltet (iOS verlangt das) und laufen auch bei lautlos gestelltem iPhone.

**Vorlesen** nutzt die Sprachausgabe des Browsers. Unter Linux braucht Chromium-basierte
Browser (Chromium, Vivaldi, Brave) dafür ein installiertes Sprachsystem, z. B. unter
Arch/Manjaro `sudo pacman -S speech-dispatcher espeak-ng` und danach den Browser neu starten.
Ohne Sprachsystem bleibt die Ausgabe stumm; die App zeigt dann einen Hinweis. Auf iPads und
in Safari funktioniert sie in der Regel ohne Einrichtung.

Für eine Probefahrt kann die Lehrkraft ein Test-Kind anlegen und sich in einem zweiten
Browser(-Fenster, privat) damit anmelden.

## Update eines bestehenden Systems

- Die Migrationen laufen beim Start automatisch. Das **älteste Lehrkraft-Konto wird Admin**.
- Offene Rennen aus der Zeit vor dem Update verfallen von selbst; eingreifen muss niemand.
- **Passwörter bestehender Kinder** sind nicht lesbar gespeichert. Unter _Kinder →
  Zugangskarten → Neue Passwörter erzeugen_ bekommt jedes Kind einmal ein neues Passwort;
  danach bleibt es sichtbar und druckbar. Gespeichert wird zusätzlich eine mit `APP_SECRET`
  verschlüsselte Fassung. **`APP_SECRET` darf sich nicht mehr ändern**, sonst sind
  die Passwörter nicht mehr lesbar (die Anmeldung funktioniert weiter).
- Verfälschte Bestzeiten aus der Testphase lassen sich beim Kind mit **Spielstand
  zurücksetzen** bereinigen.
- Der alte Aufgabenpool ist weg. Bestehende Aufgaben bleiben in ihren Sets erhalten, alte
  Adressen (`/lehrkraft/aufgaben/…`) leiten auf die Sets um.

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

Die Tests laufen mit Chromium (`ipad`, `desktop`). In der CI laufen zusätzlich Layout-Tests mit
der Safari-Engine (WebKit) für iPad quer/hoch und iPhone (`ipad-webkit`, `ipad-webkit-portrait`,
`iphone-webkit`, `iphone-se-webkit`). WebKit lässt sich nicht auf jedem Entwicklungsrechner
installieren. Der lange Ablauftest (`flow.e2e.ts`) nutzt feste Namen und braucht eine frische
Datenbank; er läuft deshalb nur im Projekt `ipad` (oder `desktop`).

## Lizenz

Noch festzulegen.
