/* Prototip Whist: interfata peste motorul din src/engine (global `Whist`). */
(function () {
  'use strict';
  var W = window.Whist;

  // ---------- texte RO / EN ----------
  var T = {
    ro: {
      titlu: 'Whist', sub: 'whist românesc · prototip', jucatori: 'Câți jucători?', unde: 'Unde jucați?',
      banca: 'Pe banca din fața blocului', covor: 'Pe covor', pat: 'În pat', turneu: 'Masă profesională',
      nivel: 'Boții', usor: 'ușor', mediu: 'mediu', greu: 'greu', secventa: 'Ordinea mâinilor',
      ziua: 'Mâinile zilei (aceleași cărți pentru toți, azi)', start: 'Începe partida', limba: 'Limba / Language',
      mana: 'Mâna', din: 'din', carti: 'cărți', carte: 'carte', atu: 'atu', faraAtu: 'fără atu',
      tu: 'Tu', randulTau: 'E rândul tău', liciteaza: 'Câte levate faci?', licitez: 'Licitez',
      interzis: function (b, n) { return 'Ca dealer nu poți spune ' + b + ': totalul ar fi ' + n + ', cât cărțile din mână.'; },
      liciteazaBot: function (x) { return x + ' licitează…'; }, joacaBot: function (x) { return x + ' joacă…'; },
      aZis: 'a zis', ia: function (x) { return x + ' ia levata'; }, iei: 'Iei tu levata',
      raspunde: 'Răspunde la culoare sau taie cu atu', foaie: 'Foaia de scor', inchide: 'Închide', total: 'Total',
      sfarsitMana: 'Sfârșitul mâinii', continua: 'Mâna următoare', final: 'Partida s-a terminat',
      castiga: function (x) { return x + ' câștigă!'; }, castigiTu: 'Ai câștigat!', din2: 'din',
      iarasi: 'Încă o partidă', meniu: 'Meniu', paraseste: 'Părăsește partida', licitat: 'licitat', luat: 'luat',
      serie: '+10 serie', serieMinus: '−10 serie', impartit: 'împarte', strange: 'Strânge', arata: 'Foaia'
    },
    en: {
      titlu: 'Whist', sub: 'Romanian whist · prototype', jucatori: 'How many players?', unde: 'Where do you play?',
      banca: 'The bench outside the block', covor: 'On the rug', pat: 'In bed', turneu: 'Professional table',
      nivel: 'Bots', usor: 'easy', mediu: 'medium', greu: 'hard', secventa: 'Hand order',
      ziua: "Today's hands (same cards for everyone today)", start: 'Start the game', limba: 'Limba / Language',
      mana: 'Hand', din: 'of', carti: 'cards', carte: 'card', atu: 'trump', faraAtu: 'no trump',
      tu: 'You', randulTau: 'Your turn', liciteaza: 'How many tricks will you take?', licitez: 'Bid',
      interzis: function (b, n) { return 'As dealer you cannot bid ' + b + ': the total would be ' + n + ', the number of cards.'; },
      liciteazaBot: function (x) { return x + ' is bidding…'; }, joacaBot: function (x) { return x + ' is playing…'; },
      aZis: 'bid', ia: function (x) { return x + ' takes the trick'; }, iei: 'You take the trick',
      raspunde: 'Follow suit, or trump if you can', foaie: 'Score sheet', inchide: 'Close', total: 'Total',
      sfarsitMana: 'End of hand', continua: 'Next hand', final: 'Game over',
      castiga: function (x) { return x + ' wins!'; }, castigiTu: 'You won!', din2: 'of',
      iarasi: 'Play again', meniu: 'Menu', paraseste: 'Leave the game', licitat: 'bid', luat: 'taken',
      serie: '+10 streak', serieMinus: '−10 streak', impartit: 'deals', strange: 'Collapse', arata: 'Sheet'
    }
  };
  var lang = 'ro';
  try { lang = localStorage.getItem('whist-limba') || 'ro'; } catch (e) {}
  function t(k) { return T[lang][k]; }

  var NUME_BOTI = ['Ion', 'Ana', 'Maria', 'Vlad', 'Elena'];
  var SIMBOL = { inima: '♥', romb: '♦', trefla: '♣', pica: '♠' };
  var ROSU = { inima: true, romb: true };

  // ---------- stare ----------
  var setari = { jucatori: 4, tema: 'covor', nivel: 'mediu', secventa: '1-8-1', ziua: false };
  try { Object.assign(setari, JSON.parse(localStorage.getItem('whist-setari') || '{}')); } catch (e) {}
  var p = null;            // partida
  var rngImpartire = Math.random;
  var afisareLevata = null; // { carti, castigator } afisata dupa o levata completa
  var mesaj = '';
  var foaieDeschisa = false;
  var foaieLaterala = true; // pe orizontal
  var timer = null;
  var app = document.getElementById('app');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nume(i) { return i === 0 ? t('tu') : p.jucatori[i].nume; }
  function salveaza() { try { localStorage.setItem('whist-setari', JSON.stringify(setari)); localStorage.setItem('whist-limba', lang); } catch (e) {} }

  function carteHtml(c, extra) {
    extra = extra || {};
    var cls = 'carte' + (ROSU[c.culoare] ? ' rosie' : '') + (extra.cls ? ' ' + extra.cls : '');
    var inner = '<b>' + W.numeValoare(c.valoare) + '</b><span>' + SIMBOL[c.culoare] + '</span>';
    if (extra.buton) {
      return '<button class="' + cls + '" data-carte="' + W.cheie(c) + '"' + (extra.disabled ? ' disabled' : '') +
        ' aria-label="' + esc(W.textCarte(c)) + '" style="' + (extra.style || '') + '">' + inner + '</button>';
    }
    return '<div class="' + cls + '" style="' + (extra.style || '') + '">' + inner + '</div>';
  }

  // Unghiurile adversarilor in jurul mesei (grade, 0 = dreapta, 90 = sus), in ordinea jocului (in sensul acelor de ceas: stanga, sus, dreapta)
  var UNGHIURI = { 3: [158, 22], 4: [180, 90, 0], 5: [176, 122, 58, 4], 6: [180, 135, 90, 45, 0] };
  function pozitie(i, raza) {
    if (i === 0) return { x: 50, y: 50 + raza };
    var a = UNGHIURI[p.jucatori.length][i - 1] * Math.PI / 180;
    return { x: 50 + Math.cos(a) * raza * 0.92, y: 50 - Math.sin(a) * raza * 0.8 };
  }

  // ---------- ecranul de start ----------
  function ecranStart() {
    clearTimeout(timer);
    p = null;
    var o = function (grup, val, text) {
      return '<button class="opt' + (setari[grup] === val ? ' activ' : '') + '" data-set="' + grup + '" data-val="' + val + '">' + text + '</button>';
    };
    app.className = 'start tema-' + setari.tema;
    app.innerHTML =
      '<div class="start-box">' +
      '<div class="antet"><div><h1>' + t('titlu') + '</h1><p class="mic">' + t('sub') + '</p></div>' +
      '<div class="limba" role="radiogroup" aria-label="' + t('limba') + '">' +
      '<button data-limba="ro" class="' + (lang === 'ro' ? 'activ' : '') + '">RO</button><button data-limba="en" class="' + (lang === 'en' ? 'activ' : '') + '">EN</button></div></div>' +
      '<h2>' + t('jucatori') + '</h2><div class="grila4">' + [3, 4, 5, 6].map(function (n) { return o('jucatori', n, n); }).join('') + '</div>' +
      '<h2>' + t('unde') + '</h2><div class="teme">' +
      ['banca', 'covor', 'pat', 'turneu'].map(function (k) {
        return '<button class="tema-opt' + (setari.tema === k ? ' activ' : '') + '" data-set="tema" data-val="' + k + '"><span class="mostra m-' + k + '"></span>' + t(k) + '</button>';
      }).join('') + '</div>' +
      '<h2>' + t('nivel') + '</h2><div class="grila3">' + o('nivel', 'usor', t('usor')) + o('nivel', 'mediu', t('mediu')) + o('nivel', 'greu', t('greu')) + '</div>' +
      '<h2>' + t('secventa') + '</h2><div class="grila2">' + o('secventa', '1-8-1', '1 → 8 → 1') + o('secventa', '8-1-8', '8 → 1 → 8') + '</div>' +
      '<label class="bifa"><input type="checkbox" id="ziua"' + (setari.ziua ? ' checked' : '') + '> ' + t('ziua') + '</label>' +
      '<button class="principal" id="start">' + t('start') + '</button></div>';
  }

  function porneste() {
    var n = setari.jucatori;
    var jucatori = [{ id: 'tu', nume: t('tu'), bot: false }];
    for (var i = 1; i < n; i++) jucatori.push({ id: 'b' + i, nume: NUME_BOTI[i - 1], bot: true });
    if (setari.ziua) {
      var d = new Date();
      var samanta = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + n * 7;
      rngImpartire = W.rngDinSamanta(samanta);
    } else rngImpartire = Math.random;
    p = W.partidaNoua(jucatori, { rng: rngImpartire, reguli: { secventa: setari.secventa } });
    afisareLevata = null; mesaj = ''; foaieDeschisa = false;
    deseneaza();
    urmatorulPas();
  }

  // ---------- bucla jocului ----------
  function urmatorulPas() {
    clearTimeout(timer);
    if (!p || afisareLevata) return;
    if (p.faza === 'licitare' && p.laRand !== 0) {
      mesaj = t('liciteazaBot')(nume(p.laRand)); deseneaza();
      timer = setTimeout(function () {
        var r = W.liciteaza(p, p.laRand, W.alegeLicitatia(p, setari.nivel));
        if (r.ok) p = r.partida;
        mesaj = ''; deseneaza(); urmatorulPas();
      }, 650);
    } else if (p.faza === 'joc' && p.laRand !== 0) {
      mesaj = t('joacaBot')(nume(p.laRand)); deseneaza();
      timer = setTimeout(function () { aplicaJoc(p.laRand, W.alegeCartea(p, setari.nivel)); }, 700);
    } else {
      mesaj = ''; deseneaza();
    }
  }

  function aplicaJoc(jucator, carte) {
    var inainte = p.mana.levataCurenta.length;
    var r = W.joaca(p, jucator, carte);
    if (!r.ok) { mesaj = r.eroare; deseneaza(); return; }
    p = r.partida;
    var completa = inainte === p.jucatori.length - 1;
    if (completa) {
      afisareLevata = p.mana.ultimaLevata;
      var c = afisareLevata.castigator;
      mesaj = c === 0 ? t('iei') : t('ia')(nume(c));
      deseneaza();
      timer = setTimeout(function () { afisareLevata = null; mesaj = ''; deseneaza(); urmatorulPas(); }, 1300);
    } else {
      mesaj = ''; deseneaza(); urmatorulPas();
    }
  }

  // ---------- masa ----------
  function deseneaza() {
    if (!p) return;
    var n = p.jucatori.length;
    var m = p.mana;
    app.className = 'joc tema-' + setari.tema + (foaieLaterala ? '' : ' foaie-stransa');

    var levataAfisata = afisareLevata ? afisareLevata.carti : m.levataCurenta;
    var castigator = afisareLevata ? afisareLevata.castigator : -1;

    // locurile
    var locuri = '';
    for (var i = 1; i < n; i++) {
      var poz = pozitie(i, 41);
      var lic = m.licitatii[i];
      var dosuri = '';
      for (var k = 0; k < m.maini[i].length; k++) dosuri += '<span class="dos" style="margin-left:' + (k ? -12 : 0) + 'px;transform:rotate(' + ((k - (m.maini[i].length - 1) / 2) * 7) + 'deg)"></span>';
      locuri += '<div class="loc' + (p.laRand === i && p.faza !== 'sfarsitMana' ? ' la-rand' : '') + (castigator === i ? ' castiga' : '') + '" style="left:' + poz.x + '%;top:' + poz.y + '%">' +
        '<div class="avatar">' + esc(nume(i)[0]) + (m.dealer === i ? '<i class="d">D</i>' : '') + '</div>' +
        '<b class="nume">' + esc(nume(i)) + '</b>' +
        '<span class="insigna">' + (lic === null ? '–' : lic + ' / ' + m.levate[i]) + '</span>' +
        '<div class="dosuri">' + dosuri + '</div></div>';
    }

    // levata
    var levata = levataAfisata.map(function (x, idx) {
      var poz = pozitie(x.jucator, 15);
      var rot = (x.jucator * 37 % 24) - 12;
      return carteHtml(x.carte, { cls: 'pe-masa' + (castigator === x.jucator ? ' castigatoare' : ''), style: 'left:' + poz.x + '%;top:' + poz.y + '%;transform:translate(-50%,-50%) rotate(' + rot + 'deg);z-index:' + (idx + 1) });
    }).join('');

    // pachetul cu atuul
    var pachet = m.carteAtu
      ? '<div class="pachet"><div class="atu-carte">' + carteHtml(m.carteAtu, { cls: 'mica' }) + '</div><span class="dos mare"></span><span class="eticheta">' + t('atu') + ' ' + SIMBOL[m.atu] + '</span></div>'
      : '<div class="pachet"><span class="eticheta">' + t('faraAtu') + '</span></div>';

    // mana mea
    var posibile = W.cartiPosibile(p, 0);
    var randulMeuLaJoc = p.faza === 'joc' && p.laRand === 0 && !afisareLevata;
    var mana = W.sorteazaMana(m.maini[0], m.atu);
    var mijloc = (mana.length - 1) / 2;
    var cartiMele = mana.map(function (c, k) {
      var jucabila = randulMeuLaJoc && posibile.some(function (x) { return W.egale(x, c); });
      var off = k - mijloc;
      return carteHtml(c, {
        buton: true, disabled: !jucabila, cls: jucabila ? 'jucabila' : (randulMeuLaJoc ? 'estompata' : ''),
        style: 'transform:translateY(' + (Math.abs(off) * Math.abs(off) * 2.2) + 'px) rotate(' + (off * 5) + 'deg);margin-left:' + (k ? 'var(--suprapunere)' : '0')
      });
    }).join('');

    // stare
    var eu = m.licitatii[0];
    var stare = mesaj;
    if (!stare) {
      if (p.faza === 'joc' && p.laRand === 0) stare = t('randulTau') + (W.culoareCeruta(p) ? ' · ' + t('raspunde') : '');
      else if (p.faza === 'licitare' && p.laRand === 0) stare = t('randulTau');
    }

    var info = t('mana') + ' ' + (p.indexMana + 1) + ' ' + t('din') + ' ' + p.secventa.length + ' · ' + m.nrCarti + ' ' + (m.nrCarti === 1 ? t('carte') : t('carti'));

    app.innerHTML =
      '<header class="bara"><button class="ic" id="meniu" aria-label="' + t('meniu') + '">←</button>' +
      '<div class="info"><b>' + info + '</b><span>' + esc(t(setari.tema)) + (m.dealer === 0 ? ' · ' + t('tu') + ' ' + t('impartit') : '') + '</span></div>' +
      '<button class="ic lat" id="foaie">' + t('foaie') + '</button></header>' +
      '<aside class="lateral">' + foaieHtml(true) + '</aside>' +
      '<main class="zona"><div class="masa"><div class="suprafata"></div>' + locuri + levata + pachet + '</div>' +
      '<div class="stare' + (stare ? '' : ' gol') + '">' + esc(stare || '·') + '</div>' +
      '<div class="eu"><span class="insigna mea' + (p.laRand === 0 && p.faza !== 'sfarsitMana' ? ' la-rand' : '') + '">' + t('tu') + (m.dealer === 0 ? ' (D)' : '') + ' · ' + (eu === null ? '–' : eu + ' / ' + m.levate[0]) + ' · ' + p.scor[0] + 'p</span></div>' +
      '<div class="mana-mea" style="--k:' + Math.max(mana.length, 1) + '">' + cartiMele + '</div></main>' +
      (p.faza === 'licitare' && p.laRand === 0 ? panouLicitare() : '') +
      (p.faza === 'sfarsitMana' && !afisareLevata ? panouSfarsit() : '') +
      (p.faza === 'terminata' ? panouFinal() : '') +
      (foaieDeschisa ? '<div class="voal" id="voal"></div><section class="foaie-sheet">' + foaieHtml(false) + '</section>' : '');
  }

  function panouLicitare() {
    var m = p.mana;
    var permise = W.licitatiiPosibile(p);
    var facute = W.licitatiiFacute(p);
    var suma = facute.reduce(function (a, b) { return a + b; }, 0);
    var butoane = '';
    var interzisa = null;
    for (var b = 0; b <= m.nrCarti; b++) {
      var ok = permise.indexOf(b) >= 0;
      if (!ok) interzisa = b;
      butoane += '<button class="lic' + (ok ? '' : ' interzis') + '" data-lic="' + b + '"' + (ok ? '' : ' disabled aria-label="' + b + ', interzis"') + '>' + b + '</button>';
    }
    return '<section class="panou">' +
      '<h2>' + t('liciteaza') + '</h2>' +
      '<p class="mic">' + (facute.length ? 'Σ ' + suma + ' ' + t('din2') + ' ' + m.nrCarti : '') + '</p>' +
      '<div class="butoane-lic" style="grid-template-columns:repeat(' + Math.min(m.nrCarti + 1, 5) + ',1fr)">' + butoane + '</div>' +
      (interzisa !== null ? '<p class="mic avert">' + esc(t('interzis')(interzisa, m.nrCarti)) + '</p>' : '') +
      '</section>';
  }

  function panouSfarsit() {
    var r = p.istoric[p.istoric.length - 1];
    var rand = p.jucatori.map(function (_, i) {
      var pct = r.puncte[i];
      return '<tr><td>' + esc(nume(i)) + '</td><td>' + r.licitatii[i] + ' / ' + r.levate[i] + '</td><td class="' + (pct < 0 ? 'neg' : 'poz') + '">' + (pct > 0 ? '+' : '') + pct +
        (r.bonus[i] > 0 ? ' <small>' + t('serie') + '</small>' : r.bonus[i] < 0 ? ' <small>' + t('serieMinus') + '</small>' : '') + '</td><td><b>' + p.scor[i] + '</b></td></tr>';
    }).join('');
    return '<div class="voal"></div><section class="panou centru"><h2>' + t('sfarsitMana') + ' · ' + r.nrCarti + ' ' + (r.nrCarti === 1 ? t('carte') : t('carti')) + '</h2>' +
      '<table class="rezumat"><thead><tr><th></th><th>' + t('licitat') + ' / ' + t('luat') + '</th><th>±</th><th>' + t('total') + '</th></tr></thead><tbody>' + rand + '</tbody></table>' +
      '<button class="principal" id="continua">' + t('continua') + '</button></section>';
  }

  function panouFinal() {
    var c = W.castigatori(p);
    var titlu = c.indexOf(0) >= 0 ? t('castigiTu') : t('castiga')(c.map(nume).join(', '));
    var ordine = p.jucatori.map(function (_, i) { return i; }).sort(function (a, b) { return p.scor[b] - p.scor[a]; });
    return '<div class="voal"></div><section class="panou centru"><h2>' + t('final') + '</h2><p class="mare">' + esc(titlu) + '</p>' +
      '<table class="rezumat"><tbody>' + ordine.map(function (i, k) { return '<tr><td>' + (k + 1) + '.</td><td>' + esc(nume(i)) + '</td><td><b>' + p.scor[i] + '</b></td></tr>'; }).join('') + '</tbody></table>' +
      '<button class="principal" id="iarasi">' + t('iarasi') + '</button></section>';
  }

  function foaieHtml(lateral) {
    var n = p.jucatori.length;
    var cap = '<tr><th>#</th><th>c</th>' + p.jucatori.map(function (_, i) { return '<th class="' + (i === 0 ? 'eu-col' : '') + '">' + esc(nume(i)) + '</th>'; }).join('') + '</tr>';
    var tot = Array(n).fill(0);
    var randuri = p.secventa.map(function (c, k) {
      var r = p.istoric[k];
      var curent = k === p.indexMana && p.faza !== 'terminata' && !r;
      var celule = '';
      for (var i = 0; i < n; i++) {
        if (r) {
          tot[i] += r.puncte[i];
          celule += '<td><small>' + r.licitatii[i] + '/' + r.levate[i] + '</small> <b class="' + (tot[i] < 0 ? 'neg' : '') + '">' + tot[i] + '</b>' + (r.bonus[i] ? '<sup>' + (r.bonus[i] > 0 ? '★' : '✕') + '</sup>' : '') + '</td>';
        } else if (curent) {
          var l = p.mana.licitatii[i];
          celule += '<td><small>' + (l === null ? '' : l + '/–') + '</small></td>';
        } else celule += '<td></td>';
      }
      return '<tr class="' + (curent ? 'curent' : r ? '' : 'viitor') + '"' + (curent ? ' id="' + (lateral ? 'rand-curent-l' : 'rand-curent') + '"' : '') + '><td>' + (k + 1) + '</td><td>' + c + '</td>' + celule + '</tr>';
    }).join('');
    var total = '<tr class="tot"><td colspan="2">' + t('total') + '</td>' + p.scor.map(function (s, i) { return '<td class="' + (i === 0 ? 'eu-col' : '') + '"><b>' + s + '</b></td>'; }).join('') + '</tr>';
    var strans = '<div class="strans">' + p.jucatori.map(function (_, i) { return '<div' + (i === 0 ? ' class="eu-col"' : '') + '><span>' + esc(nume(i)) + '</span><b>' + p.scor[i] + '</b></div>'; }).join('') + '</div>';
    return '<div class="foaie-cap"><b>' + t('foaie') + '</b>' +
      (lateral ? '<button class="ic" id="comuta-lateral" aria-label="' + t('strange') + '">' + (foaieLaterala ? '«' : '»') + '</button>' : '<button class="ic" id="inchide-foaie">' + t('inchide') + '</button>') + '</div>' +
      (lateral ? strans : '') +
      '<div class="foaie-scroll"><table class="foaie"><thead>' + cap + '</thead><tbody>' + randuri + '</tbody><tfoot>' + total + '</tfoot></table></div>';
  }

  // ---------- evenimente ----------
  app.addEventListener('click', function (e) {
    var el = e.target.closest('button, #voal');
    if (!el) return;
    if (el.dataset.limba) { lang = el.dataset.limba; salveaza(); return ecranStart(); }
    if (el.dataset.set) {
      var v = el.dataset.val;
      setari[el.dataset.set] = el.dataset.set === 'jucatori' ? Number(v) : v;
      salveaza(); return ecranStart();
    }
    if (el.id === 'start') { setari.ziua = document.getElementById('ziua').checked; salveaza(); return porneste(); }
    if (el.dataset.lic !== undefined && p && p.faza === 'licitare' && p.laRand === 0) {
      var r = W.liciteaza(p, 0, Number(el.dataset.lic));
      if (r.ok) { p = r.partida; deseneaza(); urmatorulPas(); }
      return;
    }
    if (el.dataset.carte && p && p.faza === 'joc' && p.laRand === 0 && !afisareLevata) {
      var c = p.mana.maini[0].filter(function (x) { return W.cheie(x) === el.dataset.carte; })[0];
      if (c) aplicaJoc(0, c);
      return;
    }
    if (el.id === 'continua') { clearTimeout(timer); afisareLevata = null; mesaj = ''; p = W.manaUrmatoare(p, rngImpartire); deseneaza(); return urmatorulPas(); }
    if (el.id === 'iarasi') return ecranStart();
    if (el.id === 'meniu') { if (confirmaIesire()) ecranStart(); return; }
    if (el.id === 'foaie') { foaieDeschisa = true; deseneaza(); var rc = document.getElementById('rand-curent'); if (rc) rc.scrollIntoView({ block: 'center' }); return; }
    if (el.id === 'inchide-foaie' || el.id === 'voal') { foaieDeschisa = false; return deseneaza(); }
    if (el.id === 'comuta-lateral') { foaieLaterala = !foaieLaterala; return deseneaza(); }
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'ziua') { setari.ziua = e.target.checked; salveaza(); }
  });
  var iesireCerut = 0;
  function confirmaIesire() {
    // fara dialoguri blocante: a doua apasare in 3 secunde confirma
    var acum = Date.now();
    if (acum - iesireCerut < 3000) return true;
    iesireCerut = acum; mesaj = t('paraseste') + ' ? ←'; deseneaza();
    return false;
  }

  ecranStart();
})();
