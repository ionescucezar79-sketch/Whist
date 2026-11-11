// Regulile whist-ului romanesc (dupa pagat.com/exact/romwhist.html), ca functii pure.
import type { Carte, Culoare } from './carti';

export type TipSecventa = '1-8-1' | '8-1-8';

export interface Reguli {
  secventa: TipSecventa;
  /** Puncte de baza la licitatie reusita (se adauga numarul de levate licitate). */
  punctePeReusita: number;
  /** Cate reusite / greseli la rand dau bonus / penalizare. 0 = fara serii. */
  lungimeSerie: number;
  bonusSerie: number;
  penalizareSerie: number;
  /** Mainile de cate o carte nu intra in serii (varianta frecventa la 1-8-1). */
  excludeMainiDeOCarteDinSerii: boolean;
}

export const REGULI_STANDARD: Reguli = {
  secventa: '1-8-1',
  punctePeReusita: 5,
  lungimeSerie: 5,
  bonusSerie: 10,
  penalizareSerie: 10,
  excludeMainiDeOCarteDinSerii: true,
};

const repeta = (valoare: number, ori: number) => Array.from({ length: ori }, () => valoare);
const urcare = [2, 3, 4, 5, 6, 7];
const coborare = [7, 6, 5, 4, 3, 2];

/**
 * Cate carti se impart la fiecare mana.
 * 1-8-1 pentru 4 jucatori: 1,1,1,1,2..7,8,8,8,8,7..2,1,1,1,1 (24 de maini).
 */
export function secventaMaini(jucatori: number, tip: TipSecventa): number[] {
  if (tip === '1-8-1') return [...repeta(1, jucatori), ...urcare, ...repeta(8, jucatori), ...coborare, ...repeta(1, jucatori)];
  return [...repeta(8, jucatori), ...coborare, ...repeta(1, jucatori), ...urcare, ...repeta(8, jucatori)];
}

/** Licitatiile pe care le poate face jucatorul. Ultimul (dealerul) nu poate face totalul egal cu nr. de carti. */
export function licitatiiPermise(nrCarti: number, licitatiiAnterioare: readonly number[], esteUltimul: boolean): number[] {
  const suma = licitatiiAnterioare.reduce((a, b) => a + b, 0);
  const toate = Array.from({ length: nrCarti + 1 }, (_, i) => i);
  return esteUltimul ? toate.filter((b) => suma + b !== nrCarti) : toate;
}

/**
 * Cartile care pot fi jucate: se raspunde la culoare; daca nu ai culoarea, esti obligat sa tai cu atu;
 * daca nu ai nici atu, arunci orice.
 */
export function cartiJucabile(mana: readonly Carte[], culoareCeruta: Culoare | null, atu: Culoare | null): Carte[] {
  if (culoareCeruta === null) return [...mana];
  const peCuloare = mana.filter((c) => c.culoare === culoareCeruta);
  if (peCuloare.length) return peCuloare;
  if (atu) {
    const atuuri = mana.filter((c) => c.culoare === atu);
    if (atuuri.length) return atuuri;
  }
  return [...mana];
}

/** True daca `a` bate `b` intr-o levata cu culoarea ceruta data. */
export function bate(a: Carte, b: Carte, culoareCeruta: Culoare, atu: Culoare | null): boolean {
  if (atu) {
    if (a.culoare === atu && b.culoare !== atu) return true;
    if (b.culoare === atu && a.culoare !== atu) return false;
    if (a.culoare === atu && b.culoare === atu) return a.valoare > b.valoare;
  }
  if (a.culoare === b.culoare) return a.valoare > b.valoare;
  return a.culoare === culoareCeruta && b.culoare !== culoareCeruta;
}

/** Indexul (in levata) cartii castigatoare. */
export function castigatorLevata(carti: readonly Carte[], atu: Culoare | null): number {
  if (!carti.length) throw new Error('levata goala');
  const ceruta = carti[0].culoare;
  let best = 0;
  for (let i = 1; i < carti.length; i++) if (bate(carti[i], carti[best], ceruta, atu)) best = i;
  return best;
}

/** Punctele pentru o mana, fara bonusurile de serie. */
export function puncteMana(licitat: number, luat: number, reguli: Reguli = REGULI_STANDARD): number {
  return licitat === luat ? reguli.punctePeReusita + licitat : -Math.abs(licitat - luat);
}
