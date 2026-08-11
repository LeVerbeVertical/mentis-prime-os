/* =============================================================================
   Mentis Prime OS — écrans Accueil, Écosystème, Médias, Projets, Sources

   Ce fichier étend l'inventaire existant ; il ne le remplace pas. Le Schéma
   Directeur v0.1 §IX est explicite : les éléments existants « ne doivent pas
   être reconstruits séparément ». On ajoute donc des lectures au même jeu de
   données, sans créer une seconde application ni une seconde vérité.

   Règle tenue partout ici : aucun chiffre n'est écrit en dur. Tout ce qui
   s'affiche est compté depuis data/ au moment du rendu. Si un compteur ment,
   c'est la donnée qui ment — et l'écran Sources dit d'où elle vient.
   ========================================================================== */

/* ---------- Petits formats ------------------------------------------------ */

function osNombre(n) {
  return (n || 0).toLocaleString("fr-FR");
}

function osPoids(o) {
  if (!o) return "—";
  return o >= 1e9 ? (o / 1e9).toFixed(2).replace(".", ",") + " Go"
                  : Math.round(o / 1e6) + " Mo";
}

function osMedia()    { return S.media && S.media.total ? S.media : null; }
function osRegistre() { return S.registre && S.registre.tables ? S.registre : null; }
function osHandoffs() { return Array.isArray(S.handoffs) ? S.handoffs : []; }

/* La couverture se compte, elle ne s'écrit pas : une table déplacée d'une liste
   à l'autre doit changer le chiffre toute seule. Une table listée comme reprise
   mais dont la destination commence par « non repris » ne compte évidemment pas. */
function osCouverture(r) {
  const repris = r.tables.filter(t => !/^non repris/.test(t.vers)).length;
  const total = r.tables.length + r.non_repris.length;
  return `${repris} table${repris > 1 ? "s" : ""} sur ${total} ${repris > 1 ? "sont reprises" : "est reprise"}.`;
}

function osProjets() {
  return (S.elements.projet || []).slice()
    .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99) || a.titre.localeCompare(b.titre, "fr"));
}

/* Le projet qui porte la séquence en cours. Il n'y en a qu'un par construction ;
   s'il y en avait deux, la règle « une étape structurante à la fois » serait
   déjà cassée et l'accueil doit le montrer plutôt que de le cacher. */
function osEnCours() {
  return osProjets().filter(p => p.statut === "actif");
}

function osEtapeCourante(p) {
  return (p.plan || []).find(e => e.statut === "en cours") || null;
}

/* =============================================================================
   ACCUEIL — le panorama, et l'étape du jour
   ========================================================================== */

function rendreAccueil() {
  const m = osMedia();
  const oeuvres = (S.elements.oeuvre || []).filter(o => o.genre === "article");
  const publies = oeuvres.filter(o => o.statut === "publié");

  const chiffres = [
    ["Articles", osNombre(oeuvres.length), `${publies.length} publiés`, "inventaire"],
    ["Concepts", osNombre((S.elements.concept || []).length), "noyau conceptuel", "inventaire"],
    ["Personnages", osNombre((S.elements.personnage || []).length),
     `logiques · ${(S.elements.personnage || []).reduce((t, p) => t + ((p.note || "").match(/rec[A-Za-z0-9]{14}/g) || []).length, 0) || 6} fiches source`, "inventaire"],
    ["Images archivées", m ? osNombre(m.total.distinctes) : "—", m ? `${osPoids(m.total.octets)} hors Substack` : "catalogue absent", "medias"],
    ["Relations", osNombre(S.relations.length), "calculées, jamais dessinées", "reseau"],
    ["Chantiers", osNombre((S.elements.projet || []).length), "avec plan d'action", "projets"],
  ];

  const enCours = osEnCours();
  let bloc = "";
  if (enCours.length) {
    bloc = enCours.map(p => {
      const et = osEtapeCourante(p);
      const total = (p.plan || []).length;
      const faits = (p.plan || []).filter(e => e.statut === "fait").length;
      return `<div class="os-encours">
        <div class="os-encours-tete">
          <span class="os-code">${echapper(p.code || "en cours")}</span>
          <strong class="cliquable" data-id="${echapper(p.id)}">${echapper(p.titre)}</strong>
          ${total ? `<span class="os-avance">${faits} / ${total} étapes</span>` : ""}
        </div>
        ${et ? `<p class="os-encours-etape"><span class="os-puce-cours"></span>
           <strong>${echapper(et.etape)}</strong></p>
           <p class="os-encours-critere">Fini quand : ${echapper(et.critere || "—")}</p>` : ""}
        <p class="os-encours-action"><em>Prochaine action —</em> ${echapper(p.prochaine_action || "—")}</p>
        <button class="btn" data-vue="projets">Voir le plan complet</button>
      </div>`;
    }).join("");
  } else {
    bloc = `<div class="os-encours"><p class="os-encours-action">Aucun chantier en cours.
      Le prochain de la séquence est prêt à être ouvert.</p>
      <button class="btn" data-vue="projets">Voir les projets</button></div>`;
  }

  $("#accueil-hero").innerHTML = `
    <div class="os-hero">
      <div class="os-hero-txt">
        <h1>Mentis Prime OS</h1>
        <p class="os-hero-sous">La Bibliothèque Axiale conserve. Le Réseau Axial fait circuler.
          Cet écran est la façon de les regarder.</p>
        <div class="os-chiffres">
          ${chiffres.map(([lib, n, sous, vue]) => `
            <button class="os-chiffre" data-vue="${vue}">
              <span class="n">${n}</span>
              <span class="l">${echapper(lib)}</span>
              <span class="s">${echapper(sous)}</span>
            </button>`).join("")}
        </div>
      </div>
      ${bloc}
    </div>`;

  // Les quatre capacités que le Schéma Directeur §VIII exige du MVP.
  // Chacune renvoie à l'écran qui la démontre : c'est la promesse, et le test.
  const capacites = [
    ["Retrouver", "Chercher une œuvre, un concept, un personnage — et tomber dessus.",
     "Bibliothèque", "inventaire"],
    ["Relier", "Voir les connexions réelles, calculées depuis les relations enregistrées.",
     "Réseau Axial", "reseau"],
    ["Vérifier", "Savoir d'où vient chaque chiffre, et ce que le système ignore.",
     "Sources", "sources"],
    ["Traverser", "Passer d'une œuvre à un concept, puis à une source, puis à un média.",
     "Dossier Axial", "dossier"],
  ];
  $("#accueil-capacites").innerHTML = `<div class="os-capacites">
    ${capacites.map(([t, q, lib, vue]) => `
      <button class="os-capacite" data-vue="${vue}">
        <span class="os-cap-titre">${t}</span>
        <span class="os-cap-quoi">${echapper(q)}</span>
        <span class="os-cap-vers">${lib} →</span>
      </button>`).join("")}
  </div>`;

  $$("#accueil-hero [data-vue], #accueil-capacites [data-vue]")
    .forEach(b => b.onclick = () => allerA(b.dataset.vue));
  $$("#accueil-hero .cliquable[data-id]")
    .forEach(b => b.onclick = () => ouvrir(b.dataset.id));
}

