/* =============================================================================
   RÉSEAU AXIAL — la carte conceptuelle en trois dimensions.

   Pourquoi la 3D ici, et pas de la décoration : un corpus organisé en sections
   qui partagent des concepts n'est pas planaire. À plat, les liens transverses
   d'une section à l'autre se croisent au hasard et ne veulent plus rien dire.
   En volume, chaque section occupe sa région, et un lien qui traverse le centre
   se voit pour ce qu'il est : un pont entre deux mondes.

   Rendu sur canvas 2D avec projection perspective faite à la main.
   Aucune bibliothèque, aucun WebGL, aucune ressource externe.
   ========================================================================== */

const RX = {
  noeuds: [], arcs: [],
  lacet: 0.6, tangage: -0.35, zoom: 0.78,
  survol: null, anim: null, tourne: true,
  types: new Set(), verbes: new Set(),
};

/* Verbes masqués par défaut : ils relient tout le corpus au même canal et au
   même outil. Vrais, mais ils dessinent une étoile qui écrase la structure
   conceptuelle. On les rallume à la demande. */
const RX_PLOMBERIE = ["publie_sur", "stocke_dans"];

const RX_F = 1500;   // distance focale de la projection

/* ---------- Placement en volume ------------------------------------------- */

/* Sphère de Fibonacci : n points régulièrement répartis sur une sphère.
   Aucun agglutinement aux pôles, contrairement à un maillage lat/long. */
function surSphere(i, n, r) {
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const rayon = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return { x: Math.cos(theta) * rayon * r, y: y * r, z: Math.sin(theta) * rayon * r };
}

function disposer() {
  const pos = new Map();

  // 1. L'univers-racine au centre.
  const racine = parId("univers.mentis-prime");
  if (racine) pos.set(racine.id, { x: 0, y: 0, z: 0 });

  // 2. Les sections : réparties sur une sphère intérieure.
  const sections = (S.elements.oeuvre || []).filter(o => o.genre === "série");
  sections.forEach((s, i) => pos.set(s.id, surSphere(i, sections.length, 300)));

  // 3. Les articles : en grappe autour de leur section.
  const parSection = new Map(sections.map(s => [s.id, []]));
  for (const o of (S.elements.oeuvre || [])) {
    if (o.genre === "série" || o.id === "univers.mentis-prime") continue;
    const lien = S.relations.find(r => r.de === o.id && r.verbe === "partie_de" && parSection.has(r.vers));
    (parSection.get(lien ? lien.vers : sections[0]?.id) || []).push(o);
  }
  for (const [sid, liste] of parSection) {
    const c = pos.get(sid) || { x: 0, y: 0, z: 0 };
    liste.forEach((o, i) => {
      const d = surSphere(i, liste.length, 165);
      pos.set(o.id, { x: c.x + d.x, y: c.y + d.y, z: c.z + d.z });
    });
  }

  // 4. Les concepts : au barycentre des œuvres qui les traitent, tiré vers
  //    le centre. Un concept partagé par plusieurs sections migre donc
  //    naturellement vers l'axe — c'est ce qui rend les ponts visibles.
  for (const c of (S.elements.concept || [])) {
    const amont = S.relations.filter(r => r.vers === c.id && r.verbe === "traite_de")
      .map(r => pos.get(r.de)).filter(Boolean);
    if (amont.length) {
      const m = amont.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y, z: a.z + p.z }), { x: 0, y: 0, z: 0 });
      pos.set(c.id, { x: m.x / amont.length * 0.55, y: m.y / amont.length * 0.55, z: m.z / amont.length * 0.55 });
    }
  }

  // 5. Tout le reste : coquille extérieure.
  const reste = tous().filter(e => !pos.has(e.id));
  reste.forEach((e, i) => pos.set(e.id, surSphere(i, reste.length, 520)));

  RX.noeuds = tous().map(e => {
    const p = pos.get(e.id) || { x: 0, y: 0, z: 0 };
    return { id: e.id, titre: e.titre, type: e.type, d: degre(e.id), ...p, px: 0, py: 0, ps: 1 };
  });
  const idx = new Map(RX.noeuds.map(n => [n.id, n]));
  RX.arcs = S.relations
    .map(r => ({ a: idx.get(r.de), b: idx.get(r.vers), v: r.verbe }))
    .filter(x => x.a && x.b);
  RX.total = RX.arcs.length;
}

