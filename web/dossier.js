/* =============================================================================
   DOSSIER AXIAL — la face de présentation de Mentis Prime OS.

   Fondé sur Techno Sapiens I (La Matrice Verticale), qui annonce
   Techno Sapiens II — Homo Axialis / Homo Socialis :

     « L'Homo Socialis demandera à l'IA d'augmenter sa surface.
       L'Homo Axialis lui demandera d'approfondir son axe. »

   D'où le principe de cet écran : il ne mesure pas la surface (des compteurs
   qui montent), il mesure la profondeur d'un axe — ce qu'un élément relie,
   et ce qui résonne avec lui.

   RÈGLE ABSOLUE : aucun chiffre décoratif. Chaque panneau est calculé depuis
   data/. Un panneau sans source affiche qu'il n'en a pas.
   ========================================================================== */

/* ---------- Mesures du graphe --------------------------------------------- */

function voisins(id) {
  const v = new Set();
  for (const r of S.relations) {
    if (r.de === id) v.add(r.vers);
    if (r.vers === id) v.add(r.de);
  }
  return v;
}

/* Portée : combien d'éléments sont atteignables en au plus deux relations.
   C'est la mesure de profondeur de l'axe — jusqu'où ce centre porte. */
function porteeDeuxPas(id) {
  const un = voisins(id);
  const atteints = new Set(un);
  for (const v of un) for (const w of voisins(v)) atteints.add(w);
  atteints.delete(id);
  return atteints.size;
}

/* Résonance = indice de Jaccard entre deux voisinages.
   Deux éléments résonnent quand ils tiennent au même monde, même sans
   être reliés l'un à l'autre. C'est une mesure, pas une impression. */
function resonance(a, b) {
  const A = voisins(a), B = voisins(b);
  A.delete(b); B.delete(a);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? Math.round((inter / union) * 100) : 0;
}

/* Proximité entre deux nœuds de la couronne : nombre de voisins partagés. */
function proximite(a, b, exclure) {
  const A = voisins(a), B = voisins(b);
  if (exclure) { A.delete(exclure); B.delete(exclure); }
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  if (S.relations.some(r => (r.de === a && r.vers === b) || (r.de === b && r.vers === a))) n += 2;
  return n;
}

const GLYPHES = {
  oeuvre: "▤", concept: "◈", personnage: "☖", document: "▧", ia: "◉",
  outil: "⚙", projet: "◆", canal: "➤", institution: "⌂",
};

function centreParDefaut() {
  return tous().slice().sort((a, b) => degre(b.id) - degre(a.id))[0] || null;
}

/* =============================================================================
   RENDU
   ========================================================================== */

let DOSSIER_CENTRE = null;