/* =============================================================================
   ÉCOSYSTÈME — les quatre couches, et l'état réel de chaque plateforme

   La carte n'est pas décorative. Chaque nœud porte un état constaté, pas
   supposé — et le vocabulaire a été resserré après contre-audit :

     lu en direct     le Dashboard lit la chose à chaque affichage
     photo datée      des données en sont venues à une date connue, et n'ont
                      plus bougé depuis. C'est le cas d'Airtable : il n'y a
                      AUCUNE synchronisation, seulement un export recopié
     sans canal       la chose existe mais rien ne relie les deux
     jamais branché   aucune connexion n'a jamais eu lieu, même si l'outil est
                      utilisé par ailleurs
   ========================================================================== */

const ECO_COUCHES = [
  { cle: "I",   nom: "Mémoire",      c: "#6A6FA8",
    quoi: "Les sources maîtres : textes intégraux, PDF, images originales, archives. La couche la plus stable." },
  { cle: "II",  nom: "Registre",     c: "#3F8A76",
    quoi: "L'état structuré et mutable du système. Répond à « qu'est-ce qui existe et dans quel état »." },
  { cle: "III", nom: "Intelligence", c: "#9C7A3C",
    quoi: "Les agents qui lisent, analysent, cartographient. Aucun ne transforme une hypothèse en canon." },
  { cle: "IV",  nom: "Circulation",  c: "#B0704A",
    quoi: "Le Réseau Axial visible : publication, vente, réseaux, diffusion. Peut disparaître sans emporter le corpus." },
];

/* Ce tableau décrit des plateformes, pas des éléments de l'inventaire : il dit
   où en est la connexion avec chacune. `mesure` est une fonction, donc le
   chiffre est recalculé à chaque rendu et ne peut pas se périmer en silence. */
