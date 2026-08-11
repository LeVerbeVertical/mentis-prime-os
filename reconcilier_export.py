#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Réconciliation de l'inventaire avec l'export Substack officiel.

    python3 reconcilier_export.py /chemin/vers/export_substack

CE QUI N'ENTRE JAMAIS DANS LE DÉPÔT
-----------------------------------
Ce script LIT l'export mais n'en copie rien. Deux fichiers sont
explicitement hors de portée du versionnement :

  email_list.leverbevertical.csv   adresses des abonnés — donnée personnelle
  posts/*.html                     le corpus intégral, dont 5 articles payants

Seules les métadonnées dérivées entrent dans data/ : titre, sous-titre,
date de publication, statut, audience, et les rattachements conceptuels
comptés dans le texte. Le texte lui-même reste chez toi.

CE QUE ÇA CORRIGE
-----------------
1. Les titres déduits des slugs sont remplacés par les titres réels.
2. Les dates de publication réelles remplacent l'absence de chronologie.
3. Les brouillons non publiés sont inventoriés comme tels.
4. Les rattachements `traite_de`, jusqu'ici devinés d'après le slug, sont
   recalculés en comptant les occurrences dans le texte de l'article.
"""

import csv
import json
import os
import re
import sys
import unicodedata
from html import unescape

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")
BASE = "https://leverbevertical.substack.com"

# Un concept n'est retenu que s'il est cité au moins ce nombre de fois :
# une mention isolée n'est pas un sujet.
SEUIL = 4

# Formulations écartées, et pourquoi — la première version de ce script
# rattachait 77 articles sur 103 à « L'Axe » :
#
#   « le verbe vertical »  signature présente dans le pied de page de CHAQUE
#                          article. C'est le nom de la publication, pas un sujet.
#   « axial »              trop souvent dans l'habillage et les liens.
#   « information », « performance », « transmission »
#                          mots ordinaires du français ; leur présence ne dit
#                          rien du sujet traité.
#
# Ne restent que des formulations propres au corpus, qu'on n'écrit pas
# par hasard.
TERMES = {
    "concept.axe":                  ["verticalité", "axe intérieur", "homme vertical"],
    "concept.individuation":        ["individuation"],
    "concept.noetique":             ["noétique", "noèse", "noétisme"],
    "concept.epicotherapie":        ["épicothérapie", "épicothérapeutique"],
    "concept.beingjectif":          ["êtrejectif", "étrejectif"],
    "concept.qtlx":                 ["qtlx"],
    "arch.crise":                   ["crise existentielle"],
    "arch.enfant":                  ["enfant intérieur"],
    "arch.heros":                   ["héros intérieur", "héroïsme intérieur"],
    "arch.sage":                    ["sage intérieur", "sagesse intérieure"],
    "arch.juge":                    ["juge intérieur", "justice intérieure"],
    "arch.demon":                   ["démon intérieur", "démonie intérieure"],
    "arch.transcende":              ["enfant transcendé", "enfance transcendée"],
    "axe.epistemique":              ["épistémique"],
    "axe.methodologique":           ["méthodologique"],
    "axe.anthropologique":          ["anthropologique"],
    "axe.transmissibilite":         ["transmissibilité"],
}


def sans_accents(t):
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn").lower()


BALISE = re.compile(r"<[^>]+>")
ESPACES = re.compile(r"\s+")


def texte_de(html):
    t = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", html)
    t = BALISE.sub(" ", t)
    return ESPACES.sub(" ", unescape(t))


def lire(n):
    return json.load(open(os.path.join(DATA, n), encoding="utf-8"))


def ecrire(n, c):
    with open(os.path.join(DATA, n), "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main(racine):
    chemin_csv = os.path.join(racine, "posts.csv")
    if not os.path.exists(chemin_csv):
        sys.exit(f"posts.csv introuvable dans {racine}")

    lignes = list(csv.DictReader(open(chemin_csv, encoding="utf-8")))
    for r in lignes:
        r["pid"], _, r["slug"] = r["post_id"].partition(".")

    oeuvres = lire("oeuvre.json")
    relations = lire("relations.json")
    par_slug = {o["url"].rsplit("/p/", 1)[-1]: o for o in oeuvres if "/p/" in o.get("url", "")}
    par_id = {o["id"]: o for o in oeuvres}

    # Section de rattachement par défaut pour les articles absents de la banque.
    SECTION_DEFAUT = "section.theories"

    def add_rel(de, v, vers, note=""):
        if not any(r["de"] == de and r["verbe"] == v and r["vers"] == vers for r in relations):
            relations.append({"de": de, "verbe": v, "vers": vers, "note": note})

    titres, dates, crees, brouillons = 0, 0, 0, 0

    for r in lignes:
        slug, publie = r["slug"], r["is_published"] == "true"
        if not slug:
            continue

        o = par_slug.get(slug)
        if o is None:
            oid = "oeuvre." + slug
            if oid in par_id:
                o = par_id[oid]
            else:
                o = {"id": oid, "type": "oeuvre", "titre": r["title"] or slug,
                     "statut": "publié" if publie else "brouillon",
                     "maj": r["post_date"][:10] or "", "note": "",
                     "genre": "article", "famille": "", "langue": "fr",
                     "version": "", "url": f"{BASE}/p/{slug}"}
                oeuvres.append(o); par_id[oid] = o; par_slug[slug] = o
                crees += 1
                add_rel(o["id"], "partie_de", SECTION_DEFAUT,
                        "Rattachement par défaut : absent de la banque de liens.")
                if publie:
                    add_rel(o["id"], "publie_sur", "canal.substack")
                    add_rel(o["id"], "stocke_dans", "outil.substack")

        # Titre réel : il remplace tout titre déduit.
        if r["title"] and o["titre"] != r["title"]:
            o["titre"] = r["title"]
            titres += 1
        o.pop("titre_deduit", None)

        if r["post_date"]:
            o["date_publication"] = r["post_date"][:10]
            dates += 1
        if r["subtitle"]:
            o["sous_titre"] = r["subtitle"]

        # ATTENTION — plusieurs post_id peuvent partager un même slug :
        # harmonis-mentis-prime en a trois (une newsletter publiée et deux
        # podcasts en brouillon). Écraser le statut à chaque ligne laissait
        # le dernier gagner, et un brouillon effaçait la publication réelle.
        # Une œuvre publiée le reste : le statut publié l'emporte toujours.
        deja_publie = o.get("statut") == "publié"
        if publie or not deja_publie:
            o["statut"] = "publié" if publie else "brouillon"
        if publie:
            o["audience"] = r["audience"]
        elif not o.get("audience"):
            o["audience"] = r["audience"]
        if not publie:
            brouillons += 1
        o["note"] = ("Titre, sous-titre et date confirmés par l'export Substack "
                     "du 10/08/2026." if publie else
                     "Brouillon non publié, relevé dans l'export Substack.")

    # ---- Rattachements conceptuels comptés dans le texte réel ----------------
    dossier_html = os.path.join(racine, "posts")
    # Purge de tout rattachement automatique antérieur : le comptage doit
    # pouvoir être relancé sans empiler les résultats de la version d'avant.
    anciennes = [r for r in relations
                 if r["verbe"] == "traite_de"
                 and ("déduit du slug" in (r.get("note") or "")
                      or "occurrences" in (r.get("note") or ""))]
    for a in anciennes:
        relations.remove(a)
    print(f"  {len(anciennes)} rattachements automatiques antérieurs purgés")

    liens, lus = 0, 0
    if os.path.isdir(dossier_html):
        for fn in sorted(os.listdir(dossier_html)):
            if not fn.endswith(".html"):
                continue
            slug = fn.split(".", 1)[1][:-5]
            o = par_slug.get(slug)
            if not o:
                continue
            corps = sans_accents(texte_de(open(os.path.join(dossier_html, fn),
                                               encoding="utf-8", errors="ignore").read()))
            lus += 1
            for cid, formes in TERMES.items():
                if cid not in par_id and not any(
                        e["id"] == cid for e in lire("concept.json")):
                    continue
                n = sum(corps.count(sans_accents(f)) for f in formes)
                if n >= SEUIL:
                    add_rel(o["id"], "traite_de", cid,
                            f"{n} occurrences dans le texte de l'article.")
                    liens += 1

    ecrire("oeuvre.json", oeuvres)
    ecrire("relations.json", relations)

    print(f"  titres réels appliqués   : {titres}")
    print(f"  dates de publication     : {dates}")
    print(f"  œuvres créées            : {crees}")
    print(f"  brouillons inventoriés   : {brouillons}")
    print(f"  articles lus             : {lus}")
    print(f"  rattachements comptés    : {liens}")
    print(f"  total œuvres             : {len(oeuvres)}")
    print(f"  total relations          : {len(relations)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
