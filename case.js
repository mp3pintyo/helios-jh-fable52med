// A Huang-akta — data, page rendering, and the Helios stage director.
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, html = "") => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
};

/* =====================================================================
   DATA
   ===================================================================== */
const CARDS = [
  ["JH", "Jensen Huang", "Nvidia · alapító-vezérigazgató, 63", "1993 óta vezeti a céget. Tagja Trump tudományos tanácsadó testületének, és a kínai chipexport lazításának fő szószólója. November 8-án elismerte a hűtlenséget.", ""],
  ["AH", "Alice Huang", "Huang Le · Megaspeed, volt ügyvezető", "Kínai állampolgár. 2023 márciusától novemberig volt ügyvezető igazgató; a WSJ szerint utána is a cég vezetőjeként lépett fel. Az amerikai hírszerzés szerint Pekingnek jelentett. Vádat nem emeltek ellene.", "alt"],
  ["MS", "Megaspeed", "Szingapúr · AI-felhőszolgáltató", "A kínai 7Road játékcég leányából lett 2023-ban. Nvidia-partner, GPU-kapacitást ad bérbe. Az amerikai igazságügyi minisztérium büntetőeljárásban vizsgálja.", "alt"],
  ["LH", "Lori Huang és a család", "feleség · több mint 40 éve", "Az egyetemen laborpartnerek voltak. Két gyermekük, Spencer és Madison az Nvidia vezetői. Huang részvényeinek jó része közös családi trösztökben van.", ""],
  ["IT", "Az igazgatótanács", "Nvidia · független bizottság", "Külső jogászokkal vizsgálja, célpontja volt-e Huang egy külföldi hírszerzési műveletnek. Egyelőre bizalmáról biztosította.", ""],
  ["DT", "Donald Trump", "az Egyesült Államok elnöke", "Huang legfontosabb washingtoni szövetségese. A NYT szerint 2025-ben tájékoztatták a kapcsolatról, de nem lépett. Most is kiáll mellette.", ""],
  ["MR", "Marco Rubio", "külügyminiszter", "A NYT szerint ő felügyelte annak a titkos feljegyzésnek a megírását, amely 2026 tavaszán figyelmeztetett a kapcsolatra.", ""],
  ["TT", "Tim Teter", "Nvidia · jogtanácsos", "2025 augusztusában megkereste a Megaspeed-ügy nyomozóit. Az Nvidia szerint ez szokásos egyeztetés volt a hatóságokkal.", ""],
  ["3×", "Mast · Moolenaar · Crawford", "képviselőház · bizottsági elnökök", "A külügyi, a Kína- és a hírszerzési bizottság republikánus elnökei. Közös, zárt meghallgatást kértek november 18-ra.", ""],
  ["KC", "Kuo Csia-kun", "kínai külügyi szóvivő", "„Az úgynevezett kínai kémnarratíva merő alaptalan vád, rágalom és lejáratás.”", "alt"],
];

