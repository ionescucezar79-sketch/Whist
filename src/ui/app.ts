// Interfata jucabila: un jucator uman (indexul 0) contra botilor, peste motorul din src/engine.
import {
  alegeCartea,
  alegeLicitatia,
  cartiPosibile,
  cheie,
  egale,
  joaca,
  liciteaza,
  licitatiiFacute,
  licitatiiPosibile,
  manaUrmatoare,
  numeValoare,
  partidaNoua,
  sorteazaMana,
  type Carte,
  type CarteJucata,
  type Culoare,
  type Nivel,
  type Partida,
  type Rezultat,
  type TipSecventa,
} from '../engine';
import { TEXTE, type Limba } from './text';

type Tema = 'covor' | 'banca' | 'pat' | 'turneu';

interface Setari {
  jucatori: number;
  nivel: Nivel;
  secventa: TipSecventa;
  tema: Tema;
  limba: Limba;
}

interface Stare {
  ecran: 'start' | 'joc';
  setari: Setari;
  p: Partida | null;
  ocupat: boolean;
  /** Levata incheiata, aratata cateva clipe inainte sa dispara. */
  levataAfisata: { carti: CarteJucata[]; castigator: number } | null;
  foaie: boolean;
  mesaj: string | null;
  confirmIesire: boolean;
}

const NUME_BOTI = ['Ana', 'Ion', 'Maria', 'Vlad', 'Elena'];
const SIMBOL: Record<Culoare, string> = { inima: '♥', romb: '♦', trefla: '♣', pica: '♠' };
const ROSU = (c: Culoare) => c === 'inima' || c === 'romb';

// Pozitiile adversarilor pe masa (procente), in ordinea jocului: primul e la stanga ta.
const LOCURI: Record<number, [number, number][]> = {
  3: [[11, 44], [89, 44]],
  4: [[11, 48], [50, 9], [89, 48]],
  5: [[11, 58], [26, 12], [74, 12], [89, 58]],
  6: [[10, 62], [17, 22], [50, 8], [83, 22], [90, 62]],
};

function citesteSetari(): Setari {
  const implicit: Setari = { jucatori: 4, nivel: 'mediu', secventa: '1-8-1', tema: 'covor', limba: 'ro' };
  try {
    const s = JSON.parse(localStorage.getItem('whist-setari') ?? 'null');
    if (s && typeof s === 'object') return { ...implicit, ...s };
  } catch {
    /* fara stocare */
  }
  return implicit;
}
function salveazaSetari(s: Setari) {
  try {
    localStorage.setItem('whist-setari', JSON.stringify(s));
  } catch {
    /* fara stocare */
  }
}

const st: Stare = {
  ecran: 'start',
  setari: citesteSetari(),
  p: null,
  ocupat: false,
  levataAfisata: null,
  foaie: false,
  mesaj: null,
  confirmIesire: false,
};

const t = () => TEXTE[st.setari.limba];
const app = document.getElementById('app')!;
let timerMesaj: number | undefined;

function arataMesaj(m: string) {
  st.mesaj = m;
  render();
  clearTimeout(timerMesaj);
  timerMesaj = window.setTimeout(() => {
    st.mesaj = null;
    render();
  }, 2200);
}

// ---------- logica ----------

function porneste() {
  const n = st.setari.jucatori;
  const jucatori = [
    { id: 'tu', nume: t().tu, bot: false },
    ...NUME_BOTI.slice(0, n - 1).map((nume, i) => ({ id: `b${i}`, nume, bot: true })),
  ];
  st.p = partidaNoua(jucatori, { reguli: { secventa: st.setari.secventa } });
  st.ecran = 'joc';
  st.levataAfisata = null;
  st.foaie = false;
  st.confirmIesire = false;
  render();
  pompa();
}

function aplica(r: Rezultat) {
  if (!r.ok) {
    arataMesaj(r.eroare);
    return;
  }
  const inainte = st.p!;
  st.p = r.partida;
  const ul = r.partida.mana.ultimaLevata;
  if (ul && ul !== inainte.mana.ultimaLevata) {
    st.levataAfisata = ul;
    st.ocupat = true;
    render();
    window.setTimeout(() => {
      st.levataAfisata = null;
      st.ocupat = false;
      render();
      pompa();
    }, 1300);
    return;
  }
  render();
  pompa();
}

