/* =============================================================================
   Inventaire Mentis Prime — interface locale
   Aucune bibliothèque externe. Tout est calculé depuis data/.
   ========================================================================== */

const S = {           // l'état complet, en mémoire
  schema: null,
  elements: {},       // { type: [élément, …] }
  relations: [],
  vue: "etat",
  filtres: { q: "", type: "", statut: "", tri: "titre" },
  carte: { types: new Set(), verbes: new Set(), init: false },
  ouvert: null,       // id de l'élément affiché dans le panneau
};

const COULEURS = {
  oeuvre:      "#3F8A76",
  concept:     "#6A6FA8",
  personnage:  "#A8656F",
  document:    "#4A7FA5",
  ia:          "#9C7A3C",
  outil:       "#6E8A55",
  projet:      "#B0704A",
  canal:       "#8A5F9E",
  institution: "#5B8C8C",
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const ORDRE_TYPES = ["oeuvre", "concept", "personnage", "document", "ia",
                     "outil", "projet", "canal", "institution"];

/* ---------- Utilitaires ------------------------------------------------- */

function tous() {
  return ORDRE_TYPES.flatMap(t => S.elements[t] || []);
}

function parId(id) {
  return tous().find(e => e.id === id) || null;
}

function libelle(type) {
  return S.schema.types[type]?.libelle || type;
}

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function slug(txt) {
  return txt.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "sans-titre";
}

function idUnique(type, titre) {
  const base = `${type}.${slug(titre)}`;
  if (!parId(base)) return base;
  let n = 2;
  while (parId(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function echapper(t) {
  const d = document.createElement("div");
  d.textContent = t == null ? "" : String(t);
  return d.innerHTML;
}

function relsSortantes(id) { return S.relations.filter(r => r.de === id); }
function relsEntrantes(id) { return S.relations.filter(r => r.vers === id); }
function degre(id) { return relsSortantes(id).length + relsEntrantes(id).length; }

function verbesPour(typeDe, typeVers) {
  return Object.entries(S.schema.verbes)
    .filter(([, v]) => v.de.includes(typeDe) && (!typeVers || v.vers.includes(typeVers)))
    .map(([k]) => k);
}

/* ---------- Chargement et enregistrement --------------------------------- */

async function charger() {
  const r = await fetch("/api/tout");
  const d = await r.json();
  S.schema = d.schema;
  S.elements = d.elements;
  S.relations = d.relations;
  S.carte.types = new Set(ORDRE_TYPES);
  S.carte.verbes = new Set(Object.keys(S.schema.verbes));
  marquer("enregistré");
}

let minuteur = null;
let enCours = false;

function marquer(txt, classe = "") {
  const el = $("#etat-sauvegarde");
  el.textContent = txt;
  el.className = classe;
}

function enregistrer() {
  marquer("modification…", "");
  clearTimeout(minuteur);
  minuteur = setTimeout(async () => {
    if (enCours) { enregistrer(); return; }
    enCours = true;
    try {
      const r = await fetch("/api/enregistrer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: S.elements, relations: S.relations }),
      });
      const d = await r.json();
      if (d.ok) marquer(`enregistré · ${d.elements} éléments · ${d.relations} liens`, "ok");
      else marquer(`erreur : ${d.erreur}`, "err");
    } catch (e) {
      marquer("erreur : serveur injoignable", "err");
    } finally {
      enCours = false;
    }
  }, 450);
}

/* ---------- Navigation ---------------------------------------------------- */

function allerA(vue) {
  S.vue = vue;
  $$("#onglets button").forEach(b => b.classList.toggle("actif", b.dataset.vue === vue));
  $$(".vue").forEach(v => v.classList.toggle("actif", v.id === `vue-${vue}`));
  if (vue === "etat") rendreEtat();
  if (vue === "inventaire") rendreListe();
  if (vue === "projets") rendreProjets();
  if (vue === "carte") rendreCarte();
  if (vue === "dossier") rendreDossier();
}

/* =============================================================================
   VUE 1 — ÉTAT DES LIEUX
   ========================================================================== */

function rendreEtat() {
  // Compteurs
  const c = $("#compteurs");
  c.innerHTML = ORDRE_TYPES.map(t => {
    const n = (S.elements[t] || []).length;
    return `<button class="compteur ${n === 0 ? "vide" : ""}" data-type="${t}">
      <span class="n" style="color:${n ? COULEURS[t] : ""}">${n}</span>
      <span class="l">${echapper(S.schema.types[t].pluriel)}</span>
    </button>`;
  }).join("") + `<button class="compteur" data-type="__rel">
      <span class="n">${S.relations.length}</span>
      <span class="l">Relations</span>
    </button>`;

  $$("#compteurs .compteur").forEach(b => b.onclick = () => {
    if (b.dataset.type === "__rel") { allerA("carte"); return; }
    S.filtres = { q: "", type: b.dataset.type, statut: "", tri: "titre" };
    $("#recherche").value = ""; $("#f-type").value = b.dataset.type;
    $("#f-statut").value = ""; $("#f-tri").value = "titre";
    allerA("inventaire");
  });

  // Lacunes
  const perdus   = tous().filter(e => e.type === "document" && e.emplacement === "inconnu");
  const orphelins= tous().filter(e => degre(e.id) === 0);
  const sansUrl  = tous().filter(e => e.type === "oeuvre" && e.genre === "article" && !e.url);
  const bloques  = tous().filter(e => e.type === "projet" && e.statut === "bloqué");
  const vides    = ORDRE_TYPES.filter(t => (S.elements[t] || []).length === 0);

  const lacunes = [
    perdus.length   && ["rouge", perdus.length, "document(s) dont l'emplacement est inconnu — tu sais qu'ils existent, pas où ils sont.", () => filtrer({ type: "document", statut: "à retrouver" })],
    bloques.length  && ["rouge", bloques.length, "projet(s) bloqué(s).", () => allerA("projets")],
    sansUrl.length  && ["jaune", sansUrl.length, "article(s) sans lien Substack enregistré.", () => filtrer({ type: "oeuvre", q: "" })],
    orphelins.length&& ["jaune", orphelins.length, "élément(s) sans aucune relation — invisibles sur la carte.", () => filtrer({ tri: "liens" })],
    vides.length    && ["jaune", vides.length, `type(s) encore vide(s) : ${vides.map(libelle).join(", ")}.`, () => allerA("inventaire")],
  ].filter(Boolean);

  $("#lacunes").innerHTML = lacunes.length
    ? lacunes.map(([cl, n, txt], i) => `<div class="lacune ${cl}">
        <span class="cpt">${n}</span>
        <span class="txt">${echapper(txt)}</span>
        <button data-i="${i}">Voir</button>
      </div>`).join("")
    : `<div class="lacune"><span class="txt">Rien à signaler. L'inventaire est complet.</span></div>`;

  $$("#lacunes button").forEach(b => b.onclick = () => lacunes[+b.dataset.i][3]());

  // Récents
  const recents = tous().slice().sort((a, b) => (b.maj || "").localeCompare(a.maj || "")).slice(0, 8);
  $("#recents").innerHTML = recents.map(ligneHTML).join("");
  brancherLignes($("#recents"));
}

function filtrer(f) {
  S.filtres = Object.assign({ q: "", type: "", statut: "", tri: "titre" }, f);
  $("#recherche").value = S.filtres.q;
  $("#f-type").value = S.filtres.type;
  $("#f-statut").value = S.filtres.statut;
  $("#f-tri").value = S.filtres.tri;
  allerA("inventaire");
}

/* =============================================================================
   VUE 2 — INVENTAIRE
   ========================================================================== */

function ligneHTML(e) {
  const d = degre(e.id);
  const cl = e.statut === "bloqué" || e.statut === "à retrouver" ? "mal"
           : e.statut === "publié" || e.statut === "stabilisé" || e.statut === "actif" || e.statut === "active" || e.statut === "localisé" ? "bien"
           : "moyen";
  return `<button class="ligne" data-id="${echapper(e.id)}">
    <span class="tag" style="color:${COULEURS[e.type]}">${echapper(libelle(e.type))}</span>
    <span class="titre">${echapper(e.titre)}</span>
    <span class="pastille ${cl}">${echapper(e.statut || "—")}</span>
    <span class="meta">${d} lien${d > 1 ? "s" : ""}</span>
  </button>`;
}

function brancherLignes(hote) {
  $$(".ligne", hote).forEach(b => b.onclick = () => ouvrir(b.dataset.id));
}

function rendreListe() {
  const f = S.filtres;
  const q = f.q.trim().toLowerCase();

  let items = tous().filter(e => {
    if (f.type && e.type !== f.type) return false;
    if (f.statut && e.statut !== f.statut) return false;
    if (!q) return true;
    return [e.titre, e.note, e.id, e.definition, e.description, e.prochaine_action, e.fonction]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const tris = {
    titre: (a, b) => a.titre.localeCompare(b.titre, "fr"),
    maj:   (a, b) => (b.maj || "").localeCompare(a.maj || ""),
    type:  (a, b) => ORDRE_TYPES.indexOf(a.type) - ORDRE_TYPES.indexOf(b.type) || a.titre.localeCompare(b.titre, "fr"),
    liens: (a, b) => degre(a.id) - degre(b.id) || a.titre.localeCompare(b.titre, "fr"),
  };
  items.sort(tris[f.tri] || tris.titre);

  $("#liste").innerHTML = items.length
    ? items.map(ligneHTML).join("")
    : `<p class="rien">Aucun élément ne correspond.</p>`;
  brancherLignes($("#liste"));
}

/* =============================================================================
   VUE 3 — PROJETS
   ========================================================================== */

function rendreProjets() {
  const ordre = { haute: 0, moyenne: 1, basse: 2 };
  const projets = (S.elements.projet || []).slice().sort((a, b) =>
    (ordre[a.priorite] ?? 3) - (ordre[b.priorite] ?? 3) || a.titre.localeCompare(b.titre, "fr"));

  const corps = projets.map(p => {
    const dep = relsSortantes(p.id).filter(r => r.verbe === "depend_de")
      .map(r => parId(r.vers)?.titre).filter(Boolean);
    const clS = p.statut === "bloqué" ? "mal" : p.statut === "actif" ? "bien" : "moyen";
    const clP = p.priorite === "haute" ? "mal" : p.priorite === "moyenne" ? "moyen" : "";
    return `<tr>
      <td class="cliquable" data-id="${echapper(p.id)}"><strong>${echapper(p.titre)}</strong></td>
      <td><span class="pastille ${clS}">${echapper(p.statut || "—")}</span></td>
      <td><span class="pastille ${clP}">${echapper(p.priorite || "—")}</span></td>
      <td>${echapper(p.prochaine_action || "—")}</td>
      <td>${p.blocage ? `<span style="color:var(--flag)">${echapper(p.blocage)}</span>` : "—"}</td>
      <td>${dep.length ? echapper(dep.join(", ")) : "—"}</td>
      <td>${echapper(p.responsable || "—")}</td>
    </tr>`;
  }).join("");

  $("#table-projets tbody").innerHTML = corps ||
    `<tr><td colspan="7" class="rien">Aucun projet enregistré.</td></tr>`;
  $$("#table-projets td.cliquable").forEach(td => td.onclick = () => ouvrir(td.dataset.id));
}

/* =============================================================================
   PANNEAU — fiche et édition réunies
   ========================================================================== */

function ouvrir(id) {
  const e = parId(id);
  if (!e) return;
  S.ouvert = id;
  const def = S.schema.types[e.type];

  const champCommun = (cle, lib, type = "texte") => `
    <div class="champ">
      <label for="c-${cle}">${lib}</label>
      ${type === "long"
        ? `<textarea id="c-${cle}" data-cle="${cle}">${echapper(e[cle] || "")}</textarea>`
        : `<input type="text" id="c-${cle}" data-cle="${cle}" value="${echapper(e[cle] || "")}">`}
    </div>`;

  const champsPropres = Object.entries(def.champs).map(([cle, meta]) => {
    if (meta.choix) {
      const opts = ["", ...meta.choix].map(o =>
        `<option value="${echapper(o)}" ${e[cle] === o ? "selected" : ""}>${o || "—"}</option>`).join("");
      return `<div class="champ"><label for="c-${cle}">${echapper(meta.libelle)}</label>
        <select id="c-${cle}" data-cle="${cle}">${opts}</select></div>`;
    }
    return champCommun(cle, echapper(meta.libelle), meta.type === "long" ? "long" : "texte");
  }).join("");

  const optsStatut = ["", ...def.statuts].map(s =>
    `<option value="${echapper(s)}" ${e.statut === s ? "selected" : ""}>${s || "—"}</option>`).join("");

  const relSortHTML = relsSortantes(id).map((r, i) => {
    const cible = parId(r.vers);
    return `<div class="rel-ligne">
      <span class="rel-verbe">${echapper(S.schema.verbes[r.verbe]?.libelle || r.verbe)}</span>
      <button class="rel-cible" data-vers="${echapper(r.vers)}">${echapper(cible ? cible.titre : r.vers)}</button>
      <button class="rel-sup" data-sup="${echapper(r.de)}|${echapper(r.verbe)}|${echapper(r.vers)}" title="Supprimer ce lien">×</button>
    </div>`;
  }).join("") || `<p class="rien" style="padding:1rem 0">Aucun lien sortant.</p>`;

  const relEntHTML = relsEntrantes(id).map(r => {
    const src = parId(r.de);
    return `<div class="rel-ligne">
      <span class="rel-verbe">← ${echapper(S.schema.verbes[r.verbe]?.libelle || r.verbe)}</span>
      <button class="rel-cible" data-vers="${echapper(r.de)}">${echapper(src ? src.titre : r.de)}</button>
      <button class="rel-sup" data-sup="${echapper(r.de)}|${echapper(r.verbe)}|${echapper(r.vers)}" title="Supprimer ce lien">×</button>
    </div>`;
  }).join("") || `<p class="rien" style="padding:1rem 0">Rien ne pointe vers cet élément.</p>`;

  $("#panneau").innerHTML = `
    <div class="panneau-tete">
      <div>
        <span class="tag" style="color:${COULEURS[e.type]}">${echapper(def.libelle)}</span>
        <h3>${echapper(e.titre)}</h3>
      </div>
      <button class="fermer" id="btn-fermer" aria-label="Fermer">×</button>
    </div>
    <p class="id-affiche">${echapper(e.id)}</p>

    <div class="champs">
      ${champCommun("titre", "Titre")}
      <div class="champ"><label for="c-statut">Statut</label>
        <select id="c-statut" data-cle="statut">${optsStatut}</select></div>
      ${champsPropres}
      ${champCommun("note", "Note", "long")}
    </div>

    <div class="rel-groupe">
      <h2 style="margin-top:0">Ce que cet élément pointe</h2>
      ${relSortHTML}
      <div class="ajout-rel">
        <select id="nv-sens">
          <option value="sortant">cet élément →</option>
          <option value="entrant">← vers cet élément</option>
        </select>
        <select id="nv-verbe"></select>
        <select id="nv-cible"></select>
        <button class="btn" id="btn-relier">Relier</button>
      </div>
    </div>

    <div class="rel-groupe">
      <h2>Ce qui pointe vers lui</h2>
      ${relEntHTML}
    </div>

    <div class="actions-panneau">
      <button class="btn danger" id="btn-supprimer">Supprimer cet élément</button>
    </div>`;

  // Édition : chaque modification met à jour l'état et déclenche l'enregistrement.
  $$("#panneau [data-cle]").forEach(ch => {
    ch.oninput = ch.onchange = () => {
      e[ch.dataset.cle] = ch.value;
      e.maj = aujourdhui();
      enregistrer();
      if (ch.dataset.cle === "titre") $("#panneau h3").textContent = ch.value;
      rafraichirVue();
    };
  });

  $("#btn-fermer").onclick = fermer;
  $$("#panneau .rel-cible").forEach(b => b.onclick = () => ouvrir(b.dataset.vers));
  $$("#panneau .rel-sup").forEach(b => b.onclick = () => {
    const [de, verbe, vers] = b.dataset.sup.split("|");
    S.relations = S.relations.filter(r => !(r.de === de && r.verbe === verbe && r.vers === vers));
    enregistrer(); ouvrir(id); rafraichirVue();
  });

  remplirAjoutRelation(e);

  $("#btn-supprimer").onclick = () => {
    if (!confirm(`Supprimer « ${e.titre} » et ses ${degre(id)} lien(s) ?`)) return;
    S.elements[e.type] = S.elements[e.type].filter(x => x.id !== id);
    S.relations = S.relations.filter(r => r.de !== id && r.vers !== id);
    enregistrer(); fermer(); rafraichirVue();
  };

  $("#voile").classList.add("ouvert");
  $("#panneau").classList.add("ouvert");
}

function remplirAjoutRelation(e) {
  const selS = $("#nv-sens"), selV = $("#nv-verbe"), selC = $("#nv-cible");

  // Certains types (concept, outil, institution) ne sont jamais source d'un verbe :
  // on ne peut les relier qu'en sens entrant. Le sélecteur de sens le rend possible.
  const sortants = Object.entries(S.schema.verbes).filter(([, v]) => v.de.includes(e.type));
  const entrants = Object.entries(S.schema.verbes).filter(([, v]) => v.vers.includes(e.type));

  if (!sortants.length) selS.querySelector('option[value=sortant]').disabled = true;
  if (!entrants.length) selS.querySelector('option[value=entrant]').disabled = true;
  selS.value = sortants.length ? "sortant" : "entrant";

  const majVerbes = () => {
    const liste = selS.value === "sortant" ? sortants : entrants;
    selV.innerHTML = liste.map(([k, v]) =>
      `<option value="${k}">${echapper(v.libelle)}</option>`).join("")
      || `<option value="">aucun lien possible</option>`;
    majCibles();
  };

  const majCibles = () => {
    const v = selV.value;
    if (!v) { selC.innerHTML = `<option value="">—</option>`; return; }
    const typesOk = selS.value === "sortant"
      ? S.schema.verbes[v].vers
      : S.schema.verbes[v].de;
    const cibles = tous()
      .filter(x => typesOk.includes(x.type) && x.id !== e.id)
      .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    selC.innerHTML = cibles.map(x =>
      `<option value="${echapper(x.id)}">${echapper(x.titre)} — ${echapper(libelle(x.type))}</option>`).join("")
      || `<option value="">aucune cible disponible</option>`;
  };

  selS.onchange = majVerbes;
  selV.onchange = majCibles;
  majVerbes();

  $("#btn-relier").onclick = () => {
    const v = selV.value, c = selC.value;
    if (!v || !c) return;
    const de   = selS.value === "sortant" ? e.id : c;
    const vers = selS.value === "sortant" ? c : e.id;
    if (S.relations.some(r => r.de === de && r.verbe === v && r.vers === vers)) return;
    S.relations.push({ de, verbe: v, vers, note: "" });
    enregistrer(); ouvrir(e.id); rafraichirVue();
  };
}

function fermer() {
  S.ouvert = null;
  $("#voile").classList.remove("ouvert");
  $("#panneau").classList.remove("ouvert");
}

function rafraichirVue() {
  if (S.vue === "etat") rendreEtat();
  else if (S.vue === "inventaire") rendreListe();
  else if (S.vue === "projets") rendreProjets();
  else if (S.vue === "carte") { S.carte.init = false; rendreCarte(); }
  else if (S.vue === "dossier") rendreDossier();
}

/* ---------- Création ------------------------------------------------------ */

function nouveau() {
  const type = prompt(
    "Quel type d'élément ?\n\n" + ORDRE_TYPES.map((t, i) => `${i + 1}. ${libelle(t)}`).join("\n"),
    "1");
  if (!type) return;
  const idx = parseInt(type, 10) - 1;
  const t = ORDRE_TYPES[idx];
  if (!t) { alert("Numéro invalide."); return; }

  const titre = prompt(`Titre du nouvel élément « ${libelle(t)} » :`);
  if (!titre || !titre.trim()) return;

  const el = {
    id: idUnique(t, titre.trim()),
    type: t,
    titre: titre.trim(),
    statut: S.schema.types[t].statuts[0] || "",
    maj: aujourdhui(),
    note: "",
  };
  Object.keys(S.schema.types[t].champs).forEach(c => el[c] = "");

  (S.elements[t] = S.elements[t] || []).push(el);
  enregistrer();
  rafraichirVue();
  ouvrir(el.id);
}

/* =============================================================================
   VUE 4 — CARTE
   ========================================================================== */

function rendreCarte() {
  const svg = $("#carte-svg");

  // Filtres
  if (!$("#carte-outils").dataset.pret) {
    $("#carte-outils").innerHTML =
      ORDRE_TYPES.map(t => `<button class="puce on" data-t="${t}" style="border-color:${COULEURS[t]}">${echapper(S.schema.types[t].pluriel)}</button>`).join("")
      + `<span style="flex:1"></span>`
      + `<button class="btn" id="btn-recentrer">Recentrer</button>`;
    $$("#carte-outils .puce").forEach(p => p.onclick = () => {
      const t = p.dataset.t;
      if (S.carte.types.has(t)) S.carte.types.delete(t); else S.carte.types.add(t);
      p.classList.toggle("on", S.carte.types.has(t));
      S.carte.init = false; rendreCarte();
    });
    $("#btn-recentrer").onclick = () => { S.carte.init = false; rendreCarte(); };
    $("#carte-outils").dataset.pret = "1";

    $("#legende").innerHTML = ORDRE_TYPES.map(t =>
      `<span><i style="background:${COULEURS[t]}"></i>${echapper(S.schema.types[t].pluriel)}</span>`).join("");
  }

  // Nœuds et liens retenus
  const visibles = tous().filter(e => S.carte.types.has(e.type));
  const idsVis = new Set(visibles.map(e => e.id));
  const liens = S.relations.filter(r => idsVis.has(r.de) && idsVis.has(r.vers));

  const W = 1400, H = 880;
  const noeuds = visibles.map((e, i) => ({
    id: e.id, titre: e.titre, type: e.type,
    d: 0,
    x: W / 2 + Math.cos(i * 2.399) * (60 + i * 6),
    y: H / 2 + Math.sin(i * 2.399) * (60 + i * 6),
    vx: 0, vy: 0,
  }));
  const index = new Map(noeuds.map(n => [n.id, n]));
  liens.forEach(l => { index.get(l.de).d++; index.get(l.vers).d++; });

  simuler(noeuds, liens, index, W, H);

  const rayon = n => 5 + Math.min(11, Math.sqrt(n.d) * 3);

  const arcs = liens.map(l => {
    const a = index.get(l.de), b = index.get(l.vers);
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
      stroke="currentColor" stroke-width="1" opacity="0.28"
      data-de="${echapper(l.de)}" data-vers="${echapper(l.vers)}"><title>${echapper(S.schema.verbes[l.verbe]?.libelle || l.verbe)}</title></line>`;
  }).join("");

  const ronds = noeuds.map(n => {
    const r = rayon(n);
    const etiquette = n.d >= 3 || noeuds.length < 25;
    const t = n.titre.length > 24 ? n.titre.slice(0, 23) + "…" : n.titre;
    return `<g class="noeud" data-id="${echapper(n.id)}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">
      <circle r="${r}" fill="${COULEURS[n.type]}" stroke="var(--paper)" stroke-width="1.5"></circle>
      <title>${echapper(n.titre)} — ${echapper(libelle(n.type))} · ${n.d} lien(s)</title>
      ${etiquette ? `<text x="${r + 4}" y="3.5" font-size="10.5" font-family="ui-monospace, Menlo, monospace" fill="currentColor" opacity="0.85">${echapper(t)}</text>` : ""}
    </g>`;
  }).join("");

  // Cadre calculé sur les nœuds réellement placés : rien ne peut être coupé.
  const marge = 130;
  const xs = noeuds.map(n => n.x), ys = noeuds.map(n => n.y);
  const x0 = Math.min(...xs) - marge, x1 = Math.max(...xs) + marge;
  const y0 = Math.min(...ys) - 60,    y1 = Math.max(...ys) + 60;
  svg.setAttribute("viewBox", `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`);
  svg.innerHTML = `<g id="carte-camera">${arcs}${ronds}</g>`;

  $$("#carte-svg .noeud").forEach(g => {
    g.onclick = ev => { if (!g.dataset.bouge) ouvrir(g.dataset.id); };
  });

  brancherInteractionCarte(svg, noeuds, index, liens);
  S.carte.init = true;
}

/* Placement par forces : répulsion entre tous, ressort le long des liens. */
function simuler(noeuds, liens, index, W, H) {
  const n = noeuds.length;
  if (!n) return;
  // k = distance de confort entre deux nœuds. Plus il est grand, plus la carte respire.
  const k = Math.sqrt((W * H) / n) * 0.80;
  let temp = W / 6;

  for (let pas = 0; pas < 420; pas++) {
    for (const a of noeuds) { a.vx = 0; a.vy = 0; }

    // Répulsion locale seulement. Sans ce rayon de coupure, chaque nœud est poussé
    // par les 59 autres et tout le graphe finit plaqué contre les bords du cadre.
    const coupure = k * 2.2, coupure2 = coupure * coupure;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = noeuds[i], b = noeuds[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > coupure2) continue;
        if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.01; }
        const d = Math.sqrt(d2);
        const f = (k * k) / d;
        const ux = dx / d, uy = dy / d;
        a.vx += ux * f; a.vy += uy * f;
        b.vx -= ux * f; b.vy -= uy * f;
      }
    }

    // Attraction le long des liens, atténuée sur les nœuds très connectés :
    // sans cela un pôle comme Substack ramasse tout le graphe sur lui.
    for (const l of liens) {
      const a = index.get(l.de), b = index.get(l.vers);
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const poids = 1 / Math.sqrt(Math.max(1, Math.min(a.d, b.d)));
      const f = ((d * d) / k) * 0.55 * poids;
      const ux = dx / d, uy = dy / d;
      a.vx += ux * f; a.vy += uy * f;
      b.vx -= ux * f; b.vy -= uy * f;
    }

    // Gravité plus forte sur les nœuds isolés : sans lien pour les retenir,
    // la seule répulsion les enverrait très loin et écraserait le reste du graphe.
    const cx = W / 2, cy = H / 2;
    for (const a of noeuds) {
      const g = a.d === 0 ? 0.05 : 0.014;
      a.vx += (cx - a.x) * g;
      a.vy += (cy - a.y) * g;

      const v = Math.sqrt(a.vx * a.vx + a.vy * a.vy) || 0.01;
      const pasMax = Math.min(v, temp);
      a.x += (a.vx / v) * pasMax;
      a.y += (a.vy / v) * pasMax;
      a.x = Math.max(30, Math.min(W - 30, a.x));
      a.y = Math.max(24, Math.min(H - 24, a.y));
    }
    temp *= 0.982;
  }
}

/* Déplacement d'un nœud, panoramique et zoom. */
function brancherInteractionCarte(svg, noeuds, index, liens) {
  const camera = $("#carte-camera", svg);
  let vue = { x: 0, y: 0, z: 1 };
  let tire = null;

  const appliquer = () =>
    camera.setAttribute("transform", `translate(${vue.x},${vue.y}) scale(${vue.z})`);

  const versSvg = ev => {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = vb.width / r.width, sy = vb.height / r.height;
    return {
      x: ((ev.clientX - r.left) * sx - vue.x) / vue.z,
      y: ((ev.clientY - r.top) * sy - vue.y) / vue.z,
    };
  };

  svg.onpointerdown = ev => {
    const g = ev.target.closest(".noeud");
    const p = versSvg(ev);
    if (g) {
      const n = index.get(g.dataset.id);
      tire = { type: "noeud", n, g, dx: p.x - n.x, dy: p.y - n.y, bouge: false };
    } else {
      tire = { type: "vue", x0: ev.clientX, y0: ev.clientY, vx: vue.x, vy: vue.y };
      svg.classList.add("tire");
    }
    svg.setPointerCapture(ev.pointerId);
  };

  svg.onpointermove = ev => {
    if (!tire) return;
    if (tire.type === "noeud") {
      const p = versSvg(ev);
      tire.n.x = p.x - tire.dx;
      tire.n.y = p.y - tire.dy;
      tire.bouge = true;
      tire.g.setAttribute("transform", `translate(${tire.n.x.toFixed(1)},${tire.n.y.toFixed(1)})`);
      $$(`#carte-svg line[data-de="${CSS.escape(tire.n.id)}"]`).forEach(l => {
        l.setAttribute("x1", tire.n.x.toFixed(1)); l.setAttribute("y1", tire.n.y.toFixed(1));
      });
      $$(`#carte-svg line[data-vers="${CSS.escape(tire.n.id)}"]`).forEach(l => {
        l.setAttribute("x2", tire.n.x.toFixed(1)); l.setAttribute("y2", tire.n.y.toFixed(1));
      });
    } else {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      vue.x = tire.vx + (ev.clientX - tire.x0) * (vb.width / r.width);
      vue.y = tire.vy + (ev.clientY - tire.y0) * (vb.height / r.height);
      appliquer();
    }
  };

  const finir = ev => {
    if (tire && tire.type === "noeud" && tire.bouge) {
      tire.g.dataset.bouge = "1";
      setTimeout(() => delete tire.g.dataset.bouge, 60);
    }
    tire = null;
    svg.classList.remove("tire");
    if (ev && svg.hasPointerCapture?.(ev.pointerId)) svg.releasePointerCapture(ev.pointerId);
  };
  svg.onpointerup = finir;
  svg.onpointercancel = finir;

  svg.onwheel = ev => {
    ev.preventDefault();
    const f = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    const z = Math.max(0.3, Math.min(4, vue.z * f));
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const mx = (ev.clientX - r.left) * (vb.width / r.width);
    const my = (ev.clientY - r.top) * (vb.height / r.height);
    vue.x = mx - (mx - vue.x) * (z / vue.z);
    vue.y = my - (my - vue.y) * (z / vue.z);
    vue.z = z;
    appliquer();
  };
}

/* =============================================================================
   DÉMARRAGE
   ========================================================================== */

async function demarrer() {
  await charger();

  $("#f-type").innerHTML = `<option value="">Tous les types</option>` +
    ORDRE_TYPES.map(t => `<option value="${t}">${echapper(S.schema.types[t].pluriel)}</option>`).join("");

  const statuts = [...new Set(ORDRE_TYPES.flatMap(t => S.schema.types[t].statuts))].sort((a, b) => a.localeCompare(b, "fr"));
  $("#f-statut").innerHTML = `<option value="">Tous les statuts</option>` +
    statuts.map(s => `<option value="${echapper(s)}">${echapper(s)}</option>`).join("");

  $$("#onglets button").forEach(b => b.onclick = () => allerA(b.dataset.vue));
  $("#recherche").oninput = e => { S.filtres.q = e.target.value; rendreListe(); };
  $("#f-type").onchange   = e => { S.filtres.type = e.target.value; rendreListe(); };
  $("#f-statut").onchange = e => { S.filtres.statut = e.target.value; rendreListe(); };
  $("#f-tri").onchange    = e => { S.filtres.tri = e.target.value; rendreListe(); };
  $("#btn-nouveau").onclick = nouveau;
  $("#voile").onclick = fermer;
  document.addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });

  allerA("etat");
}

demarrer().catch(e => {
  document.querySelector("main").innerHTML =
    `<p class="chargement">Impossible de charger les données : ${echapper(e.message)}<br>
     Lance d'abord <code>python3 amorcer.py</code>, puis <code>python3 serveur.py</code>.</p>`;
});
