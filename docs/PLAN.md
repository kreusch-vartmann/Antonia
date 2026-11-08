# Antonia – Projektplan

Antonia ist eine browserbasierte Mathe-Lernapp für die Grundschule, ausgerichtet auf
Kinder mit sonderpädagogischem Förderbedarf. Eine Lehrkraft erstellt Aufgaben und
Aufgabensets individuell, weist sie einzelnen Kindern zu und sieht detaillierte
Auswertungen. Die Aufgaben werden in einem Gamification-Rahmen bearbeitet (erstes
Szenario: Autorennen).

Vorbild in Bezug auf Grundidee und Funktionsumfang ist die Lernapp ANTON. Antonia ist
eine eigenständige Entwicklung: Es werden keine Inhalte, Texte, Grafiken, Namen oder
Code von ANTON übernommen.

> **Grundregel Datenschutz/Sicherheit:** Im Repository dürfen niemals reale
> Personendaten, Zugangsdaten, Secrets, Datenbank-Dumps oder sonstige
> sicherheitsrelevante Daten liegen. Demo-/Testdaten sind ausschließlich erfunden.

---

## 1. Entscheidungen

| Thema              | Entscheidung                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Fach / Stufe       | Mathe, Grundschule (Datenmodell bereitet weitere Fächer vor)                                                                    |
| Nutzer             | zunächst eine Lehrkraft, mehrere Kinder; Mandantenfähigkeit vorbereitet (`teacher_id` überall)                                  |
| Geräte             | PCs, Tablets (überwiegend iPads), ggf. Smartphones → responsive, touch-first, Safari/iPadOS als Hauptziel                       |
| Kinder-Login       | Benutzername + Passwort, von der Lehrkraft angelegt/zurückgesetzt; keine E-Mail                                                 |
| Lehrkraft-Login    | Benutzername/E-Mail + Passwort, **2FA (TOTP) optional**                                                                         |
| Personendaten      | Vorname, Nachname optional, Anzeigename; Kinderansicht zeigt nur Anzeigenamen                                                   |
| Hosting            | Hostinger VPS (EU), Coolify, eigene HTTPS-Subdomain                                                                             |
| Container          | App, PostgreSQL, Redis – jeweils eigener Container/eigene Coolify-Ressource                                                     |
| PWA / Offline      | vorerst nein; Offline später                                                                                                    |
| Vorlesen           | Web Speech API des Browsers (de-DE)                                                                                             |
| Rennen – Fehler    | **Standard: Boxenstopp** (Auto bleibt stehen, Hilfe); optional „Zurückfallen“ (nie hinter Start)                                |
| Rennen – Optik     | Draufsicht (von oben); Kind wählt sein Auto                                                                                     |
| Belohnung          | Sterne (0–3) + eigene Bestleistung; keine Münzen, Shops, Ranglisten                                                             |
| Aufgabenerstellung | Set-Assistent (Rechenart, Zahlenraum, …) oder selbst festlegen; kein sichtbarer Aufgabenpool, Aufgaben leben im Set             |
| Einstellungen      | pro Aufgabe, Set, Kind und Zuweisung (siehe Vererbung)                                                                          |
| Rollen             | Admin (verwaltet Konten) und Lehrkräfte; Kinder gehören der anlegenden Lehrkraft und lassen sich teilen                         |
| Kinder-Passwörter  | zusätzlich mit `APP_SECRET` verschlüsselt gespeichert, für die Besitzer:in dauerhaft sichtbar; QR-Code = Adresse + Benutzername |
| Rennstart          | Startbildschirm mit „Los!“ und Countdown; Uhr, Ton und Vorlesen starten erst nach dem Tipp                                      |

### Vererbung von Einstellungen

Spezifischere Ebene gewinnt:

```
Systemstandard → Aufgabe → Aufgabenset → Kind (z. B. Nachteilsausgleich) → Zuweisung
```

Beispiel: Kind hat „kein Zeitlimit“ → gilt auch, wenn das Set ein Zeitlimit hat,
außer die Lehrkraft setzt es in der konkreten Zuweisung bewusst anders.
In der Oberfläche wird jeweils angezeigt, woher ein wirksamer Wert stammt.

---

## 2. Erkenntnisse aus der Recherche (Kurzfassung)

**ANTON (öffentliche Quellen):** Inhalte nach Fach → Klasse → Thema → Block →
Übungen → Test. Zuweisung („Pinnen“) themenweise und wochenweise; Zuweisung an
einzelne Kinder nur kostenpflichtig. Eigene Inhalte nur als Lernlisten (Vokabeln,
Frage–Antwort), keine eigenen Mathe-Aufgaben. Feedback: Rot bei Fehler,
„Lösen“-Knopf, oft ohne Erklärung; Tippfehler zählen hart. Belohnung: 0–3 Sterne
(anteilig nach Punkten), Pokale, Münzen für Spiele mit Ranglisten – öffentlich
kritisiert (Suchtcharakter, Üben unter Niveau für Münzen, Stress durch Zeitdruck
und Rot). Auswertung: Verlauf mit Fehlern und Zeit; kein Export.

