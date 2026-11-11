// Cartile, pachetul si amestecarea (cu generator determinist, pentru teste si reluari).

export type Culoare = 'inima' | 'romb' | 'trefla' | 'pica';
export const CULORI: readonly Culoare[] = ['inima', 'romb', 'trefla', 'pica'];

/** Valoare 2..14 (11 = J, 12 = Q, 13 = K, 14 = A). */
export interface Carte {
  readonly culoare: Culoare;
  readonly valoare: number;
}

const NUME_VALORI: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SIMBOL: Record<Culoare, string> = { inima: '♥', romb: '♦', trefla: '♣', pica: '♠' };

export const numeValoare = (v: number) => NUME_VALORI[v] ?? String(v);
export const textCarte = (c: Carte) => `${numeValoare(c.valoare)}${SIMBOL[c.culoare]}`;
export const egale = (a: Carte, b: Carte) => a.culoare === b.culoare && a.valoare === b.valoare;
export const cheie = (c: Carte) => `${c.culoare}-${c.valoare}`;

export const MIN_JUCATORI = 3;
export const MAX_JUCATORI = 6;

/**
 * Pachetul are 8 carti de jucator: 3 jucatori -> 24 (A..9), 4 -> 32 (A..7),
 * 5 -> 40 (A..5), 6 -> 48 (A..3).
 */
export function pachet(jucatori: number): Carte[] {
  if (jucatori < MIN_JUCATORI || jucatori > MAX_JUCATORI) {
    throw new Error(`Whist se joaca in ${MIN_JUCATORI}-${MAX_JUCATORI} jucatori`);
  }
  const celMaiMic = 15 - 2 * jucatori;
  const carti: Carte[] = [];
  for (const culoare of CULORI) {
    for (let v = 14; v >= celMaiMic; v--) carti.push({ culoare, valoare: v });
  }
  return carti;
}

/** Generator determinist (mulberry32). */
export function rngDinSamanta(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function amesteca<T>(lista: readonly T[], rng: () => number): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Sortare pentru afisare: pe culori, apoi descrescator. */
export function sorteazaMana(mana: readonly Carte[], atu: Culoare | null = null): Carte[] {
  const ordine = (c: Culoare) => (c === atu ? -1 : CULORI.indexOf(c));
  return [...mana].sort((a, b) => ordine(a.culoare) - ordine(b.culoare) || b.valoare - a.valoare);
}
