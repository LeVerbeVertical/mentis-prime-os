#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fabrique une page unique et autonome de Mentis Prime OS, en lecture seule.

    python3 construire_page.py [sortie.html]

Par défaut : ./mentis-prime-os.html

POURQUOI
--------
« python3 serveur.py » suffit à un développeur. Mais l'exigence posée était
autre : ouvrir un écran et voir le système, sans terminal, sans Git, sans
Python — depuis un téléphone si besoin. Ce script produit exactement cela :
un seul fichier HTML qui contient l'interface ET les données, et qui s'ouvre
d'un double-clic ou derrière un lien.

CE QUE CE N'EST PAS
-------------------
Une seconde application. Le Schéma Directeur §IX interdit de reconstruire
séparément : la page est assemblée à partir des MÊMES fichiers que le serveur
local sert. Il n'y a donc jamais deux interfaces à maintenir — corriger web/
corrige les deux.

LECTURE SEULE, ET POUR DE BON
-----------------------------
Trois verrous, pas un seul :
  1. `fetch` est remplacé par une doublure qui sert les données figées et
     refuse toute écriture ;
  2. les commandes d'édition — création, suppression — sont masquées ;
  3. les champs de fiche sont désactivés à l'ouverture.
Un seul de ces verrous suffirait à empêcher une modification d'être ENVOYÉE ;
les trois ensemble empêchent aussi de croire qu'on a modifié quelque chose.

CE QUI N'ENTRE PAS DANS LA PAGE
-------------------------------
Les mêmes choses que le dépôt refuse : aucune adresse d'abonné, aucun texte
intégral, aucune image. La page ne porte que des métadonnées — celles que
data/ contient déjà et qui sont destinées à devenir publiques.
"""

import json
import os
import re
import sys
from datetime import date

ICI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ICI, "web")
DATA = os.path.join(ICI, "data")

TYPES = ["oeuvre", "concept", "personnage", "document", "ia",
         "outil", "projet", "canal", "institution"]

CSS = ["style.css", "dossier.css", "os.css"]
JS = ["reseau.js", "dossier.js", "os.js", "app.js"]


def lire(dossier, nom):
    with open(os.path.join(dossier, nom), encoding="utf-8") as f:
        return f.read()


def lire_json(nom, defaut):
    chemin = os.path.join(DATA, nom)
    if not os.path.exists(chemin):
        return defaut
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def corps_de_index():
    """Le contenu du <body> d'index.html, sans les balises <script>.

    On découpe plutôt qu'on ne reconstruit : la page publiée doit rester le
    reflet exact de l'interface locale, pas une variante qui divergera."""
    html = lire(WEB, "index.html")
    debut = html.index(">", html.index("<body")) + 1
    fin = html.index("<script")
    return html[debut:fin].strip()


def themes(css):
    """Ajoute la prise en charge du thème choisi explicitement par le lecteur.

    En local, le navigateur n'a qu'une préférence système et `prefers-color-
    scheme` suffit. Sur une page publiée, le lecteur peut forcer clair ou
    sombre : il faut alors que son choix l'emporte dans les DEUX sens. On
    garde donc la règle système — mais on la neutralise si « clair » a été
    demandé — et on rejoue les mêmes jetons pour « sombre » demandé."""
    m = re.search(r"@media \(prefers-color-scheme: dark\) \{\s*:root \{(.*?)\n  \}\n\}",
                  css, re.S)
    if not m:
        return css
    jetons = m.group(1)
    css = css.replace("@media (prefers-color-scheme: dark) {\n  :root {",
                      "@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {")
    return css + (
        "\n\n/* Choix explicite du lecteur : doit l'emporter sur la préférence système. */\n"
        ":root[data-theme=\"dark\"] {" + jetons + "\n}\n")


VERROUS = """
/* ---------- Lecture seule : ce qui écrit disparaît ----------------------- */
#btn-nouveau,
#panneau .btn.danger,
#panneau .nv-relation,
#panneau .supprimer-relation { display: none !important; }

#panneau input, #panneau textarea, #panneau select {
  background: var(--paper-2);
  color: var(--ink-soft);
  cursor: default;
}

.os-copie {
  border-left: 3px solid var(--accent);
  background: var(--accent-bg);
  padding: 0.55rem 0.9rem;
  margin: 0 0 1.4rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  line-height: 1.7;
  color: var(--ink-soft);
}
.os-copie strong { color: var(--ink); }
"""

