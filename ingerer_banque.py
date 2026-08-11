#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ingestion de la banque de liens du Verbe Vertical.

ATTENTION SUR LA PROVENANCE — à lire avant de faire confiance aux titres.

Le Substack est inaccessible depuis cet environnement (bloqué par le proxy
réseau). Aucun titre n'a donc été LU : les titres sont DÉDUITS des slugs
d'URL, sauf ceux déjà connus par le document institutionnel.

Ce qui est certain    : les URLs, et le rattachement à une section.
Ce qui est à vérifier : les titres déduits, marqués `titre_deduit: true`.

Les sections viennent du regroupement fourni par Hamza le 11/08/2026.
"""

import json
import os
import re
from datetime import date

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")
AJ = date.today().isoformat()
BASE = "https://leverbevertical.substack.com"

# =============================================================================
# LA BANQUE — telle que fournie, groupée par section
# =============================================================================

SECTIONS = [
    ("section.collaborations", "Collaborations", "s/collaborations", [
        "le-liminal", "techno-sapiens-iii", "luvre", "lalterite", "la-grille",
    ]),
    ("section.mythopoiese", "Mythopoïèse thérapeutique & récits",
     "s/mythopoiese-therapeutique-and-recits", [
        "jecris-pour-survivre", "du-moi-incarne-au-soi-solaire-le",
        "le-silence-habite", "la-subsistance-alignee",
        "individuation-epicotherapeutique", "projection",
        "larchitecte-de-verite", "axiome-la-transfiguration", "le-sphinx",
        "larchitecte-du-lien", "lil-drone",
    ]),
    ("section.individuation", "Individuation & Épicothérapie",
     "s/individuation-and-epicotherapie", [
        "je-je-je", "au-dela", "pronoia", "sale-arabe", "parasocial",
        "neurodivergence", "passion", "la-crise-existentielle",
        "lenfant-interieur", "le-heros-interieur", "le-sage-interieur",
        "le-juge-interieur", "le-demon-interieur", "lenfant-transcende",
        "epicotherapie", "les-8-valeurs-fondamentales-epiques",
        "individuation-le-seuil",
    ]),
    ("section.theories", "Théories & Laboratoire conceptuel", "s/theories", [
        "du-moralisateur-au-psychologisateur",
        "intuition-numineuse-theorie-a-mettre", "dev-perso-and-new-age",
        "techno-sapiens-ii", "techno-sapiens-i",
        "passeurs-de-lumiere-soufisme-taoisme", "danse-generation",
        "1982-depuis-la-honte-de-gijon", "versus", "adn",
        "le-syndrome-de-david-contre-goliath", "constante-narrative",
        "bestiaire-conceptuel", "ia-verticale-vers-une-super-intelligence",
        "le-chromato-symbolique-vs-le-semanto",
        "letrejectif-langle-mort-de-lesprit",
        "code-qtlx-vers-la-technologie-du",
        "letrejectif-la-rigueur-epistemique",
        "le-combat-interieur-friction-feconde",
        "le-metacadre-comment-neutraliser",
    ]),
    ("section.historique", "Analyses historiques & archétypales",
     "s/analyses-historiques-and-archetypales", [
        "scientia", "salus", "benevolentia", "ambitio", "innovatio",
        "resilientia", "quilibrium", "sapientia", "lhumain",
        "la-crise-existentielle-individuelle",
        "lenfance-interieure-face-a-labandon",
        "le-heroisme-interieur-face-a-la-precarite",
        "la-sagesse-interieure-face-au-reste",
        "la-justice-interieure-face-aux-engagements",
        "la-demonie-interieure-face-a-la-r",
        "lenfance-transcendee-dans-leducation",
    ]),
    ("section.manifestes", "Manifestes philosophiques & institutionnels",
     "s/manifestes-philosophiques-institutionnels", [
        "lhymne-du-verbe-vertical", "les-epistemies-de-soi",
        "univers-mentis-prime-le-socle-axial",
        "les-8-causes-humanitaires-une-porte",
    ]),
]

# Slugs correspondant à une œuvre DÉJÀ inventoriée : on complète son URL
# au lieu de créer un doublon.
DEJA = {
    "la-crise-existentielle": "oeuvre.crise-existentielle",
    "lenfant-interieur": "oeuvre.enfant-interieur",
    "le-heros-interieur": "oeuvre.heros-interieur",
    "le-sage-interieur": "oeuvre.sage-interieur",
    "le-juge-interieur": "oeuvre.juge-interieur",
    "le-demon-interieur": "oeuvre.demon-interieur",
    "lenfant-transcende": "oeuvre.enfant-transcende",
    "epicotherapie": "oeuvre.epicotherapie",
    "ia-verticale-vers-une-super-intelligence": "oeuvre.ia-verticale",
    "le-chromato-symbolique-vs-le-semanto": "oeuvre.chromato-semanto",
    "code-qtlx-vers-la-technologie-du": "oeuvre.qtlx",
    "les-8-valeurs-fondamentales-epiques": "oeuvre.8-valeurs",
    "letrejectif-langle-mort-de-lesprit": "oeuvre.beingjectif",
    "les-8-causes-humanitaires-une-porte": "oeuvre.8-causes",
    "jecris-pour-survivre": "oeuvre.ecrire-survivre",
    "individuation-le-seuil": "oeuvre.individuation-seuil",
    "univers-mentis-prime-le-socle-axial": "oeuvre.fondation-institutionnelle",
}

# Titres tenus pour sûrs : ils apparaissent dans le document institutionnel,
# dans Techno Sapiens I, ou dans la maquette du Réseau Axial.
TITRES_SURS = {
    "le-liminal": "Le Liminal",
    "lalterite": "L'Altérité",
    "la-grille": "La Grille",
    "luvre": "L'Œuvre",
    "techno-sapiens-i": "Techno Sapiens I — La Matrice Verticale",
    "techno-sapiens-ii": "Techno Sapiens II — Homo Axialis / Homo Socialis",
    "techno-sapiens-iii": "Techno Sapiens III — Civilisation intérieure",
    "les-epistemies-de-soi": "Les Épistémies de Soi",
    "parasocial": "Parasocial",
    "lil-drone": "L'Œil-Drone",
    "larchitecte-du-lien": "L'Architecte du Lien",
    "le-metacadre-comment-neutraliser": "Le Métacadre",
    "constante-narrative": "Constante Narrative",
    "danse-generation": "Danse Génération",
    "passeurs-de-lumiere-soufisme-taoisme": "Passeurs de Lumière — soufisme & taoïsme",
    "lhymne-du-verbe-vertical": "L'Hymne du Verbe Vertical",
    "neurodivergence": "Neurodivergence",
    "projection": "Projection",
    "le-sphinx": "Le Sphinx",
    "versus": "Versus",
    "adn": "ADN",
    "bestiaire-conceptuel": "Bestiaire conceptuel",
}

# Les 8 valeurs épiques, en latin : ce sont les titres eux-mêmes.
LATIN = {"scientia": "Scientia", "salus": "Salus", "benevolentia": "Benevolentia",
         "ambitio": "Ambitio", "innovatio": "Innovatio", "resilientia": "Resilientia",
         "quilibrium": "Æquilibrium", "sapientia": "Sapientia"}

# Concepts du noyau déclenchés par des mots du slug.
INDICES = {
    "concept.individuation": ["individuation", "enfant", "heros", "sage", "juge",
                              "demon", "transcende", "crise", "epicotherapie", "seuil"],
    "concept.noetique": ["noetique", "intuition", "numineuse", "silence", "liminal",
                         "etrejectif", "letrejectif"],
    "concept.axe": ["axial", "axiome", "verbe-vertical", "metacadre", "grille",
                    "socle", "valeurs", "causes"],
    "concept.sens-info-performance": ["chromato", "semanto", "qtlx", "ia-verticale",
                                      "techno-sapiens"],
    "concept.epicotherapie": ["epicotherapie", "epicotherapeutique"],
    "concept.qtlx": ["qtlx"],
    "concept.beingjectif": ["etrejectif", "letrejectif"],
}


ARTICLES = {"le", "la", "les", "au", "aux", "du", "des", "un", "une", "de", "et", "a"}


def joli(slug):
    """Titre déduit d'un slug. Approximatif par construction.

    L'élision ne s'applique qu'aux mots agglutinés du slug (« lenfant » ->
    « l'enfant ») et jamais aux articles eux-mêmes : « le-silence » doit
    rester « le silence », pas « l'e silence »."""
    if slug in TITRES_SURS:
        return TITRES_SURS[slug], False
    if slug in LATIN:
        return LATIN[slug], False
    mots = slug.replace("-and-", "-&-").split("-")
    out = []
    for m in mots:
        if m != "&" and m.lower() not in ARTICLES and len(m) > 2 \
           and m[0] in "ld" and m[1] in "aeiouyh":
            m = m[0] + "'" + m[1:]
        out.append(m)
    t = re.sub(r"(\w)' (\w)", r"\1'\2", " ".join(out))
    return t[:1].upper() + t[1:], True


