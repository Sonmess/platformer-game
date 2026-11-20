# ADR 0011: Rozsah Milestone 5

- Stav: prijaté (2026-11-20)

## Kontext
M4 je hotový: hra má dva levely (les a jaskyňa), levely sú dáta, postup sa ukladá a jaskyňa končí oblúkom, cez ktorý
vidno les za súmraku s mesiacom. V jaskyni je tajná miestnosť so zlatou rybičkou. Príbeh tak priamo vedie do ďalšieho
levelu — do lesa za súmraku.

## Rozhodnutie
- **Jeden nový level: Les za súmraku** (level 3). Začína pri východe z jaskyne a nadväzuje na výhľad z nej.
- **Vzhľad:** lesné vrstvy pozadia prefarbené do súmraku (fialovomodré tóny) a k tomu nová vlastná vrstva oblohy
  s mesiacom a hviezdami (rovnaký štýl ako výhľad z jaskyne), tmavší trávnik a vlastné prepadávacie plošiny. Vlastná
  pokojná večerná hudobná slučka.
- **Jeden nový prvok: netopier.** Visí hore nohami na konári; keď sa mačka priblíži, strmhlav k nej zlietne a vráti sa
  hore. Mňauknutie ho vyruší (na chvíľu odletí hore a je neškodný), pazúriky ho odoženú z levelu.
- **Poklad:** tajná miestnosť so zlatou rybičkou bude len v leveli 3. Lesu ani jaskyni sa nič nepridáva. Obchodník,
  kde sa poklady vymieňajú za kozmetiku, je až neskôr.
- Level 3 je zatiaľ posledný: dokončenie hry ukáže záverečnú obrazovku.
- Všetka nová grafika, zvuky a hudba sú vlastné, generované skriptmi (`tools/`).

## Dôsledky
- Rámec pre levely z M4 sa využije bez zmien: nový level je ďalší záznam v `LEVELS` (mapa, terén, pozadie, hudba).
- `ParallaxLayerDef` už má `tint`, takže prefarbenie lesa je len nastavenie; pribudne generátor vrstvy oblohy.
- Netopier je prvý lietajúci nepriateľ s vlastným útokom (strmhlavý let), testuje sa ako ostatní nepriatelia
  (čistá logika v `src/core/`, scenáre v e2e).