/** Muta botii, pe rand, cu o mica pauza ca sa se vada ce fac. */
function pompa() {
  const p = st.p;
  if (!p || st.ocupat || st.ecran !== 'joc') return;
  if ((p.faza === 'licitare' || p.faza === 'joc') && p.jucatori[p.laRand].bot) {
    st.ocupat = true;
    render();
    window.setTimeout(() => {
      st.ocupat = false;
      const q = st.p!;
      if (q !== p) return;
      if (q.faza === 'licitare') aplica(liciteaza(q, q.laRand, alegeLicitatia(q, st.setari.nivel)));
      else aplica(joaca(q, q.laRand, alegeCartea(q, st.setari.nivel)));
    }, p.faza === 'licitare' ? 650 : 750);
  }
}

// ---------- randare ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function carteHtml(c: Carte, cls = '', extra = '') {
  return `<span class="carte ${ROSU(c.culoare) ? 'rosu' : 'negru'} ${cls}" ${extra}><b>${numeValoare(c.valoare)}</b><i>${SIMBOL[c.culoare]}</i></span>`;
}
const dosHtml = (cls = '') => `<span class="dos ${cls}"></span>`;

function locuriMasa(p: Partida): [number, number][] {
  return [[50, 100], ...LOCURI[p.jucatori.length]];
}

function clasament(p: Partida): number {
  const eu = p.scor[0];
  return 1 + p.scor.filter((s) => s > eu).length;
}

function renderStart() {
  const s = st.setari;
  const T = t();
  const opt = <K extends keyof Setari>(cheieS: K, valori: [Setari[K], string][]) =>
    `<div class="seg" role="radiogroup">${valori
      .map(([v, eticheta]) => `<button role="radio" aria-checked="${s[cheieS] === v}" data-set="${cheieS}" data-val="${v}">${eticheta}</button>`)
      .join('')}</div>`;
  app.className = 'start';
  app.innerHTML = `
  <main class="ecran-start">
    <h1>Whist</h1>
    <p class="sub">${T.subtitlu}</p>
    <section><h2>${T.limba}</h2>${opt('limba', [['ro', 'Română'], ['en', 'English']])}</section>
    <section><h2>${T.jucatori}</h2>${opt('jucatori', [[3, '3'], [4, '4'], [5, '5'], [6, '6']])}</section>
    <section><h2>${T.nivel}</h2>${opt('nivel', [['usor', T.usor], ['mediu', T.mediu], ['greu', T.greu]])}</section>
    <section><h2>${T.unde}</h2>
      <div class="teme">${(['banca', 'covor', 'pat', 'turneu'] as Tema[])
        .map((tm) => `<button class="tema-btn" aria-pressed="${s.tema === tm}" data-set="tema" data-val="${tm}"><span class="mini ${tm}"></span>${T[tm]}</button>`)
        .join('')}</div>
    </section>
    <section><h2>${T.secventa}</h2>${opt('secventa', [['1-8-1', '1 → 8 → 1'], ['8-1-8', '8 → 1 → 8']])}</section>
    <details><summary>${T.reguli}</summary><p>${T.regulileText}</p></details>
    <button class="principal" data-act="start">${T.incepe}</button>
  </main>`;
}