def lire(n):
    return json.load(open(os.path.join(DATA, n), encoding="utf-8"))


def ecrire(n, c):
    with open(os.path.join(DATA, n), "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    oeuvres = lire("oeuvre.json")
    relations = lire("relations.json")
    par_id = {o["id"]: o for o in oeuvres}

    def add_rel(de, v, vers, note=""):
        if not any(r["de"] == de and r["verbe"] == v and r["vers"] == vers for r in relations):
            relations.append({"de": de, "verbe": v, "vers": vers, "note": note})

    nouveaux = deduits = completes = 0

    for sid, snom, sslug, slugs in SECTIONS:
        # La section elle-même, comme œuvre de genre « série ».
        if sid not in par_id:
            s = {"id": sid, "type": "oeuvre", "titre": snom, "statut": "publié",
                 "maj": AJ, "note": "Section Substack. Regroupement fourni par Hamza le 11/08/2026.",
                 "genre": "série", "famille": snom, "langue": "fr", "version": "",
                 "url": f"{BASE}/{sslug}"}
            oeuvres.append(s); par_id[sid] = s; nouveaux += 1
        add_rel(sid, "partie_de", "univers.mentis-prime")
        add_rel(sid, "publie_sur", "canal.substack")

        for slug in slugs:
            url = f"{BASE}/p/{slug}"

            if slug in DEJA and DEJA[slug] in par_id:
                # Œuvre déjà connue : on complète son URL et sa famille.
                o = par_id[DEJA[slug]]
                if not o.get("url"):
                    o["url"] = url; o["maj"] = AJ; completes += 1
                o["famille"] = snom
                oid = o["id"]
            else:
                oid = "oeuvre." + slug
                if oid not in par_id:
                    titre, dev = joli(slug)
                    if dev:
                        deduits += 1
                    o = {"id": oid, "type": "oeuvre", "titre": titre,
                         "statut": "publié", "maj": AJ,
                         "note": ("Titre déduit du slug d'URL — le Substack n'est pas "
                                  "accessible depuis l'environnement. À vérifier."
                                  if dev else "Titre confirmé par une source lue."),
                         "genre": "article", "famille": snom, "langue": "fr",
                         "version": "", "url": url, "titre_deduit": dev}
                    oeuvres.append(o); par_id[oid] = o; nouveaux += 1

            add_rel(oid, "partie_de", sid)
            add_rel(oid, "publie_sur", "canal.substack")
            add_rel(oid, "stocke_dans", "outil.substack")

            for cid, mots in INDICES.items():
                if any(m in slug for m in mots):
                    add_rel(oid, "traite_de", cid, "Rattachement déduit du slug.")

    ecrire("oeuvre.json", oeuvres)
    ecrire("relations.json", relations)

    print(f"  œuvres créées      : {nouveaux}  (dont {deduits} au titre déduit)")
    print(f"  URLs complétées    : {completes}")
    print(f"  total œuvres       : {len(oeuvres)}")
    print(f"  total relations    : {len(relations)}")


if __name__ == "__main__":
    main()
