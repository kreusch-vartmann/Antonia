# Antonia – Arbeitsplan Korrekturen & Erweiterungen (Rückmeldung Nov. 2026)

> **Stand: umgesetzt (Phasen 0–9).** Abweichungen und Ergänzungen stehen am Ende des Dokuments.

Dieser Plan setzt die Rückmeldung „Veranschaulichung der Rechnung bei Tipps …“ (4 Seiten PDF) um.
Er ist so geschrieben, dass er **Schritt für Schritt von oben nach unten** abgearbeitet werden kann,
auch von einem kleineren Modell. Jeder Schritt nennt Dateien, genaue Änderungen, Tests und ein
Abnahmekriterium. **Nicht vorgreifen:** Spätere Schritte bauen auf früheren auf. Wenn etwas im
Code anders aussieht als hier beschrieben, erst nachlesen und dann so anpassen, dass das
beschriebene Verhalten entsteht. Den bestehenden Code nicht „aufräumen“.

> **Grundregel Datenschutz:** Keine realen Personendaten, Passwörter, Secrets oder Dumps ins
> Repository. Testdaten immer erfunden (z. B. „Klasse 1z“, „Testkind“).

---

## 0. Arbeitsweise (gilt für jede Phase)

1. Node liegt nicht im Standard-PATH. In jeder Shell zuerst:
   `export PATH=$HOME/.local/bin:$PATH`
2. Nach **jedem** nummerierten Schritt:
   - `npm run check` (0 Fehler)
   - `npm test` (grün)
   - `npm run lint` (bei Formatfehlern `npm run format`)
3. Nach jeder **Phase** ein Commit mit englischer Nachricht im bisherigen Stil, z. B.
   `Hint visuals: crossing rules for the dot field up to 100`.
4. Schemaänderungen nur in `src/lib/server/db/schema.ts`, danach `npm run db:generate`. Die
   erzeugte Datei in `drizzle/` umbenennen ist **nicht** nötig. Datenmigrationen von Hand ans Ende
   der erzeugten SQL-Datei (mit `--> statement-breakpoint` davor).
5. Stil: Svelte 5 Runes (`$state`, `$derived`, `$props`), Tabs, deutsche UI-Texte, englische
   Code-Kommentare (sparsam), Services in `src/lib/server/services`, reine Logik in
   `src/lib/domain` (mit Unit-Tests daneben, `*.test.ts`).
6. Reine Logik **zuerst** mit Tests bauen, dann die Oberfläche.
7. E2E-Tests (`npm run test:e2e`) nur am Ende jeder Phase laufen lassen, die die Oberfläche des
   Rennens ändert (Phasen 1, 2, 3, 8), Projekte `desktop` und `ipad`.

---

## 1. Inhalt der Rückmeldung (Kurzfassung) und Stand im Code

| Nr. | Wunsch                                                                                                                           | Stand heute                                                                           | Phase |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| R1  | Wegstreichen im Punktfeld nach festen Regeln (ZR 10 / ZR 20 / ZR 100, Zehner, Einer)                                             | `HintVisual.svelte` streicht immer die ersten (linken oberen) Punkte; Feld nur bis 20 | 1     |
| R2  | Punktfeld auch im ZR 100 (10 × 10)                                                                                               | Bild nur bis 20 (`additionHint`, `tileVisual`)                                        | 1     |
| R3  | Keine verbalen Erklärungen zum Material („Lege … Plättchen“)                                                                     | Text wird bei `twenty` ausgeblendet, aber vorgelesen                                  | 1     |
| R4  | Keine automatischen Tipps im ZR 1000                                                                                             | Tipps mit Text für alle Zahlen                                                        | 1     |
| R5  | Material wählbar: Punktfeld (Standard) oder Dienes (Stangen mit Einkerbung, Würfel), pro Set und pro Zuweisung                   | fehlt                                                                                 | 2, 3  |
| R6  | Zahlenfarben wählbar: blau/rot (Standard), schwarz, Stellenwertfarben; Material wird mit eingefärbt                              | nur blau/rot fest (`--color-num-a/b`)                                                 | 2     |
| R7  | Stellenwertfarben frei wählbar (rot, grün, blau, lila, gelb, orange), pro Set und Zuweisung, „als Standard für neue Sets merken“ | fehlt                                                                                 | 2, 4  |
| R8  | Vorgaben aus dem Assistenten gelten auch beim „Aufgaben selbst festlegen“ (Rechenart, Zerlegung)                                 | leere Zeilen starten immer mit `+` und ohne Zerlegung                                 | 5     |
| R9  | Beim Anlegen sind alle Spielvarianten (Rennarten) angehakt                                                                       | nur „Normal“ und „Fehlerfrei“                                                         | 5     |
| R10 | Set-Übersicht: Reihenfolge und Überschrift von Hand änderbar, eigene Überschriften                                               | nur automatisch (`classifySet`)                                                       | 6     |
| R11 | „Zerlegung“ bei Mal/Geteilt nicht anzeigen                                                                                       | Spalte „Zerlegung“ in der Aufgabentabelle immer da (nur deaktiviert)                  | 5     |
| R12 | „Geteilt mit Rest“ und „Geteilt mit und ohne Rest“                                                                               | Geteilt nur ohne Rest                                                                 | 5     |
| R13 | Kinder in Gruppen (Klassen) und klassenübergreifende Untergruppen, Namen frei, ganze Gruppe zuweisen                             | fehlt                                                                                 | 7     |
| R14 | Zugangskarte mit blauem Flitzer als Logo                                                                                         | nur Text + QR                                                                         | 8     |
| R15 | Vitrine: pro Spielszenario eine Anzeigetafel mit Anzahl je Pokalart, Pokale in einem waagerecht scrollbaren Band                 | ein endlos wachsendes Raster                                                          | 8     |
| R16 | Kein Vorlesen, wenn es nur um Gleichungen/Zahlen geht (Aufgabe, Lösung, Tipp)                                                    | Vorlese-Knöpfe immer, Auto-Vorlesen liest Rechnungen                                  | 8     |

---

## 2. Entscheidungen (mit dir abgestimmt)

| Thema                         | Entscheidung                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plus im Punktfeld             | Erst die vollen Zehnerreihen der 1. Zahl, darunter die vollen Zehnerreihen der 2. Zahl, danach die Einer der 1. Zahl und direkt anschließend die Einer der 2. Zahl (läuft beim Übergang in die nächste Reihe). Im ZR 20 sieht 8 + 7 aus wie heute.                                                                                                                                     |
| Dienes bei Minus mit Übergang | Jede Zehnerstange zeigt durch Einkerbungen ihre 10 Würfel. Bei Übergang werden **zuerst die einzelnen Einerwürfel** rot weggestrichen, **danach die übrigen** hinten (rechts) an der **untersten noch nicht gestrichenen Zehnerstange** (Teilstrich über die letzten Segmente).                                                                                                        |
| ZR 1000                       | Keine automatischen Tipps, **kein Material** (weder Tipp noch Lösung). Die Stellenwertfarben der Zahlen gibt es aber auch dort.                                                                                                                                                                                                                                                        |
| Rennarten beim Zuweisen       | Alle vier Rennarten sind angehakt. Die Zielzeit für „Gegen die Zeit“ wird mit dem Vorschlag (etwa 12 s pro Aufgabe) vorbelegt.                                                                                                                                                                                                                                                         |
| Gruppen                       | Jedes Kind ist in **höchstens einer Klasse** und in **beliebig vielen Untergruppen** (auch klassenübergreifend). Gruppen gehören der Lehrkraft, die sie anlegt. Auch geteilte Kinder lassen sich einsortieren. Beim Zuweisen hakt ein Klick auf eine Gruppe alle ihre Kinder an. Das ist eine **einmalige** Zuweisung: Später hinzukommende Kinder bekommen das Set nicht automatisch. |
| Geteilt mit Rest              | Zwei Kästchen nacheinander: `17 : 5 = □ R □`. Das Kind tippt erst 3, dann 2. Technisch wie die Zahlzerlegung (mehrere Schritte).                                                                                                                                                                                                                                                       |
| Vorlesen                      | Vorlese-Knöpfe für Aufgabe und Tipp gibt es nur bei echtem Text (Sachaufgabe, eigener Tipp der Lehrkraft, Text-Tipp ohne Bild). Auch das automatische Vorlesen liest keine Rechnungen und keine Lösungszahlen mehr vor. Lob und Hinweise („Super!“, „Schau dir die Lösung an und gib sie ein.“) werden weiter vorgelesen, aber ohne Zahlen.                                            |
| Set-Übersicht                 | Mit „Sortieren“ erscheinen ↑/↓ pro Set und pro Überschrift, außerdem pro Set eine Auswahl „Überschrift“ (automatisch, eine feste Überschrift oder eine **eigene Überschrift**). Eigene Überschriften lassen sich anlegen, umbenennen und löschen.                                                                                                                                      |

### Annahmen (bitte bei Bedarf korrigieren, sonst gelten sie)

- A1 **Feldgröße:** Die Größe richtet sich wie bisher nach der größten Zahl der Aufgabe:
  bis 10 → Zehnerfeld (1 Reihe), bis 20 → Zwanzigerfeld (2 Reihen), bis 100 → Hunderterfeld
  (10 × 10, Fünferabstand waagerecht und senkrecht). „ZR 10“ in den Regeln heißt: größte Zahl ≤ 10.
- A2 **Hundert als Dienes:** Die Zahl 100 wird mit **10 Zehnerstangen** dargestellt (keine
  Hunderterplatte), damit das Wegstreichen genauso funktioniert wie im Hunderterfeld.
- A3 **Plus mit Dienes:** Die 1. Zahl links (Stangen untereinander, darunter die Würfel), die 2. Zahl rechts daneben, wie im PDF bei 34 + 21. Es wird nichts gebündelt.
- A4 **Farben des Materials:**
  - Farbmodus „blau/rot“ und „schwarz“: Punkte der 1. Zahl blau, Punkte der 2. Zahl (Plus) rot,
    Streichlinie rot. Dienes in Holzfarbe, Streichlinie rot.
  - Farbmodus „Stellenwerte“: Punkte und Dienes in der Farbe ihres Stellenwerts (Zehnerreihen bzw.
    Stangen in der Zehnerfarbe, Einer in der Einerfarbe), Streichlinie schwarz (wie im PDF).
  - Leere Punkte: weiß mit grauem Rand (wie im PDF).