// relationship graph: id -> [x, y, label, sub]
const NODES = {
  JH: [455, 320, "Jensen Huang", "Nvidia-vezér"],
  NV: [455, 120, "Nvidia", "igazgatótanács"],
  AH: [190, 320, "Alice Huang", "Huang Le"],
  MS: [190, 510, "Megaspeed", "Szingapúr"],
  CN: [95, 120, "Peking", "állambiztonság (MSS)"],
  KU: [430, 585, "Kínai ügyfelek", "pl. Alibaba"],
  IC: [700, 440, "Hírszerzés", "megfigyelés, memó"],
  TR: [720, 215, "Fehér Ház", "Trump, Rubio"],
  DJ: [690, 585, "Hatóságok", "BIS → DOJ, FBI"],
  CG: [905, 330, "Kongresszus", "3 bizottság"],
  WS: [880, 90, "Wall Street", "részvényesek"],
  GM: [905, 540, "GPU-piac", "gamerek"],
};
// [from, to, type, short, detail]
const EDGES = [
  ["JH", "AH", "fact", "viszony", "Huang elismerte a hűtlenséget, a nőt nem nevezte meg. A NYT szerint a testületnek azt mondta: intim kapcsolata volt egy üzletasszonnyal, akit az USA kínai informátornak tart."],
  ["AH", "MS", "fact", "ügyvezető", "2023 márciusától novemberig ügyvezető igazgató. A WSJ szerint 2025 augusztusában is a cég vezérigazgatójaként mutatkozott be."],
  ["AH", "CN", "claim", "beszervezés?", "Az amerikai hírszerzés értékelése szerint az állambiztonsági minisztérium szervezte be, és közvetlenül Pekingnek jelentett. Peking tagadja; vádemelés nincs."],
  ["NV", "MS", "fact", "4,8 Mrd $", "A Megaspeed malajziai testvércége legalább 4,8 milliárd dollárért vett Nvidia-technológiát. A cég 2023 novemberében lett Nvidia Cloud Partner; az Nvidia 2025 júniusában leállította az eladást."],
  ["MS", "KU", "fact", "bérbeadás", "A Megaspeed távoli számítási kapacitást ad bérbe kínai ügyfeleknek. Ez önmagában nem tiltott: az exportszabály a chip fizikai kivitelét korlátozza."],
  ["MS", "CN", "claim", "csempészet?", "Amerikai tisztviselők gyanúja szerint a hardver egy része Kínába került. Egy ellenőr bontatlan dobozokat látott az adatközpontban. A Megaspeed tagadja."],
  ["NV", "JH", "fact", "vizsgálat", "November 8-án független igazgatókból álló bizottság indított vizsgálatot. A testület szerint nincs ok titoksértést feltételezni, és bízik Huangban."],
  ["JH", "TR", "fact", "lobbi", "Huang elérte az exportszabályok részleges lazítását: a H200-as chip a kormány 25 százalékos részesedése mellett eladható Kínába. Elkísérte Trumpot a kínai útjára."],
  ["IC", "AH", "claim", "megfigyelés", "A NYT szerint nagyjából egy évig figyelték elektronikusan. Így bukkantak egy amerikai állampolgárra, akiről kiderült, hogy Jensen Huang."],
  ["IC", "TR", "claim", "tájékoztatás", "A NYT szerint Trumpot 2025-ben tájékoztatták, 2026 tavaszán pedig Rubio felügyeletével titkos feljegyzés készült. Lépés nem történt."],
  ["IC", "JH", "claim", "nem szóltak", "Huang nem kapott védelmi eligazítást, vagyis nem figyelmeztették, hogy célpont lehet."],
  ["NV", "DJ", "claim", "megkeresés", "A NYT szerint az Nvidia jogtanácsosa 2025 augusztusában megkereste a nyomozókat. A kereskedelmi minisztérium vizsgálata ezután leállt, és az ügy az igazságügyhöz került."],
  ["DJ", "MS", "fact", "eljárás", "Az igazságügyi minisztérium nemzetbiztonsági részlege vizsgálja a Megaspeedet (CBS). Trump szerint az FBI is foglalkozik az üggyel."],
  ["CG", "JH", "fact", "meghallgatás", "Három republikánus bizottsági elnök zárt meghallgatásra hívta november 18-ra. A demokraták is vizsgálatot és szigorúbb chipkorlátozást követelnek."],
  ["WS", "NV", "fact", "−4,27% · per", "A részvény november 9-én 4,27 százalékot esett. Befektetők csoportos pert indítottak, mert szerintük a cég eltitkolta a kapcsolatot."],
  ["GM", "NV", "fact", "árak", "A videókártyák drágulása a botránytól független: a memóriahiány okozza. Közvetlen hatás legfeljebb az RTX 5090-nél várható."],
];