/* ---------- Projection ------------------------------------------------------ */

function projeter(W, H) {
  const cl = Math.cos(RX.lacet), sl = Math.sin(RX.lacet);
  const ct = Math.cos(RX.tangage), st = Math.sin(RX.tangage);
  for (const n of RX.noeuds) {
    const x1 = n.x * cl - n.z * sl;
    const z1 = n.x * sl + n.z * cl;
    const y2 = n.y * ct - z1 * st;
    const z2 = n.y * st + z1 * ct;
    const s = (RX_F / (RX_F + z2)) * RX.zoom;
    n.px = W / 2 + x1 * s;
    n.py = H / 2 + y2 * s;
    n.ps = s;
    n.pz = z2;
  }
}

/* ---------- Dessin ---------------------------------------------------------- */

function dessinerReseau() {
  const cv = $("#reseau-canvas");
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== W * dpr || cv.height !== H * dpr) {
    cv.width = W * dpr; cv.height = H * dpr;
  }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#07060A";
  g.fillRect(0, 0, W, H);

  projeter(W, H);

  const visible = n => RX.types.has(n.type);

  // Arcs d'abord, du plus lointain au plus proche.
  const arcs = RX.arcs.filter(x => visible(x.a) && visible(x.b) && RX.verbes.has(x.v))
    .sort((p, q) => (q.a.pz + q.b.pz) - (p.a.pz + p.b.pz));
  for (const { a, b } of arcs) {
    const prof = (a.pz + b.pz) / 2;
    const alpha = Math.max(0.04, Math.min(0.34, 0.34 - prof / 2600));
    const proche = RX.survol && (a.id === RX.survol || b.id === RX.survol);
    g.strokeStyle = proche ? `rgba(232,206,122,0.85)` : `rgba(201,162,39,${alpha})`;
    g.lineWidth = proche ? 1.4 : 0.6;
    g.beginPath(); g.moveTo(a.px, a.py); g.lineTo(b.px, b.py); g.stroke();
  }

  // Nœuds ensuite, même tri.
  const ns = RX.noeuds.filter(visible).slice().sort((p, q) => q.pz - p.pz);
  for (const n of ns) {
    const r = Math.max(1.6, (2.6 + Math.min(7, Math.sqrt(n.d) * 1.9)) * n.ps);
    const prof = Math.max(0.25, Math.min(1, 1 - n.pz / 1700));
    g.globalAlpha = prof;
    g.fillStyle = COULEURS[n.type];
    g.beginPath(); g.arc(n.px, n.py, r, 0, 6.2832); g.fill();
    if (n.id === RX.survol) {
      g.globalAlpha = 1;
      g.strokeStyle = "#E8CE7A"; g.lineWidth = 1.6;
      g.beginPath(); g.arc(n.px, n.py, r + 4, 0, 6.2832); g.stroke();
    }
    g.globalAlpha = 1;
  }

  // Étiquettes : sections, gros nœuds, et l'élément survolé.
  g.font = "11px ui-monospace, Menlo, monospace";
  g.textBaseline = "middle";
  for (const n of ns) {
    const gros = n.d >= 12;
    if (!gros && n.id !== RX.survol) continue;
    const prof = Math.max(0.4, Math.min(1, 1 - n.pz / 1700));
    const t = n.titre.length > 30 ? n.titre.slice(0, 29) + "…" : n.titre;
    g.globalAlpha = n.id === RX.survol ? 1 : prof * 0.85;
    const r = Math.max(1.6, (2.6 + Math.min(7, Math.sqrt(n.d) * 1.9)) * n.ps);
    if (n.id === RX.survol) {
      const w = g.measureText(t).width;
      g.fillStyle = "rgba(7,6,10,0.9)";
      g.fillRect(n.px + r + 4, n.py - 9, w + 8, 18);
      g.strokeStyle = "#7A6220"; g.lineWidth = 0.8;
      g.strokeRect(n.px + r + 4, n.py - 9, w + 8, 18);
    }
    g.fillStyle = n.id === RX.survol ? "#E8CE7A" : "#9C8D6A";
    g.fillText(t, n.px + r + 8, n.py);
    g.globalAlpha = 1;
  }
}

/* ---------- Boucle et commandes --------------------------------------------- */

