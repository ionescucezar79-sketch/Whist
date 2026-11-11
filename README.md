# Whist (românesc)

Motorul de reguli pentru whist-ul românesc, în TypeScript pur, fără dependențe, cu boți și teste.
Interfața (React + Vite + PWA, ca la Fazan) vine peste el.

## Pornire
```
npm install
npm test           # reguli, partide, serii + partide complete simulate între boți
npm run typecheck
```

## Reguli implementate (după pagat.com/exact/romwhist.html)
- **3–6 jucători**, 8 cărți de jucător: 3 → A..9, 4 → A..7, 5 → A..5, 6 → A..3.
- **Secvența 1-8-1**: N mâini de 1 carte, 2..7, N mâini de 8, 7..2, N mâini de 1 (3N+12 mâini).
  Varianta **8-1-8** e disponibilă în `reguli.secventa`.
- **Atu**: cartea întoarsă după împărțire. La mâinile de 8 se împarte tot pachetul, deci nu există atu.
- **Licitare**: începe cel din stânga dealerului. Dealerul, ultimul, nu poate face totalul egal cu numărul de cărți.
- **Joc**: se răspunde la culoare. Dacă nu ai culoarea, ești obligat să tai cu atu. Dacă nu ai nici atu, arunci orice.
- **Punctaj**: exact = 5 + levatele licitate; greșit = minus diferența.
- **Serii**: +10 la 5 reușite la rând, −10 la 5 greșeli la rând. Mâinile de o carte nu intră în serii.
  Totul e configurabil în `Reguli`.

## Structură
- `src/engine/carti.ts` – cărțile, pachetul, amestecarea deterministă
- `src/engine/reguli.ts` – funcții pure: secvența, licitări permise, cărți jucabile, cine ia levata, punctaj
- `src/engine/partida.ts` – starea partidei (imutabilă): `partidaNoua`, `liciteaza`, `joaca`, `manaUrmatoare`, `calculeazaMana`
- `src/engine/bot.ts` – botul: estimează levatele după probabilitatea fiecărei cărți de a lua și joacă pentru a lua exact cât a licitat. Are trei niveluri: `usor`, `mediu`, `greu`.

Starea e un obiect simplu, serializabil, așa că poate fi pusă direct în Firestore pentru jocul online.
Pentru online, `calculeazaMana` și validarea mutărilor trebuie rulate într-o Cloud Function.

## De făcut
- Interfața: lobby („ulița” de la Fazan), masa cu 3–6 scaune, licitarea, cărțile, tabela de scor
- Variante pentru mâinile de o carte: „pe frunte” (vezi cărțile celorlalți, nu pe a ta) și „pe orbește”
- Bot mai bun (simulări Monte Carlo pentru licitare)
- Modul online cu Firestore și locuri ocupate de boți