function renderJoc() {
  const p = st.p!;
  const T = t();
  const n = p.jucatori.length;
  const locuri = locuriMasa(p);
  const m = p.mana;
  const meuRand = p.laRand === 0 && !st.ocupat;
  const posibile = meuRand && p.faza === 'joc' ? cartiPosibile(p) : [];
  const nume = (i: number) => (i === 0 ? T.tu : p.jucatori[i].nume);

  // Adversarii
  const adversari = p.jucatori
    .map((j, i) => {
      if (i === 0) return '';
      const [x, y] = locuri[i];
      const lic = m.licitatii[i];
      const badge =
        p.faza === 'licitare' ? (lic === null ? '…' : T.aZis(lic)) : `${lic ?? '–'} / ${m.levate[i]}`;
      const activ = p.laRand === i && (p.faza === 'licitare' || p.faza === 'joc') && !st.levataAfisata;
      const dosuri = Array.from({ length: Math.min(m.maini[i].length, 8) }, () => dosHtml('mic')).join('');
      return `<div class="loc ${activ ? 'activ' : ''}" style="left:${x}%;top:${y}%">
        <span class="avatar">${esc(j.nume[0])}${m.dealer === i ? '<em class="d">D</em>' : ''}</span>
        <b class="nume">${esc(j.nume)}</b>
        <span class="badge">${badge}</span>
        <span class="dosuri">${dosuri}</span>
      </div>`;
    })
    .join('');

  // Cartile din mijloc
  const carti = st.levataAfisata?.carti ?? m.levataCurenta;
  const castig = st.levataAfisata?.castigator;
  const mijloc = carti
    .map(({ jucator, carte }, k) => {
      const [x, y] = locuri[jucator];
      const cx = 50 + (x - 50) * 0.3;
      const cy = 47 + (y - 47) * 0.3;
      const rot = ((jucator * 37) % 24) - 12;
      return carteHtml(carte, `pe-masa ${castig === jucator ? 'castiga' : ''}`, `style="left:${cx}%;top:${cy}%;--r:${rot}deg;z-index:${k + 1}"`);
    })
    .join('');

  // Pachetul si atuul
  const pachet = m.carteAtu
    ? `<div class="pachet">${dosHtml('teanc')}${carteHtml(m.carteAtu, 'atu-carte')}<span class="eticheta">${T.atu} ${SIMBOL[m.carteAtu.culoare]}</span></div>`
    : `<div class="pachet"><span class="eticheta">${T.faraAtu}</span></div>`;

  // Mesaj central
  let centru = '';
  if (st.levataAfisata) centru = T.iaLevata(nume(st.levataAfisata.castigator));
  else if (p.faza === 'licitare' && p.laRand !== 0) {
    const s = licitatiiFacute(p).reduce((a, b) => a + b, 0);
    centru = T.totalLicitat(s, m.nrCarti);
  }

  // Mana mea
  const mana = sorteazaMana(m.maini[0], m.atu);
  const nrM = mana.length;
  const manaHtml = mana
    .map((c, k) => {
      const ok = posibile.some((x) => egale(x, c));
      const unghi = nrM > 1 ? (k - (nrM - 1) / 2) * Math.min(7, 40 / nrM) : 0;
      const cls = p.faza === 'joc' && meuRand ? (ok ? 'jucabila' : 'blocata') : '';
      return `<button class="carte-mana ${cls === 'jucabila' ? 'ok' : ''}" ${ok ? '' : 'aria-disabled="true"'} data-carte="${cheie(c)}" style="--u:${unghi}deg;--k:${k}">${carteHtml(c, cls)}</button>`;
    })
    .join('');

  // Bara de stare
  const lic0 = m.licitatii[0];
  let stare: string;
  if (p.faza === 'licitare' || p.faza === 'joc') {
    if (p.laRand === 0 && !st.levataAfisata) stare = `<b>${T.randulTau}</b>${p.faza === 'joc' && lic0 !== null ? ` · ${T.ziceAi(lic0, m.levate[0])}` : ''}`;
    else stare = `${T.seGandeste(esc(nume(p.laRand)))}${p.faza === 'joc' && lic0 !== null ? ` · ${T.ziceAi(lic0, m.levate[0])}` : ''}`;
  } else stare = '';

  // Licitarea mea
  let foaieLicitare = '';
  if (p.faza === 'licitare' && meuRand) {
    const permise = licitatiiPosibile(p);
    const facute = licitatiiFacute(p);
    const suma = facute.reduce((a, b) => a + b, 0);
    const interzise = Array.from({ length: m.nrCarti + 1 }, (_, i) => i).filter((i) => !permise.includes(i));
    foaieLicitare = `<div class="sheet licitare">
      <h2>${T.ceLevate}</h2>
      <p class="mic">${T.totalLicitat(suma, m.nrCarti)} · ${m.carteAtu ? `${T.atu}: <b class="${ROSU(m.carteAtu.culoare) ? 'atu-rosu' : 'atu-negru'}">${numeValoare(m.carteAtu.valoare)}${SIMBOL[m.carteAtu.culoare]}</b>` : T.faraAtu}</p>
      <div class="numere">${Array.from({ length: m.nrCarti + 1 }, (_, i) =>
        permise.includes(i)
          ? `<button data-lic="${i}">${i}</button>`
          : `<button disabled class="interzis" aria-label="${i}">${i}</button>`,
      ).join('')}</div>
      ${interzise.length ? `<p class="mic">${T.interzis(interzise[0], m.nrCarti)}</p>` : ''}
    </div>`;
  }

  // Sfarsit de mana / partida
  let modal = '';
  if (p.faza === 'sfarsitMana' && !st.levataAfisata) {
    const r = p.istoric[p.istoric.length - 1];
    modal = `<div class="modal"><div class="cutie">
      <h2>${T.manaGata}</h2>
      <table class="rez"><thead><tr><th></th><th>${T.licLuat}</th><th>${T.puncte}</th><th>${T.total}</th></tr></thead><tbody>
      ${p.jucatori.map((_, i) => `<tr class="${i === 0 ? 'eu' : ''}"><td>${esc(nume(i))}</td><td>${r.licitatii[i]} / ${r.levate[i]}</td>
        <td class="${r.puncte[i] < 0 ? 'neg' : 'poz'}">${r.puncte[i] > 0 ? '+' : ''}${r.puncte[i]}${r.bonus[i] ? ` <small>(${r.bonus[i] > 0 ? '+' : ''}${r.bonus[i]} ${T.serie})</small>` : ''}</td>
        <td><b>${p.scor[i]}</b></td></tr>`).join('')}
      </tbody></table>
      <button class="principal" data-act="urmatoarea">${p.indexMana + 1 >= p.secventa.length ? T.final : T.urmatoarea}</button>
    </div></div>`;
  } else if (p.faza === 'terminata') {
    const ordine = p.jucatori.map((_, i) => i).sort((a, b) => p.scor[b] - p.scor[a]);
    const castigator = ordine[0];
    modal = `<div class="modal"><div class="cutie">
      <h2>${T.final}</h2>
      <p class="mare">${castigator === 0 ? T.aiCastigat : T.aCastigat(esc(nume(castigator)))}</p>
      <ol class="podium">${ordine.map((i) => `<li class="${i === 0 ? 'eu' : ''}"><span>${esc(nume(i))}</span><b>${p.scor[i]}</b></li>`).join('')}</ol>
      <button class="principal" data-act="joc-nou">${T.jocNou}</button>
    </div></div>`;
  }

  if (st.confirmIesire) {
    modal = `<div class="modal"><div class="cutie">
      <h2>${T.iesiSigur}</h2>
      <div class="rand-butoane"><button class="secundar" data-act="ramai">${T.inchide}</button><button class="principal" data-act="iesi-da">${T.iesi}</button></div>
    </div></div>`;
  }

  app.className = `joc tema-${st.setari.tema}`;
  app.innerHTML = `
  <header class="sus">
    <button class="icon" data-act="iesi" aria-label="${T.iesi}">‹</button>
    <div class="info"><b>${T.mana(p.indexMana + 1, p.secventa.length, m.nrCarti)}</b>
      <span>${m.dealer === 0 ? `${T.tu} ${T.imparte}` : `${esc(nume(m.dealer))} ${T.imparte}`}</span></div>
    <button class="scor-btn" data-act="foaie">${T.tu} <b>${p.scor[0]}</b> · ${T.locul(clasament(p))}</button>
  </header>
  <section class="masa">
    <div class="suprafata"></div>
    ${adversari}
    ${pachet}
    ${mijloc}
    ${centru ? `<div class="centru">${centru}</div>` : ''}
  </section>
  <div class="stare">${stare}</div>
  <section class="mana-mea" style="--n:${nrM}">${manaHtml}</section>
  ${foaieLicitare}
  ${st.foaie ? renderFoaie(p) : ''}
  ${modal}
  ${st.mesaj ? `<div class="toast" role="status">${esc(st.mesaj)}</div>` : ''}`;
}

