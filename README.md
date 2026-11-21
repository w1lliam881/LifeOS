# LIFE OS

Mitt personliga produktivitetsoperativsystem: uppgifter, mål, vanor, lärande, journal och analys på ett ställe.

## Kom igång

```bash
npm install
npm run dev        # utvecklingsserver på http://localhost:5173
npm run build      # typkontroll + produktionsbygge i dist/
npm run preview    # kör produktionsbygget lokalt
npm test           # enhetstester (Vitest)
npm run typecheck  # bara TypeScript
```

## Sektioner

- **Översikt**: dagens fokus (max tre stjärnmärkta uppgifter), dagens uppgifter, vanor att bocka av, mål, lärande och en daglig reflektionsfråga.
- **Uppgifter**: vyerna Idag (inkl. försenade), Kommande, Alla öppna och Klara. Filtrera på sökord, prioritet, projekt och datum.
- **Mål**: veckomål (nollställs varje måndag) och långsiktiga mål med deadline, takt och historik. Arkivera eller återställ.
- **Vanor**: vecko- och månadsvy, dagligt schema eller valda veckodagar, nuvarande och längsta svit, andel klara.
- **Lärande**: ämnen med moment, veckomål i minuter, timer, lärpass med anteckningar och lärdomar.
- **Journal**: tre fasta frågor, humör och fritext, autosparning, kalender och sökning.
- **Analys**: uppgifter, vanekonsekvens, lärtid och måläge per period, jämfört med föregående period.

## Snabbinmatning

Skriv i fältet "Lägg till uppgift" och tryck Enter:
`Ring Anna imorgon ! #privat` blir en uppgift för imorgon med hög prioritet i projektet Privat.
Appen förstår `idag`, `imorgon`, `i övermorgon`, veckodagar (`fredag`), `någon gång`, `!` och `#projekt`.

Kortkommandon: `N` skapar en ny uppgift, `1`–`7` byter sektion och `Esc` stänger en dialog.

## Data

All data sparas i webbläsarens `localStorage` (nyckeln `lifeos:data`) på den enhet du använder. **Det finns ingen molnsynk.**
Under Inställningar kan du exportera allt som JSON och importera det igen, till exempel som säkerhetskopia eller för att flytta till en annan enhet.
Importen validerar filen och hoppar över ogiltiga poster.

## Arkitektur

```
src/
  lib/          affärslogik och data (ren TypeScript, enhetstestad)
    dates.ts      lokala datumnycklar "YYYY-MM-DD", aldrig UTC-konverterade
    tasks.ts      status, filtrering, sortering, snabbinmatning
    habits.ts     schema, svitar, andel klara
    goals.ts      värde, framsteg, takt, historik
    learning.ts, analytics.ts
    storage.ts    versionerad persistens, validering, export/import
    store.ts      liten extern store (useSyncExternalStore) med actions
  components/   återanvändbara UI-komponenter, dialoger, diagram
  pages/        en fil per sektion (laddas lazy)
  styles/       designsystem (CSS-variabler)
```