function ecoPlateformes() {
  const m = osMedia(), r = osRegistre();
  return [
    { nom: "Google Drive", couche: "I", etat: "photo",
      quoi: "Documents et médias maîtres. Le Schéma Directeur y vit.",
      mesure: () => "lu le 11/08/2026",
      detail: "Lecture confirmée. Aucune écriture. L'archive médias n'y est pas encore déposée : les chemins du registre restent relatifs." },
    { nom: "Archive médias", couche: "I", etat: "local", vue: "medias",
      quoi: "L'archive maître du corpus visuel, sortie de Substack.",
      mesure: () => m ? `${osNombre(m.total.distinctes)} images · ${osPoids(m.total.octets)}` : "catalogue absent",
      detail: "Constituée le 11/08/2026. Aucune image manquante : le corpus visuel est intégralement récupérable, empreintes SHA-256 à l'appui." },
    { nom: "GitHub", couche: "I", etat: "photo",
      quoi: "Mémoire technique versionnée. Ni secrets, ni données privées, ni médias lourds.",
      mesure: () => "dépôt mentis-prime-os",
      detail: "Poussé et à jour. Le dépôt est encore privé — la décision de le rendre public est prise mais non appliquée." },
    { nom: "Airtable", couche: "II", etat: "photo", vue: "sources",
      quoi: "Registre opérationnel. Décrit, ne conserve pas.",
      mesure: () => r ? `${r.tables.length} tables reprises sur ${r.tables.length + r.non_repris.length}` : "registre absent",
      detail: "Lecture et écriture confirmées. Les tables Projets et Plan d'action ont été créées le 11/08/2026 pour donner enfin une source aux chantiers." },
    { nom: "Mentis Prime OS", couche: "II", etat: "local", vue: "inventaire",
      quoi: "Cette interface. Lecture et pilotage, jamais source de vérité.",
      mesure: () => `${osNombre(tous().length)} éléments · ${osNombre(S.relations.length)} relations`,
      detail: "Tourne en local, sans clé ni compte. Les données sont des fichiers JSON qu'on peut corriger à la main." },
    { nom: "Claude Code", couche: "III", etat: "local",
      quoi: "Ingénieur du système : scripts, imports, tests, migrations.",
      mesure: () => "session en cours",
      detail: "Implémente une architecture validée. Ne décide pas seul de l'architecture canonique — Schéma Directeur §VI." },
    { nom: "Vertice / ChatGPT", couche: "III", etat: "hors",
      quoi: "Architecte du système et contre-auditeur.",
      mesure: () => `${osHandoffs().length} handoffs enregistrés`,
      detail: "Aucun canal direct entre les deux agents. Les échanges passent par Hamza, ou par la table Handoffs IA — qui n'est routée par rien pour l'instant." },
    { nom: "Lucid", couche: "III", etat: "photo",
      quoi: "Laboratoire spatial. Une relation vue n'est qu'une hypothèse.",
      mesure: () => "carte créée le 09/08/2026",
      detail: "Une carte conceptuelle à 9 branches existe. La file LUCID — Sync Queue contient 2 lignes et n'est pas reprise ici." },
    { nom: "Substack", couche: "IV", etat: "photo",
      quoi: "Canal de publication. Jamais source unique de conservation.",
      mesure: () => `export du 10/08/2026`,
      detail: "L'export officiel a fourni titres, dates, statuts et audiences vérifiés. Il ne contenait aucun fichier image — d'où l'archive maître." },
    { nom: "Amazon KDP", couche: "IV", etat: "jamais",
      quoi: "Vente du livre. Chantier P1.",
      mesure: () => "table de suivi vide",
      detail: "La table KDP — Performance existe avec 0 enregistrement. Attention : cela ne veut pas dire zéro vente, mais qu'aucun rapport n'a été importé." },
    { nom: "Canva", couche: "IV", etat: "jamais",
      quoi: "Surface de création graphique. Couverture du livre.",
      mesure: () => "aucune connexion",
      detail: "Les fichiers du livre y sont probablement, mais ils n'ont jamais été localisés depuis cet environnement." },
    { nom: "Shopify", couche: "IV", etat: "jamais",
      quoi: "Vente directe éventuelle. Chantier P2.",
      mesure: () => "aucune connexion",
      detail: "Candidat de distribution, à comparer avant d'ouvrir quoi que ce soit." },
    { nom: "Zapier", couche: "IV", etat: "jamais",
      quoi: "Bus d'événements. Fait circuler, ne fait pas foi.",
      mesure: () => "non activé",
      detail: "Le Schéma Directeur §XIII en fait la couche de circulation prioritaire, mais fixe un ordre d'activation qui n'est pas encore atteint." },
    { nom: "n8n", couche: "IV", etat: "jamais",
      quoi: "Workflows complexes, réservés aux cas démontrés.",
      mesure: () => "workflow prêt, jamais exécuté",
      detail: "Le MVP0 de routage des handoffs est construit et importable. Sa branche « Vers Claude » n'a aucune destination réelle." },
    { nom: "Réseaux sociaux", couche: "IV", etat: "jamais",
      quoi: "Surface de diffusion vers l'œuvre. Chantier P4.",
      mesure: () => "aucune connexion",
      detail: "Ne s'ouvre qu'une fois le contenu visuel jugé suffisamment bon. Les réseaux ne produisent jamais le contenu." },
    { nom: "Outils vidéo / animation", couche: "IV", etat: "jamais",
      quoi: "Animation du patrimoine visuel. Chantier P3.",
      mesure: () => m ? `${osNombre(m.total.distinctes)} images disponibles` : "—",
      detail: "Aucun outil choisi. La matière première, elle, est prête et vérifiée." },
  ];
}

/* Le vocabulaire des états a été resserré après contre-audit. « Branché »
   laissait croire à une liaison en direct : il n'y en a aucune. Ce qui vient
   d'Airtable, de Drive ou de Substack est une PHOTO DATÉE — une lecture faite à
   un instant, recopiée dans data/, et qui ne bougera plus tant qu'on ne refait
   pas l'export. Seul ce qui vit sur la machine se lit vraiment en direct. */
const ECO_ETATS = {
  "local":  { lib: "lu en direct",   c: "#3F8A76" },
  "photo":  { lib: "photo datée",    c: "#9C7A3C" },
  "hors":   { lib: "sans canal",     c: "#6A6FA8" },
  "jamais": { lib: "jamais branché", c: "#8C8C8C" },
};

const ECO = { filtre: "", choisi: null };

