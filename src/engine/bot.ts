// Botul: estimeaza cate levate poate face si joaca pentru a lua exact cat a licitat.
import { cheie, pachet, type Carte, type Culoare } from './carti';
import { bate, castigatorLevata } from './reguli';
import { cartiPosibile, culoareCeruta, licitatiiPosibile, type Partida } from './partida';

export type Nivel = 'usor' | 'mediu' | 'greu';

const GRESELI: Record<Nivel, { licitare: number; joc: number }> = {
  usor: { licitare: 0.35, joc: 0.25 },
  mediu: { licitare: 0.1, joc: 0.07 },
  greu: { licitare: 0, joc: 0 },
};

/** Cartile pe care jucatorul nu le vede (nici in mana lui, nici jucate, nici cartea de atu intoarsa). */
function cartiNevazute(p: Partida, jucator: number): Carte[] {
  const vazute = new Set<string>();
  for (const c of p.mana.maini[jucator]) vazute.add(cheie(c));
  for (const x of p.mana.levataCurenta) vazute.add(cheie(x.carte));
  if (p.mana.carteAtu) vazute.add(cheie(p.mana.carteAtu));
  for (const c of p.mana.jucate) vazute.add(cheie(c));
  return pachet(p.jucatori.length).filter((c) => !vazute.has(cheie(c)));
}

/**
 * Probabilitatea aproximativa ca `carte` sa ia levata daca e jucata prima,
 * presupunand ca fiecare carte nevazuta e la un adversar cu probabilitatea `pAdversar`.
 */
function sansaCastig(carte: Carte, nevazute: readonly Carte[], pAdversar: number, atu: Culoare | null, nrCarti: number): number {
  let mai_mari = 0;
  let atuuri = 0;
  for (const c of nevazute) {
    if (c.culoare === carte.culoare && c.valoare > carte.valoare) mai_mari++;
    else if (atu && carte.culoare !== atu && c.culoare === atu) atuuri++;
  }
  // Un adversar taie doar daca nu are culoarea: probabil la maini mici, rar la maini mari.
  const sansaTaiere = nrCarti <= 2 ? 0.7 : nrCarti <= 4 ? 0.35 : 0.2;
  const amenintari = mai_mari + atuuri * sansaTaiere;
  return Math.pow(1 - pAdversar, amenintari);
}

function pAdversar(p: Partida, jucator: number, nevazute: number): number {
  const laAdversari = p.mana.maini.reduce((s, m, i) => (i === jucator ? s : s + m.length), 0);
  return nevazute ? Math.min(1, laAdversari / nevazute) : 0;
}

/** Estimarea botului: cate levate crede ca face cu mana lui. */
export function estimeazaLevate(p: Partida, jucator: number): number {
  const mana = p.mana.maini[jucator];
  const nev = cartiNevazute(p, jucator);
  const pa = pAdversar(p, jucator, nev.length);
  const { atu, nrCarti } = p.mana;
  let total = 0;
  for (const c of mana) {
    let s = sansaCastig(c, nev, pa, atu, nrCarti);
    // Cartile mici de atu castiga des pe culorile unde botul nu mai are carti.
    if (atu && c.culoare === atu && nrCarti >= 3) s = Math.max(s, 0.3);
    total += s;
  }
  // Mai multi jucatori = mai multa concurenta pe fiecare levata.
  return total * (1 - (p.jucatori.length - 3) * 0.04);
}

export function alegeLicitatia(p: Partida, nivel: Nivel = 'mediu', rng: () => number = Math.random): number {
  const permise = licitatiiPosibile(p);
  if (!permise.length) throw new Error('Botul nu poate licita acum');
  let tinta = estimeazaLevate(p, p.laRand);
  if (rng() < GRESELI[nivel].licitare) tinta += rng() < 0.5 ? -1 : 1;
  // Cea mai apropiata licitatie permisa; la egalitate, cea mai mica (e mai usor sa nu iei).
  return permise.reduce((best, b) => (Math.abs(b - tinta) < Math.abs(best - tinta) ? b : best));
}

export function alegeCartea(p: Partida, nivel: Nivel = 'mediu', rng: () => number = Math.random): Carte {
  const jucator = p.laRand;
  const posibile = cartiPosibile(p);
  if (!posibile.length) throw new Error('Botul nu poate juca acum');
  if (posibile.length === 1) return posibile[0];
  if (rng() < GRESELI[nivel].joc) return posibile[Math.floor(rng() * posibile.length)];

  const { atu, nrCarti } = p.mana;
  const vreaLevate = (p.mana.licitatii[jucator] ?? 0) - p.mana.levate[jucator] > 0;
  const ceruta = culoareCeruta(p);
  const nev = cartiNevazute(p, jucator);
  const pa = pAdversar(p, jucator, nev.length);
  const sansa = (c: Carte) => sansaCastig(c, nev, pa, atu, nrCarti);
  const dupa = <T>(lista: T[], f: (x: T) => number) => [...lista].sort((a, b) => f(a) - f(b));
  // La egalitate, botul pastreaza atuurile.
  const greutate = (c: Carte) => c.valoare + (c.culoare === atu ? 20 : 0);

  // Deschide levata
  if (ceruta === null) {
    if (vreaLevate) return dupa(posibile, (c) => -sansa(c) * 100 + greutate(c) / 100)[0];
    return dupa(posibile, (c) => sansa(c) * 100 + greutate(c) / 100)[0];
  }

  // Raspunde
  const levata = p.mana.levataCurenta.map((x) => x.carte);
  const actuala = levata[castigatorLevata(levata, atu)];
  const castigatoare = posibile.filter((c) => bate(c, actuala, ceruta, atu));
  const pierzatoare = posibile.filter((c) => !bate(c, actuala, ceruta, atu));
  const ultimul = levata.length === p.jucatori.length - 1;

  if (vreaLevate) {
    if (castigatoare.length) {
      // Ultimul ia cu cea mai mica; altfel cu cea mai sigura.
      return ultimul ? dupa(castigatoare, greutate)[0] : dupa(castigatoare, (c) => -sansa(c) * 100 + greutate(c) / 100)[0];
    }
    return dupa(pierzatoare, greutate)[0]; // scapa de cea mai mica
  }
  if (pierzatoare.length) return dupa(pierzatoare, (c) => -greutate(c))[0]; // scapa de cea mai mare care tot pierde
  // Trebuie sa ia: daca e ultimul, macar scapa de cea mai mare; altfel cea mai mica, poate o bate altul.
  return ultimul ? dupa(castigatoare, (c) => -greutate(c))[0] : dupa(castigatoare, greutate)[0];
}
