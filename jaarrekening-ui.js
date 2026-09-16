/* jaarrekening-ui.js — gedeelde balanslezer-UI voor /zoeken/ en /dashboard/.
   Classic script (geen module): werkt op elke pagina; zet window.KBOJr.
   render(paneel, data, nace, opties):
     opties.kpis   === true  -> KPI-cijferrij tonen (dashboard);
                                weggelaten/kpis:false -> zonder (zoeken, v25.2)
     opties.traject === true -> benchmark toont ook het EV-traject over de jaren
   v27: trendgrafiek (toegankelijke SVG), dynamische kolommen (afwezige rubrieken
   verdwijnen, nooit een "—"-regen), balansdetail van het nieuwste boekjaar,
   extra ratio-lezingen (nettomarge, rendabiliteit EV, liquiditeit nu ook voor
   xbrl-boekjaren), omzet/personeelskosten in tabel en vergelijking.
   Pas op: deze file wordt door de browser-tests gelezen; houd klassennamen stabiel. */
(function () {
  "use strict";

  function injecteerStijlen() {
    if (document.getElementById("jr-dynamic-styles")) return;
    var style = document.createElement("style");
    style.id = "jr-dynamic-styles";
    style.textContent = `
      @keyframes jrPanelFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes jrKpiIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes jrBarGrow {
        from { transform: scaleY(0); opacity: 0.1; }
        to { transform: scaleY(1); opacity: 0.85; }
      }
      @keyframes jrLineDraw {
        from { stroke-dashoffset: 1200; }
        to { stroke-dashoffset: 0; }
      }
      @keyframes jrDotPop {
        0% { transform: scale(0); opacity: 0; }
        65% { transform: scale(1.35); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes jrTabFade {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .jr-panel {
        margin-top: 0.85rem;
        background: var(--kaart, #FFFFFF);
        border: 1px solid var(--rand, #DDE3E8);
        border-radius: 12px;
        padding: 1.15rem 1.25rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
        animation: jrPanelFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .jr-kop {
        margin: 0 0 0.85rem 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--muted, #475363);
      }
      .jr-tabs {
        display: flex;
        gap: 0.4rem;
        border-bottom: 1px solid var(--rand, #DDE3E8);
        margin: 0.4rem 0 0.9rem;
        overflow-x: auto;
        padding-bottom: 0.25rem;
      }
      .jr-tab {
        appearance: none;
        border: 1px solid transparent;
        background: transparent;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--muted, #475363);
        padding: 0.45rem 0.85rem;
        border-radius: 8px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .jr-tab:hover {
        color: var(--ink, #1F2733);
        background: var(--spook, #F7F9FB);
        transform: translateY(-1px);
      }
      .jr-tab[aria-selected="true"] {
        color: var(--blauw, #38557E);
        background: rgba(56, 85, 126, 0.09);
        border-color: rgba(56, 85, 126, 0.25);
        font-weight: 700;
      }
      [data-thema="donker"] .jr-tab[aria-selected="true"] {
        color: #93C5FD;
        background: rgba(147, 197, 253, 0.12);
        border-color: rgba(147, 197, 253, 0.3);
      }
      .jr-tabpanel {
        animation: jrTabFade 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .jr-kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.65rem;
        margin-bottom: 1rem;
      }
      .jr-kpi {
        background: var(--spook, #F7F9FB);
        border: 1px solid var(--rand, #DDE3E8);
        border-radius: 10px;
        padding: 0.7rem 0.85rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.25rem;
        animation: jrKpiIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: calc(var(--kpi-idx, 0) * 45ms);
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
      }
      .jr-kpi:hover {
        transform: translateY(-2px);
        border-color: var(--blauw, #38557E);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
      }
      .jr-kpi-label {
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 700;
        color: var(--muted, #475363);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .jr-code {
        font-size: 9.5px;
        font-weight: 500;
        text-transform: none;
        letter-spacing: 0;
        opacity: 0.8;
        background: var(--rand, #DDE3E8);
        padding: 1px 5px;
        border-radius: 4px;
      }
      .jr-kpi-waarde {
        font-size: 16.5px;
        font-weight: 700;
        color: var(--ink, #1F2733);
        font-variant-numeric: tabular-nums;
        line-height: 1.25;
      }
      .jr-delta {
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
      }
      .jr-pos { color: #059669 !important; }
      .jr-neg { color: #DC2626 !important; }
      [data-thema="donker"] .jr-pos { color: #34D399 !important; }
      [data-thema="donker"] .jr-neg { color: #F87171 !important; }

      .jr-grafiek-container {
        background: var(--spook, #F7F9FB);
        border: 1px solid var(--rand, #DDE3E8);
        border-radius: 10px;
        padding: 0.9rem 1.1rem;
        margin-bottom: 1rem;
        animation: jrPanelFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .jr-grafiek-titel {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        font-size: 12px;
        font-weight: 700;
        color: var(--ink, #1F2733);
        margin-bottom: 0.6rem;
      }
      .jr-legende {
        display: flex;
        gap: 0.85rem;
        font-size: 11px;
        color: var(--muted, #475363);
        font-weight: 500;
      }
      .jr-legende-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .jr-legende-bol {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .jr-bar {
        transform-box: fill-box;
        transform-origin: bottom center;
        animation: jrBarGrow 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: calc(var(--bar-idx, 0) * 55ms);
        transition: opacity 0.2s ease, filter 0.2s ease;
        cursor: pointer;
      }
      .jr-bar:hover {
        opacity: 1 !important;
        filter: brightness(1.1);
      }
      .jr-sparkline {
        stroke-dasharray: 1200;
        stroke-dashoffset: 1200;
        animation: jrLineDraw 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
      }
      .jr-dot {
        transform-box: fill-box;
        transform-origin: center;
        animation: jrDotPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: calc(0.35s + var(--dot-idx, 0) * 70ms);
        transition: r 0.2s ease, stroke-width 0.2s ease;
        cursor: pointer;
      }
      .jr-dot:hover {
        r: 6.5px;
        stroke-width: 2.5px;
      }

      .jr-bench {
        background: rgba(56, 85, 126, 0.04);
        border: 1px solid var(--rand, #DDE3E8);
        border-left: 3.5px solid var(--blauw, #38557E);
        border-radius: 8px;
        padding: 0.75rem 0.95rem;
        margin: 0.85rem 0 0.5rem;
        animation: jrPanelFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .jr-bench p { margin: 0.15rem 0; font-size: 12.5px; line-height: 1.5; color: var(--tekst, #1F2733); }
      .jr-bench-titel { font-weight: 700; font-size: 11px !important; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted, #475363); }
      .jr-bench-ev { font-weight: 700; color: var(--blauw, #38557E); font-variant-numeric: tabular-nums; }
      
      .jr-lezingen {
        margin: 0.65rem 0;
        padding-left: 1.2rem;
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--tekst, #1F2733);
      }
      .jr-lezingen li { margin-bottom: 0.25rem; }

      .jr-scroll {
        overflow-x: auto;
        margin: 0.5rem 0;
        border-radius: 8px;
        border: 1px solid var(--rand, #DDE3E8);
      }
      .jr-tabel {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        background: var(--kaart, #FFFFFF);
      }
      .jr-tabel th, .jr-tabel td {
        padding: 0.5rem 0.7rem;
        border-bottom: 1px solid var(--rand, #DDE3E8);
        text-align: right;
        font-variant-numeric: tabular-nums;
        transition: background-color 0.15s ease;
      }
      .jr-tabel th:first-child, .jr-tabel td:first-child {
        text-align: left;
        font-weight: 600;
        color: var(--ink, #1F2733);
      }
      .jr-tabel td:not(:first-child) {
        white-space: nowrap;
        color: var(--tekst, #1F2733);
      }
      .jr-tabel thead th {
        background: var(--spook, #F7F9FB);
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted, #475363);
        border-bottom: 2px solid var(--rand, #DDE3E8);
      }
      .jr-tabel tbody tr:nth-child(even) {
        background: rgba(0, 0, 0, 0.015);
      }
      .jr-tabel tbody tr:hover {
        background: rgba(56, 85, 126, 0.06);
      }
      .jr-tabel tbody tr:last-child th, .jr-tabel tbody tr:last-child td {
        border-bottom: none;
      }

      .jr-staat {
        margin: 0.5rem 0;
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
      }
      .jr-staat th, .jr-staat td {
        padding: 0.45rem 0.6rem;
        border-bottom: 1px solid var(--rand, #DDE3E8);
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .jr-staat th:first-child, .jr-staat td:first-child { text-align: left; }
      .jr-staat tr.jr-staat-tussen th, .jr-staat tr.jr-staat-tussen td {
        border-top: 1.5px solid var(--ink, #1F2733);
        font-weight: 700;
        background: var(--spook, #F7F9FB);
      }
      .jr-staat tr.jr-staat-rest th, .jr-staat tr.jr-staat-rest td {
        color: var(--muted, #475363);
        font-style: italic;
      }
      .jr-verand-kop {
        margin: 0.8rem 0 0.3rem;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted, #475363);
        font-weight: 700;
      }
      .jr-veranderingen {
        margin: 0.2rem 0;
        padding-left: 1.2rem;
        font-size: 12.5px;
        line-height: 1.6;
      }
      .jr-veranderingen li { margin: 0.2rem 0; }

      @media (prefers-reduced-motion: reduce) {
        .jr-panel, .jr-kpi, .jr-tabpanel, .jr-grafiek-container, .jr-bar, .jr-sparkline, .jr-dot {
          animation: none !important;
          transition: none !important;
        }
      }`;
    document.head.appendChild(style);
  }

  var nfGeld0 = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 });
  var nfT = new Intl.NumberFormat("nl-BE");

  function fmtGeld(v, metPlus) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    var teken = v < 0 ? "\u2212\u20AC " : (metPlus && v > 0 ? "+\u20AC " : "\u20AC ");
    return teken + nfGeld0.format(Math.abs(Math.round(v)));
  }
  function fmtPct(v) { return v === null || v === undefined ? "\u2014" : (Math.round(v * 1000) / 10 + "%").replace(".", ","); }
  function fmtPctTeken(v) {
    if (v === null || v === undefined) return "\u2014";
    return (v > 0 ? "+" : "") + (Math.round(v * 1000) / 10 + "%").replace(".", ",");
  }
  function fmtRatio(v) { return v === null || v === undefined ? "\u2014" : String(Math.round(v * 100) / 100).replace(".", ","); }
  function fmtMult(v) { return String(Math.round(v * 100) / 100).replace(".", ","); }
  function fmtAantal(v) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    return nfT.format(Math.round(v * 10) / 10).replace(",0", "");
  }
  /* compacte aslabels voor de grafiek (exacte waarden staan in titel en tabel) */
  function fmtKompakt(v) {
    var a = Math.abs(v);
    var tek = v < 0 ? "\u2212" : "";
    if (a >= 1e6) return tek + "\u20AC " + (Math.round(a / 1e5) / 10 + "").replace(".", ",") + " mln";
    if (a >= 1e3) return tek + "\u20AC " + nfGeld0.format(Math.round(a / 1e3)) + "k";
    return tek + "\u20AC " + nfGeld0.format(a);
  }

  /* v28.6: ronde rasterstappen (1/2/2.5/5 x 10^k), herleidbaar voor elke band */
  function lezingSolv(p, ev) {
    if (ev !== null && ev !== undefined && ev < 0)
      return "Negatief eigen vermogen — verliezen hebben de inbreng en reserves weggevreten.";
    if (p === null || p === undefined) return null;
    if (p < 0.2) return "Dunne kapitaalbuffer: het eigen vermogen dekt minder dan een vijfde van het balanstotaal.";
    if (p < 0.4) return "Gangbare kapitaalstructuur.";
    return "Sterke kapitaalbasis.";
  }
  function lezingLiq(p) {
    if (p === null || p === undefined) return null;
    if (p < 1) return "Werkkapitaaltekort: de vlottende activa dekken de schulden op korte termijn niet volledig.";
    if (p < 1.5) return "Evenwichtige kortetermijnpositie.";
    return "Ruim liquide.";
  }
  function lezingRes(res) {
    if (res === null || res === undefined) return null;
    return res >= 0 ? "Winstgevend afgesloten boekjaar." : "Verlieslatend afgesloten boekjaar.";
  }
  function lezingMarge(v) {                                /* v27: nettomarge = resultaat / omzet */
    if (v === null || v === undefined) return null;
    var cent = Math.max(-99, Math.round(v * 100));
    return v >= 0
      ? "Na alle kosten en belastingen bleef van elke euro omzet ongeveer " + cent + " cent over."
      : "Elke euro omzet kostte het boekjaar gemiddeld " + Math.abs(cent) + " cent.";
  }
  function lezingRoe(v) {                                  /* v27: rendabiliteit op eigen vermogen */
    if (v === null || v === undefined) return null;
    return v >= 0
      ? "Het boekjaarresultaat bedroeg " + fmtPct(v) + " van het eigen vermogen."
      : "Het verlies vrat " + fmtPct(Math.abs(v)) + " van het eigen vermogen op.";
  }

  /* Equidam EBITDA-multiples (04-07-2026, n>40.000 beursgenoteerde bedrijven) —
     NACE-2025 prefix -> [multiple, NL sectorlabel], langste prefix wint. */
  var JR_MULTIPLES = {
    "01": [5.73, "Akkerbouw en telers"], "02": [5.73, "Veeteelt"], "03": [5.73, "Visserij en aquacultuur"],
    "05": [3.58, "Steenkoolwinning"], "06": [3.37, "Winning van aardolie en aardgas"],
    "07": [4.40, "Metaalertsdelfstoffen"], "08": [6.67, "Steengroeven en bouwstoffen"],
    "09": [6.06, "Diensten voor delfstofwinning"],
    "10": [7.01, "Voedingsindustrie"], "11": [8.39, "Drankenindustrie"], "12": [7.63, "Tabaksindustrie"],
    "13": [6.89, "Textielindustrie"], "14": [6.11, "Kledingindustrie"], "15": [6.89, "Leder- en schoenindustrie"],
    "16": [7.40, "Houtindustrie"], "17": [7.05, "Papierindustrie"], "18": [6.21, "Drukkerijen"],
    "19": [5.64, "Cokes en raffinaderijen"], "20": [8.35, "Chemische industrie"],
    "21": [8.45, "Farmaceutische industrie"], "22": [6.66, "Rubber- en kunststofproducten"],
    "23": [6.67, "Minerale bouwmaterialen"], "24": [7.59, "Basismetaalindustrie"],
    "25": [8.04, "Metaalconstructies en -producten"], "26": [10.47, "Computers en elektronica"],
    "27": [10.47, "Elektrische apparatuur"], "28": [9.22, "Machines en apparaten"],
    "29": [5.05, "Auto- en vrachtwagenproductie"], "30": [7.05, "Overig transportmaterieel"],
    "31": [8.29, "Meubelindustrie"], "32": [5.16, "Overige industrie"],
    "33": [5.00, "Herstel en installatie van machines"],
    "35": [6.96, "Productie en distributie van energie"], "36": [10.12, "Waterbedrijven"],
    "37": [10.12, "Riolering en afvalwaterzuivering"], "38": [6.04, "Afvalinzameling en -verwerking"],
    "39": [6.04, "Sanering en bodembeheer"],
    "41": [7.09, "Bouw van gebouwen"], "42": [6.80, "Civiele techniek"],
    "43": [6.25, "Gespecialiseerde bouwwerken"], "45": [6.70, "Automobielhandel en -herstel"],
    "46": [7.35, "Groothandel"], "463": [6.74, "Groothandel in voeding en dranken"],
    "47": [5.81, "Detailhandel (specialiteiten)"], "471": [6.07, "Supermarkten en warenhuizen"],
    "472": [6.07, "Voedingswinkels"], "49": [7.15, "Goederenvervoer over land"],
    "493": [5.93, "Personenvervoer over land"], "50": [6.35, "Zeevaart"], "51": [6.29, "Luchtvaart"],
    "52": [7.21, "Opslag en vervoersondersteuning"], "53": [7.21, "Post- en koeriersdiensten"],
    "55": [7.55, "Hotels en logiesverstrekking"], "56": [6.55, "Restaurants en drankgelegenheden"],
    "58": [6.08, "Uitgeverijen"], "59": [4.99, "Film- en videoproductie"],
    "60": [3.99, "Radio en televisie"], "61": [5.54, "Telecommunicatie"],
    "612": [6.97, "Mobiele telecommunicatie"], "62": [6.03, "IT-diensten en consultancy"],
    "63": [8.00, "Informatiediensten en online platforms"], "64": [9.15, "Financiële dienstverlening"],
    "641": [11.83, "Banken"], "642": [6.46, "Houdstermaatschappijen"],
    "65": [6.33, "Verzekeringen"], "66": [9.15, "Financiële bemiddeling"],
    "68": [9.00, "Vastgoed (eigen bezit en exploitatie)"], "682": [6.53, "Vastgoedbemiddeling"],
    "691": [7.31, "Advocatuur"], "692": [7.31, "Accountancy en fiscaliteit"],
    "70": [7.31, "Managementconsulting"], "71": [6.25, "Architectuur en ingenieursdiensten"],
    "72": [7.90, "Onderzoek en ontwikkeling"], "73": [4.10, "Reclame en marketing"],
    "74": [5.00, "Overige zakelijke dienstverlening"], "75": [5.13, "Diergeneeskunde"],
    "77": [6.87, "Verhuur van machines en materieel"], "78": [5.09, "Uitzend- en arbeidsbemiddeling"],
    "79": [4.99, "Reisbureaus en touroperators"], "80": [7.61, "Beveiligingsdiensten"],
    "81": [5.00, "Facilitaire diensten"], "82": [5.00, "Zakelijke ondersteuningsdiensten"],
    "85": [4.68, "Onderwijs"], "86": [7.94, "Gezondheidszorg"],
    "87": [7.94, "Instellingen voor maatschappelijke zorg"], "88": [7.94, "Ambulante maatschappelijke zorg"],
    "90": [4.99, "Kunst en podiumkunsten"], "91": [5.35, "Bibliotheken en musea"],
    "92": [6.93, "Gokken en kansspelen"], "93": [6.52, "Sport en recreatie"],
    "95": [5.00, "Herstel van computers en consumptiegoederen"], "96": [5.13, "Persoonlijke verzorging"]
  };
  function multipleVoor(nace) {
    var d = String(nace || "").replace(/\D/g, "");
    for (var len = d.length; len >= 2; len--) {
      var m = JR_MULTIPLES[d.slice(0, len)];
      if (m) return m;
    }
    return null;
  }

  /* v27 — vaste leersjablonen voor de cijferstabel: [sleutel, koplabel, code, soort] */
  var TABEL_KOLOMMEN = [
    ["omzet", "Omzet", "70", "geld"],
    ["brutomarge", "Brutomarge", "9900", "geld"],
    ["personeelskosten", "Personeelskosten", "62", "geld"],
    ["bezoldigingBestuur", "Vergoeding bestuur", "9503", "geld"],       /* v28: toelichting volledig model */
    ["afschrijvingen", "Afschrijvingen", "630", "geld"],
    ["bedrijfswinst", "Bedrijfswinst", "9901", "geld"],
    ["ebitda", "EBITDA", "formule", "geld"],
    ["finKosten", "Fin. kosten", "65", "geld"],
    ["belastingen", "Belastingen", "67/77", "geld"],
    ["resultaat", "Resultaat", "9904", "geld"],
    ["eigenVermogen", "Eigen vermogen", "10/15", "geld"],
    ["activa", "Activa", "20/58", "geld"],
    ["schulden", "Schulden", "17/49", "schuld"],
    ["werknemers", "Werknemers", "9087", "aantal"],
    ["solvabiliteit", "Solvabiliteit", "", "pct"],
    ["liquiditeit", "Liquiditeit", "29/58 op 42/48", "ratio"]
  ];
  /* kolom zichtbaar als minstens één boekjaar een waarde heeft — nooit "—"-regens */
  function kolomHeeftData(jaren, analyseIdx, kol) {
    return jaren.some(function (j) {
      if (kol[3] === "pct" || kol[3] === "ratio") {
        var a = analyseIdx[j.boekjaar] || {};
        return a[kol[0]] !== null && a[kol[0]] !== undefined;
      }
      var v = j[kol[0]];
      return v !== null && v !== undefined && !isNaN(v);
    });
  }

  /* v27 — toegankelijke SVG-trendgrafiek: staafjes resultaat + lijn eigen vermogen.
     Statisch (geen animatie, reduced-motion-veilig); exacte waarden in <title> en tabel. */
  var TREND_SPECS = [
    ["omzet", "Omzet", "70", "geld", 1],
    ["brutomarge", "Brutomarge", "9900", "geld", 1],
    ["personeelskosten", "Personeelskosten", "62", "geld", 1],
    ["bezoldigingBestuur", "Vergoeding bestuur", "9503", "geld", 1],
    ["afschrijvingen", "Afschrijvingen", "630", "geld", 1],
    ["bedrijfswinst", "Bedrijfswinst", "9901", "geld", 1],
    ["ebitda", "EBITDA", "formule", "geld", 1],
    ["finOpbrengsten", "Financiële opbrengsten", "75", "geld", 1],
    ["finKosten", "Financiële kosten", "65", "geld", 1],
    ["winstVoorBelasting", "Resultaat vóór belasting", "9903", "geld", 1],
    ["resultaat", "Resultaat", "9904", "geld", 1],
    ["eigenVermogen", "Eigen vermogen", "10/15", "geld", 1],
    ["activa", "Activa", "20/58", "geld", 1],
    ["schulden", "Schulden", "17/49", "geld", 1],
    ["werknemers", "Werknemers", "9087", "aantal", 1],
    ["solvabiliteit", "Solvabiliteit", "10/15 op 20/58", "pct", 2],
    ["liquiditeit", "Liquiditeit", "29/58 op 42/48", "ratio", 2],
    ["nettoMarge", "Nettomarge", "", "pct", 2],
    ["roe", "Rendabiliteit eigen vermogen", "", "pct", 2],
    ["omzetPerWerknemer", "Omzet per werknemer (VTE)", "", "geld", 2]
  ];
  /* ===================== v31.0: kolommenstaat (designbesluit eindbaas 2026-08-28) ===================== */
  function pctTeken(r) {
    if (r === null || r === undefined || !isFinite(r)) return "";
    var s2 = Math.round(r * 1000) / 10;
    return (s2 > 0 ? "+" : "") + String(s2).replace(".", ",") + "%";
  }
  function reeksVoorSpec(spec, jaren, analyseIdx) {
    var key = spec[0], bron = spec[4];
    return jaren.map(function (j) {
      if (bron === 1) return (j[key] === undefined ? null : j[key]);
      var a = analyseIdx[j.boekjaar] || {};
      return (a[key] === undefined ? null : a[key]);
    });
  }
  function eersteMetData(reeks, vanaf) {
    for (var i = vanaf; i < reeks.length; i++) if (reeks[i] !== null && reeks[i] !== undefined) return i;
    return -1;
  }
  function fmtWaarde(v, soort) {
    if (v === null || v === undefined) return "\u2014";
    if (soort === "geld") return fmtGeld(v);
    if (soort === "aantal") return fmtAantal(v);
    if (soort === "pct") return fmtPct(v);
    return fmtRatio(v);
  }
  function fmtDeltaAbs(abs, soort) {
    if (soort === "geld") return fmtGeld(abs, true);
    if (soort === "aantal") return (abs > 0 ? "+" : "") + fmtAantal(abs);
    if (soort === "pct") return (abs > 0 ? "+" : "") + String(Math.round(abs * 1000) / 10).replace(".", ",") + " ptn";
    return (abs > 0 ? "+" : "") + fmtRatio(abs);
  }

  /* Blad "Per rubriek": één kolommenstaat — rubriek, nieuwste waarde, verschil met
     het vorige boekjaar mét cijfers, en laagste/hoogste over de neergelegde jaren. */
  function maakRubriekStaat(paneel, data, analyseIdx) {
    var jaren = data.jaren;
    var blok = document.createElement("section");
    blok.className = "jr-blok jr-rubriekstaat";
    var titel = document.createElement("h3");
    titel.className = "jr-detail-titel";
    titel.textContent = "Evolutie per rubriek (" + jaren[jaren.length - 1].boekjaar + " \u2013 " + jaren[0].boekjaar + ")";
    blok.appendChild(titel);
    var scroll = document.createElement("div");
    scroll.className = "jr-scroll";
    var tabel = document.createElement("table");
    tabel.className = "jr-tabel jr-staat";
    var cap = document.createElement("caption");
    cap.textContent = "Per rubriek: nieuwste boekjaar, verschil met het vorige boekjaar met cijfers " +
      "(absoluut en procentueel), en laagste/hoogste waarde over de " + jaren.length + " neergelegde boekjaren.";
    tabel.appendChild(cap);
    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    ["Rubriek", "code", "" + jaren[0].boekjaar, "Verschil", "Min \u00b7 max"].forEach(function (h) {
      var th = document.createElement("th"); th.scope = "col"; th.textContent = h; trh.appendChild(th);
    });
    thead.appendChild(trh); tabel.appendChild(thead);
    var tbody = document.createElement("tbody");
    TREND_SPECS.forEach(function (spec) {
      var reeks = reeksVoorSpec(spec, jaren, analyseIdx);
      var i0 = eersteMetData(reeks, 0);
      if (i0 < 0) return;
      var i1 = eersteMetData(reeks, i0 + 1);
      var tr = document.createElement("tr");
      var titelreeks = [];
      for (var k = 0; k < reeks.length; k++) if (reeks[k] !== null && reeks[k] !== undefined)
        titelreeks.push(jaren[k].boekjaar + ": " + fmtWaarde(reeks[k], spec[3]));
      tr.title = spec[1] + " per boekjaar \u2014 " + titelreeks.join(" \u00b7 ");
      var th = document.createElement("th"); th.scope = "row"; th.textContent = spec[1]; tr.appendChild(th);
      var tc = document.createElement("td"); tc.className = "jr-code"; tc.textContent = spec[2] || "\u2014"; tr.appendChild(tc);
      var tv = document.createElement("td"); tv.textContent = fmtWaarde(reeks[i0], spec[3]);
      if (typeof reeks[i0] === "number" && (spec[3] === "geld" || spec[3] === "aantal")) tv.className = reeks[i0] < 0 ? "jr-neg" : (reeks[i0] > 0 ? "jr-pos" : "");
      tr.appendChild(tv);
      var td = document.createElement("td");
      if (i1 >= 0) {
        var abs = reeks[i0] - reeks[i1];
        var sp = document.createElement("span");
        sp.className = "jr-delta" + (abs < 0 ? " jr-neg" : (abs > 0 ? " jr-pos" : ""));
        var symbool = abs > 0 ? "\u25B2 " : (abs < 0 ? "\u25BC " : "\u2192 ");
        var pct = (reeks[i1] !== 0 && spec[3] !== "pct" && spec[3] !== "ratio") ? pctTeken(abs / Math.abs(reeks[i1])) : "";
        sp.textContent = symbool + fmtDeltaAbs(abs, spec[3]) + (pct ? " (" + pct + ")" : "");
        td.appendChild(sp);
      } else { td.textContent = "\u2014"; }
      tr.appendChild(td);
      var tm = document.createElement("td"); tm.className = "jr-minmax";
      var vals = reeks.filter(function (v) { return v !== null && v !== undefined; });
      if (vals.length >= 2) {
        tm.textContent = fmtWaarde(Math.min.apply(null, vals), spec[3]) + " \u00b7 " + fmtWaarde(Math.max.apply(null, vals), spec[3]);
      } else { tm.textContent = "\u2014"; }
      tr.appendChild(tm);
      tbody.appendChild(tr);
    });
    tabel.appendChild(tbody);
    scroll.appendChild(tabel); blok.appendChild(scroll);
    paneel.appendChild(blok);
  }

  /* Blad "Rekenroute": boekhoudkundige kolommenstaat van de waterval-kernketen —
     elke stap met bedrag en doorlopende tussenstand, ankers vet, restpost gedempt. */
  function maakRekenroute(paneel, jaren) {
    var bruikbaar = jaren.filter(function (j) {
      return j.waterval && j.waterval.stappen && j.waterval.stappen.length > 1;
    });
    if (!bruikbaar.length) return;
    var blok = document.createElement("section");
    blok.className = "jr-blok jr-rekenroute";
    var koprij = document.createElement("div");
    koprij.className = "jr-reeks-kop";
    var titel = document.createElement("h3");
    titel.className = "jr-detail-titel";
    titel.textContent = "Rekenroute van brutomarge naar resultaat";
    koprij.appendChild(titel);
    var lab = document.createElement("label");
    lab.className = "jr-reeks-jaar";
    lab.appendChild(document.createTextNode("Boekjaar: "));
    var sel = document.createElement("select");
    sel.setAttribute("aria-label", "Kies het boekjaar voor de rekenroute");
    bruikbaar.forEach(function (j) {
      var o = document.createElement("option");
      o.value = String(j.boekjaar); o.textContent = String(j.boekjaar); sel.appendChild(o);
    });
    lab.appendChild(sel); koprij.appendChild(lab); blok.appendChild(koprij);
    var host = document.createElement("div");
    host.className = "jr-scroll";
    blok.appendChild(host);
    var voet = document.createElement("p");
    voet.className = "jr-reeks-voet";
    voet.hidden = true;
    blok.appendChild(voet);
    paneel.appendChild(blok);

    function teken() {
      var bj = sel.value;
      var j = bruikbaar.filter(function (x) { return String(x.boekjaar) === bj; })[0] || bruikbaar[0];
      var w = j.waterval;
      host.innerHTML = "";
      var tabel = document.createElement("table");
      tabel.className = "jr-tabel jr-staat";
      var cap = document.createElement("caption");
      cap.textContent = "Rekenroute boekjaar " + j.boekjaar + ": van brutomarge naar het neergelegde resultaat, met tussenstand na iedere stap.";
      tabel.appendChild(cap);
      var thead = document.createElement("thead");
      var trh = document.createElement("tr");
      ["Stap", "code", "Bedrag", "Tussenstand"].forEach(function (h) {
        var th = document.createElement("th"); th.scope = "col"; th.textContent = h; trh.appendChild(th);
      });
      thead.appendChild(trh); tabel.appendChild(thead);
      var tbody = document.createElement("tbody");
      var loop = 0;
      w.stappen.forEach(function (s) {
        if (s.soort === "plus") loop += s.v;
        else if (s.soort === "min") loop -= s.v;
        else if (s.soort === "rest") loop += s.v;
        else loop = s.v; /* start/tussen: verankerde stand */
        var tr = document.createElement("tr");
        if (s.soort === "tussen" || s.soort === "start") tr.className = "jr-staat-tussen";
        if (s.soort === "rest") tr.className = "jr-staat-rest";
        var th = document.createElement("th"); th.scope = "row"; th.textContent = s.label; tr.appendChild(th);
        var tc = document.createElement("td"); tc.className = "jr-code"; tc.textContent = s.code || "\u2014"; tr.appendChild(tc);
        var tb = document.createElement("td");
        if (s.soort === "tussen") tb.textContent = "\u2014";
        else if (s.soort === "min") { tb.textContent = fmtGeld(-Math.abs(s.v), true); tb.className = "jr-neg"; }
        else { tb.textContent = fmtGeld(s.v, true); if (s.soort !== "start") tb.className = s.v < 0 ? "jr-neg" : (s.v > 0 ? "jr-pos" : ""); }
        tr.appendChild(tb);
        var tt = document.createElement("td"); tt.textContent = fmtGeld(loop);
        if (loop < 0) tt.className = "jr-neg";
        tr.appendChild(tt);
        tbody.appendChild(tr);
      });
      tabel.appendChild(tbody);
      host.appendChild(tabel);
      voet.hidden = !w.heeftRest;
      if (w.heeftRest) voet.textContent = "Een lichte restpost (schuingedrukt) houdt kleine rekenkundige restverschillen in de neergelegde cijfers " +
        "zichtbaar en exact; de optelsom blijft gelijk aan het neergelegde resultaat.";
    }
    sel.addEventListener("change", teken);
    teken();
  }

  /* Overzicht: de grootste veranderingen van het jongste boekjaar in mensentaal */
  function maakVeranderingen(data, analyseIdx) {
    var rows = [];
    TREND_SPECS.forEach(function (spec) {
      if (spec[3] !== "geld" && spec[3] !== "aantal") return;
      var reeks = reeksVoorSpec(spec, data.jaren, analyseIdx);
      var i0 = eersteMetData(reeks, 0); if (i0 < 0) return;
      var i1 = eersteMetData(reeks, i0 + 1); if (i1 < 0) return;
      var h = reeks[i0], v = reeks[i1];
      if (h === v) return;
      var pct = v !== 0 ? (h - v) / Math.abs(v) : null;
      rows.push({ spec: spec, h: h, v: v, pct: pct,
        bjV: data.jaren[i1].boekjaar, bj: data.jaren[i0].boekjaar,
        score: pct !== null ? Math.abs(pct) : 0 });
    });
    if (!rows.length) return null;
    rows.sort(function (a, b) { return b.score - a.score; });
    var wrap = document.createElement("div");
    wrap.className = "jr-verand";
    var kop = document.createElement("p");
    kop.className = "jr-verand-kop";
    kop.textContent = "Grootste veranderingen";
    wrap.appendChild(kop);
    var ul = document.createElement("ul");
    ul.className = "jr-veranderingen";
    rows.slice(0, 3).forEach(function (r) {
      var li = document.createElement("li");
      var st = document.createElement("strong");
      st.textContent = r.spec[1] + " ";
      li.appendChild(st);
      var sp = document.createElement("span");
      sp.className = "jr-delta" + (r.h - r.v < 0 ? " jr-neg" : " jr-pos");
      sp.textContent = (r.h - r.v > 0 ? "\u25B2" : "\u25BC") + " van " + fmtWaarde(r.v, r.spec[3]) +
        " naar " + fmtWaarde(r.h, r.spec[3]) + (r.pct !== null ? " (" + pctTeken(r.pct) + ")" : "") +
        " (" + r.bjV + " \u2192 " + r.bj + ")";
      li.appendChild(sp);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  var jrTabSeq = 0;
  function maakTabStructuur(paneel, secties) {
    jrTabSeq++;
    var nav = document.createElement("nav");
    nav.className = "jr-tabs";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Onderdelen van de jaarrekening-analyse");
    var host = document.createElement("div");
    host.className = "jr-tabpanelen";
    paneel.appendChild(nav);
    paneel.appendChild(host);
    var panelen = {};
    var knoppen = [];
    secties.forEach(function (sec, i) {
      var id = "jr" + jrTabSeq + "-" + sec[0];
      var knop = document.createElement("button");
      knop.type = "button";
      knop.className = "jr-tab";
      knop.id = id + "-tab";
      knop.textContent = sec[1];
      knop.setAttribute("role", "tab");
      knop.setAttribute("aria-controls", id + "-paneel");
      knop.setAttribute("aria-selected", i === 0 ? "true" : "false");
      knop.tabIndex = i === 0 ? 0 : -1;
      var pan = document.createElement("div");
      pan.className = "jr-tabpanel";
      pan.id = id + "-paneel";
      pan.setAttribute("role", "tabpanel");
      pan.setAttribute("aria-labelledby", id + "-tab");
      pan.tabIndex = 0;
      if (i !== 0) pan.hidden = true;
      nav.appendChild(knop);
      host.appendChild(pan);
      panelen[sec[0]] = pan;
      knoppen.push([knop, pan]);
    });
    function activeer(idx) {
      knoppen.forEach(function (paar, i) {
        var aan = i === idx;
        paar[0].setAttribute("aria-selected", aan ? "true" : "false");
        paar[0].tabIndex = aan ? 0 : -1;
        paar[1].hidden = !aan;
      });
    }
    nav.addEventListener("keydown", function (ev) {
      var toetsen = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 };
      var actieve = knoppen.findIndex(function (p) { return p[0].getAttribute("aria-selected") === "true"; });
      var doel = -1;
      if (toetsen[ev.key]) doel = (actieve + toetsen[ev.key] + knoppen.length) % knoppen.length;
      else if (ev.key === "Home") doel = 0;
      else if (ev.key === "End") doel = knoppen.length - 1;
      if (doel >= 0) {
        ev.preventDefault();
        activeer(doel);
        knoppen[doel][0].focus();
      }
    });
    knoppen.forEach(function (paar, i) {
      paar[0].addEventListener("click", function () { activeer(i); });
    });
    return { panelen: panelen, knoppen: knoppen, activeer: activeer };
  }

  function render(paneel, data, nace, opties) {
    injecteerStijlen();
    opties = opties || {};
    paneel.innerHTML = "";
    var analyseIdx = {};
    (data.analyse || []).forEach(function (a, i) {
      if (data.jaren[i]) analyseIdx[data.jaren[i].boekjaar] = a;
    });
    var nieuwste = data.jaren[0];
    var an0 = analyseIdx[nieuwste.boekjaar] || {};
    var vorigJaar = data.jaren[1] ? data.jaren[1].boekjaar : null;

    var kop = document.createElement("p");
    kop.className = "jr-kop";
    kop.innerHTML = "<strong>" + nfT.format(data.aantalNeerleggingen) + (data.aantalNeerleggingen === 1 ? " neerlegging" : " neerleggingen") +
      "</strong> bij de NBB Balanscentrale — doorrekening van boekjaar <strong>" + nieuwste.boekjaar + "</strong> (" + nieuwste.modelNaam + ")" +
      (data.jaren.length > 1 ? ", vergeleken met " + data.jaren[data.jaren.length - 1].boekjaar : "") + ".";
    paneel.appendChild(kop);

    function tekenKlasse(v) { return v < 0 ? " jr-neg" : (v > 0 ? " jr-pos" : ""); }

    /* Tabblad-dossier opbouwen */
    var tabs = maakTabStructuur(paneel, [
      ["ovz", "📊 Overzicht & Ratio's"], ["evo", "📑 Per rubriek"], ["opb", "🧮 Rekenroute"], ["cij", "📋 Cijfers (" + data.jaren.length + "j)"]
    ]);
    var pOvz = tabs.panelen.ovz, pEvo = tabs.panelen.evo,
        pOpb = tabs.panelen.opb, pCij = tabs.panelen.cij;

    /* 1. KPI-Kaarten Grid in Overzicht */
    var kpis = document.createElement("div");
    kpis.className = "jr-kpis";
    function kpi(titel, code, waarde, sub, ruw, ruwDelta, waardeKleur) {
      var box = document.createElement("div");
      box.className = "jr-kpi";
      box.style.setProperty("--kpi-idx", kpis.children.length);
      var lab = document.createElement("span");
      lab.className = "jr-kpi-label";
      lab.innerHTML = titel + (code ? " <span class='jr-code'>" + code + "</span>" : "");
      var w = document.createElement("span");
      w.className = "jr-kpi-waarde" + (waardeKleur !== undefined ? (" " + waardeKleur) : (typeof ruw === "number" ? tekenKlasse(ruw) : ""));
      w.textContent = waarde;
      box.appendChild(lab);
      box.appendChild(w);
      if (sub) {
        var d = document.createElement("span");
        d.className = "jr-delta" + (typeof ruwDelta === "number" ? tekenKlasse(ruwDelta) : "");
        d.textContent = sub;
        box.appendChild(d);
      }
      kpis.appendChild(box);
    }

    kpi("Eigen vermogen", "10/15", fmtGeld(nieuwste.eigenVermogen),
      (an0.eigenVermogenDelta != null && vorigJaar) ? fmtGeld(an0.eigenVermogenDelta, true) + " t.o.v. " + vorigJaar : "",
      nieuwste.eigenVermogen, an0.eigenVermogenDelta);
    kpi("Nettoresultaat", "9904", fmtGeld(nieuwste.resultaat),
      (an0.resultaatDelta != null && vorigJaar) ? fmtGeld(an0.resultaatDelta, true) + " t.o.v. " + vorigJaar : "",
      nieuwste.resultaat, an0.resultaatDelta);
    if (nieuwste.omzet != null) {
      kpi("Omzet", "70", fmtGeld(nieuwste.omzet),
        (an0.omzetGroei != null && vorigJaar) ? fmtPctTeken(an0.omzetGroei) + " t.o.v. " + vorigJaar : "",
        nieuwste.omzet, null);
    } else if (nieuwste.brutomarge != null) {
      kpi("Brutomarge", "9900", fmtGeld(nieuwste.brutomarge),
        (an0.brutomargeDelta != null && vorigJaar) ? fmtGeld(an0.brutomargeDelta, true) + " t.o.v. " + vorigJaar : "",
        nieuwste.brutomarge, an0.brutomargeDelta);
    }
    if (nieuwste.ebitda != null) {
      kpi("EBITDA", "formule", fmtGeld(nieuwste.ebitda),
        (an0.ebitdaDelta != null && vorigJaar) ? fmtGeld(an0.ebitdaDelta, true) + " t.o.v. " + vorigJaar : "",
        nieuwste.ebitda, an0.ebitdaDelta);
    }
    if (an0.solvabiliteit != null) {
      var solvTekst = an0.solvabiliteit >= 0.4 ? "🟢 Gezond (≥40%)" : (an0.solvabiliteit >= 0.25 ? "🟡 Voldoende (≥25%)" : "🔴 Aandacht (<25%)");
      kpi("Solvabiliteit", "10/15:20/58", fmtPct(an0.solvabiliteit), solvTekst, null, null, an0.solvabiliteit >= 0.25 ? "jr-pos" : "jr-neg");
    }
    if (an0.liquiditeit != null) {
      var liqTekst = an0.liquiditeit >= 1.2 ? "🟢 Ruim (≥1.2)" : (an0.liquiditeit >= 1.0 ? "🟡 Voldoende (≥1.0)" : "🔴 Krap (<1.0)");
      kpi("Liquiditeit", "29/58:42/48", fmtRatio(an0.liquiditeit), liqTekst, null, null, an0.liquiditeit >= 1.0 ? "jr-pos" : "jr-neg");
    }
    if (nieuwste.werknemers != null) {
      kpi("Personeel", "9087", fmtAantal(nieuwste.werknemers) + " VTE",
        (nieuwste.personeelskosten && nieuwste.werknemers > 0) ? fmtGeld(nieuwste.personeelskosten / nieuwste.werknemers) + " / VTE" : "",
        nieuwste.werknemers, null);
    }
    pOvz.appendChild(kpis);

    /* 2. Vector SVG Meerjarentrend Grafiek in Overzicht */
    if (data.jaren.length > 1) {
      var gBox = document.createElement("div");
      gBox.className = "jr-grafiek-container";
      var gTit = document.createElement("div");
      gTit.className = "jr-grafiek-titel";
      gTit.innerHTML = "<span>Meerjarenevolutie (" + data.jaren[data.jaren.length - 1].boekjaar + " – " + data.jaren[0].boekjaar + ")</span>" +
        "<div class='jr-legende'>" +
        "<span class='jr-legende-item'><span class='jr-legende-bol' style='background:var(--blauw)'></span> Eigen vermogen</span>" +
        "<span class='jr-legende-item'><span class='jr-legende-bol' style='background:#10B981'></span> Nettoresultaat</span>" +
        "</div>";
      gBox.appendChild(gTit);

      var svgW = 680, svgH = 170, padL = 50, padR = 20, padT = 20, padB = 30;
      var plotW = svgW - padL - padR, plotH = svgH - padT - padB;
      var jarenRev = data.jaren.slice().reverse();
      
      var maxEv = Math.max.apply(null, jarenRev.map(function(j){ return Math.max(0, j.eigenVermogen || 0); }));
      var minEv = Math.min.apply(null, jarenRev.map(function(j){ return Math.min(0, j.eigenVermogen || 0); }));
      var maxRes = Math.max.apply(null, jarenRev.map(function(j){ return Math.max(0, j.resultaat || 0); }));
      var minRes = Math.min.apply(null, jarenRev.map(function(j){ return Math.min(0, j.resultaat || 0); }));
      var topVal = Math.max(maxEv, maxRes, 10000);
      var botVal = Math.min(0, minEv, minRes);
      var valRange = topVal - botVal;

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + svgW + " " + svgH);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "auto");
      svg.style.display = "block";

      // Nul-as
      var yZero = padT + plotH - ((0 - botVal) / valRange) * plotH;
      var zeroLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      zeroLine.setAttribute("x1", padL); zeroLine.setAttribute("x2", svgW - padR);
      zeroLine.setAttribute("y1", yZero); zeroLine.setAttribute("y2", yZero);
      zeroLine.setAttribute("stroke", "var(--rand)"); zeroLine.setAttribute("stroke-width", "1.5");
      svg.appendChild(zeroLine);

      var stepX = plotW / jarenRev.length;
      var resPoints = [];

      jarenRev.forEach(function(j, idx) {
        var cx = padL + (idx + 0.5) * stepX;
        var barW = Math.max(16, stepX * 0.45);
        var ev = j.eigenVermogen || 0;
        var yEv = padT + plotH - ((ev - botVal) / valRange) * plotH;
        var barH = Math.abs(yZero - yEv);

        // Eigen vermogen bar
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", cx - barW / 2);
        rect.setAttribute("y", Math.min(yEv, yZero));
        rect.setAttribute("width", barW);
        rect.setAttribute("height", Math.max(2, barH));
        rect.setAttribute("rx", "3");
        rect.setAttribute("fill", "var(--blauw)");
        rect.setAttribute("class", "jr-bar");
        rect.style.setProperty("--bar-idx", idx);
        svg.appendChild(rect);

        // Boekjaar label
        var tYear = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tYear.setAttribute("x", cx); tYear.setAttribute("y", svgH - 8);
        tYear.setAttribute("text-anchor", "middle");
        tYear.setAttribute("font-size", "11");
        tYear.setAttribute("font-weight", "600");
        tYear.setAttribute("fill", "var(--muted)");
        tYear.textContent = j.boekjaar;
        svg.appendChild(tYear);

        // Resultaat point
        var res = j.resultaat || 0;
        var yRes = padT + plotH - ((res - botVal) / valRange) * plotH;
        resPoints.push({ x: cx, y: yRes, val: res });
      });

      // Resultaat Sparkline
      if (resPoints.length > 1) {
        var pPath = "M " + resPoints.map(function(p){ return p.x + " " + p.y; }).join(" L ");
        var pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", pPath);
        pathEl.setAttribute("fill", "none");
        pathEl.setAttribute("stroke", "#10B981");
        pathEl.setAttribute("stroke-width", "2.5");
        pathEl.setAttribute("class", "jr-sparkline");
        svg.appendChild(pathEl);

        resPoints.forEach(function(p, pIdx) {
          var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
          dot.setAttribute("r", "4.5");
          dot.setAttribute("fill", p.val >= 0 ? "#10B981" : "#EF4444");
          dot.setAttribute("stroke", "#FFFFFF");
          dot.setAttribute("stroke-width", "1.5");
          dot.setAttribute("class", "jr-dot");
          dot.style.setProperty("--dot-idx", pIdx);
          svg.appendChild(dot);
        });
      }

      gBox.appendChild(svg);
      pOvz.appendChild(gBox);
    }

    /* 3. Belangrijkste Veranderingen & Lezingen in Overzicht */
    var verl = maakVeranderingen(data, analyseIdx);
    if (verl) pOvz.appendChild(verl);

    var ul = document.createElement("ul");
    ul.className = "jr-lezingen";
    function lezingLi(titel, tekst) {
      if (!tekst) return;
      var li = document.createElement("li");
      li.innerHTML = "<strong>" + titel + ":</strong> " + tekst;
      ul.appendChild(li);
    }
    lezingLi("Solvabiliteit", an0.solvabiliteit != null ? lezingSolv(an0.solvabiliteit) : null);
    lezingLi("Liquiditeit", an0.liquiditeit != null ? lezingLiq(an0.liquiditeit) : null);
    lezingLi("Resultaat", nieuwste.resultaat != null ? lezingRes(nieuwste.resultaat, an0.resultaatDelta, vorigJaar) : null);
    lezingLi("Rendabiliteit EV", an0.rendabiliteitEV != null ? lezingRoe(an0.rendabiliteitEV) : null);
    if (ul.children.length) pOvz.appendChild(ul);

    /* 4. Sectorbenchmark */
    var mult = multipleVoor(nace);
    if (mult && nieuwste.ebitda != null) {
      var bench = document.createElement("div");
      bench.className = "jr-bench";
      var bt = document.createElement("p");
      bt.className = "jr-bench-titel";
      bt.textContent = "Sectorbenchmark (Equidam EBITDA-multiple)";
      bench.appendChild(bt);
      var be = document.createElement("p");
      var evSchat = nieuwste.ebitda * mult[0];
      be.innerHTML = "Geschatte ondernemingswaarde bij EBITDA " + fmtGeld(nieuwste.ebitda) +
        " (multiple " + fmtMult(mult[0]) + "× voor sector " + (mult[1] || "algemeen") + "): " +
        "<span class='jr-bench-ev'>" + (evSchat > 0 ? fmtGeld(evSchat) : "—") + "</span>.";
      bench.appendChild(be);
      pOvz.appendChild(bench);
    }

    /* 5. Subpanelen: Per rubriek & Rekenroute */
    maakRubriekStaat(pEvo, data, analyseIdx);
    maakRekenroute(pOpb, data.jaren);

    /* 6. Cijfer-Tabel Tab (pCij) */
    var tabelBox = document.createElement("div");
    tabelBox.className = "jr-scroll";
    var tabel = document.createElement("table");
    tabel.className = "jr-tabel";
    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    var thKop = document.createElement("th");
    thKop.textContent = "Kerncijfer (EUR)";
    trh.appendChild(thKop);
    data.jaren.forEach(function (j) {
      var th = document.createElement("th");
      th.textContent = j.boekjaar;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tabel.appendChild(thead);

    var tbody = document.createElement("tbody");
    function voegTabelRij(label, prop, isPct, isDelta) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.textContent = label;
      tr.appendChild(th);
      data.jaren.forEach(function (j, i) {
        var td = document.createElement("td");
        var val = (prop in j) ? j[prop] : (data.analyse && data.analyse[i] ? data.analyse[i][prop] : null);
        if (isPct) {
          td.textContent = fmtPct(val);
        } else {
          td.textContent = fmtGeld(val);
        }
        if (typeof val === "number" && val < 0) td.className = "jr-neg";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }

    voegTabelRij("Eigen vermogen (10/15)", "eigenVermogen");
    voegTabelRij("Balanstotaal (20/58)", "balanstotaal");
    voegTabelRij("Vaste activa (20/28)", "vasteActiva");
    voegTabelRij("Vlottende activa (29/58)", "vlottend");
    voegTabelRij("Vorderingen (40/41)", "vorderingen");
    voegTabelRij("Geldbeleggingen & liquide (54/58)", "liquide");
    voegTabelRij("Schulden totaal (17/49)", "schulden");
    voegTabelRij("Schulden op korte termijn (42/48)", "schuldenKort");
    voegTabelRij("Omzet (70)", "omzet");
    voegTabelRij("Brutomarge (9900)", "brutomarge");
    voegTabelRij("Personeelskosten (62)", "personeelskosten");
    voegTabelRij("Bedrijfswinst / EBIT (9901)", "bedrijfswinst");
    voegTabelRij("EBITDA", "ebitda");
    voegTabelRij("Nettoresultaat / Winst (9904)", "resultaat");
    voegTabelRij("Solvabiliteitsgraad", "solvabiliteit", true);
    voegTabelRij("Nettomarge", "nettomarge", true);
    voegTabelRij("Rendabiliteit EV (ROE)", "rendabiliteitEV", true);

    tabel.appendChild(tbody);
    tabelBox.appendChild(tabel);
    pCij.appendChild(tabelBox);
  }

  function renderFout(paneel, boodschap) {
    paneel.innerHTML = "";
    var p = document.createElement("p");
    p.className = "jr-status";
    p.textContent = boodschap;
    paneel.appendChild(p);
  }

  window.KBOJr = {
    fmtGeld: fmtGeld, fmtPct: fmtPct, fmtPctTeken: fmtPctTeken, fmtRatio: fmtRatio, fmtMult: fmtMult,
    fmtAantal: fmtAantal,
    lezingSolv: lezingSolv, lezingLiq: lezingLiq, lezingRes: lezingRes,
    multipleVoor: multipleVoor, render: render, renderFout: renderFout
  };
})();