- A5 **Zahlen im Farbmodus „Stellenwerte“:** Jede Ziffer bekommt die Farbe ihres Stellenwerts,
  auch Ergebnis und Zerlegungsteile. Ab der fünften Stelle schwarz. Eingabekästchen bleiben
  neutral.
- A6 **Standardfarben der Stellenwerte:** Einer grün, Zehner blau, Hunderter rot, Tausender lila.
- A7 **Mal-Tipps** bleiben wie sie sind (Punktefeld mit Reihen + Strategietext, z. B. „Mal 2 heißt
  verdoppeln“). Das ist keine Erklärung zum Material. Geteilt-Tipps bleiben Text.
- A8 **Tipps bei Plus/Minus bis 100:** Nur das Bild, kein Text (auch nicht vorgelesen). Das gilt
  auch für die Zwischenschritte der Zahlzerlegung. Bei gesuchter 1. oder 2. Zahl bleibt der
  Text-Tipp („Denke an die Umkehraufgabe …“), dort gibt es kein Bild. Ein **eigener Tipp der
  Lehrkraft** wird immer als Text gezeigt (zusätzlich zum Bild).
- A9 **„Geteilt mit und ohne Rest“:** In solchen Sets haben **alle** Geteiltaufgaben die Rest-Eingabe,
  auch die ohne Rest (dann „R 0“). Sonst könnte das Kind am Aussehen erkennen, ob ein Rest bleibt.
- A10 **Darstellungs-Einstellungen** (Material, Farben) gelten für Set und Zuweisung, nicht für das
  Kind allgemein. Die Zuweisung überschreibt das Set.
- A11 **Vitrine:** Der Tooltip (Datum, Fehler) im Band wird durch eine kleine sichtbare Zeile unter
  dem Pokal ersetzt, weil ein scrollbares Band Tooltips abschneidet. Die Einzelheiten stehen weiter
  auf der Detailseite.
- A12 **Lehrerseite:** Im Editor einer einzelnen Aufgabe zeigt die Vorschau den Tipp genauso wie
  das Kind ihn sieht (Bild statt Text).
- A13 **Gruppen-Reihenfolge:** Klassen und Untergruppen lassen sich mit ↑/↓ ordnen. Die
  Kinderübersicht zeigt die Klassen in dieser Reihenfolge, zuletzt „Ohne Klasse“.

---

## Phase 0 – Schema (alle Datenbankänderungen auf einmal)

Damit nur **eine** Migration entsteht, werden alle neuen Spalten und Tabellen jetzt angelegt.
Benutzt werden sie erst in späteren Phasen.

### Schritt 0.1 – Typ für Lehrkraft-Voreinstellungen

Neue Datei `src/lib/domain/preferences.ts`:

```ts
/** Per-teacher preferences (stored as JSON on the teacher). */
import type { SettingsLayer } from './settings';

export interface TeacherPreferences {
	/** Display settings (material, colours) that new sets start with. */
	setDefaults?: SettingsLayer;
	/** Order of the headings on the set overview, e.g. ["range:zr10", "custom:<uuid>"]. */
	headingOrder?: string[];
}
```

### Schritt 0.2 – `src/lib/server/db/schema.ts`

1. Tabelle `teacher`: neue Spalte
   `preferences: jsonb('preferences').$type<TeacherPreferences>().notNull().default({})`.
2. Tabelle `taskSet`: neue Spalten
   - `heading: text('heading')` – `null` = automatisch, sonst `range:<RangeKey>` oder `custom:<uuid>`.
   - `sortOrder: integer('sort_order')` – `null` = nach Name.
3. Neue Tabelle `setHeading` (`set_heading`): `id` (uuid, defaultRandom), `teacherId` (FK teacher,
   cascade), `name` (text, notNull), `createdAt`. Index `set_heading_teacher_idx` auf `teacherId`.
4. Neue Tabelle `studentGroup` (`student_group`): `id`, `teacherId` (FK teacher, cascade),
   `name` (text notNull), `kind` (`text('kind').$type<'class' | 'subgroup'>().notNull().default('class')`),
   `position` (integer notNull default 0), `createdAt`. Index `student_group_teacher_idx`.
5. Neue Tabelle `studentGroupMember` (`student_group_member`): `groupId` (FK student_group, cascade),
   `studentId` (FK student, cascade), `createdAt`. `uniqueIndex('student_group_member_uq').on(groupId, studentId)`,
   `index('student_group_member_student_idx').on(studentId)`.
6. Tabelle `trophy`: neue Spalte `scenario: text('scenario').notNull().default('race')`.
7. Kommentar im Kopf der Datei ergänzen: Gruppennamen sind keine Personendaten, Gruppen und
   Mitgliedschaften werden beim Löschen der Lehrkraft bzw. des Kindes mitgelöscht.

Dann `npm run db:generate`. Die neue Migration heißt `drizzle/0006_….sql`. Prüfen, dass sie nur
`ALTER TABLE … ADD COLUMN` und `CREATE TABLE`/`CREATE INDEX` enthält.

**Test:** `tests/unit/migrations.test.ts` läuft weiter grün (es wendet alle Migrationen an).

**Abnahme:** `npm run check && npm test` grün. **Commit Phase 0.**

---

## Phase 1 – Tipps: Punktfeld mit richtigen Streichregeln bis 100, ZR 1000 ohne Tipp

### Schritt 1.1 – Reine Logik für das Punktfeld: `src/lib/domain/visuals.ts` (neu)

Das Feld hat immer 10 Spalten. Zelle `i` liegt in Reihe `Math.floor(i / 10)`, Spalte `i % 10`.

```ts
export type FieldSize = 10 | 20 | 100;
export interface FieldCell {
	/** Which number the dot belongs to; null = empty dot. */
	owner: 'a' | 'b' | null;
	crossed: boolean;
	/** Place value for colouring: full rows are tens, the rest are ones. */
	place: 'tens' | 'ones';
}
export interface Strike {
	row: number;
	from: number;
	to: number;
} // columns, inclusive

export function fieldSize(a: number, op: Op, b: number): FieldSize | null;
export function fieldCells(a: number, op: '+' | '-', b: number): FieldCell[];
export function strikes(cells: FieldCell[]): Strike[];
```

**`fieldSize`:** `null`, wenn `op` nicht `+`/`-` ist oder das Ergebnis ungültig ist
(`computeResult` = `null`). Sonst `m = max(a, b, Ergebnis)`: `m ≤ 10 → 10`, `m ≤ 20 → 20`,
`m ≤ 100 → 100`, sonst `null`.

**`fieldCells` bei Plus** (Länge = Feldgröße, alle Zellen zuerst `owner: null, crossed: false`):

```
Ta = floor(a/10), Tb = floor(b/10), oa = a % 10, ob = b % 10
Reihen 0 … Ta-1          → owner 'a', place 'tens'
Reihen Ta … Ta+Tb-1      → owner 'b', place 'tens'
s = (Ta+Tb)*10
Zellen s … s+oa-1        → owner 'a', place 'ones'
Zellen s+oa … s+oa+ob-1  → owner 'b', place 'ones'
```

**`fieldCells` bei Minus:** Zellen `0 … a-1` → `owner 'a'`. `F = floor(a/10)` (volle Reihen),
`p = a % 10` (Punkte in der angefangenen Reihe `F`). `place = 'tens'` für `i < F*10`, sonst
`'ones'`. Dann gestrichene Zellen bestimmen:

```
Fall Zehnerfeld (Feldgröße 10):
    b ≥ 5 → streiche 0 … b-1          (von links)
    b < 5 → streiche a-b … a-1        (von rechts)

Sonst (Feldgröße 20 oder 100):
    t = floor(b/10)  (ganze Zehner von b),  o = b % 10  (Einer von b)
    1. Zehner: streiche die Reihen F-1, F-2, …, F-t ganz
       (die untersten vollen Reihen direkt über der angefangenen Reihe)
    2. Einer, wenn o > 0:
       a) o ≤ p (kein Übergang):
            o ≥ 5 → streiche F*10 … F*10+o-1             (unten links)
            o < 5 → streiche F*10+p-o … F*10+p-1         (unten rechts)
       b) o > p (Übergang):
            streiche alle p Punkte der angefangenen Reihe (F*10 … F*10+p-1)
            R = F-1-t   (unterste noch nicht gestrichene volle Reihe)
            streiche R*10+10-(o-p) … R*10+9              (rechts in Reihe R)
```

**`strikes`:** Für jede Reihe die zusammenhängenden gestrichenen Zellen als eine Linie
(`from`/`to` = erste/letzte Spalte). Mehrere Linien in einer Reihe gibt es nur, wenn zwischen
gestrichenen Zellen ungestrichene liegen. Der Fünferabstand in der Mitte ist **keine** Lücke.

**Tests `src/lib/domain/visuals.test.ts`** – gestrichene Indizes (`cells.flatMap((c,i)=>c.crossed?[i]:[])`):

| Aufgabe  | Feld | gestrichene Zellen   |
| -------- | ---- | -------------------- |
| 7 − 6    | 10   | 0–5                  |
| 7 − 5    | 10   | 0–4                  |
| 7 − 2    | 10   | 5, 6                 |
| 10 − 3   | 10   | 7, 8, 9              |
| 10 − 6   | 10   | 0–5                  |
| 13 − 7   | 20   | 6–9, 10–12           |
| 16 − 2   | 20   | 14, 15               |
| 16 − 5   | 20   | 10–14                |
| 17 − 6   | 20   | 10–15                |
| 17 − 10  | 20   | 0–9                  |
| 20 − 7   | 20   | 13–19                |
| 59 − 7   | 100  | 50–56                |
| 59 − 30  | 100  | 20–49                |
| 59 − 32  | 100  | 20–49, 57, 58        |
| 34 − 22  | 100  | 10–29, 32, 33        |
| 52 − 27  | 100  | 25–29, 30–49, 50, 51 |
| 100 − 37 | 100  | 63–69, 70–99         |