// [date, text, flag]   flag: "key" | "next" | ""   — a 4-digit entry starts a year block
const TIMELINE = [
  ["2022"],
  ["október", "Az Egyesült Államok először tiltja meg a fejlett AI-chipek kivitelét Kínába.", ""],
  ["2023"],
  ["március", "A kínai 7Road játékcég szingapúri leánya felveszi a <b>Megaspeed</b> nevet. Ügyvezető: Alice Huang.", "key"],
  ["november", "Alice Huang lemond az igazgatóságról, a cég egy szingapúri tulajdonoshoz kerül. Négy nappal később a Megaspeed Nvidia Cloud Partner.", ""],
  ["2024"],
  ["év eleje", "A WSJ szerint egy kaliforniai Nvidia-rendezvényen találkoznak.", ""],
  ["június", "Computex, Tajpej: közös fotók egy bárból. Néhány héttel később indulnak a milliárdos szállítások Malajziába.", "key"],
  ["ősz – tél", "A kereskedelmi minisztérium vizsgálni kezdi a Megaspeedet; Alice Huangot megfigyelik.", ""],
  ["2025"],
  ["május 22.", "Tajpeji vacsora. Egy tévéfelvételen Alice Huang arcon csókolja Jensen Huangot; a beszámolók szerint egy autóval távoznak.", "key"],
  ["június", "Az Nvidia leállítja az eladást a Megaspeednek.", ""],
  ["augusztus", "Az Nvidia jogtanácsosa megkeresi a nyomozókat. A vizsgálat átkerül az igazságügyi minisztériumhoz.", ""],
  ["október", "A NYT első cikke a „rejtélyes vezérigazgatóról”. A lap szerint ekkoriban tájékoztatják Trumpot.", ""],
  ["december", "Bloomberg: a Megaspeed 136 ezer Nvidia GPU-t importált. Trump engedélyezi a H200-as chip kínai eladását 25 százalékos állami részesedéssel.", ""],
  ["2026"],
  ["tavasz", "Titkos feljegyzés a kormány szűk körének a kapcsolatról. Májusban Huang Trumppal utazik Kínába.", ""],
  ["október 29.", "<b>New York Times:</b> az Nvidia vezére kínai kémművelet célpontja. Másnap Huang: a kapcsolat „teljesen normális” üzleti viszony.", "key"],
  ["november 3.", "Félidős választás: a demokraták megszerzik a Kongresszust. A techrészvények esnek.", ""],
  ["november 4–6.", "Három bizottsági elnök levele Huangnak. <b>Financial Times:</b> a kapcsolat romantikus volt.", ""],
  ["november 8.", "<b>Huang beismerő levele.</b> Az igazgatótanács független vizsgálatot indít.", "key"],
  ["november 9.", "A részvény 4,27 százalékot esik. Csoportos per indul. Zárt hírszerzési tájékoztató a Kongresszusban. Peking tagad.", "key"],
  ["november 10.", "A részvény nyitás előtt 1,8 százalékot javít. Itt tartunk.", ""],
  ["november 11.", "Határidő: Huang válasza a bizottságoknak.", "next"],
  ["november 17.", "Harmadik negyedéves gyorsjelentés.", "next"],
  ["november 18.", "Zárt meghallgatás a képviselőházban.", "next"],
];

const MOVERS = [["Nvidia", -4.27], ["AMD", 13.26], ["Marvell", 9.49], ["Broadcom", 8.78], ["Arm", 6.69], ["ASML", 6], ["Intel", 5.49], ["TSMC", 4], ["Qualcomm", 3.66]];

const GPUS = [["RTX 5050", 249, 420], ["RTX 5060", 299, 450], ["RTX 5060 Ti 16GB", 429, 790], ["RTX 5070", 549, 900], ["RTX 5070 Ti", 749, 1250], ["RTX 5080", 999, 2200], ["RTX 5090", 1999, 9400], ["Radeon RX 9070 XT", 599, 870]];

const LANGS = [
  ["HU", "Magyar", "„Pénz, szex, AI, Kína”", "A 444 a világgazdasági kockázatot, a Forbes.hu a lobbit, a hvg és a 24.hu a kémszálat emelte ki. A legtöbb magyar cikk a BBC és a New York Times nyomán készült; saját értesülés nincs."],
  ["EN", "Angol", "“A black eye moment”", "Itt keletkezik a történet: a NYT hozta a hírszerzési szálat, az FT a románcot, a WSJ a céges és családi hátteret, a Bloomberg a Megaspeedet. A keret: nemzetbiztonság és vezetői kockázat."],
  ["中", "Kínai", "„A legnagyobb veszély: elveszíteni az Nvidiát”", "A 36Kr a hatalmi szerkezetet elemzi (3,58 százalék, leváltható vezér). A Huxiu szerint a „kínai kém” címke mindenkinek kapóra jön Amerikában, Alice Huang inkább tőkepiaci ügyeskedő. Az állami Global Times szerint néhány fotóból fújták fel az ügyet."],
  ["日", "Japán", "「激震」— megrázkódtatás", "A játékos 4Gamer is vezető hírként hozta, tárgyszerűen. A Storm Media japán kiadása a teljes levelet lefordította, és táblázatban választotta szét a tényt a gyanútól. Fő téma az utódlási kockázat."],
  ["DE", "Német", "„Die womöglich schwerste Woche”", "A Handelsblatt szerint a cég történetének talán legnehezebb hete jön. A Tagesspiegel gazdasági kémthrillerhez hasonlítja az ügyet, és kiemeli: Huang októberben még Berlinben tárgyalt Merz kancellárral."],
  ["FR", "Francia", "« Une épée de Damoclès »", "A France 24 és az AFP „kínos ügyről” ír. A hangsúly Trump közelgő kínai útján és az AI-buboréktól való félelmen van. Trumpot idézik: „Biztosan magammal viszem.”"],
];

