import { describe, expect, it } from 'vitest';
import {
  bate,
  cartiJucabile,
  castigatorLevata,
  licitatiiPermise,
  pachet,
  puncteMana,
  secventaMaini,
  type Carte,
} from '../src/engine';

const c = (valoare: number, culoare: Carte['culoare']): Carte => ({ culoare, valoare });

describe('pachet', () => {
  it.each([
    [3, 24, 9],
    [4, 32, 7],
    [5, 40, 5],
    [6, 48, 3],
  ])('%i jucatori: %i carti, cea mai mica %i', (n, total, minim) => {
    const p = pachet(n);
    expect(p).toHaveLength(total);
    expect(Math.min(...p.map((x) => x.valoare))).toBe(minim);
    expect(new Set(p.map((x) => `${x.culoare}${x.valoare}`)).size).toBe(total);
  });

  it('refuza 2 sau 7 jucatori', () => {
    expect(() => pachet(2)).toThrow();
    expect(() => pachet(7)).toThrow();
  });
});

describe('secventa', () => {
  it('1-8-1 pentru 4 jucatori (exemplul de pe pagat)', () => {
    expect(secventaMaini(4, '1-8-1')).toEqual([1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1]);
  });
  it('8-1-8 incepe si se termina cu cate o mana de 8 pentru fiecare', () => {
    const s = secventaMaini(3, '8-1-8');
    expect(s.slice(0, 3)).toEqual([8, 8, 8]);
    expect(s.slice(-3)).toEqual([8, 8, 8]);
    expect(s).toHaveLength(3 * 3 + 12);
  });
});

describe('licitare', () => {
  it('ultimul nu poate face totalul egal cu nr. de carti (exemplul de pe pagat)', () => {
    expect(licitatiiPermise(4, [2, 1], true)).toEqual([0, 2, 3, 4]);
  });
  it('ceilalti pot licita orice', () => {
    expect(licitatiiPermise(3, [1, 2], false)).toEqual([0, 1, 2, 3]);
  });
  it('daca suma deja depaseste, ultimul are toate variantele', () => {
    expect(licitatiiPermise(2, [2, 2], true)).toEqual([0, 1, 2]);
  });
});

describe('ce carti poti juca', () => {
  const mana = [c(14, 'inima'), c(9, 'inima'), c(10, 'pica'), c(7, 'trefla')];
  it('raspunzi la culoare', () => {
    expect(cartiJucabile(mana, 'inima', 'pica')).toEqual([c(14, 'inima'), c(9, 'inima')]);
  });
  it('fara culoare, esti obligat sa tai cu atu', () => {
    expect(cartiJucabile(mana, 'romb', 'pica')).toEqual([c(10, 'pica')]);
  });
  it('fara culoare si fara atu, arunci orice', () => {
    expect(cartiJucabile(mana, 'romb', 'romb')).toHaveLength(4);
    expect(cartiJucabile(mana, 'romb', null)).toHaveLength(4);
  });
  it('cand deschizi, orice carte', () => {
    expect(cartiJucabile(mana, null, 'pica')).toHaveLength(4);
  });
});

describe('cine ia levata', () => {
  it('cea mai mare din culoarea ceruta', () => {
    expect(castigatorLevata([c(10, 'inima'), c(14, 'romb'), c(12, 'inima')], 'pica')).toBe(2);
  });
  it('atuul bate orice', () => {
    expect(castigatorLevata([c(14, 'inima'), c(7, 'pica'), c(13, 'inima')], 'pica')).toBe(1);
  });
  it('atu mai mare bate atu mai mic', () => {
    expect(castigatorLevata([c(14, 'inima'), c(7, 'pica'), c(9, 'pica')], 'pica')).toBe(2);
  });
  it('fara atu (maini de 8)', () => {
    expect(castigatorLevata([c(9, 'trefla'), c(14, 'pica'), c(10, 'trefla')], null)).toBe(2);
  });
  it('o carte aruncata nu bate culoarea ceruta', () => {
    expect(bate(c(14, 'romb'), c(7, 'inima'), 'inima', 'pica')).toBe(false);
  });
});

describe('punctaj', () => {
  it('exact: 5 + levatele licitate', () => {
    expect(puncteMana(3, 3)).toBe(8);
    expect(puncteMana(0, 0)).toBe(5);
  });
  it('gresit: minus diferenta, in plus sau in minus', () => {
    expect(puncteMana(3, 2)).toBe(-1);
    expect(puncteMana(3, 5)).toBe(-2);
    expect(puncteMana(3, 0)).toBe(-3);
  });
});