Plus (`owner` je Zelle):

| Aufgabe | Feld | `a`         | `b`          |
| ------- | ---- | ----------- | ------------ |
| 3 + 4   | 10   | 0–2         | 3–6          |
| 8 + 7   | 20   | 0–7         | 8–14         |
| 34 + 21 | 100  | 0–29, 50–53 | 30–49, 54    |
| 38 + 25 | 100  | 0–29, 50–57 | 30–49, 58–60 |

Außerdem: Anzahl nicht gestrichener `a`-Zellen = Ergebnis (für alle Minus-Fälle oben prüfen),
`fieldSize(30, '+', 80) === null`, `fieldSize(3, '*', 4) === null`, `strikes` für 13 − 7 ergibt
`[{row:0,from:6,to:9},{row:1,from:0,to:2}]`.

### Schritt 1.2 – Typ des Tipp-Bildes

`src/lib/domain/formats/types.ts`: `HintVisual` ändern zu

```ts
export type HintVisual =
	| { kind: 'dots'; rows: number; cols: number }
	/** Plus/minus up to 100: dot field or base-ten material, chosen by the display settings. */
	| { kind: 'field'; a: number; b: number; op: '+' | '-' };
```

`Hint.text` bleibt `string`; ein **leerer** Text heißt „kein Text“. Kommentar ergänzen.
Tipps werden nie gespeichert (sie werden aus der Aufgabe berechnet), daher ist keine Migration nötig.

### Schritt 1.3 – `src/lib/domain/formats/arithmetic.ts`

1. Neue Hilfsfunktion `fieldVisual(a, op, b): HintVisual | undefined` → `{ kind: 'field', a, b, op }`
   wenn `fieldSize(a, op, b) !== null`, sonst `undefined`. `tileVisual` und die Bildlogik in
   `additionHint` durch `fieldVisual` ersetzen (der Typ `twenty` verschwindet überall).
2. Neue Hilfsfunktion `noAutoHint(a, op, b)`: `true` bei `+`/`-`, wenn `max(a, b, Ergebnis) > 100`.
3. `additionHint(a, op, b, r)`: Gibt es ein Bild → `{ text: '', visual }`. Kein Bild → `null`
   (das passiert nur über 100, siehe 2.). Die alten Texte („Lege erst …“, „Rechne erst bis 10 …“)
   entfallen.
4. `stepHint(c, step)`: Bild vorhanden → `{ text: '', visual }`; sonst `null`.
5. `hint(c, step)`:
   - Zwischenschritt (`n > 1 && step < n - 1`): `noAutoHint` → nur der eigene Tipp (wenn vorhanden,
     ohne Bild), sonst `stepHint`.
   - Plus/Minus mit `gap === 'result'` und `noAutoHint` → `auto = null`.
   - Eigener Tipp: `{ text: custom, visual: auto?.visual }` (wie bisher).
   - Am Ende: Hat das Ergebnis weder Text noch Bild, `null` zurückgeben.
6. Tests in `arithmetic.test.ts` anpassen und ergänzen:
   - `hint(add(3, 4)).visual` → `{ kind: 'field', a: 3, b: 4, op: '+' }`, `text === ''`.
   - `hint(add(30, 8)).visual` → jetzt `kind: 'field'` (bis 100 gibt es Bilder).
   - `hint(add(300, 80))` → `null`; `hint({...add(300, 80), hint: 'Zähle die Hunderter'})` →
     `{ text: 'Zähle die Hunderter', visual: undefined }`.
   - Zerlegung 8 + 7: `hint(c, 0).visual` → `kind 'field'`, `text === ''` (alte Erwartungen
     „Es bleiben 5“, „Rechne erst bis 10“ ersetzen).
   - Mal-Tipps unverändert (Text + `dots`).

### Schritt 1.4 – Engine: Tipp nur zählen, wenn es einen gibt

`src/lib/domain/run/engine.ts`, Funktion, die nach einer falschen Antwort `hintShown` setzt
(`registerWrong`, ca. Zeile 320): `cur.hintShown = true` nur, wenn zusätzlich
`formatOf(def.content).hint(def.content, cur.step ?? 0) !== null`. Sonst würde die Auswertung im
ZR 1000 „Tipp gezeigt“ melden, obwohl keiner zu sehen war.
Test in `engine.test.ts`: Aufgabe 300 + 80, falsche Antwort mit `hintAfter: 1` → `view().current.hint`
ist `null` und das Antwort-Ereignis hat `hintShown: false`.

### Schritt 1.5 – Punktfeld zeichnen: `src/lib/components/visual/DotField.svelte` (neu)

Props: `{ a: number; b: number; op: '+' | '-'; display: DisplaySettings }`. `DisplaySettings` gibt es
erst in Phase 2. In dieser Phase `display` **weglassen** und mit festen Farben arbeiten (blau
`#1f5fbf`, rot `#c62828`). In Phase 2 kommt der Prop dazu.

Zeichnung (SVG, explizite `width`/`height` wie bisher, wegen Safari):

- Zellabstand 24, Radius 9, zusätzlicher Abstand 8 nach Spalte 5 und (nur beim Hunderterfeld)
  nach Reihe 5. Rahmen `rect` mit `rx=6`, weiß, Rand `#999`.
- Kreise: `owner 'a'` blau, `owner 'b'` rot, leer `fill="#fff" stroke="#8a929b"`.
  Gestrichene Punkte behalten ihre Farbe (keine Transparenz mehr).
- Für jede Linie aus `strikes(cells)` eine `line` von der Mitte der ersten Zelle − 13 bis zur Mitte
  der letzten Zelle + 13, waagerecht durch die Mitte, `stroke="#c62828"`, `stroke-width=3.5`,
  `stroke-linecap="round"`.
- Größe: Zehner- und Zwanzigerfeld höchstens `18rem` breit (wie bisher `.twenty`). Hunderterfeld
  höchstens `15rem` breit **und** höchstens `40dvh` hoch (Fallback `40vh`), damit die Tastatur sichtbar
  bleibt. Bei `width`/`height`-Attributen die natürliche Größe setzen, per CSS `max-width`,
  `height: auto`.
- `role="img"`, `aria-label`: „Zehnerfeld“ / „Zwanzigerfeld“ / „Hunderterfeld“, bei Minus ergänzt
  um „, {b} weggestrichen“.
- CSS-Klasse am SVG: `class="field field-{size}"` (die E2E-Tests suchen danach).

### Schritt 1.6 – `src/lib/components/race/HintVisual.svelte`

Wird zum Verteiler: `kind 'dots'` → bisherige Mal-Darstellung (unverändert übernehmen),
`kind 'field'` → `<DotField a b op />`. Den alten `twenty`-Zweig löschen.

### Schritt 1.7 – Text nur zeigen, wenn es einen gibt

- `src/lib/components/race/RaceGame.svelte` (ca. Zeile 649–676): Statt
  `{#if cur.hint.visual?.kind !== 'twenty'}` jetzt `{#if cur.hint.text}`. Der Knopf
  „Tipp vorlesen“ nur bei `cur.hint.text` (Feinschliff zum Vorlesen folgt in Phase 8).
- Gleiches in `src/routes/ueben/vitrine/[id]/+page.svelte` (Zeile 59 und der Vorlese-Knopf).
- In `feedbackMessage` (Zeile 266–267): an den gesprochenen Text nur dann `c.hint.text` anhängen,
  wenn er nicht leer ist.

### Schritt 1.8 – Lehrerseite: Tipp-Vorschau mit Bild (A12)

`src/lib/components/TaskFields.svelte`: Die Vorschau berechnet `arithmetic.hint(v.content)`.
Statt nur `hint?.text` das ganze Hint-Objekt durchreichen und im Markup der Vorschau
`{#if hint.text}Tipp: {hint.text}{/if}` und `{#if hint.visual}<HintVisual visual={hint.visual} />{/if}`
zeigen. Steht kein Tipp zur Verfügung: „Kein automatischer Tipp (ZR 1000).“ bzw. nichts.

### Schritt 1.9 – E2E anpassen

`tests/e2e/layout.e2e.ts` (Zeile 85–90): Selektor `.hint svg.twenty` → `.hint svg.field`, die
Farbprüfungen bleiben sinngemäß (rote Kreise vorhanden, keine orangen). Prüfen, welche Aufgabe der
Test verwendet; bei Minus zusätzlich `line` vorhanden.

**Abnahme Phase 1:** Für alle Beispiele aus dem PDF (7−6, 7−5, 7−2, 13−7, 16−2, 16−5, 17−6, 59−7,
17−10, 59−30, 59−32) sieht das Bild im Rennen aus wie im PDF (Handprobe: Set mit genau diesen
Aufgaben anlegen, jeweils einmal falsch antworten). Aufgaben über 100 zeigen keinen Tipp.
**Commit Phase 1.**

---

## Phase 2 – Darstellungs-Einstellungen: Material und Farben

### Schritt 2.1 – Farben: `src/lib/domain/colors.ts` (neu)

```ts
export const PLACE_COLORS = ['red', 'green', 'blue', 'purple', 'yellow', 'orange'] as const;
export type PlaceColor = (typeof PLACE_COLORS)[number];
export const PLACE_COLOR_LABEL: Record<PlaceColor, string> = {
	red: 'Rot',
	green: 'Grün',
	blue: 'Blau',
	purple: 'Lila',
	yellow: 'Gelb',
	orange: 'Orange'
};
/** text: readable on white; fill: for dots and material. */
export const PLACE_COLOR_HEX: Record<PlaceColor, { text: string; fill: string }> = {
	red: { text: '#c62828', fill: '#d32f2f' },
	green: { text: '#2e7d32', fill: '#43a047' },
	blue: { text: '#1f5fbf', fill: '#1f5fbf' },
	purple: { text: '#7b1fa2', fill: '#9c27b0' },
	yellow: { text: '#9a7400', fill: '#f2c200' },
	orange: { text: '#c25100', fill: '#ef6c00' }
};
export const OPERAND_A = '#1f5fbf';
export const OPERAND_B = '#c62828';
export const STRIKE_RED = '#c62828';
export const STRIKE_BLACK = '#222';
export const WOOD = { fill: '#e2b47c', light: '#f0cb98', stroke: '#9c6b35' };
export type Place = 'ones' | 'tens' | 'hundreds' | 'thousands';
/** Places of the digits of a number string from the left, e.g. "1234" → thousands … ones; null after the 4th place. */
export function digitPlaces(value: string): { digit: string; place: Place | null }[];
```