function rendreDossier() {
  const sel = $("#axe-centre");

  // Le sélecteur de centre, trié par nombre de liens : les axes les plus
  // profonds d'abord.
  const candidats = tous().filter(e => degre(e.id) > 0)
    .sort((a, b) => degre(b.id) - degre(a.id));
  if (!DOSSIER_CENTRE || !parId(DOSSIER_CENTRE)) {
    DOSSIER_CENTRE = (centreParDefaut() || {}).id || null;
  }
  sel.innerHTML = candidats.map(e =>
    `<option value="${echapper(e.id)}" ${e.id === DOSSIER_CENTRE ? "selected" : ""}>${echapper(e.titre)} — ${degre(e.id)} liens</option>`
  ).join("");
  sel.onchange = () => { DOSSIER_CENTRE = sel.value; rendreDossier(); };

  const centre = parId(DOSSIER_CENTRE);
  if (!centre) {
    $("#planche").innerHTML = `<p class="rien">Aucun élément relié : le dossier n'a pas d'axe à représenter.</p>`;
    return;
  }

  $("#dossier-source").textContent =
    `calculé depuis data/ — ${tous().length} éléments, ${S.relations.length} relations`;

  const auj = new Date().toISOString().slice(0, 10);
  const P = [];

  /* ---------- Bandeau ---------------------------------------------------- */
  P.push(`
    <div class="bandeau">
      <div class="sceau">
        <svg viewBox="0 0 100 100" width="86" height="86" role="img" aria-label="Sceau axial">
          <circle cx="50" cy="50" r="34" fill="none" stroke="#7A6220" stroke-width="1"/>
          <circle cx="50" cy="50" r="26" fill="none" stroke="#4E3F16" stroke-width="1"/>
          <path d="M50 10 L54 46 L90 50 L54 54 L50 90 L46 54 L10 50 L46 46 Z" fill="#C9A227" opacity="0.9"/>
          <circle cx="50" cy="50" r="5" fill="#0A0805" stroke="#E8CE7A" stroke-width="1.2"/>
        </svg>
      </div>
      <div class="bandeau-centre">
        <h1>Dossier Axial</h1>
        <p class="sous-titre">⇑ Le Verbe Vertical ⇓</p>
      </div>
      <div class="cartouche">
        Dossier n° <b>${auj}</b><br>
        Centre : <b>${echapper(libelle(centre.type))}</b><br>
        Profondeur : <b>${degre(centre.id)} liens</b><br>
        Archives vivantes
      </div>
    </div>`);

  /* ---------- Profil dominant -------------------------------------------- */
  const conceptsCentre = [...voisins(centre.id)]
    .map(parId).filter(e => e && e.type === "concept")
    .sort((a, b) => degre(b.id) - degre(a.id));
  const devise = centre.definition || centre.description || centre.note ||
                 centre.prochaine_action || S.schema.types[centre.type].quoi;

  P.push(`
    <div class="bloc profil">
      <div class="bloc-titre">Profil dominant <span class="cpt">${echapper(libelle(centre.type))} · ${echapper(centre.statut || "—")}</span></div>
      <p class="nom">${echapper(centre.titre)}</p>
      <p class="devise">${echapper(devise)}</p>
      <div class="etiquettes">
        ${conceptsCentre.slice(0, 5).map(c => `<span class="etiquette">${echapper(c.titre)}</span>`).join("")
          || `<span class="etiquette vide-signal">aucun concept rattaché</span>`}
      </div>
      <div class="profil-stats">
        <div>Liens directs<b>${degre(centre.id)}</b></div>
        <div>Types atteints<b>${new Set([...voisins(centre.id)].map(i => parId(i)).filter(Boolean).map(e => e.type)).size}</b></div>
        <div>Portée à 2 pas<b>${porteeDeuxPas(centre.id)}</b></div>
        <div>Part du graphe<b>${Math.round(porteeDeuxPas(centre.id) / Math.max(1, tous().length) * 100)} %</b></div>
      </div>
    </div>`);

  P.push(`<div class="colonne colonne-g">`);

  /* ---------- Questions du moment : les blocages réels -------------------- */
  const bloques = (S.elements.projet || []).filter(p => p.blocage);
  P.push(`<div class="bloc">
      <div class="bloc-titre">Questions du moment <span class="cpt">${bloques.length}</span></div>
      ${bloques.length ? bloques.map((p, i) => `
        <button class="item" data-id="${echapper(p.id)}">
          <span class="glyphe">${i + 1}</span>
          <span class="t">${echapper(p.blocage)}</span>
          <span class="d">${echapper(p.titre)}</span>
        </button>`).join("")
      : `<div class="item creux"><span class="glyphe">·</span><span class="t">Aucun blocage enregistré.</span></div>`}
    </div>`);

  /* ---------- Archives notables : les œuvres les plus reliées ------------- */
  const archives = (S.elements.oeuvre || []).slice()
    .sort((a, b) => degre(b.id) - degre(a.id)).slice(0, 4);
  P.push(bloc("Archives notables", archives, e => ({
    glyphe: GLYPHES.oeuvre,
    t: e.titre,
    d: `${e.famille || e.genre || ""} · ${degre(e.id)} liens${e.url ? "" : " · lien absent"}`,
  }), "Aucune œuvre enregistrée."));
  P.push(`</div>`);

  /* ---------- Carte axiale ------------------------------------------------ */
  P.push(`<div class="centre">`);
  P.push(carteAxiale(centre));
  P.push(`</div>`);
  P.push(`<div class="colonne colonne-d">`);

  /* ---------- Bibliothèque axiale : les axes de recherche ----------------- */
  const axes = (S.elements.concept || []).filter(c => c.genre === "axe");
  P.push(bloc("Bibliothèque axiale", axes, e => ({
    glyphe: "❧", t: e.titre, d: e.definition || "",
  }), "Aucun axe de recherche enregistré."));



  /* ---------- Cartographies notables : concepts du noyau ------------------ */
  const noyau = (S.elements.concept || [])
    .filter(c => c.genre === "concept" || c.genre === "théorie")
    .sort((a, b) => degre(b.id) - degre(a.id)).slice(0, 4);
  P.push(bloc("Cartographies notables", noyau, e => ({
    glyphe: GLYPHES.concept, t: e.titre, d: e.definition || "",
  }), "Aucun concept du noyau."));

  /* ---------- Laboratoire : outils actifs --------------------------------- */
  const labo = (S.elements.outil || [])
    .filter(o => o.statut === "actif" || o.statut === "en essai")
    .sort((a, b) => degre(b.id) - degre(a.id)).slice(0, 5);
  P.push(bloc("Collaborations / Laboratoire", labo, e => ({
    glyphe: GLYPHES.outil, t: e.titre, d: `${e.genre || ""} · ${e.statut}`,
  }), "Aucun outil actif."));
  P.push(`</div>`);

  /* ---------- Profils en résonance ---------------------------------------- */
  const reso = tous()
    .filter(e => e.id !== centre.id)
    .map(e => ({ e, pct: resonance(centre.id, e.id) }))
    .filter(x => x.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  P.push(`<div class="bloc resonances">
      <div class="bloc-titre">Profils en résonance <span class="cpt">indice de Jaccard sur les voisinages</span></div>
      ${reso.length ? `<div class="grille-reso">${reso.map(({ e, pct }) => `
        <button class="reso" data-id="${echapper(e.id)}">
          <span class="rt">${echapper(e.titre)}</span>
          <span class="rp">${pct} %</span>
          <span class="rl">${echapper(libelle(e.type))}</span>
          <span class="jauge"><i style="width:${pct}%"></i></span>
        </button>`).join("")}</div>`
      : `<p class="devise vide-signal">Aucun élément ne partage de voisinage avec ce centre.</p>`}
    </div>`);

  /* ---------- Notes de laboratoire : prochaines actions ------------------- */
  const notes = (S.elements.projet || []).filter(p => p.prochaine_action);
  P.push(`<div class="bloc notes-labo">
      <div class="bloc-titre">Notes de laboratoire <span class="cpt">${notes.length}</span></div>
      ${notes.length ? `<ul>${notes.map(p => `
        <li><span>${echapper(p.priorite || p.statut || "")}</span>${echapper(p.prochaine_action)}</li>`).join("")}</ul>`
      : `<p class="devise">Aucune prochaine action enregistrée.</p>`}
    </div>`);

  /* ---------- Historique axial : ce que disent les dates ------------------ */
  const parAn = {};
  for (const e of tous()) {
    const an = (e.maj || "").slice(0, 4);
    if (!an) continue;
    (parAn[an] = parAn[an] || []).push(e);
  }
  const annees = Object.keys(parAn).sort();
  P.push(`<div class="bloc historique">
      <div class="bloc-titre">Historique axial <span class="cpt">d'après le champ « dernière modification »</span></div>
      <div class="frise">
        ${annees.map(an => {
          const l = parAn[an];
          const types = [...new Set(l.map(e => libelle(e.type)))].slice(0, 4).join(", ");
          return `<div class="jalon">
            <div class="an">${an}</div>
            <div class="quoi"><b>${l.length}</b> élément(s) — ${echapper(types)}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`);

  /* ---------- Triptyque --------------------------------------------------- */
  P.push(`<div class="triptyque">
      <div>Relier<small>${S.relations.length} relations enregistrées</small></div>
      <div>Cartographier<small>${tous().filter(e => degre(e.id) > 0).length} éléments sur la carte</small></div>
      <div>Aligner<small>${tous().filter(e => degre(e.id) === 0).length} encore hors de l'axe</small></div>
    </div>`);

  /* ---------- Provenance, en clair ---------------------------------------- */
  P.push(`<div class="provenance">
      <b>Provenance —</b> tous les chiffres de cette planche sont calculés depuis <b>data/</b>, au chargement.
      La résonance est un indice de Jaccard sur les voisinages du graphe, pas une appréciation.
      Le triptyque <b>Relier · Cartographier · Aligner</b> reprend les trois verbes de <b>Techno Sapiens I — La Matrice Verticale</b>.
      L'historique n'est pas une chronologie de l'œuvre : il compte les dates de dernière modification des fiches.
      Voir <b>PROVENANCE.md</b> pour ce que chaque donnée vaut réellement.
    </div>`);

  $("#planche").innerHTML = P.join("");

  $$("#planche .item[data-id], #planche .reso[data-id], #planche .n-cliquable[data-id]")
    .forEach(b => b.onclick = () => ouvrir(b.dataset.id));
  $$("#planche .n-cliquable[data-recentre]")
    .forEach(g => g.ondblclick = () => { DOSSIER_CENTRE = g.dataset.recentre; rendreDossier(); });
}

/* ---------- Fabrique de cartouche ----------------------------------------- */

function bloc(titre, liste, mapper, vide, classe) {
  const style = classe ? ` ${classe}` : "";
  if (!liste.length) {
    return `<div class="bloc${style}">
      <div class="bloc-titre">${titre}</div>
      <div class="item creux"><span class="glyphe">·</span><span class="t">${vide}</span></div>
    </div>`;
  }
  return `<div class="bloc${style}">
    <div class="bloc-titre">${titre} <span class="cpt">${liste.length}</span></div>`+`
    ${liste.map(e => {
      const m = mapper(e);
      return `<button class="item" data-id="${echapper(e.id)}">
        <span class="glyphe">${m.glyphe}</span>
        <span class="t">${echapper(m.t)}</span>
        <span class="d">${echapper(m.d)}</span>
      </button>`;
    }).join("")}
  </div>`;
}

/* =============================================================================
   LA CARTE AXIALE — disposition radiale autour du centre choisi
   ========================================================================== */

function carteAxiale(centre) {
  const W = 900, H = 660, CX = W / 2, CY = 322;
  const R_ANNEAU = 112;     // les pastilles sur le cercle
  const R_ETIQ   = 246;     // les cartouches de titre

  // La couronne : les voisins directs du centre, les plus reliés d'abord.
  const couronne = [...voisins(centre.id)]
    .map(parId).filter(Boolean)
    .sort((a, b) => degre(b.id) - degre(a.id))
    .slice(0, 12);

  if (!couronne.length) {
    return `<div class="bloc carte-axiale">
      <div class="bloc-titre">Carte axiale</div>
      <p class="devise vide-signal">Ce centre n'a aucun voisin.</p>
    </div>`;
  }

  const n = couronne.length;
  const pts = couronne.map((e, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      e, a,
      ax: CX + Math.cos(a) * R_ANNEAU, ay: CY + Math.sin(a) * R_ANNEAU,
      lx: CX + Math.cos(a) * R_ETIQ,   ly: CY + Math.sin(a) * R_ETIQ,
    };
  });

  // Les cordes entre voisins de la couronne, épaisseur selon la proximité.
  const cordes = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p = proximite(pts[i].e.id, pts[j].e.id, centre.id);
      // Seuil à 3 : deux articles publiés sur le même canal partagent déjà
      // 2 voisins sans rien avoir en commun. En dessous, ce n'est pas une
      // proximité, c'est de la plomberie — et ça noircit la planche pour rien.
      if (p < 3) continue;
      const style = p >= 5 ? "" : p === 4 ? "6 4" : "2 5";
      cordes.push(`<line x1="${pts[i].ax.toFixed(1)}" y1="${pts[i].ay.toFixed(1)}"
        x2="${pts[j].ax.toFixed(1)}" y2="${pts[j].ay.toFixed(1)}"
        stroke="#C9A227" stroke-width="${p >= 5 ? 1.2 : 0.9}"
        ${style ? `stroke-dasharray="${style}"` : ""} opacity="${p >= 5 ? 0.8 : 0.5}"/>`);
    }
  }

  const rayons = pts.map(p => `
    <line x1="${CX}" y1="${CY}" x2="${p.ax.toFixed(1)}" y2="${p.ay.toFixed(1)}"
      stroke="#4E3F16" stroke-width="0.8" opacity="0.8"/>
    <line x1="${p.ax.toFixed(1)}" y1="${p.ay.toFixed(1)}" x2="${p.lx.toFixed(1)}" y2="${p.ly.toFixed(1)}"
      stroke="#7A6220" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.7"/>`).join("");

  const pastilles = pts.map(p => `
    <circle cx="${p.ax.toFixed(1)}" cy="${p.ay.toFixed(1)}" r="5.5"
      fill="${COULEURS[p.e.type]}" stroke="#E8CE7A" stroke-width="1"/>`).join("");

  const etiquettes = pts.map(p => {
    const droite = Math.cos(p.a) >= -0.05;
    const titre = p.e.titre.length > 26 ? p.e.titre.slice(0, 25) + "…" : p.e.titre;
    const larg = Math.max(88, titre.length * 6.6 + 18);
    const x = droite ? p.lx : p.lx - larg;
    const y = p.ly - 13;
    return `<g class="n-cliquable" data-id="${echapper(p.e.id)}" data-recentre="${echapper(p.e.id)}">
      <rect class="halo" x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}"
        width="${larg + 6}" height="32" fill="#C9A227" opacity="0"/>
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larg}" height="26" rx="2"
        fill="#100D08" stroke="#7A6220" stroke-width="0.9"/>
      <text x="${(x + larg / 2).toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="middle"
        font-size="11.5" fill="#DCCFA8"
        font-family="Optima, Palatino, Georgia, serif">${echapper(titre)}</text>
      <title>${echapper(p.e.titre)} — ${echapper(libelle(p.e.type))} · ${degre(p.e.id)} liens · double-clic pour recentrer</title>
    </g>`;
  }).join("");

  const motsCentre = centre.titre.toUpperCase().split(/\s+/);
  const lignes = [];
  let cur = "";
  for (const m of motsCentre) {
    if ((cur + " " + m).trim().length > 15) { lignes.push(cur.trim()); cur = m; }
    else cur = (cur + " " + m).trim();
  }
  if (cur) lignes.push(cur);
  const l3 = lignes.slice(0, 3);

  return `<div class="bloc carte-axiale">
    <div class="bloc-titre">Carte axiale des projets et connexions</div>
    <svg class="axiale" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Carte radiale : ${echapper(centre.titre)} et ses ${n} voisins directs">
      <circle cx="${CX}" cy="${CY}" r="${R_ANNEAU}" fill="none" stroke="#4E3F16" stroke-width="1"/>
      <circle cx="${CX}" cy="${CY}" r="${R_ANNEAU - 9}" fill="none" stroke="#241D0C" stroke-width="1"/>
      ${rayons}
      ${cordes.join("")}
      <circle cx="${CX}" cy="${CY}" r="72" fill="#0D0B06" stroke="#7A6220" stroke-width="1.2"/>
      ${l3.map((t, i) => `<text x="${CX}" y="${CY + (i - (l3.length - 1) / 2) * 17 + 5}"
        text-anchor="middle" font-size="13.5" fill="#E8CE7A" letter-spacing="1.4"
        font-family="Optima, Palatino, Georgia, serif">${echapper(t)}</text>`).join("")}
      ${pastilles}
      ${etiquettes}
    </svg>
    <div class="axe-legende">
      <span><u></u> proximité forte (5+ voisins communs)</span>
      <span><u class="moy"></u> moyenne (4)</span>
      <span><u class="faible"></u> faible (3)</span>
      ${[...new Set(couronne.map(e => e.type))].map(t =>
        `<span><i style="background:${COULEURS[t]}"></i>${echapper(libelle(t))}</span>`).join("")}
    </div>
    <p class="devise" style="text-align:center;font-size:0.78rem">
      Clic sur un cartouche : ouvrir la fiche. Double-clic : recentrer le dossier sur lui.
    </p>
  </div>`;
}
