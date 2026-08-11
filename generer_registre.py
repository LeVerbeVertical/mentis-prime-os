#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère le Corpus Registry : l'index intelligent des 100 objets Substack.

    python3 generer_registre.py

Produit `corpus_registry.csv`, prêt à importer dans Airtable.

Principe : l'index, pas le texte. Chaque ligne décrit un objet du corpus et
pointe vers lui. Le texte intégral reste dans les fichiers sources et sur
Drive — Airtable n'a pas vocation à héberger 280 000 mots.

Les colonnes laissées vides sont celles qu'aucune source ne peut remplir
automatiquement : elles relèvent d'une décision humaine.
"""

import csv, json, os
from collections import defaultdict

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")

def lire(n): return json.load(open(os.path.join(DATA, n), encoding="utf-8"))

oeuvres   = lire("oeuvre.json")
concepts  = {c["id"]: c for c in lire("concept.json")}
personnes = {p["id"]: p for p in lire("personnage.json")}
relations = lire("relations.json")
par_id    = {o["id"]: o for o in oeuvres}

# Médias par slug, depuis le manifeste.
medias = defaultdict(list)
mf = os.path.join(ICI, "medias_manifeste.csv")
if os.path.exists(mf):
    for r in csv.DictReader(open(mf, encoding="utf-8")):
        medias[r["slug"]].append(r["url"])

sortantes = defaultdict(list); entrantes = defaultdict(list)
for r in relations:
    sortantes[r["de"]].append(r); entrantes[r["vers"]].append(r)

COLS = ["ID Substack", "Titre", "Sous-titre", "Date publication",
        "Statut publication", "Audience", "Section", "Concepts",
        "Personnages", "Niveau canonique", "URL", "Archive maître",
        "Médias", "Relations", "Mots", "Liens sortants", "Envois",
        "Ouvertures", "Provenance des métadonnées"]

lignes = []
for o in oeuvres:
    if o.get("genre") == "série" or "/p/" not in o.get("url", ""):
        continue
    slug = o["url"].rsplit("/p/", 1)[-1]

    sect = next((par_id[r["vers"]]["titre"] for r in sortantes[o["id"]]
                 if r["verbe"] == "partie_de" and r["vers"] in par_id), "")
    cs = [concepts[r["vers"]]["titre"] for r in sortantes[o["id"]]
          if r["verbe"] == "traite_de" and r["vers"] in concepts]
    ps = [personnes[r["de"]]["titre"] for r in entrantes[o["id"]]
          if r["verbe"] == "apparait_dans" and r["de"] in personnes]

    lignes.append({
        "ID Substack": slug,
        "Titre": o["titre"],
        "Sous-titre": o.get("sous_titre", ""),
        "Date publication": o.get("date_publication", ""),
        "Statut publication": o["statut"],
        "Audience": o.get("audience", ""),
        "Section": sect,
        "Concepts": " · ".join(sorted(cs)),
        "Personnages": " · ".join(sorted(ps)),
        "Niveau canonique": "",          # décision humaine
        "URL": o["url"],
        "Archive maître": "",            # chemin Drive, à remplir
        "Médias": len(medias.get(slug, [])),
        "Relations": len(sortantes[o["id"]]) + len(entrantes[o["id"]]),
        "Mots": o.get("mots", ""),
        "Liens sortants": o.get("liens_sortants", ""),
        "Envois": o.get("envois", ""),
        "Ouvertures": o.get("ouvertures", ""),
        "Provenance des métadonnées": "Export Substack 10/08/2026",
    })

lignes.sort(key=lambda r: (r["Date publication"] or "9999", r["Titre"]))
chemin = os.path.join(ICI, "corpus_registry.csv")
with open(chemin, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(lignes)

pub = sum(1 for r in lignes if r["Statut publication"] == "publié")
print(f"  {len(lignes)} objets — {pub} publiés, {len(lignes)-pub} brouillons")
print(f"  avec concepts   : {sum(1 for r in lignes if r['Concepts'])}")
print(f"  avec médias     : {sum(1 for r in lignes if r['Médias'])}")
print(f"  avec statistiques : {sum(1 for r in lignes if r['Envois'])}")
print(f"  colonnes à remplir à la main : Niveau canonique, Archive maître")
print(f"\n  écrit : {chemin}")
