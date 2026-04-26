# Változásnapló

## [1.2.10] – 2026-04-26

### Javítva

- **Preview váltás + nyitott kereső**: preview nézetre váltáskor a keresősáv automatikusan bezáródik, így nincs visszaugrás `split` nézetbe.
- **Pozíciómegőrzés nézetváltáskor**: preview módra váltás közben megőrzi és visszaállítja az aktuális preview scroll pozíciót, ezért nem ugrik a dokumentum elejére.

## [1.2.9] – 2026-04-26

### Javítva

- **Raw editor keresés-kiemelés**: az editor nézetben is megjelenik minden találat sárgával, az aktuális találat narancssárgával.
- **Kereső Enter viselkedés**: Enter lenyomására a fókusz a keresőmezőn marad, nem ugrik át az editorba; az újabb Enter-ek a `Next` léptetésnek felelnek meg.

## [1.2.8] – 2026-04-26

### Javítva

- **Kereső fókuszugrás hiba**: gépelés közben a kereső már nem dobja át a fókuszt az editorra, így a find input stabilan aktív marad.
- **Preview kereső-kiemelés**: minden találat sárga kiemelést kap, az aktuális találat narancssárga.
- **Prev/Next preview követés**: léptetéskor a preview automatikusan az aktuális találathoz görget, és ott frissül az aktív kiemelés.

## [1.2.7] – 2026-04-26

### Javítva

- **Kereső gépelési teljesítmény**: az automatikus „első találatra ugrás” logika már deferred query alapján fut, így nagy dokumentumnál nem indít teljes keresést minden egyes leütésre.
- **Kevesebb felesleges keresőművelet**: egységesített trim-elt query ellenőrzések csökkentik az üres/whitespace keresésekből adódó fölösleges számításokat.

## [1.2.6] – 2026-04-26

### Javítva

- **Editor line number virtualizáció**: nagy dokumentum esetén a sorszám oszlop már csak a látható + ráhagyásos tartományt rendereli, így jelentősen kevesebb DOM elem keletkezik.
- **Kevesebb memória-allokáció kurzorkezelésnél**: a sor/oszlop számítás és a célpozíció-görgetés már nem `split` + nagy string szeleteléssel történik, hanem közvetlen karakterbejárással.

## [1.2.5] – 2026-04-26

### Javítva

- **Kereső teljesítmény-optimalizáció**: az editor keresőmotorja cache-eli az adott dokumentum + query + opciók kombinációhoz tartozó találatlistát, így `Next/Prev`, indexszámítás és találatszámlálás közben nem fut újra feleslegesen a teljes dokumentum bejárása.
- **Kevesebb memória-allokáció navigációnál**: a visszafelé keresés már nem készít minden lépésnél fordított tömbmásolatot.
- **App oldali találatszámláló**: ahol elérhető, a cache-elt editor számlálót használja a külön regex-szkennelés helyett.

## [1.2.4] – 2026-04-26

### Javítva

- **Ablakállapot mentése/visszaállítása**: az alkalmazás már megjegyzi az utolsó ablakméretet, pozíciót, maximalizált és teljes képernyős állapotot, majd induláskor visszaállítja azt.
- **Zárás utáni élmény**: az állapot mentése `move/resize/maximize/fullscreen` eseményekre ütemezetten, illetve bezáráskor azonnal is megtörténik.

## [1.2.3] – 2026-04-26

### Javítva

- **Keresősáv bezárása**: új, vizuálisan a meglévő kezelőelemekhez igazított `X` gomb került a keresősáv jobb oldalára, amivel egy kattintással bezárható a panel.

## [1.2.2] – 2026-04-26

### Javítva

- **Kereső navigáció (`0/3`, Prev/Next nem működik)**: ha csak előnézet nézet aktív volt, az editor komponens nem volt mountolva, ezért a kereső találatkezelés nem tudott működni. Kereső megnyitásakor a rendszer automatikusan `split` nézetre vált, így a találatokra ugrás és kijelölés stabilan működik.
- **`Ctrl+F` ismételt lenyomása**: a keresőmező minden alkalommal fókuszt kap, és a meglévő keresőkifejezés kijelölődik.
- **Kereső input reakcióidő**: a találatszámlálás `useDeferredValue` alapú, így nagy dokumentumnál gördülékenyebb a gépelés.

## [1.2.1] – 2026-04-26

### Javítva

- **Előnézet – belső hivatkozások (TOC, `#fejezet`)**: a `rehype-sanitize` (GitHub-séma) miatt a címsorok `id` attribútuma `user-content-` előtaggal kerül a DOM-ba. A korábbi kód csak a nyers fragmentet kereste, ezért a tartalomjegyzék linkek nem görgettek a megfelelő fejezethez. A keresés most a nyers és az előtagolt azonosítót is figyelembe veszi, valamint a `name` attribútumot is.
