# ADR 0010: Rozsah Milestone 4

- Stav: prijaté (2026-11-20)

## Kontext
M3 je hotový a otestovaný; po ňom dostal level vlastný terén (ADR 0009), prepadávacie plošiny vlastný vzhľad
a životy sa dajú nazbierať až do 9. Hra má stále jeden level, ktorý končí vchodom do jaskyne. Pre ďalšie terény sú
pripravené štýly „murivo“ a „skala s kryštálmi“ (`tools/tiles.mjs`).

## Rozhodnutie
- **Jeden nový level: Jaskyňa.** Príbeh nadväzuje: mačka vojde do jaskyne na konci lesa a v leveli 2 ňou prechádza
  až k východu. Neskorší level (výstup z jaskyne, les za súmraku) je mimo M4.
- **Jaskyňa má vlastný vzhľad:** nový terén (tmavá vlhká skala s kryštálmi, strop s kvapľami), nový parallax
  (vlastný pixel art: steny jaskyne, siluety stalagmitov, kryštály) a vlastná hudobná slučka. Všetko generované
  skriptami ako doteraz (`tools/tiles.mjs`, nový generátor pozadia, `tools/music.mjs`).
- **Jeden nový prvok:** padajúce stalaktity — visia zo stropu, keď pod nimi mačka prebehne, zatrasú sa a spadnú;
  zásah je zásah (veľká mačka sa len zmenší). Iné nápady (vietor, gejzír, netopier) do backlogu.
- **Postup medzi levelmi je lineárny a ukladá sa:** po cieli Enter = ďalší level, životy a body sa prenášajú.
  Hra si v prehliadači pamätá najvyšší odomknutý level; úvodná obrazovka ponúkne pokračovať alebo vybrať level.
- **Levely sa stávajú dátami:** zoznam levelov v `constants.ts` (mapa, terén, prepadávacie plošiny, pozadie, hudba),
  scéna `Game` dostane číslo levelu. Testy (`landmarks.ts`, `route.spec.ts`) sa parametrizujú levelom.

## Dôsledky
- Pribúda rámec pre viac levelov, ktorý využije aj M5 (súmrak v lese) bez ďalších zmien kódu.
- Ukladanie postupu je prvé trvalé úložisko hry (`localStorage`, odolné voči zablokovanému úložisku).
- V jaskyni nie sú vrany (nehodia sa tam); lietajúceho nepriateľa môže priniesť neskorší míľnik.
- Viac vrstiev pozadia a tmavá paleta sa musia zmestiť do 60 FPS (kontrola v záverečnom kroku).