DOUBLURE = """
/* =============================================================================
   Doublure de serveur — la page est autonome et ne parle à personne.

   L'interface a été écrite pour un serveur local : elle appelle /api/tout au
   démarrage et /api/enregistrer à chaque modification. Plutôt que d'en écrire
   une seconde version sans réseau — qui divergerait — on remplace `fetch`.
   L'interface ne sait pas qu'elle est figée ; elle se comporte normalement.
   ========================================================================== */
(function () {
  // Sans balise viewport, un téléphone simule un écran de 980 px puis réduit :
  // le texte devient énorme et les media queries ne se déclenchent jamais.
  // La page ne peut pas écrire dans le <head> — le format d'hébergement le
  // fournit — donc on l'ajoute ici, avant que la mise en page n'ait lieu.
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement("meta");
    m.name = "viewport";
    m.content = "width=device-width, initial-scale=1";
    document.head.appendChild(m);
  }

  const FIGE = window.__MPOS__;
  window.fetch = function (url) {
    const u = String(url);
    if (u.indexOf("/api/tout") !== -1) {
      return Promise.resolve({ json: () => Promise.resolve(FIGE) });
    }
    if (u.indexOf("/api/enregistrer") !== -1) {
      // Refus explicite plutôt que faux succès : mentir sur un enregistrement
      // ferait croire à une modification conservée, et c'est la seule erreur
      // vraiment coûteuse ici.
      return Promise.resolve({ json: () => Promise.resolve({
        erreur: "copie en lecture seule — rien n'est enregistré" }) });
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  };
})();
"""

APRES = """
/* ---------- Après le démarrage : figer ce qui reste ---------------------- */
(function () {
  const banniere = document.createElement("p");
  banniere.className = "os-copie";
  banniere.innerHTML = "<strong>Copie en lecture seule</strong> — instantané du "
    + window.__MPOS_DATE__ + ". Les fiches s'ouvrent et se parcourent, "
    + "mais rien ne s'enregistre. La version qui s'édite tourne en local : "
    + "<code>python3 serveur.py</code>.";
  const accueil = document.querySelector("#vue-etat");
  if (accueil) accueil.insertBefore(banniere, accueil.firstChild);

  // Les champs sont désactivés à chaque ouverture de fiche : le panneau est
  // reconstruit à chaque fois, donc un simple passage au démarrage ne suffit
  // pas. On observe le panneau plutôt que d'aller modifier app.js.
  const panneau = document.querySelector("#panneau");
  if (panneau && window.MutationObserver) {
    new MutationObserver(function () {
      panneau.querySelectorAll("input, textarea, select").forEach(function (c) {
        c.readOnly = true;
        if (c.tagName === "SELECT") c.disabled = true;
      });
    }).observe(panneau, { childList: true });
  }
})();
"""


def main():
    sortie = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "mentis-prime-os.html")

    fige = {
        "schema": lire_json("schema.json", {}),
        "elements": {t: lire_json(f"{t}.json", []) for t in TYPES},
        "relations": lire_json("relations.json", []),
        "media": lire_json("media.json", []),
        "handoffs": lire_json("handoff.json", []),
        "registre": lire_json("_registre.json", []),
    }

    css = "\n".join(themes(lire(WEB, f)) if f == "style.css" else lire(WEB, f)
                    for f in CSS) + VERROUS
    js = "\n".join(lire(WEB, f) for f in JS)

    # </script> à l'intérieur d'une chaîne JSON fermerait la balise : on le
    # neutralise. Aucune donnée ne contient ce motif aujourd'hui, mais un titre
    # d'article peut contenir n'importe quoi demain.
    donnees = json.dumps(fige, ensure_ascii=False, separators=(",", ":")) \
                  .replace("</", "<\\/")

    page = (
        "<title>Mentis Prime OS</title>\n"
        f"<style>\n{css}\n</style>\n\n"
        f"{corps_de_index()}\n\n"
        "<script>\n"
        f"window.__MPOS__ = {donnees};\n"
        f"window.__MPOS_DATE__ = {json.dumps(date.today().strftime('%d/%m/%Y'))};\n"
        f"{DOUBLURE}\n</script>\n"
        f"<script>\n{js}\n{APRES}\n</script>\n"
    )

    with open(sortie, "w", encoding="utf-8") as f:
        f.write(page)

    n = sum(len(v) for v in fige["elements"].values())
    print(f"  {os.path.basename(sortie)} — {len(page)/1e6:.2f} Mo")
    print(f"  {n} éléments · {len(fige['relations'])} relations · "
          f"{len(CSS)} feuilles de style · {len(JS)} scripts")
    print(f"  s'ouvre d'un double-clic, sans Python ni serveur")


if __name__ == "__main__":
    main()