const SOURCES = {
  "Magyar": [
    ["444.hu — Pénz, szex, AI, Kína (a kiinduló cikk)", "https://444.hu/2026/11/09/penz-szex-ai-kina-ezeken-reccsenhet-meg-most-nemcsak-az-nvidia-de-akar-a-vilaggazdasag-is"],
    ["BBC News Magyarul — Az Nvidia kivizsgálja…", "https://www.bbc.com/magyarul/articles/cmkgkg7xj9kgo"],
    ["hvg.hu — Viszonya volt az Nvidia vezérének", "https://hvg.hu/tudomany/20261109_nvidia-vezer-jensen-huang-kinai-kemno-vizsgalat"],
    ["24.hu — Kémbotrány robbant ki", "https://24.hu/tech/2026/11/09/nvidia-vizsgalat-jensen-huang-kinai-kembotrany/"],
    ["Forbes.hu — Trumpnál lobbizott az Nvidia-vezér", "https://www.forbes.hu/uzlet/trump-nvidia-jensen-huang-kinai-kem-fbi-vizsgalat/"],
    ["Euronews magyarul", "https://hu.euronews.com/2026/11/09/vizsgalatot-inditott-az-nvidia-kinai-kem-halozhatta-be-a-techorias-vezeret-jensen-huangot"],
    ["Widescreen.hu", "https://widescreen.hu/jensen-huang-botranyba-keveredett-a-gyanu-szerint-kinai-kemmel-volt-viszonya-vizsgalat-indul-az-nvidia-vezerigazgatoja-ellen/"],
  ],
  "Angol — az ügy": [
    ["Newsweek — idővonal", "https://www.newsweek.com/nvidia-jensen-huang-china-timeline-alice-huang-12690761"],
    ["CNBC — What is Megaspeed?", "https://www.cnbc.com/2026/11/09/megaspeed-nvidia-jensen-huang-alice-huang.html"],
    ["CNBC — Nvidia stock falls 4%", "https://www.cnbc.com/2026/11/09/nvidia-jensen-huang-chinese-spy-investigation.html"],
    ["CNBC — nov. 10., nyitás előtt", "https://www.cnbc.com/2026/11/10/nvidia-nvda-jensen-huang-affair-chinese-spy.html"],
    ["CBS News", "https://www.cbsnews.com/news/nvidia-jensen-huang-investigation-china-intelligence/"],
    ["The Guardian — Why is Huang at the centre…", "https://www.theguardian.com/technology/2026/nov/09/nvidia-jensen-huang-us-china-donald-trump-spy"],
    ["ABC News (Ausztrália) — Who is Jensen Huang", "https://www.abc.net.au/news/2026-11-10/who-is-jensen-huang-and-why-is-nvidia-ceo-scandal-important/107368698"],
    ["Bloomberg — Huang defends Megaspeed ties", "https://www.bloomberg.com/news/articles/2026-10-29/nvidia-ceo-says-ties-to-company-under-spying-probe-were-normal"],
    ["Wikipedia — Nvidia alleged spying scandal", "https://en.wikipedia.org/wiki/Nvidia_alleged_spying_scandal"],
    ["É. P. Torres — The Jensen Huang Debacle and the AI Bubble", "https://www.realtimetechpocalypse.com/p/the-jensen-huang-debacle-and-the"],
  ],
  "Angol — videókártyák": [
    ["PC Gamer — the GPU company's dealings…", "https://www.pcgamer.com/hardware/graphics-cards/jensen-huangs-affair-with-alleged-chinese-spy-highlights-how-the-gpu-companys-dealings-are-now-everyones-business/"],
    ["TechSpot — GPU pricing, Q4 2026", "https://www.techspot.com/article/3192-gpu-pricing-q4-2026/"],
    ["Engadget — No end in sight for the GPU supply problem", "https://www.engadget.com/2309554/gpu-supply-problem-no-end-in-sight/"],
    ["SCMP — Chinese traders still confident", "https://www.scmp.com/tech/big-tech/article/3373855/chinese-traders-still-confident-nvidia-gpu-access-amid-jensen-huang-scandal"],
    ["Business Insider — more AI chips for the US", "https://www.businessinsider.com/nvidia-jensen-huang-scandal-free-up-ai-chips-for-us-2026-11"],
    ["Capital & Compute — Will the probe lower GPU prices?", "https://capitalandcompute.net/blog/will-nvidia-ceo-probe-lower-gpu-prices/"],
    ["The Week — How gamers turned on Huang", "https://www.theweek.in/news/sci-tech/2026/11/10/why-gamers-are-angry-at-nvidia-ceo-jensen-huang.html"],
  ],
  "Kínai": [
    ["36氪 — 黄仁勋出轨，最大危机：失去英伟达", "https://www.36kr.com/p/4062486156727168"],
    ["虎嗅 — 从黄仁勋出轨说起…间谍叙事", "https://www.huxiu.com/article/4904296.html"],
  ],
  "Japán": [
    ["4Gamer — NVIDIAに激震", "https://www.4gamer.net/games/999/G999905/20261110009/"],
    ["風傳媒日本語版 — 謝罪メール全文", "https://japan.storm.mg/articles/1179900"],
  ],
  "Német": [
    ["Handelsblatt — Nvidia prüft Verdacht…", "https://www.handelsblatt.com/technik/ki/jensen-huang-nvidia-prueft-verdacht-der-auslaendischen-spionage-gegen-chef/100268272.html"],
    ["Tagesspiegel — „Ich war meiner Frau untreu“", "https://www.tagesspiegel.de/internationales/nvidia-chef-soll-beziehung-mit-china-spionin-gehabt-haben--konzern-kundigt-prufung-an-16254931.html"],
  ],
  "Francia": [
    ["France 24 / AFP — Le patron de Nvidia éclaboussé…", "https://www.france24.com/fr/asie-pacifique/20261108-le-patron-de-nvidia-%C3%A9clabouss%C3%A9-par-une-affaire-extraconjugale-avec-une-espionne-chinoise-pr%C3%A9sum%C3%A9e"],
  ],
};