**Antonia-Abgrenzung:** individuelle Zuweisung als Standard, freie Mathe-Aufgaben
inkl. Generator, fehlerfreundliches gestuftes Feedback, keine Münzen/Ranglisten,
Zeitlimit nur optional, Fehlermuster-Analyse und Export für Förderpläne.

**Fachdidaktik / Förderpädagogik** (DZLM mahiko/PIKAS/KIRA, CAST UDL, W3C COGA/WCAG):

- Erst verstehen, dann automatisieren → Rennen ist ein Übungs-/Festigungsformat.
- 1×1: Kernaufgaben (·1, ·2, ·5, ·10), Ableitung (z. B. 9·5 = 10·5 − 5);
  Hilfe = Verweis auf Kernaufgabe / gegliedertes Punktefeld.
- Fehler: sofort, sachlich, ohne Strafe; gestufte Hilfen; Lösung zeigen und
  nachtippen lassen; Aufgabe später wiederholen.
- Zeitlimits abschaltbar bzw. stark verlängerbar (WCAG 2.2.1), Standard aus,
  ruhige Anzeige statt Countdown.
- Wettbewerb gegen sich selbst statt gegen andere; keine öffentlichen Vergleiche.
- Reizarm, gleichbleibendes Layout, eine Aufgabe pro Bildschirm, große
  Touch-Ziele (≥ 60 px), Animation/Ton abschaltbar, Vorlesen.
- Nützliche Kennzahlen: Trefferquote je Aufgabenfamilie, Median-Antwortzeit,
  Versuche, Hilfestufe, Fehlermuster, Verlauf über Wochen. Daten sind Hinweise,
  keine Diagnose.

---

## 3. Szenario „Autorennen“ (Meilenstein 1)

- **Fortschritt an Aufgaben gekoppelt:** jede gelöste Aufgabe = ein Streckenabschnitt;
  jedes Kind erreicht das Ziel.
- **Bei Fehler (Standard Boxenstopp):**
  1. „Noch nicht – probier nochmal“ (ruhig, kein Rot-Alarm, Eingabe bleibt sichtbar)
  2. Hilfe (Kernaufgabe / Punktefeld / von der Lehrkraft hinterlegter Hinweis)
  3. Lösung wird gezeigt, Kind tippt sie nach
  - Stufen und Anzahl Versuche einstellbar; Aufgabe wird später in der Runde wiederholt.
  - Option „Zurückfallen“: kleiner Rückschritt, nie hinter den Start.
- **Gegner (einstellbar):** keiner | Geister-Auto (eigene Bestleistung) |
  Computer-Auto mit einstellbarem Tempo.
- **Zeitlimit (optional):** pro Aufgabe und/oder pro Set; ruhige „Tankanzeige“,
  ausblendbar; bei Ablauf bleibt das Auto stehen, Aufgabe kommt später wieder
  (alternativ: als falsch werten).
- **Ziel:** Zielflagge, 0–3 Sterne (Anteil im ersten Versuch richtig),
  anstrengungsbezogene Rückmeldung, Vergleich mit eigener Bestleistung.
- **Antwortformat:** Zahlenfeld oder 2–4 Antwortoptionen (Distraktoren manuell oder
  automatisch aus typischen Fehlern).
- **Barrierefreiheit:** Vorlesen (Knopf/automatisch), reizarmer Modus, Ton aus,
  große Schrift, Animationen reduzierbar (`prefers-reduced-motion` respektiert).
- **Auto-Auswahl:** Kind wählt Auto (Form/Farbe) aus selbst gestalteten SVG-Autos.
- **Robustheit:** Rundenstand in Redis (Neuladen/Verbindungsabbruch verliert nichts),
  Endergebnis und alle Antworten in PostgreSQL.

---

## 4. Architektur

### Stack

- **SvelteKit + TypeScript** (adapter-node) – Oberfläche und Server in einer App
- **PostgreSQL** + **Drizzle ORM** (typsicheres Schema, SQL-Migrationen)
- **Redis** (ioredis) – Sessions, Login-Rate-Limit, laufender Rundenstand
- **Auth:** eigene Session-Cookies (httpOnly, Secure, SameSite=Lax), Argon2id,
  optional TOTP für Lehrkraft, CSRF-Schutz über SvelteKit-Origin-Check