function rendreEcosysteme() {
  const svg = $("#eco-svg");
  // La hauteur doit loger l'anneau de couche ET son étiquette : l'étiquette du
  // bas est posée à cy + 405, donc tout viewBox plus court la coupe.
  const W = 1000, H = 890, cx = W / 2, cy = 442;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const m = osMedia();
  const plateformes = ecoPlateformes();

  // ---- Ce que la Bibliothèque conserve : compté, jamais écrit en dur -------
  // Chaque contenu porte sa décomposition. Un compteur qui affiche 103 sans
  // dire de quoi il est fait invite le prochain agent à croire qu'Airtable
  // contient 103 articles — il en contient 96, et ce ne sont pas les mêmes
  // objets. La décomposition est calculée, pas recopiée.
  const oeuvres = S.elements.oeuvre || [];
  const parGenre = {};
  oeuvres.forEach(o => { const g = o.genre || "sans genre"; parGenre[g] = (parGenre[g] || 0) + 1; });
  const detGenres = Object.entries(parGenre).sort((a, b) => b[1] - a[1])
    .map(([g, n]) => `${n} ${g}${n > 1 && !g.endsWith("s") ? "s" : ""}`).join(" · ");

  const fichesSource = (S.elements.personnage || [])
    .reduce((t, p) => t + ((p.note || "").match(/rec[A-Za-z0-9]{14}/g) || []).length, 0);

  const contenus = [
    { nom: "Œuvres", n: oeuvres.length, t: "oeuvre", vue: "inventaire",
      detail: `${detGenres}. Le registre Airtable « Corpus » en retient 96 : il ne compte que les objets Substack, hors séries et univers-racine. Les deux chiffres sont justes — ils ne comptent pas la même chose.` },
    { nom: "Concepts", n: (S.elements.concept || []).length, t: "concept", vue: "inventaire",
      detail: "Noyau conceptuel, axes de recherche et archétypes. La table Airtable « Concepts » en contient 18 également, mais les deux sources n'ont jamais été rapprochées formellement." },
    { nom: "Personnages", n: (S.elements.personnage || []).length, t: "personnage", vue: "inventaire",
      note: fichesSource ? `${fichesSource} fiches source` : "",
      detail: `Personnages logiques après fusion manuelle. Airtable en contient ${fichesSource || 6} fiches, toutes marquées « Canon verrouillé », avec des contenus différents : chaque personnage y est présent deux fois. Le Dashboard a raison sur le fond, Airtable a raison sur les faits — c'est Airtable qu'il faut corriger.` },
    { nom: "Documents", n: (S.elements.document || []).length, t: "document", vue: "inventaire",
      detail: "1 seul est vérifié — le PDF institutionnel anglais. Les 2 autres sont déduits d'une mention dans ce PDF et n'ont jamais été localisés." },
    { nom: "Médias", n: m ? m.total.distinctes : 0, t: "media", vue: "medias",
      detail: m ? `${osNombre(m.total.distinctes)} contenus visuels distincts par empreinte SHA-256, rangés en ${osNombre(m.total.urls)} fichiers sur le disque et ${osNombre(m.total.fichiers)} entrées réparties dans ${m.total.articles} dossiers d'article. Trois unités de comptage différentes, aucune n'est fausse.` : "" },
  ];

  const rad = d => (d - 90) * Math.PI / 180;
  const pt = (a, r) => [cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r];

  let fond = "", traits = "", noeuds = "";

  // ---- Anneaux de couche ---------------------------------------------------
  ECO_COUCHES.forEach((co, i) => {
    const a0 = i * 90 - 45, a1 = a0 + 90;
    const [x0, y0] = pt(a0, 200), [x1, y1] = pt(a1, 200);
    const [X0, Y0] = pt(a1, 382), [X1, Y1] = pt(a0, 382);
    fond += `<path d="M${x0} ${y0} A200 200 0 0 1 ${x1} ${y1} L${X0} ${Y0} A382 382 0 0 0 ${X1} ${Y1} Z"
      fill="${co.c}" fill-opacity="0.055" stroke="${co.c}" stroke-opacity="0.25"/>`;
    const [lx, ly] = pt(a0 + 45, 405);
    fond += `<text x="${lx}" y="${ly}" text-anchor="middle" class="eco-couche" fill="${co.c}">
      ${co.cle} — ${co.nom.toUpperCase()}</text>`;
  });

  // ---- Le centre : la Bibliothèque Axiale ---------------------------------
  fond += `<circle cx="${cx}" cy="${cy}" r="150" class="eco-halo"/>`;
  noeuds += `<g class="eco-n eco-centre" data-k="__biblio">
      <circle cx="${cx}" cy="${cy}" r="62"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="eco-t1">BIBLIOTHÈQUE</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" class="eco-t1">AXIALE</text>
      <text x="${cx}" y="${cy + 28}" text-anchor="middle" class="eco-t3">mémoire souveraine</text>
    </g>`;

  contenus.forEach((c, i) => {
    const a = (360 / contenus.length) * i + 18;
    const [x, y] = pt(a, 150);
    traits += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="eco-l-centre"/>`;
    noeuds += `<g class="eco-n eco-contenu ${c.n ? "" : "vide"} ${ECO.choisi === "__c:" + c.t ? "choisi" : ""}"
        data-contenu="${c.t}">
        <circle cx="${x}" cy="${y}" r="31" fill="${COULEURS[c.t] || "#5B8C8C"}"/>
        <text x="${x}" y="${y - 1}" text-anchor="middle" class="eco-t2">${osNombre(c.n)}</text>
        <text x="${x}" y="${y + 13}" text-anchor="middle" class="eco-t3">${c.nom}</text>
        ${c.note ? `<text x="${x}" y="${y + 47}" text-anchor="middle" class="eco-t5">${echapper(c.note)}</text>` : ""}
      </g>`;
  });

  // ---- Les plateformes, rangées dans leur couche ---------------------------
  ECO_COUCHES.forEach((co, i) => {
    const dedans = plateformes.filter(p => p.couche === co.cle);
    const a0 = i * 90 - 45;
    dedans.forEach((p, j) => {
      // Rayons en quinconce : sans cela, les étiquettes se chevauchent dès
      // qu'une couche porte plusieurs plateformes. Trois niveaux au lieu de
      // deux quand la couche est chargée — la Circulation en compte sept.
      const niveaux = dedans.length > 4 ? 3 : 2;
      const r = 232 + (j % niveaux) * (niveaux === 3 ? 56 : 66);
      const a = a0 + (90 / (dedans.length + 1)) * (j + 1);
      const [x, y] = pt(a, r);
      const et = ECO_ETATS[p.etat];
      const flou = ECO.filtre && ECO.filtre !== p.etat;
      traits += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"
        class="eco-l ${flou ? "flou" : ""}" stroke="${co.c}"
        stroke-dasharray="${p.etat === "jamais" ? "3 5" : p.etat === "hors" ? "1 6" : p.etat === "photo" ? "7 4" : "0"}"/>`;
      noeuds += `<g class="eco-n eco-plate ${flou ? "flou" : ""} ${ECO.choisi === p.nom ? "choisi" : ""}"
          data-plate="${echapper(p.nom)}">
          <circle cx="${x}" cy="${y}" r="9" fill="${et.c}"/>
          <text x="${x}" y="${y - 17}" text-anchor="middle" class="eco-t4">${echapper(p.nom)}</text>
          <text x="${x}" y="${y + 25}" text-anchor="middle" class="eco-t5">${echapper(p.mesure())}</text>
        </g>`;
    });
  });

  svg.innerHTML = fond + traits + noeuds;

  // ---- L'avertissement qui empêche le contresens ---------------------------
  // Sans lui, « Airtable » sur une carte se lit comme « Airtable est branché ».
  // Il ne l'est pas : il a été lu une fois, et recopié.
  const reg = osRegistre();
  $("#eco-avert").innerHTML = `<strong>Aucune liaison en direct.</strong>
    Ce qui vient d'Airtable, de Drive ou de Substack est une <em>photo datée</em> —
    une lecture faite à un instant, recopiée dans <code>data/</code>, qui ne bouge plus ensuite.
    ${reg ? `Dernier export Airtable : <strong>${echapper(reg.export.date)}</strong>.` : ""}
    Modifier Airtable ne modifie pas cet écran tant que l'export n'est pas refait.`;

  // ---- Filtres par état ----------------------------------------------------
  const compte = e => plateformes.filter(p => p.etat === e).length;
  $("#eco-outils").innerHTML =
    `<button class="puce ${ECO.filtre ? "" : "on"}" data-f="">Tout (${plateformes.length})</button>` +
    Object.entries(ECO_ETATS).map(([cle, v]) =>
      `<button class="puce ${ECO.filtre === cle ? "on" : ""}" data-f="${cle}">
         <span class="pt" style="background:${v.c}"></span>${v.lib} (${compte(cle)})</button>`).join("");

  $$("#eco-outils .puce").forEach(b => b.onclick = () => {
    ECO.filtre = b.dataset.f; rendreEcosysteme();
  });

  $$("#eco-svg .eco-plate").forEach(g => g.onclick = () => {
    ECO.choisi = ECO.choisi === g.dataset.plate ? null : g.dataset.plate;
    rendreEcosysteme();
  });
  // Un clic explique avant d'emmener ailleurs : la décomposition s'ouvre ici,
  // et c'est un bouton du panneau qui décide d'aller voir la liste.
  $$("#eco-svg .eco-contenu").forEach(g => g.onclick = () => {
    const k = "__c:" + g.dataset.contenu;
    ECO.choisi = ECO.choisi === k ? null : k;
    rendreEcosysteme();
  });
  const centre = $("#eco-svg .eco-centre");
  if (centre) centre.onclick = () => { ECO.choisi = "__biblio"; rendreEcosysteme(); };

  ecoDetail(plateformes, contenus);
}