function renderFoaie(p: Partida): string {
  const T = t();
  const nume = (i: number) => (i === 0 ? T.tu : p.jucatori[i].nume);
  const randuri = p.secventa
    .map((k, idx) => {
      const r = p.istoric[idx];
      const curent = idx === p.indexMana && !r;
      const celule = p.jucatori
        .map((_, i) => {
          if (r) {
            const total = p.istoric.slice(0, idx + 1).reduce((s, x) => s + x.puncte[i], 0);
            return `<td><small>${r.licitatii[i]}/${r.levate[i]}</small> <b class="${total < 0 ? 'neg' : ''}">${total}</b>${r.bonus[i] ? '<sup>★</sup>' : ''}</td>`;
          }
          if (curent) {
            const b = p.mana.licitatii[i];
            return `<td><small>${b ?? '·'}/–</small></td>`;
          }
          return '<td></td>';
        })
        .join('');
      return `<tr class="${curent ? 'curent' : r ? '' : 'viitor'}"><td class="nr">${idx + 1}<small> · ${k}c</small></td>${celule}</tr>`;
    })
    .join('');
  return `<div class="modal foaie-modal" data-act="foaie-inchide"><div class="cutie hartie" data-stop="1">
    <div class="cap"><h2>${T.foaia}</h2><button class="secundar" data-act="foaie-inchide">${T.inchide}</button></div>
    <div class="scroll"><table class="foaie">
      <thead><tr><th>${T.mana_}</th>${p.jucatori.map((_, i) => `<th class="${i === 0 ? 'eu' : ''}">${esc(nume(i))}</th>`).join('')}</tr></thead>
      <tbody>${randuri}</tbody>
      <tfoot><tr><td>${T.total}</td>${p.scor.map((s, i) => `<td class="${i === 0 ? 'eu' : ''}"><b>${s}</b></td>`).join('')}</tr></tfoot>
    </table></div>
    <p class="mic">${T.licLuat} · ★ = ${T.serie} (±10)</p>
  </div></div>`;
}