- **Validierung:** Zod
- **Grafik:** SVG + CSS-Animationen, eigene Assets
- **Tests:** Vitest (Logik), Playwright (E2E inkl. WebKit/iPad-Profil), axe (a11y)
- **Qualität:** ESLint, Prettier, `svelte-check`, gitleaks (pre-commit + CI)

### Erweiterbarkeit

- **Aufgabenformat-Registry:** Ein Format definiert Schema (Zod), Generator(en),
  Darstellung (Svelte-Komponente), Prüfung und Fehlermuster-Erkennung.
  Erstes Format: `arithmetic` (+, −, ·, :, optional Lücke an beliebiger Stelle).
- **Szenario-Registry:** Ein Szenario erhält nur Ereignisse
  (`correct`, `wrong`, `hint`, `timeout`, `solutionShown`, `finished`) und
  visualisiert Fortschritt. Jedes Format ist in jedem Szenario nutzbar.
  Erstes Szenario: `race`.

### Datenmodell (grob)

| Tabelle         | Inhalt                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `teacher`       | Konto, Passwort-Hash, optional TOTP-Secret (verschlüsselt)                                                                            |
| `student`       | `teacher_id`, Vorname, Nachname?, Anzeigename, Benutzername, Passwort-Hash, Einstellungen (JSON), gewähltes Auto                      |
| `task`          | `teacher_id`, Fach, Format, Inhalt (JSON), Lösung, Distraktoren, Hilfe, Tags, Herkunft (manuell/Generator + Parameter), Einstellungen |
| `task_set`      | Name, Beschreibung, Szenario, Einstellungen                                                                                           |
| `task_set_item` | Set ↔ Aufgabe, Reihenfolge, Einstellungen                                                                                             |
| `assignment`    | Set ↔ Kind, Zeitraum (von/bis, tagesgenau), Einstellungen, Status                                                                     |
| `run`           | eine Runde: Start, Ende, Sterne, Kennzahlen                                                                                           |
| `answer_event`  | jede Antwort: Aufgabe, Eingabe, korrekt, Zeit (ms), Versuch, Hilfestufe, Timeout, Fehlermuster                                        |
| `audit_log`     | sicherheitsrelevante Aktionen der Lehrkraft (ohne Inhalte/Personendaten im Klartext)                                                  |

### Betrieb

- Multi-Stage-Dockerfile, Non-root, Healthcheck-Endpunkt, Migrationen beim Start
- Coolify: App aus GitHub-Repo; PostgreSQL und Redis als eigene Ressourcen,
  nur im internen Netzwerk; Secrets ausschließlich als Coolify-Umgebungsvariablen
- `docker-compose.dev.yml` für lokale Entwicklung; `.env.example` mit Platzhaltern
- Automatische, verschlüsselte PostgreSQL-Backups; Wiederherstellung getestet
- GitHub Actions: Lint, Typecheck, Tests, Build, gitleaks

### Datenschutz & Sicherheit (technisch)

- Datenminimierung: Nachname optional, keine E-Mail für Kinder
- Argon2id, Login-Rate-Limit (pro IP großzügig, weil eine Schule oft eine IP hat) und temporäre
  Sperre, sichere Session-Cookies
- Kinder-Passwörter liegen zusätzlich AES-256-GCM-verschlüsselt (Schlüssel aus `APP_SECRET`) vor,
  damit die Lehrkraft sie wieder ansehen und drucken kann. Verlust von `APP_SECRET` macht sie
  unlesbar, die Anmeldung (Argon2-Hash) funktioniert weiter.
- Strikte Autorisierung: Kinder sehen nur eigene Daten, Lehrkraft nur eigene Kinder
- Keine Personendaten in Logs; Security-Header (CSP, HSTS, …)
- Löschfunktion (Kind inkl. aller Ergebnisse), Datenexport für die Lehrkraft
- TLS über Coolify/Let's Encrypt

---

## 5. Meilensteine

**Stand:** M0 und M1 sind umgesetzt (Code, Tests, CI). Offen ist nur das Deployment in
Coolify inkl. Backup-Einrichtung (siehe README).

Umsetzungsnotizen M1:

- Run-Engine (`src/lib/domain/run/engine.ts`) ist rein und szenario-/formatunabhängig;
  das Rennen visualisiert nur `done / total`. Zustand liegt in Redis, jede Antwort
  sofort in PostgreSQL.
- Boxenstopp: Fehlversuch → Auto steht, Tipp nach `hintAfter`, Lösung nach
  `solutionAfter` (Kind gibt sie selbst ein). Nicht sofort gelöste Aufgaben kommen
  einmal wieder (Strecke wird um eine Aufgabe länger, Auto fährt trotzdem vor).