/* =====================================================================
   PAGE RENDERING
   ===================================================================== */
$("#cards").append(...CARDS.map(([mono, name, role, text, cls], i) =>
  el("article", { class: "card " + cls }, `<span class="id">SZ-${String(i + 1).padStart(2, "0")}</span><div class="mono-pic">${mono}</div><h4>${name}</h4><div class="role">${role}</div><p>${text}</p>`)));

$("#timeline").append(...TIMELINE.map((t) => t.length === 1
  ? el("div", { class: "tl-year" }, t[0])
  : el("div", { class: "tl-item " + t[2] }, `<time>${t[0]}</time><p>${t[1]}</p>`)));

$("#movers").append(...MOVERS.map(([name, v]) => {
  const w = (Math.abs(v) / 14) * 70;
  const style = v < 0 ? `left:${30 - w}%;width:${w}%` : `left:30%;width:${w}%`;
  return el("div", { class: "bar" + (v < 0 ? " neg" : "") }, `<span>${name}</span><div class="track"><div class="fill" style="${style}"></div></div><span>${v > 0 ? "+" : "−"}${String(Math.abs(v)).replace(".", ",")}%</span>`);
}));

$("#gputable").innerHTML = `<thead><tr><th>Modell</th><th>Ajánlott ár</th><th>Bolti ár (USA)</th><th>Felár</th></tr></thead><tbody>` +
  GPUS.map(([n, msrp, now]) => {
    const pct = Math.round((now / msrp - 1) * 100);
    const k = Math.min(1, pct / 300);
    const bg = `rgb(${Math.round(118 + 137 * k)}, ${Math.round(185 + 70 * k)}, ${Math.round(255 * k)})`;
    return `<tr><td>${n}</td><td>${msrp} $</td><td>${now.toLocaleString("hu-HU")} $</td><td><span class="heat" style="background:${bg}">+${pct}%</span></td></tr>`;
  }).join("") + `</tbody>`;

$("#langs").append(...LANGS.map(([code, name, quote, text]) =>
  el("article", { class: "lang" }, `<span class="code">${code}</span><h4>${name}</h4><div class="quote">${quote}</div><p>${text}</p>`)));

$("#sources").append(...Object.entries(SOURCES).map(([group, list]) =>
  el("div", {}, `<h4>${group}</h4>` + list.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join(""))));