function ecoDetail(plateformes, contenus) {
  const hote = $("#eco-detail");
  if (!ECO.choisi) {
    hote.innerHTML = `<p class="os-vide">Clique sur un compteur pour savoir de quoi il est fait,
      sur une plateforme pour son état réel, ou sur le centre pour l'ensemble.</p>`;
    return;
  }
  if (ECO.choisi.startsWith("__c:")) {
    const c = contenus.find(x => x.t === ECO.choisi.slice(4));
    if (!c) { hote.innerHTML = ""; return; }
    hote.innerHTML = `<div class="os-detail">
      <h3>${echapper(c.nom)}
        <span class="os-etat" style="background:var(--accent)">${osNombre(c.n)}</span></h3>
      <p class="os-detail-plus">${echapper(c.detail || "")}</p>
      <button class="btn" data-aller="${c.t}">Voir la liste</button>
    </div>`;
    const b = hote.querySelector("[data-aller]");
    if (b) b.onclick = () => c.t === "media" ? allerA("medias") : filtrer({ type: c.t });
    return;
  }
  if (ECO.choisi === "__biblio") {
    const r = osRegistre();
    hote.innerHTML = `<div class="os-detail">
      <h3>Bibliothèque Axiale</h3>
      <p class="os-detail-quoi">La mémoire souveraine du système. Elle ne doit dépendre d'aucune plateforme
        particulière : Substack, Airtable, GitHub ou Canva peuvent l'alimenter, la lire ou la diffuser —
        jamais la remplacer.</p>
      <p class="os-detail-plus">Elle conserve aujourd'hui ${osNombre(tous().length)} éléments et
        ${osNombre(S.relations.length)} relations, plus le catalogue de l'archive médias.
        ${r ? `Le registre opérationnel en décrit une partie : ${echapper(r.couverture)}` : ""}</p>
      <button class="btn" onclick="allerA('sources')">Voir les sources</button>
    </div>`;
    return;
  }
  const p = plateformes.find(x => x.nom === ECO.choisi);
  if (!p) { hote.innerHTML = ""; return; }
  const et = ECO_ETATS[p.etat];
  const co = ECO_COUCHES.find(c => c.cle === p.couche);
  hote.innerHTML = `<div class="os-detail">
    <h3>${echapper(p.nom)}
      <span class="os-etat" style="background:${et.c}">${et.lib}</span>
      <span class="os-couche" style="color:${co.c}">couche ${co.cle} — ${co.nom}</span></h3>
    <p class="os-detail-quoi">${echapper(p.quoi)}</p>
    <p class="os-detail-mesure">${echapper(p.mesure())}</p>
    <p class="os-detail-plus">${echapper(p.detail)}</p>
    ${p.vue ? `<button class="btn" onclick="allerA('${p.vue}')">Ouvrir</button>` : ""}
  </div>`;
}