Test `colors.test.ts` für `digitPlaces('1234')`, `('7')`, `('12345')` (erste Ziffer `null`).

### Schritt 2.2 – Neue Einstellungen: `src/lib/domain/settings.ts`

1. In `settingsSchema` ergänzen:
   - `visualMaterial: z.enum(['dots', 'dienes'])`
   - `numberColors: z.enum(['operands', 'black', 'placeValue'])`
   - `colorOnes`, `colorTens`, `colorHundreds`, `colorThousands`: jeweils `z.enum(PLACE_COLORS)`
2. `DEFAULT_SETTINGS`: `visualMaterial: 'dots'`, `numberColors: 'operands'`, `colorOnes: 'green'`,
   `colorTens: 'blue'`, `colorHundreds: 'red'`, `colorThousands: 'purple'`.
3. `SettingMeta.group` um `'Veranschaulichung'` erweitern. Neues optionales Feld
   `visibleWhen?: { key: SettingKey; value: string }`.
4. `SETTING_META` (alle `levels: ['set', 'assignment']`, `group: 'Veranschaulichung'`):
   - `visualMaterial`: Label „Material bei Tipps und Lösungen“, Optionen
     „Punktfeld“ / „Dienes-Material (Stangen und Würfel)“, Hilfe „Bis zum Zahlenraum 100.“
   - `numberColors`: Label „Farben der Zahlen“, Optionen
     `operands` „1. Zahl blau, 2. Zahl rot“, `black` „Schwarz“, `placeValue` „Nach Stellenwerten“.
   - `colorOnes` „Farbe der Einer“, `colorTens` „Farbe der Zehner“, `colorHundreds` „Farbe der
     Hunderter“, `colorThousands` „Farbe der Tausender“; Optionen aus `PLACE_COLOR_LABEL`;
     jeweils `visibleWhen: { key: 'numberColors', value: 'placeValue' }`.
5. Neuer Typ und Helfer:
   ```ts
   export const DISPLAY_KEYS = [
   	'visualMaterial',
   	'numberColors',
   	'colorOnes',
   	'colorTens',
   	'colorHundreds',
   	'colorThousands'
   ] as const;
   export type DisplaySettings = Pick<Settings, (typeof DISPLAY_KEYS)[number]>;
   /** Display settings from a stored (possibly old) settings snapshot. */
   export function displaySettings(raw: unknown): DisplaySettings;
   ```
   `displaySettings` = `DEFAULT_SETTINGS` überschrieben mit `sanitizeLayer(raw)`, nur `DISPLAY_KEYS`.
6. Tests in `settings.test.ts`: Standardwerte; `resolveSettings({ set: { numberColors: 'black' },
assignment: { numberColors: 'placeValue' } })` → `placeValue`; ein Wert auf Ebene `student`
   wird ignoriert; `displaySettings({})` = Standard; `displaySettings({ colorOnes: 'pink' })` =
   Standard.

### Schritt 2.3 – `src/lib/components/SettingsEditor.svelte`: abhängige Felder

Die Felder mit `visibleWhen` sollen nur sichtbar sein, wenn das steuernde Feld den Wert hat.

- `let values = $state<Record<string, string>>({})`, gefüllt mit `String(layer[k] ?? inherited[k])`
  für alle angezeigten Schlüssel (einmalig beim Erzeugen, `svelte-ignore state_referenced_locally`).
- An jedem `<select>`: `onchange={(e) => (values[k] = e.currentTarget.value)}`.
- Ein Feld mit `meta.visibleWhen` wird mit `hidden` versehen (nicht entfernt, damit der Wert im
  Formular bleibt), wenn `values[meta.visibleWhen.key] !== meta.visibleWhen.value`.
- Die Gruppe „Veranschaulichung“ bekommt als ersten Inhalt eine kleine Vorschau:
  `<span class="preview">` mit „34 − 22“ in den gewählten Farben (Ziffern per `digitPlaces`
  einfärben, bei `operands` 34 blau, 22 rot, bei `black` schwarz).

### Schritt 2.4 – Einstellungen bis zum Rennen durchreichen

1. `src/lib/server/services/runs.ts`: `ClientSettings` um alle `DISPLAY_KEYS` erweitern,
   `clientSettings()` entsprechend. (Die Werte stecken schon in `engine.settings`, weil
   `runLevel` aus Set, Kind und Zuweisung aufgelöst wird.)
2. Ältere laufende Rennen in Redis haben die Schlüssel nicht: in `clientSettings` mit
   `displaySettings(s)` auffüllen.
3. `src/lib/server/services/trophies.ts` → `trophyDetail`: zusätzlich `run.settings` des Laufs laden
   (wenn `t.runId`) und `display: displaySettings(runRow?.settings ?? {})` zurückgeben.

### Schritt 2.5 – Farben im Punktfeld und im Rechenausdruck

1. `DotField.svelte`: Prop `display: DisplaySettings` ergänzen.
   - `numberColors === 'placeValue'`: Farbe = `PLACE_COLOR_HEX[place === 'tens' ? colorTens : colorOnes].fill`,
     Streichlinie `STRIKE_BLACK`.
   - sonst: `a` → `OPERAND_A`, `b` → `OPERAND_B`, Linie `STRIKE_RED`.
2. `HintVisual.svelte`: Prop `display` (Standard `displaySettings({})`) an `DotField` weitergeben.
   Alle Aufrufer übergeben `display`: RaceGame (`payload.settings`), Vitrine-Detail
   (`data.display`), TaskFields (Standard).
3. `RaceGame.svelte`, Rechenausdruck:
   - Am Element `.expr` die Klasse `colors-{settings.numberColors}` setzen.
   - CSS: `.colors-black .num, .colors-placeValue .num { color: var(--color-text); }` und die
     farbigen Ränder von `.gap.role-*`/`.blank.role-*` in diesen beiden Modi neutral
     (`var(--color-border-strong)` oder wie bei `role-result`).
   - Im Snippet `cell` für `part.kind === 'num'`: bei `placeValue` den Wert über `digitPlaces` in
     einzelne `<span style="color: …">` zerlegen (Farbe `PLACE_COLOR_HEX[…].text`, `null` → keine
     Farbe). Der Text bleibt für Screenreader gleich (keine Leerzeichen zwischen den Spans).
4. E2E `layout.e2e.ts`: Die Farbprüfung `role-a` blau / `role-b` rot bleibt (Standard).

### Schritt 2.6 – Oberfläche Lehrkraft

Keine eigene Arbeit nötig: `SettingsEditor` zeigt die neue Gruppe automatisch auf der Set-Seite
(`level="set"`), im Assistenten (Set speichern) und bei Zuweisungen (`level="assignment"`, Seite
`/lehrkraft/sets/[id]#zuweisen` und `/lehrkraft/zuweisungen/[id]`). Prüfen, dass das so ist.

**Abnahme Phase 2:** Set mit „Nach Stellenwerten“ und Einer = Orange: Im Rennen sind bei 34 − 22
die Ziffern 3 und 2 in der Zehnerfarbe, 4 und 2 orange. Das Punktfeld zeigt Zehnerreihen blau,
Einer orange, schwarze Streichlinie. Eine Zuweisung mit „Schwarz“ überschreibt das Set.
**Commit Phase 2.**

---

## Phase 3 – Dienes-Material

### Schritt 3.1 – Reine Logik: `dienesGroups` in `src/lib/domain/visuals.ts`

```ts
export interface DienesRod {
	crossed: boolean[];
} // 10 segments, left to right
export interface DienesGroup {
	owner: 'a' | 'b';
	rods: DienesRod[];
	cubes: boolean[];
} // cubes: crossed?
export function dienesGroups(a: number, op: '+' | '-', b: number): DienesGroup[];
```

- **Plus:** zwei Gruppen. `a`: `floor(a/10)` Stangen ohne Striche, `a % 10` Würfel; `b` genauso.
- **Minus:** eine Gruppe `owner 'a'`, abgeleitet aus `fieldCells(a, '-', b)`:
  Reihe `r < F` → Stange `r` mit `crossed[c] = cells[r*10+c].crossed`;
  die angefangene Reihe `F` (Spalten `0 … p-1`) → Würfel mit `cells[F*10+c].crossed`.
  Damit gelten automatisch dieselben Regeln wie im Punktfeld, auch die Entscheidung zum Übergang
  (erst die Einerwürfel, dann hinten an der untersten nicht gestrichenen Stange).
  Sonderfall Zehnerfeld mit `a = 10`: eine Stange, Striche nach der ZR-10-Regel.

Tests: 34 + 21 → Gruppen `{a: 3 Stangen, 4 Würfel}`, `{b: 2 Stangen, 1 Würfel}`;
52 − 27 → 5 Stangen, Stangen 3 und 4 ganz gestrichen, Stange 2 Segmente 5–9 gestrichen,
2 Würfel gestrichen; 16 − 2 → 1 Stange ungestrichen, 6 Würfel, Würfel 4 und 5 gestrichen;
7 − 6 → 0 Stangen, Würfel 0–5 gestrichen.

### Schritt 3.2 – Zeichnung: `src/lib/components/visual/DienesVisual.svelte` (neu)

Props wie `DotField` (`a`, `b`, `op`, `display`).

- Maße: Würfel 16 × 16, Stange 10 × 16 breit (160) und 16 hoch, Abstand zwischen Stangen 6,
  Würfel in einer Reihe mit Abstand 4 unter den Stangen (wie im PDF: Stangen untereinander,
  Würfel darunter). Bei Plus stehen die zwei Gruppen nebeneinander (Abstand 28).
- Etwas Tiefe ohne Aufwand: jedes Teil als `rect` in der Grundfarbe plus ein schmaler, hellerer
  Streifen oben (`light`) und dunkler Rand (`stroke`).