/* ---------- relationship graph ---------- */
{
  const svg = $("#graph"), info = $("#graph-info"), NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
  };
  const W = 150, Hh = 50;
  const edgeEls = EDGES.map(([a, b, type]) => {
    const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
    return svg.appendChild(mk("line", { x1, y1, x2, y2, class: "edge " + type }));
  });
  const nodeEls = {};
  for (const [id, [x, y, label, sub]] of Object.entries(NODES)) {
    const g = mk("g", { class: "node", tabindex: "0", role: "button", "aria-label": label, transform: `translate(${x - W / 2},${y - Hh / 2})` });
    g.append(mk("rect", { width: W, height: Hh }), mk("text", { x: W / 2, y: 22 }, label), mk("text", { x: W / 2, y: 38, class: "s" }, sub));
    const pick = () => select(id);
    g.addEventListener("click", pick);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    nodeEls[id] = svg.appendChild(g);
  }
  function select(id) {
    const linked = new Set([id]);
    const rows = [];
    EDGES.forEach(([a, b, type, short, detail], i) => {
      const on = a === id || b === id;
      edgeEls[i].classList.toggle("dim", !on);
      edgeEls[i].classList.toggle("hot", on);
      if (on) {
        const other = a === id ? b : a;
        linked.add(other);
        rows.push(`<li><span class="b ${type === "fact" ? "b-fact" : "b-claim"}">${type === "fact" ? "tény" : "állítás"}</span><b>${NODES[other][2]}</b> · ${short}<br>${detail}</li>`);
      }
    });
    for (const [nid, g] of Object.entries(nodeEls)) {
      g.classList.toggle("sel", nid === id);
      g.classList.toggle("dim", !linked.has(nid));
    }
    info.innerHTML = `<h3>${NODES[id][2]} szálai</h3><ul>${rows.join("")}</ul>`;
  }
  select("JH");
}

/* ---------- chapters, reveal, progress ---------- */
const stops = [...document.querySelectorAll("[data-cam]")];
const chapterEls = stops.filter((s) => s.dataset.title);
const nav = $("#chapters");
chapterEls.forEach((s, i) => nav.append(el("a", { href: "#" + s.id }, `<span>${s.dataset.title}</span>${String(i).padStart(2, "0")}`)));
const navLinks = [...nav.children];

let pending = [...document.querySelectorAll(".reveal")];
function reveal() {
  if (!pending.length) return;
  pending = pending.filter((e) => {
    const r = e.getBoundingClientRect();
    const seen = r.top < innerHeight * 0.9 && r.bottom > 0;
    if (seen) e.classList.add("in");
    return !seen;
  });
}

/* =====================================================================
   HELIOS STAGE
   ===================================================================== */
// camera per chapter: eye, look-at (metres; y is height above the floor)
const CAMS = {
  hero:   { e: [3.5, 1.9, 14.5],  a: [-4.6, 3.4, 0] },
  brief:  { e: [-7.5, 3.0, 10.5], a: [1.5, 2.0, 0] },
  alice:  { e: [-1.5, 2.4, 12.5], a: [-5.0, 2.7, 4.5] },
  top:    { e: [-3, 34, 16],      a: [-3, 0, 1.5] },
  wide:   { e: [16, 7, 21],       a: [-4, 1, 0] },
  mega:   { e: [-6.6, 3.0, 5.0],  a: [-13.5, 1.0, -3.2] },
  china:  { e: [-12.5, 2.2, 7.0], a: [-20.2, 4.2, 12.6] },
  dc:     { e: [8.5, 1.9, 14.5],  a: [14.5, 2.5, 8] },
  wall:   { e: [7.6, 2.6, -0.4],  a: [13.8, 2.4, -9] },
  gamers: { e: [3.4, 2.1, -10.4], a: [-0.6, 1.3, -15] },
  future: { e: [11, 6.5, 15],     a: [0, 1.6, 0] },
  orbit:  { e: [-19, 11, -15],    a: [-2, 0.5, 2] },
  end:    { e: [0, 46, 4],        a: [0, 0, 0.5] },
};
// stations: label anchor in the scene + the camera used in explore mode
const STATIONS = [
  ["Nvidia", "Jensen Huang", [0, 4.5, 0], "hero"],
  ["Alice Huang", "Huang Le", [-6.5, 5.3, 6], "alice"],
  ["Megaspeed", "szerverek és bontatlan dobozok", [-15, 3.0, -4], "mega"],
  ["Peking", "állambiztonság — állítás", [-20, 7.8, 12], "china"],
  ["Washington", "Fehér Ház, Kongresszus, FBI", [14, 4.9, 8], "dc"],
  ["Wall Street", "−4,27%", [13.4, 5.9, -9], "wall"],
  ["GeForce", "a gamerek polca", [0, 2.5, -15], "gamers"],
];

let H = null;            // the engine module once it is running
let explore = false;
const cur = { e: [...CAMS.hero.e], a: [...CAMS.hero.a] };
const engineLine = $("#engine-line");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (t) => t * t * (3 - 2 * t);

