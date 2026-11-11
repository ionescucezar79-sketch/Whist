import { describe, expect, it } from 'vitest';
import {
  REGULI_STANDARD,
  calculeazaMana,
  cartiPosibile,
  joaca,
  liciteaza,
  manaUrmatoare,
  partidaNoua,
  rngDinSamanta,
  type Carte,
  type Jucator,
  type Partida,
} from '../src/engine';

const jucatori = (n: number): Jucator[] =>
  Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nume: `Jucator ${i}`, bot: i > 0 }));

function ok(r: ReturnType<typeof liciteaza>): Partida {
  if (!r.ok) throw new Error(r.eroare);
  return r.partida;
}

/** O partida cu mana fixata, pentru teste exacte. */
function cuMana(p: Partida, maini: Carte[][], atu: Partida['mana']['atu']): Partida {
  return { ...p, mana: { ...p.mana, maini, atu, nrCarti: maini[0].length } };
}

const c = (valoare: number, culoare: Carte['culoare']): Carte => ({ culoare, valoare });

describe('impartirea', () => {
  it('prima mana: 1 carte fiecaruia, atu intors, incepe cel din stanga dealerului', () => {
    const p = partidaNoua(jucatori(4), { primulDealer: 2, rng: rngDinSamanta(1) });
    expect(p.mana.maini.every((m) => m.length === 1)).toBe(true);
    expect(p.mana.carteAtu).not.toBeNull();
    expect(p.mana.atu).toBe(p.mana.carteAtu!.culoare);
    expect(p.laRand).toBe(3);
    expect(p.faza).toBe('licitare');
  });

  it('la mainile de 8 se imparte tot pachetul si nu exista atu', () => {
    const p = partidaNoua(jucatori(4), { primulDealer: 0, rng: rngDinSamanta(2), reguli: { secventa: '8-1-8' } });
    expect(p.mana.maini.every((m) => m.length === 8)).toBe(true);
    expect(p.mana.atu).toBeNull();
    expect(p.mana.carteAtu).toBeNull();
  });
});

describe('licitarea', () => {
  it('ordinea si restrictia dealerului', () => {
    let p = partidaNoua(jucatori(3), { primulDealer: 0, rng: rngDinSamanta(3) }); // 1 carte
    expect(liciteaza(p, 0, 0).ok).toBe(false); // nu e la rand
    p = ok(liciteaza(p, 1, 1));
    p = ok(liciteaza(p, 2, 0));
    const r = liciteaza(p, 0, 0); // 1+0+0 = 1 carte: interzis
    expect(r.ok).toBe(false);
    p = ok(liciteaza(p, 0, 1));
    expect(p.faza).toBe('joc');
    expect(p.laRand).toBe(1);
  });
});

describe('jocul', () => {
  it('obligatia de culoare si de atu e verificata', () => {
    let p = partidaNoua(jucatori(3), { primulDealer: 0, rng: rngDinSamanta(4) });
    p = cuMana(p, [[c(9, 'trefla'), c(10, 'pica')], [c(14, 'inima'), c(13, 'trefla')], [c(12, 'inima'), c(11, 'romb')]], 'pica');
    p = ok(liciteaza(p, 1, 1));
    p = ok(liciteaza(p, 2, 1));
    p = ok(liciteaza(p, 0, 1)); // 3 != 2, permis
    p = ok(joaca(p, 1, c(14, 'inima')));
    expect(joaca(p, 2, c(11, 'romb')).ok).toBe(false); // are inima
    p = ok(joaca(p, 2, c(12, 'inima')));
    expect(cartiPosibile(p)).toEqual([c(10, 'pica')]); // n-are inima: trebuie sa taie
    expect(joaca(p, 0, c(9, 'trefla')).ok).toBe(false);
    p = ok(joaca(p, 0, c(10, 'pica')));
    expect(p.mana.levate).toEqual([1, 0, 0]);
    expect(p.laRand).toBe(0); // castigatorul deschide
  });

  it('sfarsitul mainii: punctaj si mana urmatoare cu dealerul mutat', () => {
    let p = partidaNoua(jucatori(3), { primulDealer: 0, rng: rngDinSamanta(5) });
    p = cuMana(p, [[c(9, 'trefla')], [c(14, 'inima')], [c(12, 'inima')]], 'pica');
    p = ok(liciteaza(p, 1, 1));
    p = ok(liciteaza(p, 2, 1));
    p = ok(liciteaza(p, 0, 0));
    p = ok(joaca(p, 1, c(14, 'inima')));
    p = ok(joaca(p, 2, c(12, 'inima')));
    p = ok(joaca(p, 0, c(9, 'trefla')));
    expect(p.faza).toBe('sfarsitMana');
    expect(p.scor).toEqual([5, 6, -1]);
    const urm = manaUrmatoare(p, rngDinSamanta(6));
    expect(urm.mana.dealer).toBe(1);
    expect(urm.laRand).toBe(2);
  });
});

describe('serii', () => {
  const R = REGULI_STANDARD;
  const zero = [0, 0, 0];

  it('a 5-a reusita la rand aduce +10 si reseteaza seria', () => {
    const r = calculeazaMana(R, 3, [1, 0, 1], [1, 0, 1], [4, 0, 0], zero);
    expect(r.bonus).toEqual([10, 0, 0]);
    expect(r.puncte[0]).toBe(5 + 1 + 10);
    expect(r.seriiReusite).toEqual([0, 1, 1]);
  });

  it('a 5-a greseala la rand aduce -10', () => {
    const r = calculeazaMana(R, 3, [2, 0, 0], [0, 1, 2], zero, [4, 0, 0]);
    expect(r.bonus).toEqual([-10, 0, 0]);
    expect(r.puncte[0]).toBe(-2 - 10);
  });

  it('o greseala intrerupe seria de reusite', () => {
    const r = calculeazaMana(R, 3, [1, 1, 1], [0, 1, 2], [4, 4, 4], zero);
    expect(r.seriiReusite).toEqual([0, 0, 0]);
    expect(r.bonus).toEqual([0, 10, 0]);
  });

  it('mainile de o carte nu conteaza si nu rup seria', () => {
    const r = calculeazaMana(R, 1, [1, 0, 0], [1, 0, 0], [4, 4, 0], [0, 0, 4]);
    expect(r.bonus).toEqual([0, 0, 0]);
    expect(r.seriiReusite).toEqual([4, 4, 0]);
    expect(r.seriiGreseli).toEqual([0, 0, 4]);
  });

  it('varianta in care si mainile de o carte conteaza', () => {
    const r = calculeazaMana({ ...R, excludeMainiDeOCarteDinSerii: false }, 1, [1, 0, 0], [1, 0, 0], [4, 0, 0], zero);
    expect(r.bonus).toEqual([10, 0, 0]);
  });
});