- Zurückfallen (Option): erster Fehlversuch je Aufgabe hängt die Aufgabe erneut an
  (Fortschrittsanteil sinkt sichtbar), max. doppelte Länge.
- Zeitlimit pro Aufgabe: „später nochmal“ (Standard) oder „als Fehlversuch“; nach zwei
  Zeitabläufen wird die Lösung gezeigt. Zeitlimit pro Rennen beendet mit Teilergebnis.
- Sterne: 3 ab 90 % sofort richtig, 2 ab 60 %, sonst 1 für das Ankommen.
- Geister-Auto (nur Rennart „Bestzeit jagen“) = schnellste beendete fehlerfreie Fahrt des Kindes mit demselben Set.
- „PDF“ = druckoptimierte Ansicht (Browser „Als PDF speichern“), CSV mit Semikolon für
  deutsche Tabellenprogramme, Formel-Injektion wird verhindert.

Umsetzungsnotizen Überarbeitung Nov. 2026 (siehe `docs/PLAN-2026-11.md`):

- **Rennstart:** Die Rennseite legt nichts mehr an. Erst „Los!“ ruft `POST /api/run/start`.
  Ein offenes Rennen lässt sich bis 10 Minuten nach der letzten Aktion fortsetzen
  (`RESUME_WINDOW_MS`), danach wird es abgebrochen. Wiederholte Anfragen tragen eine
  `actionId`; der Server wendet sie nur einmal an. Fehler der API sind JSON mit `code`.
- **Durchgänge:** Die Einstellung `rounds` legt für jeden Durchgang eigene „Slots“ in der
  Engine an (`<taskId>~<round>`); Ereignisse tragen die echte Aufgaben-ID und `round`.
- **Zahlzerlegung:** `ArithmeticContent.decompose` (`show` | `fill`). Bei `fill` hat eine
  Aufgabe drei Schritte (`steps`), Ereignisse tragen `step`/`steps`; ein Zwischenschritt
  bewegt das Auto nicht. Hilfen und Lösung zählen je Schritt.
- **Spielstand zurücksetzen:** `assignment.progress_reset_at`. Sterne, Bestzeit und die
  Freischaltung von „Bestzeit jagen“ zählen nur Rennen danach; Auswertung und Pokale nicht.
- **Rollen:** `teacher.role/active`, Tabelle `student_teacher` (geteilte Kinder), Zugriffsregeln
  in `services/access.ts`. Das älteste Konto wurde per Migration Admin.
- **Passwörter:** `student.password_enc` (AES-256-GCM mit `APP_SECRET`, Zweck
  `student-password`); jede Ansicht der Passwörter steht im Protokoll.
- **Set-Assistent:** `domain/wizard.ts` erzeugt Aufgabenentwürfe, `SetWizard.svelte` ist die
  Oberfläche. Sets werden nach `domain/numberRange.ts` (Zahlenraum, Übergang) sortiert.

### M0 – Fundament

- Projektgerüst (SvelteKit, TS, Drizzle, Redis-Client, Lint/Format/Tests)
- Dockerfile, `docker-compose.dev.yml`, `.env.example`
- CI (GitHub Actions) und gitleaks pre-commit
- Healthcheck; erstes Deployment über Coolify auf die Subdomain
- Backups einrichten und Wiederherstellung testen

### M1 – Autorennen vollständig

1. **Konten:** Lehrkraft-Setup (erstes Konto per CLI-Befehl), Login, optional 2FA;
   Kinder anlegen/bearbeiten/löschen, Passwort zurücksetzen; Rate-Limit; Rollen
2. **Aufgabenpool:** Format `arithmetic`; manuell anlegen; Generatoren
   (Einmaleinsreihe, Plus/Minus im Zahlenraum bis N, Lückenaufgaben);
   generierte Aufgaben bearbeitbar; Tags, Filter, Suche
3. **Sets & Zuweisung:** Sets zusammenstellen/sortieren, an ein oder mehrere Kinder
   zuweisen, Zeitraum; Vererbung der Einstellungen mit Herkunftsanzeige
4. **Rennen (Kinderansicht):** wie in Abschnitt 3, getestet auf iPad, PC, Smartphone
5. **Auswertung:** Übersicht, Detail pro Kind/Set/Aufgabe, Fehlermuster, Verlauf,
   Export CSV + PDF (Förderplan-Kurzübersicht)
6. **Härtung:** Lösch-/Exportfunktionen, Log-Review, Security-Review,
   a11y-Tests, Probelauf mit einem Kind

### Später

- weitere Aufgabenformate (Zahlenstrahl, Punktefeld/Hunderterfeld, Zuordnen, …)
- weitere Szenarien
- Offline-Fähigkeit, ggf. PWA
- ggf. weitere Lehrkräfte/Fächer