// Which camera does the current scroll position ask for?
function scrollCam() {
  const vh = innerHeight, mid = vh / 2;
  let idx = 0, t = 0, hold = 0.5;
  for (let i = 0; i < stops.length; i++) {
    const r = stops[i].getBoundingClientRect();
    const half = Math.min(r.height / 2, vh / 2);
    const start = r.top + half, end = r.bottom - half;   // the section "holds" the camera while mid is in [start, end]
    if (mid >= start || i === 0) {
      idx = i;
      hold = end > start ? Math.min(1, Math.max(0, (mid - start) / (end - start))) : 0.5;
      if (mid > end && i < stops.length - 1) {
        const n = stops[i + 1].getBoundingClientRect();
        const nStart = n.top + Math.min(n.height / 2, vh / 2);
        t = Math.min(1, Math.max(0, (mid - end) / Math.max(1, nStart - end)));
      } else t = 0;
    }
  }
  const A = CAMS[stops[idx].dataset.cam], B = CAMS[stops[Math.min(idx + 1, stops.length - 1)].dataset.cam];
  const k = smooth(t);
  // a slow arc around the subject while the reader stays inside one chapter
  const swing = reduced ? 0 : (hold - 0.5) * 0.3 * (1 - k);
  let e = mix3(A.e, B.e, k);
  const a = mix3(A.a, B.a, k);
  const dx = e[0] - a[0], dz = e[2] - a[2], c = Math.cos(swing), s = Math.sin(swing);
  e = [a[0] + dx * c - dz * s, e[1], a[2] + dx * s + dz * c];
  return { e, a, idx };
}

function updateChrome(idx) {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  let active = -1;
  // a scene caption belongs to the chapter that follows it
  for (let i = idx; i < stops.length && active < 0; i++) if (stops[i].dataset.title) active = chapterEls.indexOf(stops[i]);
  navLinks.forEach((l, i) => l.classList.toggle("on", i === active));
}

/* ---------- labels projected from the scene ---------- */
const labelLayer = $("#labels");
const labelEls = STATIONS.map(([name, sub, , cam]) => {
  const d = el("div", { class: "tag3d" }, `${name}<small>${sub}</small>`);
  d.addEventListener("click", () => explore && flyTo(cam));
  labelLayer.append(d);
  return d;
});
function updateLabels(heroView) {
  const c = H.heliosEditorCamera();
  if (!c || c.length < 25) return;
  const w = innerWidth, h = innerHeight;
  STATIONS.forEach(([, , p], i) => {
    const cx = c[0] * p[0] + c[4] * p[1] + c[8] * p[2] + c[12];
    const cy = c[1] * p[0] + c[5] * p[1] + c[9] * p[2] + c[13];
    const cw = c[3] * p[0] + c[7] * p[1] + c[11] * p[2] + c[15];
    const x = (cx / cw * 0.5 + 0.5) * w, y = (1 - (cy / cw * 0.5 + 0.5)) * h;
    const dist = Math.hypot(p[0] - c[16], p[1] - c[17], p[2] - c[18]);
    const ok = cw > 0.1 && !(heroView && x < w * 0.56) && x > -40 && x < w - 40 && y > 50 && y < h - 20 && dist < 62;
    const d = labelEls[i];
    d.style.opacity = ok ? Math.min(1, 1.5 - dist / 60) : 0;
    if (ok) d.style.transform = `translate(${x.toFixed(1)}px, ${(y - 62).toFixed(1)}px)`;
  });
}

/* ---------- frame loop ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const want = scrollCam();
  updateChrome(want.idx);
  reveal();
  if (!H) return;
  if (!explore) {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    cur.e = mix3(cur.e, want.e, k);
    cur.a = mix3(cur.a, want.a, k);
    const t = now / 1000, drift = reduced ? 0 : 0.18;   // the camera breathes a little
    H.heliosLookAt(cur.e[0] + Math.sin(t * 0.21) * drift, cur.e[1] + Math.sin(t * 0.17) * drift * 0.5, cur.e[2] + Math.cos(t * 0.19) * drift, cur.a[0], cur.a[1], cur.a[2]);
  }
  updateLabels(!explore && want.idx === 0 && scrollY < innerHeight * 0.4);
}
requestAnimationFrame(frame);

function flyTo(name) {
  const c = CAMS[name];
  cur.e = [...c.e]; cur.a = [...c.a];
  H?.heliosLookAt(...c.e, ...c.a);
}

/* ---------- explore mode: hand the camera to the visitor ---------- */
const exploreBtn = $("#explore-btn"), dock = $("#dock");
STATIONS.forEach(([name, , , cam]) => {
  const b = el("button", { class: "btn", type: "button" }, name);
  b.addEventListener("click", () => flyTo(cam));
  dock.append(b);
});
dock.append(Object.assign(el("button", { class: "btn", type: "button" }, "Felülnézet"), { onclick: () => flyTo("top") }));
function setExplore(on) {
  if (!H) return;
  explore = on;
  document.body.classList.toggle("explore", on);
  exploreBtn.textContent = on ? "✕ Vissza az aktához" : "Helyszínelés 3D-ben";
  if (on) { H.heliosLookAt(...cur.e, ...cur.a); $("#helios-canvas").focus({ preventScroll: true }); }
}
exploreBtn.addEventListener("click", () => setExplore(!explore));
addEventListener("keydown", (e) => { if (e.key === "Escape" && explore) setExplore(false); });