- Einkerbungen: in jeder Stange 9 senkrechte Linien bei `x = 16, 32, …` (Farbe `stroke`,
  `stroke-width=1`).
- Farben: `numberColors === 'placeValue'` → Stangen `colorTens`, Würfel `colorOnes` (Wert `fill`;
  Helligkeitsstreifen mit `opacity 0.35` weiß darüber), Linie `STRIKE_BLACK`. Sonst `WOOD`,
  Linie `STRIKE_RED`.
- Striche: pro Stange die zusammenhängenden gestrichenen Segmente als waagerechte Linie (wie im
  Punktfeld, 6 px über/unter den Rand hinaus), bei den Würfeln die zusammenhängenden gestrichenen
  Würfel ebenso.
- Explizite `width`/`height`, `max-width: min(20rem, 100%)`, `role="img"`,
  `aria-label="Zehnerstangen und Einerwürfel"`, Klasse `dienes`.

### Schritt 3.3 – Auswahl im Verteiler

`HintVisual.svelte`: `kind 'field'` → `display.visualMaterial === 'dienes'` ? `<DienesVisual>` :
`<DotField>`. Die Vorschau in `SettingsEditor` braucht kein Material.

**Abnahme Phase 3:** Set mit „Dienes-Material“: 34 + 21 und 59 − 32, 52 − 27, 13 − 7 sehen aus wie
beschrieben; mit Stellenwertfarben sind Stangen und Würfel eingefärbt. E2E: im Layout-Test einen
zusätzlichen kurzen Fall (Set-Einstellung Dienes) mit `.hint svg.dienes` sichtbar.
**Commit Phase 3.**

---

## Phase 4 – Voreinstellungen der Lehrkraft für neue Sets

### Schritt 4.1 – Service `src/lib/server/services/preferences.ts` (neu)

```ts
export async function getPreferences(db: Db, teacherId: string): Promise<TeacherPreferences>;
/** Shallow merge: keys in `patch` replace the stored ones. */
export async function updatePreferences(
	db: Db,
	teacherId: string,
	patch: Partial<TeacherPreferences>
): Promise<void>;
```

`setDefaults` beim Speichern mit `sanitizeLayer` säubern und auf `DISPLAY_KEYS` beschränken.
Test in `tests/unit/services.test.ts`: speichern, lesen, unbekannte Schlüssel fallen weg.

### Schritt 4.2 – Neues Set startet mit den Voreinstellungen

1. `src/routes/lehrkraft/sets/neu/+page.server.ts` → `load`: `{ setDefaults: prefs.setDefaults ?? {} }`.
   Ebenso `src/routes/lehrkraft/sets/[id]/aufgaben/+page.server.ts` braucht es **nicht** (dort
   werden keine Set-Einstellungen gespeichert).
2. `SetWizard.svelte`: neuer Prop `setDefaults: SettingsLayer`, an den `SettingsEditor` als
   `layer={setDefaults}` geben (statt `{}`). Seite `sets/neu/+page.svelte` reicht `data.setDefaults` durch.
3. Unter dem `SettingsEditor` eine Checkbox
   `<label><input type="checkbox" name="rememberDisplay" /> Material und Farben auch für neue Sets verwenden</label>`.
4. `save`-Action: Ist `rememberDisplay` gesetzt, `updatePreferences(…, { setDefaults: pick(settings, DISPLAY_KEYS) })`.
   Achtung: `layerFromForm` speichert nur Abweichungen vom Standard. Für die Voreinstellung genau
   diese Abweichungen speichern (Standardwerte brauchen keinen Eintrag). Wird nichts abweichend
   gewählt, wird `setDefaults` auf `{}` gesetzt.
5. Dieselbe Checkbox auf der Set-Seite (`sets/[id]/+page.svelte`, Formular `?/update`) und in der
   Action `update`.

**Abnahme Phase 4:** Set A mit „Stellenwerte, Einer orange“ und Haken speichern → „Set anlegen“
zeigt bei Set B schon diese Werte. **Commit Phase 4.**

---

## Phase 5 – Assistent und Aufgaben: Vorgaben, Rennarten, Zerlegung, Geteilt mit Rest

### Schritt 5.1 – Vorgaben gelten beim „Aufgaben selbst festlegen“ (R8)

1. `DraftRow.svelte`: `DraftInit` um `op?: Op`, `gap?: Gap`, `withRemainder?: boolean` ergänzen
   (`withRemainder` erst ab Schritt 5.4 benutzt, Feld schon jetzt anlegen). Startwerte:
   `op = draft.expr?.op ?? draft.op ?? '+'`, `gap = draft.expr?.gap ?? draft.gap ?? 'result'`.
2. `SetWizard.svelte` → `addRows(n)`: Jede neue leere Zeile bekommt Vorgaben aus dem Assistenten:
   - `op`: `'+'`, `'-'`, `'*'`, `':'` direkt; `'+-'` abwechselnd `+`/`−` (nach Zeilennummer
     `nextId + i`), `'*:'` abwechselnd `·`/`:`.
   - `gap`: `gaps[(nextId + i) % gaps.length]`, bei leerer Auswahl `'result'`.
   - `decompose`: bei Plus/Minus der gewählte Wert (wenn nicht `none`), sonst nichts.
   - `withRemainder`: ab Schritt 5.4.
3. In der Karte „Aufgaben selbst festlegen“ eine Zeile mit den übernommenen Vorgaben anzeigen,
   z. B. „Vorgaben aus dem Assistenten: Minus, gesucht: Ergebnis, Zerlegung: Kästchen. Du kannst sie
   pro Zeile ändern.“
4. DraftRow: Wenn eine Vorgabe `decompose` gesetzt ist, die Zeile aber (noch) keine sinnvolle
   Zerlegung hat, bleibt der Wert gespeichert und wird sichtbar, sobald die Zahlen passen
   (heute schon so, weil der Select nur `disabled` ist – prüfen).

Test (Komponententest ist nicht nötig): Handprobe „Minus, Kästchen“ → „Aufgaben selbst festlegen“
→ alle drei Zeilen stehen auf `−`, nach Eingabe von 15 und 7 steht „Kästchen“ in der Zerlegung.

### Schritt 5.2 – Alle Rennarten vorausgewählt (R9)

`src/lib/components/ModePicker.svelte`:

- Standard von `selected` auf `[...RUN_MODES]` ändern.
- Zielzeit-Vorbelegung: Wenn `targetTime` nicht gesetzt oder 0 ist und `selected` `'time'` enthält,
  `minutes`/`seconds` mit dem Vorschlag (`suggestion`, gleiche Formel) vorbelegen. Weil
  `suggestion` von Props abhängt, beim Initialisieren direkt berechnen
  (`Math.max(30, Math.round((taskCount * rounds * 12) / 15) * 15)`, bei `taskCount = 0` → 0).
- Die Zuweisungs-Bearbeitung (`/lehrkraft/zuweisungen/[id]`) übergibt `selected` und `targetTime`
  der bestehenden Zuweisung und ist damit nicht betroffen.

Test `tests/unit/services.test.ts` ist nicht betroffen. E2E `flow.e2e.ts` prüfen: Falls dort beim
Zuweisen Rennarten an- oder abgehakt werden, die Erwartungen anpassen (z. B. Gold-Karte erscheint
jetzt zusätzlich auf der Kinderseite).

### Schritt 5.3 – „Zerlegung“ nur bei Plus/Minus (R11)

1. `SetWizard.svelte`: Spaltenüberschrift der Tabelle abhängig vom Assistenten:
   Plus/Minus → „Zerlegung“; `':'`/`'*:'` → „Rest“ (ab 5.4, bis dahin bei `':'` keine Spalte);
   `'*'` → keine Spalte. Im Modus „selbst festlegen“ mit gemischten Zeilen: „Zerlegung / Rest“.
   Dazu einen neuen Prop `extraColumn: 'decompose' | 'remainder' | 'both' | 'none'` an `DraftRow`.
2. `DraftRow.svelte`: In der Zelle je nach Rechenart der **Zeile**: `+`/`−` → Select Zerlegung
   (wie bisher), `:` → (ab 5.4) Checkbox „mit Rest“, `·` → „–“. Bei `extraColumn === 'none'`
   keine Zelle. `colspan` der Warnzeile (`colspan="7"`) entsprechend anpassen.
3. `TaskFields.svelte` (Einzelaufgabe): zeigt Zerlegung schon nur bei `split` – prüfen, nichts tun.

### Schritt 5.4 – Geteilt mit Rest (R12)

**Domäne `src/lib/domain/formats/types.ts`:** `ArithmeticContent.withRemainder?: boolean` mit
Kommentar „Division with remainder: the child enters the quotient, then the remainder (17 : 5 = 3 R 2).“

**`src/lib/domain/formats/arithmetic.ts`:**

1. Schema: `withRemainder: z.boolean().optional()`. In `superRefine`: Ist `withRemainder` gesetzt,
   muss `expr` vorhanden sein, `op === ':'`, `gap === 'result'` und `b > 0`
   (Meldung: „Rest gibt es nur bei Geteiltaufgaben, bei denen das Ergebnis gesucht ist.“). Die
   bisherige Prüfung „muss ohne Rest aufgehen“ entfällt für diese Aufgaben.
2. Neu: `export function divide(a, b): { q: number; r: number } | null` (`null` bei `b === 0`).
3. `expectedAnswer(expr, withRemainder = false)`: bei `withRemainder` → `q`.
4. `checkConsistency`: Eingabe um `withRemainder?: boolean` erweitern.
   - `':'` ohne Haken und `a % b !== 0`: Meldung
     „{a} : {b} geht nicht ohne Rest auf. Setze den Haken „mit Rest“ oder ändere die Zahlen.“
   - mit Haken: `b === 0` → ungültig; `answer !== q` → `mismatch` mit Meldung
     „{a} : {b} = {q} Rest {r}“ und `correct: q`.
