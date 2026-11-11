// Starea unei partide si actiunile (imutabile): liciteaza, joaca, mana urmatoare.
// Aceeasi stare poate fi folosita local (contra botilor) si, mai tarziu, in Firestore pentru jocul online.
import { amesteca, egale, pachet, type Carte, type Culoare } from './carti';
import {
  REGULI_STANDARD,
  castigatorLevata,
  cartiJucabile,
  licitatiiPermise,
  puncteMana,
  secventaMaini,
  type Reguli,
} from './reguli';

export interface Jucator {
  id: string;
  nume: string;
  bot: boolean;
}

export interface CarteJucata {
  jucator: number;
  carte: Carte;
}

export type Faza = 'licitare' | 'joc' | 'sfarsitMana' | 'terminata';

export interface Mana {
  nrCarti: number;
  dealer: number;
  atu: Culoare | null;
  /** Cartea intoarsa care da atuul (null la mainile de 8, cand se imparte tot pachetul). */
  carteAtu: Carte | null;
  maini: Carte[][];
  /** Pe indexul jucatorului; null = inca nu a licitat. */
  licitatii: (number | null)[];
  levate: number[];
  levataCurenta: CarteJucata[];
  /** Cartile din levatele deja incheiate in mana asta (le vad toti). */
  jucate: Carte[];
  ultimaLevata: { carti: CarteJucata[]; castigator: number } | null;
}

export interface RezultatMana {
  nrCarti: number;
  atu: Culoare | null;
  licitatii: number[];
  levate: number[];
  /** Punctele castigate in mana, inclusiv bonus / penalizare de serie. */
  puncte: number[];
  bonus: number[];
}

export interface Partida {
  reguli: Reguli;
  jucatori: Jucator[];
  secventa: number[];
  indexMana: number;
  mana: Mana;
  faza: Faza;
  laRand: number;
  scor: number[];
  seriiReusite: number[];
  seriiGreseli: number[];
  istoric: RezultatMana[];
}

export type Rezultat = { ok: true; partida: Partida } | { ok: false; eroare: string };

const n = (p: Partida) => p.jucatori.length;
const urmatorul = (p: Partida, i: number) => (i + 1) % n(p);

function imparte(jucatori: number, nrCarti: number, dealer: number, rng: () => number): Mana {
  const carti = amesteca(pachet(jucatori), rng);
  const maini: Carte[][] = Array.from({ length: jucatori }, () => []);
  // Se imparte incepand cu jucatorul din stanga dealerului.
  for (let k = 0; k < nrCarti * jucatori; k++) maini[(dealer + 1 + k) % jucatori].push(carti[k]);
  const carteAtu = carti[nrCarti * jucatori] ?? null;
  return {
    nrCarti,
    dealer,
    atu: carteAtu?.culoare ?? null,
    carteAtu,
    maini,
    licitatii: Array(jucatori).fill(null),
    levate: Array(jucatori).fill(0),
    levataCurenta: [],
    jucate: [],
    ultimaLevata: null,
  };
}

export interface OptiuniPartida {
  reguli?: Partial<Reguli>;
  /** Implicit: aleator. */
  primulDealer?: number;
  rng?: () => number;
}

export function partidaNoua(jucatori: Jucator[], opt: OptiuniPartida = {}): Partida {
  const rng = opt.rng ?? Math.random;
  const reguli = { ...REGULI_STANDARD, ...opt.reguli };
  const secventa = secventaMaini(jucatori.length, reguli.secventa); // valideaza si nr. de jucatori
  const dealer = opt.primulDealer ?? Math.floor(rng() * jucatori.length);
  const zero = () => Array(jucatori.length).fill(0);
  return {
    reguli,
    jucatori,
    secventa,
    indexMana: 0,
    mana: imparte(jucatori.length, secventa[0], dealer, rng),
    faza: 'licitare',
    laRand: (dealer + 1) % jucatori.length,
    scor: zero(),
    seriiReusite: zero(),
    seriiGreseli: zero(),
    istoric: [],
  };
}

// ---- interogari ----

/** Licitatiile deja facute, in ordinea licitarii. */
export function licitatiiFacute(p: Partida): number[] {
  const r: number[] = [];
  for (let k = 1; k <= n(p); k++) {
    const b = p.mana.licitatii[(p.mana.dealer + k) % n(p)];
    if (b !== null) r.push(b);
  }
  return r;
}

export function licitatiiPosibile(p: Partida): number[] {
  if (p.faza !== 'licitare') return [];
  return licitatiiPermise(p.mana.nrCarti, licitatiiFacute(p), p.laRand === p.mana.dealer);
}

export function culoareCeruta(p: Partida): Culoare | null {
  return p.mana.levataCurenta[0]?.carte.culoare ?? null;
}

export function cartiPosibile(p: Partida, jucator = p.laRand): Carte[] {
  if (p.faza !== 'joc' || jucator !== p.laRand) return [];
  return cartiJucabile(p.mana.maini[jucator], culoareCeruta(p), p.mana.atu);
}

// ---- actiuni ----