function boucleReseau() {
  if (S.vue !== "reseau") { RX.anim = null; return; }
  if (RX.tourne) RX.lacet += 0.0016;
  dessinerReseau();
  RX.anim = requestAnimationFrame(boucleReseau);
}

function rendreReseau() {
  if (!RX.types.size) RX.types = new Set(ORDRE_TYPES);
  if (!RX.verbes.size) {
    RX.verbes = new Set(Object.keys(S.schema.verbes).filter(v => !RX_PLOMBERIE.includes(v)));
  }
  disposer();

  const outils = $("#reseau-outils");
  outils.innerHTML =
    ORDRE_TYPES.map(t => `<button class="puce ${RX.types.has(t) ? "on" : ""}" data-t="${t}"
        style="border-color:${COULEURS[t]}">${echapper(S.schema.types[t].pluriel)}</button>`).join("")
    + `<span style="flex:1"></span>`
    + `<button class="btn" id="rx-rot">${RX.tourne ? "Arrêter" : "Tourner"}</button>`
    + `<button class="btn" id="rx-reset">Recadrer</button>`;

  $("#reseau-verbes").innerHTML = Object.entries(S.schema.verbes).map(([k, v]) =>
    `<button class="puce ${RX.verbes.has(k) ? "on" : ""}" data-v="${k}"
       title="${echapper(v.question)}">${k}</button>`).join("");
  $$("#reseau-verbes .puce").forEach(p => p.onclick = () => {
    const v = p.dataset.v;
    RX.verbes.has(v) ? RX.verbes.delete(v) : RX.verbes.add(v);
    p.classList.toggle("on", RX.verbes.has(v));
    majCompteReseau();
  });

  $$("#reseau-outils .puce").forEach(p => p.onclick = () => {
    const t = p.dataset.t;
    RX.types.has(t) ? RX.types.delete(t) : RX.types.add(t);
    p.classList.toggle("on", RX.types.has(t));
  });
  $("#rx-rot").onclick = e => { RX.tourne = !RX.tourne; e.target.textContent = RX.tourne ? "Arrêter" : "Tourner"; };
  $("#rx-reset").onclick = () => { RX.lacet = 0.6; RX.tangage = -0.35; RX.zoom = 1; };

  majCompteReseau();

  brancherReseau();
  if (!RX.anim) boucleReseau();
}

function majCompteReseau() {
  const n = RX.arcs.filter(x => RX.verbes.has(x.v)).length;
  const caches = RX.total - n;
  $("#reseau-compte").textContent =
    `${RX.noeuds.length} nœuds · ${n} liens affichés` +
    (caches ? ` · ${caches} masqués (verbes décochés)` : "") +
    ` · calculé depuis data/`;
}

function noeudSous(cv, ev) {
  const r = cv.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  let best = null, bd = 18 * 18;
  for (const n of RX.noeuds) {
    if (!RX.types.has(n.type)) continue;
    const dx = n.px - mx, dy = n.py - my, d2 = dx * dx + dy * dy;
    if (d2 < bd) { bd = d2; best = n; }
  }
  return best;
}

function brancherReseau() {
  const cv = $("#reseau-canvas");
  if (cv.dataset.pret) return;
  cv.dataset.pret = "1";

  let tire = null;
  cv.onpointerdown = ev => {
    tire = { x: ev.clientX, y: ev.clientY, l: RX.lacet, t: RX.tangage, bouge: false };
    cv.setPointerCapture(ev.pointerId);
  };
  cv.onpointermove = ev => {
    if (tire) {
      const dx = ev.clientX - tire.x, dy = ev.clientY - tire.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) tire.bouge = true;
      RX.lacet = tire.l + dx * 0.006;
      RX.tangage = Math.max(-1.4, Math.min(1.4, tire.t + dy * 0.006));
    } else {
      const n = noeudSous(cv, ev);
      const id = n ? n.id : null;
      if (id !== RX.survol) { RX.survol = id; cv.style.cursor = id ? "pointer" : "grab"; }
    }
  };
  const fin = ev => {
    if (tire && !tire.bouge) {
      const n = noeudSous(cv, ev);
      if (n) ouvrir(n.id);
    }
    tire = null;
  };
  cv.onpointerup = fin;
  cv.onpointercancel = () => { tire = null; };
  cv.onwheel = ev => {
    ev.preventDefault();
    RX.zoom = Math.max(0.35, Math.min(4, RX.zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
  };
}