5. `stepCount`: `withRemainder` → 2 (vor der Zerlegungsprüfung).
6. `expectedAt`: `withRemainder` → `[q, r][step]`.
7. `presentArithmetic`: bei `withRemainder` die Teile
   `num(a,'result'), sym(':'), num(b,'result'), sym('='), cell(0), sym('R'), cell(1)` mit derselben
   `cell`-Logik wie bei der Zerlegung (gefüllte Schritte als Zahl, aktueller Schritt `gap`, späterer
   `blank`). Rolle der Zellen `'result'`. Sprache:
   „{a} geteilt durch {b}. Wie oft passt die {b} hinein, und welcher Rest bleibt?“
8. `solved`: „{a} : {b} = {q} R {r}“. `label1`: „{a} : {b} = ? R ?“.
9. `hint`: Schritt 0 → `{ text: 'Welche Zahl mal {b} ist höchstens {a}?' }`; Schritt 1 →
   `{ text: 'Rechne {a} − {q} · {b}.' }` (eigener Tipp der Lehrkraft hat Vorrang).
10. `distractors`: Schritt 0 wie Zwischenschritt (Nachbarzahlen). Schritt 1: Zahlen `0 … b-1` ohne `r`,
    nach Abstand zu `r` sortiert, die nächsten `count + 2` mischen.
11. `errorPattern`: Schritt 1 und `g >= b` → `'remainderTooBig'`; sonst wie Zwischenschritt.
    `ERROR_PATTERN_LABELS.remainderTooBig = 'Rest zu groß (nicht kleiner als der Teiler)'`.
12. `family`: `withRemainder` → „1:1 mit Rest“.
13. `validate`: `withRemainder` entfernen, wenn `false`; `decompose` wird bei `:` schon entfernt.

Tests in `arithmetic.test.ts`: 17 : 5 mit Rest → Schritte 2, `expected(c,0) = 3`, `expected(c,1) = 2`,
`check(c,'2',1)`, `solved = '17 : 5 = 3 R 2'`, `errorPattern(c,'5',1) = 'remainderTooBig'`,
Distraktoren im Schritt 1 alle `< 5`; 15 : 5 mit Rest → `expected(c,1) = 0`; Schema lehnt
`withRemainder` bei `+` und bei `gap: 'a'` ab; `checkConsistency` für 17 : 5 ohne Haken → `invalid`.

**Engine:** keine Änderung nötig (mehrere Schritte gibt es schon). Test in `engine.test.ts`:
Rennen mit 17 : 5 R → erst 3, dann 2 → Aufgabe gelöst; falscher Rest zählt als Fehler im Schritt 1.

**Formular `src/lib/server/taskForm.ts`:** `withRemainder = g('withRemainder') === 'on' && op === ':'`,
Antwort-Vorbelegung über `expectedAnswer(expr, withRemainder)`, im Ergebnis mitgeben.

**Assistent `src/lib/domain/wizard.ts`:**

1. Parameter `remainder: z.enum(['none', 'only', 'mixed']).default('none')`.
2. `Candidate` um `rem?: boolean` erweitern. In `timesCandidates` für Geteiltaufgaben
   (`p.op === ':'` oder `'*:'`):
   - `none`: wie bisher.
   - `only`: für jede Reihe `d` (Teiler, `d ≥ 2`) und jeden Faktor `k` alle `a = k·d + r` mit
     `r = 1 … d-1`, `rem: true`. Reihe 1 überspringen.
   - `mixed`: für jede Kombination `(k, d)` die Aufgabe ohne Rest (`rem: true`, siehe A9) und eine
     mit zufälligem Rest `1 … d-1` (`r` mit dem Seed-RNG wählen; bei `d = 1` nur ohne Rest).
3. Bei Aufgaben mit `rem` immer `gap = 'result'`. Enthält `p.gaps` etwas anderes, Warnung:
   „Bei Geteiltaufgaben mit Rest wird immer das Ergebnis gesucht.“
4. Entwurf: `content.withRemainder = true`, `answer = q`.
5. Tags: `'mit Rest'` bzw. `'mit und ohne Rest'`. Name (`suggestSetName`): Anhang „ mit Rest“
   bzw. „ mit und ohne Rest“.
6. Tests in `wizard.test.ts`: `op ':'`, `rows [5]`, `remainder 'only'`, 10 Aufgaben → alle
   `withRemainder`, alle `a % 5 !== 0`, `answer === floor(a/5)`; `mixed` → beide Sorten kommen vor;
   Name „Geteilt durch 5 mit Rest“.

**Oberfläche:**

- `SetWizard.svelte`: Bei `op === ':'` oder `'*:'` neues Fieldset „Rest“ mit Radios
  `none` „ohne Rest“, `only` „nur mit Rest“, `mixed` „mit und ohne Rest“ (Name `p.remainder`).
  Die Vorschau-Übernahme (`items = p.drafts.map…`) gibt `withRemainder` mit.
  `addRows`: `withRemainder` = Assistent-Wert `!== 'none'` für Zeilen mit `:`.
- `DraftRow.svelte`: bei `op === ':'` Checkbox `name="d.{i}.withRemainder"` „mit Rest“, Antwort
  über `expectedAnswer({…}, withRemainder)`; Konsistenzprüfung mit `withRemainder`.
- `TaskFields.svelte`: bei `op === ':'` dieselbe Checkbox (`name="withRemainder"`).
- `RaceGame.svelte`: Das `R` ist ein normaler `op`-Teil. Handprobe am iPad-Profil: beide Kästchen
  passen in eine Zeile (`class:boxed` gilt, weil `steps > 1`).
- `src/lib/domain/numberRange.ts`: nichts zu tun (Geteilt bleibt „Geteilt“).

**Abnahme Phase 5:** Set „Geteilt durch 5 mit und ohne Rest“ anlegen und fahren; Rest-Eingabe
klappt mit Zahlenfeld und mit Auswahl. **Commit Phase 5.**

---

## Phase 6 – Set-Übersicht: Reihenfolge und Überschriften von Hand (R10)

### Schritt 6.1 – Reine Logik: `src/lib/domain/setOrder.ts` (neu)

```ts
import { RANGE_LABEL, RANGE_ORDER, type RangeKey } from './numberRange';

export type HeadingKey = string; // "range:<RangeKey>" | "custom:<uuid>"
export interface CustomHeading {
	id: string;
	name: string;
}
export interface OrderableSet {
	id: string;
	name: string;
	autoRange: RangeKey;
	heading: string | null;
	sortOrder: number | null;
}

/** The heading a set is listed under: the stored one if it still exists, else the automatic one. */
export function headingOf(s: OrderableSet, customs: CustomHeading[]): HeadingKey;
/** All headings in display order: stored order first (only existing keys), then the rest in the default order (RANGE_ORDER, then customs). */
export function headingOrder(stored: string[] | undefined, customs: CustomHeading[]): HeadingKey[];
export function headingLabel(key: HeadingKey, customs: CustomHeading[]): string;
/** sortOrder ascending (null last), then name (de, numeric). */
export function compareSets(a: OrderableSet, b: OrderableSet): number;
export function groupSets<T extends OrderableSet>(
	sets: T[],
	customs: CustomHeading[],
	stored?: string[]
): { key: HeadingKey; label: string; sets: T[] }[];
/** Moves an item one place up/down in a list; returns a new list (unchanged at the edges). */
export function moveInList<T>(list: T[], item: T, dir: 'up' | 'down'): T[];
```

`groupSets` gibt **alle** Überschriften zurück (auch leere); die Seite blendet leere aus, außer im
Sortiermodus bei eigenen Überschriften.
Tests `setOrder.test.ts`: automatische Zuordnung; gespeicherte gültige Überschrift gewinnt;
gelöschte eigene Überschrift → automatisch; `headingOrder` mit gespeicherter Teilreihenfolge;
`compareSets` mit `sortOrder` und `null`; `moveInList` an den Rändern.

### Schritt 6.2 – Services

1. `src/lib/server/services/sets.ts` → `listSets`: zusätzlich `heading`, `sortOrder` laden, Feld
   `range` umbenennen in `autoRange` (Aufrufer anpassen: nur `sets/+page.svelte`).
2. Neu in `sets.ts`:
   - `setSetHeading(db, teacherId, setId, heading: string | null)`: prüft, dass `heading` `null`,
     ein gültiges `range:<RangeKey>` oder ein eigenes `custom:<id>` der Lehrkraft ist; setzt
     `sortOrder = null` (das Set kommt in der neuen Gruppe nach dem Namen einsortiert).
   - `writeSetOrder(db, teacherId, setIds: string[])`: setzt `sortOrder = Index` für die übergebenen
     eigenen Sets (in einer Transaktion).
   - `duplicateSet`: `heading` mitkopieren, `sortOrder` nicht.
3. Neu `src/lib/server/services/headings.ts`: `listHeadings`, `createHeading(name)` (1–60 Zeichen,
   getrimmt), `renameHeading`, `deleteHeading` (setzt bei allen Sets mit `custom:<id>` die
   Überschrift auf `null` und entfernt den Schlüssel aus `preferences.headingOrder`). Alle mit
   `teacherId`-Prüfung.
4. Tests in `tests/unit/services.test.ts`: Überschrift anlegen, Set zuordnen, löschen → Set wieder
   automatisch; fremde Überschrift wird abgelehnt; `writeSetOrder` ändert keine fremden Sets.

### Schritt 6.3 – Seite `src/routes/lehrkraft/sets/`

`+page.server.ts`:

- `load`: `sets`, `headings` (eigene), `headingOrder` (aus den Voreinstellungen).
- Neue Actions (alle mit `requireTeacher`, `isUuid`-Prüfung, `guarded`):
  - `moveSet` (`id`, `dir`): Gruppen wie auf der Seite mit `groupSets` bilden, die Gruppe des Sets
    nehmen, `moveInList`, dann `writeSetOrder` mit der ganzen Gruppe.
  - `setHeading` (`id`, `heading`; leer = automatisch).
  - `moveHeading` (`key`, `dir`): aktuelle `headingOrder(...)` bilden, `moveInList`, mit
    `updatePreferences({ headingOrder })` speichern.
  - `createHeading` (`name`), `renameHeading` (`id`, `name`), `deleteHeading` (`id`).

`+page.svelte`:

- Gruppen über `groupSets(data.sets, data.headings, data.headingOrder)`.
- Knopf „Reihenfolge und Überschriften bearbeiten“ schaltet `let sorting = $state(false)` um
  („Fertig“ beendet). Ohne Sortiermodus sieht die Seite aus wie heute.
- Im Sortiermodus:
  - an jeder Überschrift ↑/↓ (Formular `?/moveHeading`, `use:enhance`), bei eigenen Überschriften
    zusätzlich Umbenennen (kleines Eingabefeld + „Speichern“) und „Löschen“ (mit `confirm`).
  - pro Set ↑/↓ (`?/moveSet`) und eine Auswahl „Überschrift“ (`?/setHeading`, sendet beim Ändern
    mit `form.requestSubmit()`): erste Option „Automatisch ({RANGE_LABEL[autoRange]})“, dann alle
    festen Überschriften, dann die eigenen.
  - leere eigene Überschriften werden angezeigt („Noch keine Sets“).
  - unten ein Formular „Neue Überschrift“ (`?/createHeading`).
- Hinweis-Text im Sortiermodus: „Das Programm sortiert neue Sets automatisch ein (z. B. nach
  Zehnerübergang). Hier kannst du das ändern, z. B. wenn 15 + 5 für dich nicht als Übergang zählt.“

**Abnahme Phase 6:** Set aus „ZR 20 mit Zehnerübergang“ nach „ZR 20 ohne Zehnerübergang“
verschieben, Reihenfolge ändern, eigene Überschrift „Wochenplan“ anlegen, nach oben schieben,
Set hineinlegen, Überschrift löschen → Set ist wieder automatisch einsortiert. **Commit Phase 6.**

---

## Phase 7 – Kindergruppen: Klassen und Untergruppen (R13)

### Schritt 7.1 – Service `src/lib/server/services/groups.ts` (neu)

```ts
export type GroupKind = 'class' | 'subgroup';
export interface GroupWithMembers {
	id: string;
	name: string;
	kind: GroupKind;
	position: number;
	memberIds: string[];
}

export async function listGroups(db, teacherId): Promise<GroupWithMembers[]>; // nur sichtbare Kinder (canSeeStudent)
export async function createGroup(
	db,
	teacherId,
	input: { name: string; kind: GroupKind }
): Promise<string>;
export async function renameGroup(db, teacherId, id, name): Promise<void>;
export async function deleteGroup(db, teacherId, id): Promise<void>;
export async function moveGroup(db, teacherId, id, dir: 'up' | 'down'): Promise<void>; // innerhalb derselben Art
/** Replaces the members. For a class, the children leave their other classes of this teacher. */
export async function setGroupMembers(db, teacherId, id, studentIds: string[]): Promise<void>;
/** Class and subgroups of one child (only groups of this teacher). */
export async function setStudentGroups(
	db,
	teacherId,
	studentId,
	input: { classId: string | null; subgroupIds: string[] }
): Promise<void>;
```

Regeln:

- Name 1–60 Zeichen (getrimmt), sonst `ValidationError`.
- Nur eigene Gruppen; nur Kinder, die die Lehrkraft sehen darf (`canSeeStudent`), sonst
  `ValidationError('Kind nicht gefunden.')`.
- Eine Klasse pro Kind und Lehrkraft: In `setGroupMembers` (Art `class`) und `setStudentGroups`
  das Kind zuerst aus allen anderen Klassen **dieser Lehrkraft** entfernen.
- `src/lib/server/services/access.ts` → `unshareStudent`: zusätzlich die Mitgliedschaften des
  Kindes in Gruppen der Lehrkraft löschen, der das Kind nicht mehr geteilt ist.

Tests: Klasse anlegen, Kinder setzen, Kind in zweite Klasse → aus erster raus; Untergruppe mit
Kindern aus zwei Klassen; fremdes Kind abgelehnt; geteiltes Kind erlaubt; nach `unshareStudent` ist
das Kind nicht mehr in den Gruppen der anderen Lehrkraft; Löschen des Kindes entfernt die
Mitgliedschaft (Cascade).

### Schritt 7.2 – Seite „Gruppen“ `src/routes/lehrkraft/kinder/gruppen/` (neu)

- `load`: `groups` (`listGroups`), `students` (`listStudents`).
- Actions: `create`, `rename`, `remove`, `move`, `members` (Form-Felder `id`, mehrere `studentId`).
- Oberfläche: zwei Abschnitte „Klassen“ und „Untergruppen“. Oben ein Formular „Neue Gruppe“ (Name,
  Art: Klasse / Untergruppe; Hilfetext: „Ein Kind kann in einer Klasse und in mehreren Untergruppen
  sein, z. B. Förderkurs mit Kindern aus 1a und 1b.“).
  Jede Gruppe als `card` mit Name (umbenennbar), ↑/↓, „Löschen“ (`confirm`: „Gruppe löschen? Die
  Kinder bleiben erhalten.“) und aufklappbarer Mitgliederliste (`<details>`) mit Checkboxen aller
  Kinder. Bei Klassen steht hinter Kindern, die schon in einer anderen Klasse sind, klein
  „(jetzt in 1b)“. „Speichern“ sendet `members`.
- Link „Gruppen“ auf der Kinderübersicht (neben „Zugangskarten“).

### Schritt 7.3 – Kinderübersicht `src/routes/lehrkraft/kinder/+page.svelte`

- `load` zusätzlich `groups`.
- Darstellung: pro Klasse (in Reihenfolge `position`) eine Überschrift mit eigener Tabelle, zuletzt
  „Ohne Klasse“ (nur wenn nicht leer). Gibt es keine Klassen, sieht die Seite aus wie heute.
- Neue Spalte „Untergruppen“ mit `tag`s.
- Auswahl „Anzeigen“: „Alle Kinder“ oder eine Untergruppe (rein im Browser filtern).

### Schritt 7.4 – Kind anlegen / bearbeiten

- `kinder/neu`: optionale Auswahl „Klasse“ (eigene Klassen). Nach dem Anlegen
  `setStudentGroups(..., { classId, subgroupIds: [] })`.
- `kinder/[id]`: Abschnitt „Gruppen“ (auch für geteilte Kinder, es geht um die eigenen Gruppen der
  Lehrkraft): Auswahl Klasse + Checkboxen Untergruppen, Action `groups`.

### Schritt 7.5 – Ganze Gruppe zuweisen

`src/routes/lehrkraft/sets/[id]/` (Formular „Neu zuweisen“):

- `load` zusätzlich `groups`.
- Kinder-Checkboxen an `let selected = $state<string[]>([])` binden (`bind:group`). Nach
  erfolgreichem Zuweisen `selected = []` (im bestehenden `use:enhance`-Callback neben `pickerKey++`).
- Darüber „Ganze Gruppe:“ mit einem Knopf pro Gruppe (`type="button"`, z. B. „Klasse 1a (12)“).
  Klick: Sind schon alle Mitglieder ausgewählt → alle abwählen, sonst alle hinzufügen.
  `aria-pressed` zeigt den Zustand.
- Die Kinder werden nach Klassen gruppiert angezeigt (eine Zeile pro Klasse mit Klassennamen
  davor, zuletzt „Ohne Klasse“).
- Server bleibt unverändert (es kommen einfach mehrere `studentId`).
- Dieselben Gruppen-Knöpfe auf der Seite **Zugangskarten** (`kinder/karten`), um schnell eine Klasse
  zu drucken.

E2E (`flow.e2e.ts`, kurz): Gruppe „Klasse 1z“ anlegen, Testkind hinzufügen, beim Zuweisen
„Klasse 1z“ klicken → Checkbox des Testkinds ist angehakt.

**Abnahme Phase 7:** Zwei Klassen, eine Untergruppe mit Kindern aus beiden; Zuweisen per
Gruppen-Knopf. **Commit Phase 7.**

---

## Phase 8 – Kinderseite: Vorlesen, Vitrine, Zugangskarte

### Schritt 8.1 – Kein Vorlesen bei reinen Gleichungen (R16)

`src/lib/components/race/RaceGame.svelte`:

1. Neue Ableitung `const taskHasText = $derived(!!cur?.presentation.question?.trim())`.
2. Neue Aufgabe (Effekt, ca. Zeile 171): automatisch vorlesen nur, wenn `taskHasText`.
3. Knopf „Vorlesen“ an der Aufgabe (ca. Zeile 605) und die Meldung `$speechSilent` darunter nur bei
   `settings.readAloud !== 'off' && taskHasText`.
4. `feedbackMessage`:
   - falsch mit Lösung: angezeigt bleibt „Die Lösung ist {X}. Gib sie ein.“, **gesprochen** wird
     „Schau dir die Lösung an und gib sie ein.“ (bei Auswahl: „… und tippe sie an.“).
   - falsch mit Tipp: gesprochen „Boxenstopp! Hier ist ein Tipp.“ plus `c.hint.text` nur, wenn nicht
     leer (schon in Schritt 1.7).
   - Zeit um mit Lösung: angezeigt wie bisher, gesprochen „Die Zeit ist um. Schau dir die Lösung an
     und gib sie ein.“
5. Knopf „Tipp vorlesen“ nur bei `cur.hint.text` (schon in Schritt 1.7, prüfen).
6. `src/routes/ueben/vitrine/[id]/+page.svelte`: „Tipp vorlesen“ nur bei Text (prüfen).
7. Zwischenschritte der Zahlzerlegung: Die Sprache (`stepSpeech`) wird nur noch bei Sachaufgaben
   genutzt. Nichts löschen, die Bedingung in 2./3. reicht.

E2E: Im Layout-Test nach dem Laden einer Rechenaufgabe ohne Fragetext:
`expect(page.getByRole('button', { name: 'Aufgabe vorlesen' })).toHaveCount(0)`. Die Prüfung in
`flow.e2e.ts` auf den angezeigten Text „Boxenstopp! Hier ist ein Tipp.“ bleibt gültig.

### Schritt 8.2 – Vitrine pro Spielszenario (R15)

1. Neue Datei `src/lib/domain/scenarios.ts`:
   `export const SCENARIOS = [{ id: 'race', label: 'Autorennen' }] as const;` und
   `scenarioLabel(id)` (unbekannt → „Weitere Spiele“).