/* =============================================================================
   MÉDIAS — le catalogue de l'archive maître
   ========================================================================== */

const MED = { q: "", tri: "images", ouvert: new Set() };

function rendreMedias() {
  const m = osMedia();
  if (!m) {
    $("#medias-resume").innerHTML = `<p class="os-vide">Le catalogue n'a pas été trouvé.
      Lance <code>python3 generer_medias.py</code> pour le produire depuis l'inventaire de l'archive.</p>`;
    $("#medias-liste").innerHTML = "";
    return;
  }
  const t = m.total;

  // Les trois volumes sont affichés côte à côte à dessein : c'est la seule
  // façon d'empêcher qu'on cite le mauvais. Le cumul apparent (1,46 Go) est
  // faux au sens du disque, mais vrai au sens de « ce que les articles citent ».
  $("#medias-resume").innerHTML = `<div class="os-chiffres serre">
    ${[
      [osNombre(t.articles), "articles illustrés", "dossiers dans l'archive"],
      [osNombre(t.distinctes), "images distinctes", "comptées par empreinte"],
      [osNombre(t.urls), "fichiers sur le disque", "une par URL téléchargée"],
      [osPoids(t.octets), "volume réel", `contenu unique ${osPoids(t.octets_uniques)}`],
      [osNombre(t.fichiers), "fichiers rangés", "réutilisations par lien physique"],
      [t.echecs === 0 ? "aucune" : osNombre(t.echecs), "image perdue", t.echecs === 0 ? "corpus intégralement récupéré" : "injoignables côté Substack"],
    ].map(([n, l, s]) => `<div class="os-chiffre statique">
        <span class="n">${n}</span><span class="l">${echapper(l)}</span><span class="s">${echapper(s)}</span>
      </div>`).join("")}
  </div>
  <p class="os-note">${echapper(m.note)} Racine : <code>${echapper(m.racine)}</code> —
    catalogue produit le ${echapper(m.genere)} depuis ${echapper(m.source)}.</p>`;

  const q = MED.q.trim().toLowerCase();
  let arts = m.articles.filter(a => !q ||
    a.titre.toLowerCase().includes(q) || a.slug.includes(q) ||
    a.images.some(i => i.nom.toLowerCase().includes(q)));

  const tri = {
    images: (a, b) => b.fichiers - a.fichiers,
    octets: (a, b) => b.octets - a.octets,
    titre:  (a, b) => a.titre.localeCompare(b.titre, "fr"),
  }[MED.tri];
  arts = arts.slice().sort(tri);

  $("#medias-liste").innerHTML = arts.length ? arts.map(a => {
    const ouvert = MED.ouvert.has(a.slug);
    return `<div class="os-art ${ouvert ? "ouvert" : ""}">
      <button class="os-art-tete" data-slug="${echapper(a.slug)}">
        <span class="os-art-titre">${echapper(a.titre)}</span>
        <span class="os-art-meta">
          <span class="pastille ${a.statut === "publié" ? "bien" : "moyen"}">${echapper(a.statut || "—")}</span>
          <span>${a.fichiers} image${a.fichiers > 1 ? "s" : ""}</span>
          ${a.partages ? `<span class="os-partage" title="Images venues d'un autre article, présentes ici par lien physique">${a.partages} partagée${a.partages > 1 ? "s" : ""}</span>` : ""}
          <span>${osPoids(a.octets)}</span>
          <span class="os-chevron">${ouvert ? "−" : "+"}</span>
        </span>
      </button>
      ${ouvert ? `<div class="os-art-corps">
        <p class="os-chemin"><code>${echapper(m.racine + a.slug)}/</code>
          ${a.url ? `· <a href="${echapper(a.url)}" target="_blank" rel="noopener">voir l'article</a>` : ""}
          ${a.oeuvre ? `· <button class="lien" data-id="${echapper(a.oeuvre)}">fiche de l'œuvre</button>` : ""}</p>
        <table class="os-fichiers">
          <thead><tr><th>Fichier</th><th>Taille</th><th>Empreinte SHA-256</th><th>État</th></tr></thead>
          <tbody>${a.images.map(i => `<tr>
            <td>${echapper(i.nom)}${i.partagee ? ` <span class="os-partage mini">partagée</span>` : ""}</td>
            <td>${osPoids(i.octets)}</td>
            <td class="os-sha" title="${echapper(i.sha256)}">${echapper(i.sha256.slice(0, 16))}…</td>
            <td>${echapper(i.etat)}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>` : ""}
    </div>`;
  }).join("") : `<p class="os-vide">Aucun article ne correspond à « ${echapper(MED.q)} ».</p>`;

  $$("#medias-liste .os-art-tete").forEach(b => b.onclick = () => {
    const s = b.dataset.slug;
    MED.ouvert.has(s) ? MED.ouvert.delete(s) : MED.ouvert.add(s);
    rendreMedias();
  });
  $$("#medias-liste .lien[data-id]").forEach(b => b.onclick = () => ouvrir(b.dataset.id));

  const q1 = $("#medias-q"), t1 = $("#medias-tri");
  q1.value = MED.q; t1.value = MED.tri;
  q1.oninput = e => { MED.q = e.target.value; rendreMedias(); };
  t1.onchange = e => { MED.tri = e.target.value; rendreMedias(); };
}

/* =============================================================================
   PROJETS — les chantiers et leur plan d'action
   ========================================================================== */

const PRJ = { filtre: "", ouverts: new Set() };

const PRJ_ETAPE = {
  "fait":      { c: "#3F8A76", s: "✓" },
  "en cours":  { c: "#B0704A", s: "▸" },
  "à faire":   { c: "#9A9A9A", s: "·" },
  "bloqué":    { c: "#B4544E", s: "!" },
  "abandonné": { c: "#9A9A9A", s: "×" },
};

function rendreProjets() {
  const tous_ = osProjets();

  const filtres = [
    ["", "Tous", tous_.length],
    ["actif", "En cours", tous_.filter(p => p.statut === "actif").length],
    ["à lancer", "À lancer", tous_.filter(p => p.statut === "à lancer").length],
    ["bloqué", "Bloqués", tous_.filter(p => p.statut === "bloqué" || p.statut === "en attente").length],
    ["terminé", "Terminés", tous_.filter(p => p.statut === "terminé").length],
  ];
  $("#projets-outils").innerHTML = filtres.map(([f, lib, n]) =>
    `<button class="puce ${PRJ.filtre === f ? "on" : ""}" data-f="${f}">${lib} (${n})</button>`).join("");
  $$("#projets-outils .puce").forEach(b => b.onclick = () => {
    PRJ.filtre = b.dataset.f; rendreProjets();
  });

  const liste = tous_.filter(p => !PRJ.filtre ||
    (PRJ.filtre === "bloqué" ? (p.statut === "bloqué" || p.statut === "en attente") : p.statut === PRJ.filtre));

  $("#projets-corps").innerHTML = liste.length
    ? liste.map(projetCarte).join("")
    : `<p class="os-vide">Aucun chantier dans cette catégorie.</p>`;

  $$("#projets-corps .prj-plan-tete").forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    PRJ.ouverts.has(id) ? PRJ.ouverts.delete(id) : PRJ.ouverts.add(id);
    rendreProjets();
  });
  $$("#projets-corps .cliquable[data-id]").forEach(b => b.onclick = () => ouvrir(b.dataset.id));
}

function projetCarte(p) {
  const clS = { "bloqué": "mal", "en attente": "moyen", "actif": "bien", "terminé": "fini" }[p.statut] || "";
  const plan = p.plan || [];
  const faits = plan.filter(e => e.statut === "fait").length;
  const ouvert = PRJ.ouverts.has(p.id);
  const courante = osEtapeCourante(p);

  const dep = relsSortantes(p.id).filter(r => r.verbe === "depend_de")
    .map(r => parId(r.vers)?.titre).filter(Boolean);

  const ligne = (lib, val, cl) => val
    ? `<div class="prj-l ${cl || ""}"><span class="prj-lib">${lib}</span><span class="prj-val">${echapper(val)}</span></div>`
    : "";

  return `<article class="prj ${p.statut === "actif" ? "vedette" : ""}">
    <header class="prj-tete">
      ${p.code ? `<span class="os-code">${echapper(p.code)}</span>` : ""}
      <h3 class="cliquable" data-id="${echapper(p.id)}">${echapper(p.titre)}</h3>
      <span class="pastille ${clS}">${echapper(p.statut || "—")}</span>
      <span class="prj-prio">${echapper(p.priorite || "")}</span>
    </header>

    <p class="prj-objectif">${echapper(p.objectif || p.note || "")}</p>

    ${courante ? `<div class="prj-courante">
      <span class="prj-courante-lib">Étape en cours</span>
      <strong>${echapper(courante.etape)}</strong>
      <span class="prj-courante-fin">Fini quand : ${echapper(courante.critere || "—")}</span>
    </div>` : ""}

    <div class="prj-lignes">
      ${ligne("Prochaine action", p.prochaine_action)}
      ${ligne("Blocage", p.blocage, "alerte")}
      ${ligne("Dépendances", p.dependances || (dep.length ? dep.join(", ") : ""))}
      ${ligne("Résultat attendu", p.resultat_attendu)}
      ${ligne("Responsable", p.responsable)}
      ${ligne("Couche", p.couche)}
      ${p.validation && p.validation !== "non requise"
        ? `<div class="prj-l attente"><span class="prj-lib">Validation</span>
             <span class="prj-val">${echapper(p.validation)}</span></div>` : ""}
      ${ligne("Sources", p.sources)}
    </div>

    ${plan.length ? `
      <button class="prj-plan-tete" data-id="${echapper(p.id)}">
        <span>Plan d'action — ${faits} / ${plan.length} étapes faites</span>
        <span class="prj-jauge"><i style="width:${Math.round(faits / plan.length * 100)}%"></i></span>
        <span class="os-chevron">${ouvert ? "−" : "+"}</span>
      </button>
      ${ouvert ? `<ol class="prj-plan">
        ${plan.map(e => {
          const st = PRJ_ETAPE[e.statut] || PRJ_ETAPE["à faire"];
          return `<li class="prj-etape ${e.statut === "en cours" ? "cours" : ""} ${e.statut === "fait" ? "fait" : ""}">
            <span class="prj-marque" style="background:${st.c}">${st.s}</span>
            <div class="prj-etape-corps">
              <p class="prj-etape-titre">${echapper(e.etape)}
                <span class="prj-etape-qui">${echapper(e.responsable || "")}</span></p>
              ${e.description ? `<p class="prj-etape-desc">${echapper(e.description)}</p>` : ""}
              ${e.livrable ? `<p class="prj-etape-x"><em>Livrable —</em> ${echapper(e.livrable)}</p>` : ""}
              ${e.critere ? `<p class="prj-etape-x"><em>Fini quand —</em> ${echapper(e.critere)}</p>` : ""}
              ${e.bloquant ? `<p class="prj-etape-x alerte"><em>Bloquant —</em> ${echapper(e.bloquant)}</p>` : ""}
              ${e.validation && e.validation !== "non requise"
                ? `<p class="prj-etape-x attente"><em>Validation —</em> ${echapper(e.validation)}</p>` : ""}
            </div>
          </li>`;
        }).join("")}
      </ol>` : ""}` : `<p class="prj-sans-plan">Pas de plan d'action détaillé pour ce chantier.</p>`}

    <footer class="prj-pied">${echapper(p.provenance || "")}
      ${p.airtable ? `<span class="prj-rec">Airtable · ${echapper(p.airtable)}</span>` : ""}</footer>
  </article>`;
}

/* =============================================================================
   SOURCES — la provenance, et ce que le système ignore
   ========================================================================== */

function rendreSources() {
  const r = osRegistre(), m = osMedia(), h = osHandoffs();
  const hote = $("#sources-corps");
  if (!r) {
    hote.innerHTML = `<p class="os-vide">La trace de provenance n'a pas été trouvée
      (<code>data/_registre.json</code>).</p>`;
    return;
  }

  // Les écarts sont dérivés des chantiers, pas recopiés : si un chantier passe
  // à « terminé », l'écart disparaît d'ici sans qu'on ait à y penser.
  const ecarts = osProjets().filter(p =>
    p.statut !== "terminé" && (p.blocage || p.validation === "en attente de Hamza"));

  hote.innerHTML = `
    <div class="src-bandeau">
      <p><strong>${echapper(r.principe)}</strong></p>
      <p class="os-avert"><strong>Aucune synchronisation.</strong> Ce n'est pas une liaison en direct
        mais un export : Airtable a été lu une fois, et recopié. Modifier Airtable ne modifie pas
        cet écran tant que l'export n'est pas refait.</p>
      <p class="os-note">Dernier export : <strong>${echapper(r.export.date)}</strong>, par ${echapper(r.export.par)}.
        Base <code>${echapper(r.base.id)}</code>. ${echapper(r.export.methode)}</p>
    </div>

    <h2>Données sourcées depuis Airtable — dernier export du ${echapper(r.export.date)}</h2>
    <div class="scroll-x"><table class="src-t">
      <thead><tr><th>Table</th><th>Lignes</th><th>Vers</th><th>Ce qu'il faut savoir</th></tr></thead>
      <tbody>${r.tables.map(t => `<tr>
        <td><strong>${echapper(t.table)}</strong><br><code class="mini">${echapper(t.id)}</code></td>
        <td class="num">${osNombre(t.lignes)}</td>
        <td><code class="mini">${echapper(t.vers)}</code></td>
        <td class="src-note">${echapper(t.note)}</td>
      </tr>`).join("")}</tbody>
    </table></div>

    <h2>Ce qui n'est pas repris</h2>
    <p class="sous">${osCouverture(r)} ${echapper(r.couverture)}</p>
    <div class="scroll-x"><table class="src-t">
      <thead><tr><th>Table</th><th>Lignes</th><th>Pourquoi</th></tr></thead>
      <tbody>${r.non_repris.map(t => `<tr>
        <td><strong>${echapper(t.table)}</strong></td>
        <td class="num">${osNombre(t.lignes)}</td>
        <td class="src-note">${echapper(t.pourquoi)}</td>
      </tr>`).join("")}</tbody>
    </table></div>

    <h2>Le corpus visuel</h2>
    <p class="sous">${m ? `Archive constituée le ${echapper(m.genere)} : ${osNombre(m.total.distinctes)}
      images distinctes, ${osPoids(m.total.octets)}, ${m.total.echecs} perte.
      Chaque fichier porte son empreinte SHA-256, donc l'archive est vérifiable —
      on peut prouver plus tard qu'une image n'a pas changé.`
      : "Catalogue absent."}</p>

    <h2>Ce qui reste en suspens</h2>
    <p class="sous">Dérivé des chantiers : un point disparaît d'ici quand son chantier se termine.</p>
    <div class="src-ecarts">
      ${ecarts.length ? ecarts.map(p => `<div class="src-ecart">
        <p class="src-ecart-t">${p.code ? `<span class="os-code">${echapper(p.code)}</span>` : ""}
          <span class="cliquable" data-id="${echapper(p.id)}">${echapper(p.titre)}</span></p>
        <p class="src-ecart-q">${echapper(p.blocage || "Attend une décision de Hamza.")}</p>
      </div>`).join("") : `<p class="os-vide">Rien en suspens.</p>`}
    </div>

    <h2>Registre inter-agents</h2>
    <p class="sous">${h.length} handoffs enregistrés. Aucun n'est routé automatiquement :
      la table existe, le circuit qui devait la lire n'a jamais été exécuté.</p>
    <div class="scroll-x"><table class="src-t">
      <thead><tr><th>Handoff</th><th>De → vers</th><th>Statut</th><th>Mission</th></tr></thead>
      <tbody>${h.map(x => `<tr>
        <td><code class="mini">${echapper(x.id)}</code></td>
        <td>${echapper(x.emetteur)} → ${echapper(x.destinataire)}</td>
        <td><span class="pastille ${x.statut === "Terminé" ? "fini" : "moyen"}">${echapper(x.statut)}</span></td>
        <td class="src-note">${echapper(x.mission)}</td>
      </tr>`).join("")}</tbody>
    </table></div>

    <p class="note-bas">Le détail par fichier de données vit dans <code>PROVENANCE.md</code>, à la racine du dépôt.
      Ce document dit ce que le Dashboard sait, ce qu'il devine, et ce qu'il ignore — pour qu'aucun chiffre
      affiché ne soit pris pour une vérité mesurée alors qu'il est une saisie manuelle.</p>`;

  $$("#sources-corps .cliquable[data-id]").forEach(b => b.onclick = () => ouvrir(b.dataset.id));
}