/* ---------- boot ---------- */
function dress(m) {
  const A = (o) => m.heliosEditorApply(JSON.stringify(o));
  const env = JSON.parse(m.heliosEditorState()).environment;
  env.sun_elevation_deg = -25; env.sun_azimuth_deg = 200; env.sun_intensity = 1.5;
  Object.assign(env.fog, { density: 0.02, height_falloff: 0.12, albedo: [0.55, 0.9, 0.35], ambient: 0.4 });
  env.clouds.coverage = 0.15;
  A({ op: "environment", env });
  A({ op: "render", key: "motion_blur", value: 0 });
  A({ op: "render", key: "bloom_intensity", value: 0.12 });
  A({ op: "render", key: "auto_exposure", value: false });
  A({ op: "material", name: "vault/green", params: { emissive_color: [1.39, 2.17, 0] } });
  const G = [0.55, 1, 0.12], Wt = [0.95, 1, 0.9];
  const light = (position, color, intensity, range, cast_shadows = false) => A({ op: "add_light", def: {
    shape: "point", position, direction: [0, -1, 0], color, intensity, range, source_radius: 0.08, cast_shadows, inner_deg: 25, outer_deg: 35, enabled: true } });
  light([0, 4.2, 4.5], G, 40, 16, true);       // the card
  light([0, 5.5, -3.5], G, 14, 12);
  light([-6.0, 3.2, 7.6], Wt, 16, 9);          // Alice
  light([-9.6, 3.6, 0.9], Wt, 30, 10, true);   // crates
  light([-15, 2.4, -4], G, 70, 10);            // rack aisle
  light([-19.6, 5.5, 14.6], Wt, 34, 13);       // Beijing
  light([14, 3.0, 10.4], Wt, 34, 12, true);    // Washington
  light([13.4, 3.4, -6.4], G, 22, 11);         // Wall Street
  light([0, 3.2, -12.6], Wt, 22, 10);          // gamers' shelf
}

async function boot() {
  if (!navigator.gpu) throw new Error("ez a böngésző nem támogatja a WebGPU-t");
  const clean = location.pathname + location.hash;
  // Helios reads the model to load from the query string at start-up.
  history.replaceState(null, "", "?gltf=scene/vault.glb" + location.hash);
  document.body.append(el("span", { id: "engine-status", hidden: "" }));
  globalThis.heliosConfig = { embedded: true, statusElement: "engine-status", gpuBudgetMs: 11 };
  const m = await import("./helios/pkg/helios_demo.js");
  await m.default();
  for (let i = 0; i < 600 && !m.heliosScene(); i++) await new Promise((r) => setTimeout(r, 100));
  history.replaceState(null, "", clean);
  if (!m.heliosScene()) throw new Error($("#engine-status").textContent || "a jelenet nem töltődött be");
  dress(m);
  m.heliosLookAt(...cur.e, ...cur.a);
  H = m;
  // The first seconds after start-up the GPU is still compiling pipelines and frames stall;
  // keep the fallback stage up until frames flow steadily.
  engineLine.textContent = "Helios: a jelenet bemelegszik…";
  await new Promise((done) => {
    let run = 0, prev = performance.now();
    const tick = (t) => { run = t - prev < 120 ? run + 1 : 0; prev = t; run >= 10 ? done() : requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(done, 20000);
  });
  document.body.classList.add("engine-on");
  document.addEventListener("visibilitychange", () => m.heliosSetPaused(document.hidden));
  setInterval(() => {
    const fps = /\((\d+) fps\)/.exec(m.heliosHud());
    engineLine.innerHTML = `Render: <b>Helios</b> · WebGPU${fps ? " · " + fps[1] + " fps" : ""}`;
  }, 1000);
}
boot().catch((err) => {
  console.warn("Helios:", err);
  document.body.classList.add("no-gpu");
  engineLine.textContent = "3D háttér nélkül: " + (err.message || err);
});