2. `src/lib/server/services/runs.ts`, beim Anlegen des Pokals (`insert(trophy)`, ca. Zeile 312):
   `scenario` des Sets mitschreiben (`taskSet.scenario` über `s.setId` laden; Standard `'race'`).
3. `trophies.ts` → `listTrophies`: Feld `scenario` mit auswählen.
4. `src/routes/ueben/vitrine/+page.svelte` neu aufbauen:
   - Pokale nach `scenario` gruppieren, Reihenfolge wie `SCENARIOS`.
   - Pro Szenario eine `section` mit Überschrift (z. B. „Autorennen“, dazu ein kleiner blauer
     `RaceCar` als Symbol) und einer **Anzeigetafel**: für Bronze, Silber, Gold je ein
     `<Trophy kind=… />` und groß „× {Anzahl}“ (auch bei 0, dann blass). Die Tafel als dunkles
     Schild (`background: #2b2f36; color: #fff; border-radius: 1rem`), Zahlen
     `font-variant-numeric: tabular-nums`. Für Screenreader: `aria-label="3 bronzene Pokale"` usw.
   - Darunter das **Band**: `<ul class="band">` mit `display: flex; gap; overflow-x: auto;
scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding-bottom` und den
     Pokalen als `li` mit `flex: 0 0 9rem; scroll-snap-align: start`. Neueste zuerst. Holzoptik des
     Regals beibehalten (Rahmen, Leiste unten).
   - Links und rechts vom Band je ein `IconButton` (Pfeil zurück / vor, `aria-label` „Weiter nach
     links“ / „Weiter nach rechts“), der `band.scrollBy({ left: ±band.clientWidth * 0.8, behavior })`
     aufruft (im reizarmen Modus ohne `smooth`). Die Knöpfe nur zeigen, wenn das Band überläuft
     (`scrollWidth > clientWidth`, bei `resize` neu prüfen).
   - Statt Tooltip (A11): unter dem Pokal klein „{Datum}“ und „{Fehler}“ (`dateTime` / `mistakes`).
     `aria-describedby` und das `role="tooltip"`-Element entfernen.
5. E2E `flow.e2e.ts` (Zeile ~128–131): die Tooltip-Prüfung ersetzen durch
   `expect(page.getByText('1 Fehler')).toBeVisible()` innerhalb des Bandes und eine Prüfung der
   Anzeigetafel (`getByLabel('1 bronzener Pokal')` – genaue Wortwahl wie in 4. umgesetzt).
   Singular/Plural beachten: „1 bronzener Pokal“, „3 bronzene Pokale“.

### Schritt 8.3 – Zugangskarte mit Flitzer (R14)

`src/routes/lehrkraft/kinder/karten/+page.svelte`:

- `import RaceCar from '#lib/components/race/RaceCar.svelte'`.
- In jeder Karte oben links über dem Namen: `<RaceCar model="racer" color="blue" size={96} label="Antonia Autorennen" />`
  in einem `div.logo`. Text und QR-Code bleiben.
- CSS: `.kcard { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`, damit das Auto
  farbig gedruckt wird.
- Prüfen, dass `RaceCar` ohne umgebendes Rennen funktioniert (es ist ein eigenständiges SVG).

**Abnahme Phase 8:** Druckvorschau zeigt den blauen Flitzer; Vitrine mit vielen Pokalen wächst
nicht mehr nach unten, sondern scrollt waagerecht; reine Rechenaufgaben haben keinen
Vorlese-Knopf. E2E `desktop` und `ipad` grün. **Commit Phase 8.**

---

## Phase 9 – Abschluss

1. `README.md`, Abschnitt „Bedienung in Kürze“: Material und Farben (Set/Zuweisung, Standard für
   neue Sets), Geteilt mit Rest, Gruppen, Sortieren der Set-Übersicht.
2. `docs/PLAN.md`: Umsetzungsnotizen (Streichregeln mit Verweis auf `visuals.ts`, neue
   Einstellungen, Gruppenmodell, Überschriften-Schlüssel `range:`/`custom:`).
3. Am Ende dieses Dokuments „Abweichungen und Ergänzungen bei der Umsetzung“ ergänzen.
4. Vollständiger Lauf: `npm run lint && npm run check && npm test && npm run build`, danach E2E lokal
   (`desktop`, `ipad`).
5. Push, CI abwarten (inkl. WebKit).

**Commit Phase 9.**

---

## Handprobe zum Schluss (mit dem PDF daneben)

| Prüfung                                                                           | ok  |
| --------------------------------------------------------------------------------- | --- |
| 7−6, 7−5, 7−2 im Zehnerfeld wie im PDF                                            |     |
| 13−7, 16−2, 16−5, 17−6, 17−10 im Zwanzigerfeld wie im PDF                         |     |
| 59−7, 59−30, 59−32 im Hunderterfeld wie im PDF                                    |     |
| 34+21 und 59−32 mit Dienes (Holz)                                                 |     |
| 34−22 mit Stellenwertfarben (Punktfeld)                                           |     |
| 52−27 mit Dienes: erst Würfel, dann hinten an der untersten freien Stange         |     |
| Aufgabe im ZR 1000: kein Tipp, Zahlen in Stellenwertfarben möglich                |     |
| Kein Text „Lege … Plättchen“ mehr                                                 |     |
| Assistent „Minus + Kästchen“ → selbst festlegen: Zeilen stehen auf − und Kästchen |     |
| Zuweisen: alle Rennarten angehakt, Zielzeit vorbelegt                             |     |
| Mal/Geteilt: keine Spalte „Zerlegung“                                             |     |
| Geteilt mit Rest im Rennen (Zahlenfeld und Auswahl)                               |     |
| Set-Übersicht: verschieben, Überschrift ändern, eigene Überschrift                |     |
| Gruppen: Klasse + Untergruppe, ganze Gruppe zuweisen                              |     |
| Zugangskarte mit blauem Flitzer (Druckvorschau)                                   |     |
| Vitrine: Anzeigetafel + waagerechtes Band                                         |     |
| Kein Vorlese-Knopf bei reinen Rechenaufgaben                                      |     |

---

## Empfehlung: Welches Modell für welche Phase

Eine Phase pro Sitzung. Am Anfang jeder Sitzung dem Modell sagen:
„Lies `docs/PLAN-2026-11-korrekturen.md`, Abschnitte 0, 2 und Phase N, und setze Phase N um.“

| Phase | Inhalt                                 | Empfehlung                                                                           |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| 0     | Schema/Migration                       | Sonnet (Haiku geht, wenn die Migration danach geprüft wird)                          |
| 1     | Streichregeln, Tipp-Logik, Punktfeld   | **Sonnet** (Algorithmus + Tests sind vorgegeben, die SVG-Zeichnung braucht Sorgfalt) |
| 2     | Einstellungen, Farben                  | **Sonnet** (berührt viele Dateien)                                                   |
| 3     | Dienes-Material                        | **Sonnet**                                                                           |
| 4     | Lehrkraft-Voreinstellungen             | Sonnet oder Haiku                                                                    |
| 5     | Assistent, Rennarten, Geteilt mit Rest | **Sonnet** (5.4 ist die schwierigste Domänenänderung)                                |
| 6     | Set-Übersicht sortieren                | Sonnet                                                                               |
| 7     | Gruppen                                | **Sonnet** (Zugriffsregeln)                                                          |
| 8     | Vorlesen, Vitrine, Zugangskarte        | Haiku geht, Sonnet ist sicherer bei der Vitrine                                      |
| 9     | Doku, Abschlusslauf                    | Haiku                                                                                |

Gesamt-Empfehlung: **Sonnet (aktuell) für den ganzen Plan.** Haiku nur für die Phasen 0, 4, 8, 9,
und nur, wenn danach `npm run check && npm test` grün sind und ein Mensch die Handprobe macht.
Nach den Phasen 1, 3 und 5 lohnt sich eine kurze Durchsicht der Bilder im Browser
(Handprobe-Tabelle), weil Tests das Aussehen nicht vollständig prüfen.

---

## Abweichungen und Ergänzungen bei der Umsetzung

- Alle Schemaänderungen stehen in einer Migration (`drizzle/0006_*.sql`). Bestehende Pokale
  bekommen `scenario = 'race'`.
- Die Streichregeln und das Layout von Punktfeld und Dienes-Material liegen gemeinsam in
  `src/lib/domain/visuals.ts` (mit Tests für alle Beispiele aus dem PDF). Das Dienes-Material
  leitet seine Striche aus den Punktfeld-Zellen ab, deshalb gilt dieselbe Regel.
- Der Tipp-Typ `twenty` heißt jetzt `field`. Ein leerer Tipp-Text bedeutet „nur Bild“.
- Die Engine zählt „Tipp gezeigt“ nur noch, wenn es einen Tipp gibt (kein Tipp über 100).
- Einstellungen für Material und Farben stehen als Gruppe „Veranschaulichung“ in
  `SETTING_META` (Ebenen Set und Zuweisung); `visibleWhen` blendet die Stellenwertfarben nur bei
  „Nach Stellenwerten“ ein. Das Kind-Profil ändert sie nicht.
- Geteilt mit Rest hat zwei Schritte (Ergebnis, Rest). Fehlermuster `remainderTooBig`.
- `listSets` liefert weiter `range`; die Seite macht daraus `autoRange` für `setOrder.ts`.
- Zugangskarten: Der Flitzer steht über dem Namen. Geteilte Kinder haben keine Karte, darum
  zählt der Gruppen-Knopf dort nur die eigenen Kinder.
- Der Kinder-Startbildschirm: „Bestzeit jagen“ (gesperrt) war wegen `opacity` nicht kontrastreich
  genug und fiel erst auf, als alle Rennarten vorausgewählt waren. Jetzt ohne `opacity`.
- Neuer E2E-Test `tests/e2e/groups.e2e.ts` (Klasse, Zuweisen an die Klasse, Rest-Eingabe,
  Überschriften). Er heißt so, damit er nach `flow.e2e.ts` läuft (das „Details“-Kind der
  Auswertung ist sonst ein anderes).
- Es wurde nichts committet; die Änderungen liegen im Arbeitsverzeichnis.
