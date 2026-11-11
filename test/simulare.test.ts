import { describe, expect, it } from 'vitest';
import {
  alegeCartea,
  alegeLicitatia,
  joaca,
  liciteaza,
  manaUrmatoare,
  pachet,
  partidaNoua,
  rngDinSamanta,
  type Nivel,
  type Partida,
  type TipSecventa,
} from '../src/engine';

/** Joaca o partida intreaga doar cu boti si verifica regulile la fiecare pas. */
function simuleaza(niveluri: Nivel[], samanta: number, secventa: TipSecventa = '1-8-1'): Partida {
  const rng = rngDinSamanta(samanta);
  const jucatori = niveluri.map((_, i) => ({ id: `b${i}`, nume: `Bot ${i}`, bot: true }));
  let p = partidaNoua(jucatori, { rng, reguli: { secventa } });
  let pasi = 0;
  while (p.faza !== 'terminata') {
    if (++pasi > 10_000) throw new Error('partida nu se termina');
    if (p.faza === 'licitare') {
      const r = liciteaza(p, p.laRand, alegeLicitatia(p, niveluri[p.laRand], rng));
      if (!r.ok) throw new Error(r.eroare);
      p = r.partida;
    } else if (p.faza === 'joc') {
      const r = joaca(p, p.laRand, alegeCartea(p, niveluri[p.laRand], rng));
      if (!r.ok) throw new Error(r.eroare);
      p = r.partida;
    } else {
      // Invarianti la sfarsitul fiecarei maini
      const ultima = p.istoric[p.istoric.length - 1];
      expect(ultima.levate.reduce((a, b) => a + b, 0)).toBe(ultima.nrCarti);
      expect(ultima.licitatii.reduce((a, b) => a + b, 0)).not.toBe(ultima.nrCarti);
      expect(p.mana.jucate).toHaveLength(ultima.nrCarti * jucatori.length);
      expect(new Set(p.mana.jucate.map((c) => `${c.culoare}${c.valoare}`)).size).toBe(p.mana.jucate.length);
      p = manaUrmatoare(p, rng);
    }
  }
  return p;
}

describe('partide complete intre boti', () => {
  for (const n of [3, 4, 5, 6]) {
    for (const secventa of ['1-8-1', '8-1-8'] as const) {
      it(`${n} jucatori, ${secventa}`, () => {
        const p = simuleaza(Array(n).fill('mediu'), 100 + n, secventa);
        expect(p.istoric).toHaveLength(3 * n + 12);
        const total = p.istoric.reduce((s, m) => s.map((v, i) => v + m.puncte[i]), Array(n).fill(0));
        expect(total).toEqual(p.scor);
        expect(pachet(n)).toHaveLength(8 * n);
      });
    }
  }
});

describe('calitatea botului', () => {
  function procentReusite(p: Partida, jucator: number) {
    const ok = p.istoric.filter((m) => m.licitatii[jucator] === m.levate[jucator]).length;
    return ok / p.istoric.length;
  }

  it('botul greu isi face licitatia in majoritatea mainilor', () => {
    let suma = 0;
    const partide = 40;
    for (let s = 0; s < partide; s++) suma += procentReusite(simuleaza(['greu', 'greu', 'greu', 'greu'], s), 0);
    const medie = suma / partide;
    console.log(`bot greu, 4 jucatori: ${(medie * 100).toFixed(1)}% maini reusite`);
    expect(medie).toBeGreaterThan(0.5);
  });

  it('botul greu bate botii usori', () => {
    let diferenta = 0;
    const partide = 40;
    for (let s = 0; s < partide; s++) {
      const p = simuleaza(['greu', 'usor', 'usor', 'usor'], 1000 + s);
      diferenta += p.scor[0] - (p.scor[1] + p.scor[2] + p.scor[3]) / 3;
    }
    console.log(`greu vs usor: +${(diferenta / partide).toFixed(1)} puncte pe partida`);
    expect(diferenta / partide).toBeGreaterThan(5);
  });
});