function render() {
  if (st.ecran === 'start') renderStart();
  else renderJoc();
  if (st.foaie) app.querySelector('.foaie tr.curent')?.scrollIntoView({ block: 'center' });
}

// ---------- evenimente ----------

app.addEventListener('click', (e) => {
  const tinta = e.target as HTMLElement;
  const el = tinta.closest<HTMLElement>('[data-act],[data-set],[data-lic],[data-carte]');
  if (!el) return;
  if (el.dataset.set) {
    const k = el.dataset.set as keyof Setari;
    const v = el.dataset.val!;
    (st.setari as unknown as Record<string, unknown>)[k] = k === 'jucatori' ? Number(v) : v;
    salveazaSetari(st.setari);
    render();
    return;
  }
  const p = st.p;
  if (el.dataset.lic !== undefined && p) {
    if (st.ocupat || p.laRand !== 0) return;
    aplica(liciteaza(p, 0, Number(el.dataset.lic)));
    return;
  }
  if (el.dataset.carte && p) {
    if (st.ocupat || p.laRand !== 0 || p.faza !== 'joc') return;
    const c = p.mana.maini[0].find((x) => cheie(x) === el.dataset.carte);
    if (!c) return;
    if (!cartiPosibile(p).some((x) => egale(x, c))) {
      arataMesaj(t().nuPoti);
      return;
    }
    aplica(joaca(p, 0, c));
    return;
  }
  switch (el.dataset.act) {
    case 'start':
      porneste();
      break;
    case 'urmatoarea':
      if (p && p.faza === 'sfarsitMana') {
        st.p = manaUrmatoare(p);
        render();
        pompa();
      }
      break;
    case 'joc-nou':
      st.ecran = 'start';
      st.p = null;
      render();
      break;
    case 'foaie':
      st.foaie = true;
      render();
      break;
    case 'foaie-inchide':
      if (el.classList.contains('modal') && tinta.closest('[data-stop]')) return;
      st.foaie = false;
      render();
      break;
    case 'iesi':
      st.confirmIesire = true;
      render();
      break;
    case 'ramai':
      st.confirmIesire = false;
      render();
      break;
    case 'iesi-da':
      st.confirmIesire = false;
      st.ecran = 'start';
      st.p = null;
      render();
      break;
  }
});

render();