export function liciteaza(p: Partida, jucator: number, licitatie: number): Rezultat {
  if (p.faza !== 'licitare') return { ok: false, eroare: 'Nu se liciteaza acum' };
  if (jucator !== p.laRand) return { ok: false, eroare: 'Nu esti la rand' };
  if (!licitatiiPosibile(p).includes(licitatie)) {
    return { ok: false, eroare: `Licitatia ${licitatie} nu e permisa` };
  }
  const licitatii = [...p.mana.licitatii];
  licitatii[jucator] = licitatie;
  const gata = jucator === p.mana.dealer;
  return {
    ok: true,
    partida: {
      ...p,
      mana: { ...p.mana, licitatii },
      faza: gata ? 'joc' : 'licitare',
      laRand: urmatorul(p, jucator), // dupa dealer incepe jocul cel din stanga lui
    },
  };
}

export function joaca(p: Partida, jucator: number, carte: Carte): Rezultat {
  if (p.faza !== 'joc') return { ok: false, eroare: 'Nu se joaca acum' };
  if (jucator !== p.laRand) return { ok: false, eroare: 'Nu esti la rand' };
  if (!p.mana.maini[jucator].some((c) => egale(c, carte))) return { ok: false, eroare: 'Nu ai aceasta carte' };
  if (!cartiPosibile(p).some((c) => egale(c, carte))) {
    return { ok: false, eroare: 'Trebuie sa raspunzi la culoare sau sa tai cu atu' };
  }

  const maini = p.mana.maini.map((m, i) => (i === jucator ? m.filter((c) => !egale(c, carte)) : m));
  const levataCurenta = [...p.mana.levataCurenta, { jucator, carte }];

  if (levataCurenta.length < n(p)) {
    return { ok: true, partida: { ...p, mana: { ...p.mana, maini, levataCurenta }, laRand: urmatorul(p, jucator) } };
  }

  // Levata completa
  const castigator = levataCurenta[castigatorLevata(levataCurenta.map((x) => x.carte), p.mana.atu)].jucator;
  const levate = p.mana.levate.map((v, i) => (i === castigator ? v + 1 : v));
  const jucate = [...p.mana.jucate, ...levataCurenta.map((x) => x.carte)];
  const mana: Mana = { ...p.mana, maini, levate, levataCurenta: [], jucate, ultimaLevata: { carti: levataCurenta, castigator } };

  if (maini[0].length > 0) return { ok: true, partida: { ...p, mana, laRand: castigator } };
  return { ok: true, partida: incheieMana({ ...p, mana }) };
}

export interface CalculMana {
  puncte: number[];
  bonus: number[];
  seriiReusite: number[];
  seriiGreseli: number[];
}

/** Punctele unei maini, cu bonusul / penalizarea de serie. Functie pura, folosita si pe server. */
export function calculeazaMana(
  reguli: Reguli,
  nrCarti: number,
  licitatii: readonly number[],
  levate: readonly number[],
  seriiReusiteAnterioare: readonly number[],
  seriiGreseliAnterioare: readonly number[],
): CalculMana {
  const seriiReusite = [...seriiReusiteAnterioare];
  const seriiGreseli = [...seriiGreseliAnterioare];
  const bonus = licitatii.map(() => 0);
  const conteazaLaSerii = reguli.lungimeSerie > 0 && !(reguli.excludeMainiDeOCarteDinSerii && nrCarti === 1);

  const puncte = licitatii.map((b, i) => {
    const luat = levate[i];
    if (conteazaLaSerii) {
      if (b === luat) {
        seriiGreseli[i] = 0;
        if (++seriiReusite[i] === reguli.lungimeSerie) {
          bonus[i] = reguli.bonusSerie;
          seriiReusite[i] = 0;
        }
      } else {
        seriiReusite[i] = 0;
        if (++seriiGreseli[i] === reguli.lungimeSerie) {
          bonus[i] = -reguli.penalizareSerie;
          seriiGreseli[i] = 0;
        }
      }
    }
    return puncteMana(b, luat, reguli) + bonus[i];
  });
  return { puncte, bonus, seriiReusite, seriiGreseli };
}

function incheieMana(p: Partida): Partida {
  const licitatii = p.mana.licitatii as number[];
  const { puncte, bonus, seriiReusite, seriiGreseli } = calculeazaMana(
    p.reguli, p.mana.nrCarti, licitatii, p.mana.levate, p.seriiReusite, p.seriiGreseli,
  );
  return {
    ...p,
    faza: 'sfarsitMana',
    scor: p.scor.map((s, i) => s + puncte[i]),
    seriiReusite,
    seriiGreseli,
    istoric: [
      ...p.istoric,
      { nrCarti: p.mana.nrCarti, atu: p.mana.atu, licitatii, levate: p.mana.levate, puncte, bonus },
    ],
  };
}

/** Dupa `sfarsitMana`: imparte mana urmatoare sau termina partida. */
export function manaUrmatoare(p: Partida, rng: () => number = Math.random): Partida {
  if (p.faza !== 'sfarsitMana') throw new Error('Mana nu s-a terminat');
  const indexMana = p.indexMana + 1;
  if (indexMana >= p.secventa.length) return { ...p, faza: 'terminata' };
  const dealer = urmatorul(p, p.mana.dealer);
  return {
    ...p,
    indexMana,
    mana: imparte(n(p), p.secventa[indexMana], dealer, rng),
    faza: 'licitare',
    laRand: urmatorul(p, dealer),
  };
}

/** Indecsii jucatorilor cu scorul maxim (pot fi mai multi la egalitate). */
export function castigatori(p: Partida): number[] {
  const max = Math.max(...p.scor);
  return p.scor.flatMap((s, i) => (s === max ? [i] : []));
}
