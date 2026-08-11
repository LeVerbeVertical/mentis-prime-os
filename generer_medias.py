#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prépare l'écran Médias : agrège l'archive maître en data/media.json.

    python3 generer_medias.py

POURQUOI CE FICHIER
-------------------
`archive_medias/inventaire_archive.csv` fait 700 lignes et vit à côté d'une
archive de 879 Mo qui n'est pas versionnée. L'interface, elle, doit pouvoir
afficher l'état du corpus visuel sur une machine où l'archive n'a pas encore
été copiée. On en tire donc un résumé léger, versionné, qui dit ce qui existe
et où — sans transporter un seul octet d'image.

CE QUI EST CONSERVÉ
-------------------
Par article : le nombre d'images, le volume, et pour chaque fichier son nom,
sa taille, son empreinte SHA-256 complète et son état. L'empreinte n'est pas
tronquée : c'est elle qui permettra plus tard de vérifier qu'une image n'a pas
changé, et une empreinte tronquée ne prouve plus rien.

LES LIENS PHYSIQUES
-------------------
Une image citée par plusieurs articles n'est téléchargée qu'une fois ; les
autres dossiers la reçoivent par lien physique. Le résumé distingue donc les
fichiers propres à un article de ceux qu'il partage avec d'autres, pour que
« 702 fichiers » et « 482 images distinctes » ne se contredisent pas.
"""

import csv
import json
import os
from collections import defaultdict
from datetime import date

ICI = os.path.dirname(os.path.abspath(__file__))
INVENTAIRE = os.path.join(ICI, "inventaire_archive.csv")
OEUVRES = os.path.join(ICI, "data", "oeuvre.json")
SORTIE = os.path.join(ICI, "data", "media.json")


def slug_de(oeuvre):
    url = (oeuvre.get("url") or "").rstrip("/")
    return url.rsplit("/", 1)[-1] if "/p/" in url else ""


def main():
    lignes = list(csv.DictReader(open(INVENTAIRE, encoding="utf-8")))

    titres = {}
    for o in json.load(open(OEUVRES, encoding="utf-8")):
        s = slug_de(o)
        if s:
            titres[s] = {"titre": o.get("titre", s), "id": o["id"],
                         "statut": o.get("statut", ""), "url": o.get("url", "")}

    # Une empreinte vue sous plusieurs slugs = une image réutilisée. On compte
    # les images distinctes par leur empreinte, pas par leur nom de fichier :
    # deux articles peuvent nommer différemment le même octet.
    porteurs = defaultdict(set)
    for r in lignes:
        if r["sha256"]:
            porteurs[r["sha256"]].add(r["slug"])

    par_slug = defaultdict(list)
    for r in lignes:
        par_slug[r["slug"]].append(r)

    articles = []
    for slug in sorted(par_slug):
        fichiers = par_slug[slug]
        meta = titres.get(slug, {})
        octets = sum(int(f["octets"] or 0) for f in fichiers)
        partages = sum(1 for f in fichiers if len(porteurs.get(f["sha256"], ())) > 1)
        articles.append({
            "slug": slug,
            "titre": meta.get("titre", slug),
            "oeuvre": meta.get("id", ""),
            "statut": meta.get("statut", ""),
            "url": meta.get("url", ""),
            "fichiers": len(fichiers),
            "partages": partages,
            "octets": octets,
            "images": [{
                "nom": os.path.basename(f["fichier"]),
                "chemin": f["fichier"],
                "octets": int(f["octets"] or 0),
                "sha256": f["sha256"],
                "etat": f["etat"],
                "source": f["url"],
                "partagee": len(porteurs.get(f["sha256"], ())) > 1,
            } for f in sorted(fichiers, key=lambda x: x["fichier"])],
        })

    # Trois volumes différents, et les confondre donne trois fois un faux
    # chiffre. Ils se distinguent par l'unité qu'on dédoublonne :
    #
    #   cumul apparent  additionne chaque ligne          → 1,46 Go, faux : les
    #                                                      réutilisations sont
    #                                                      des liens physiques
    #                                                      et ne pèsent rien
    #   sur le disque   une fois par URL téléchargée     → ce que `du` mesure
    #   contenu unique  une fois par empreinte SHA-256   → ce qui resterait si
    #                                                      l'on dédoublonnait
    #                                                      aussi par contenu
    #
    # L'écart entre les deux derniers n'est pas une erreur : 46 images sont
    # identiques au bit près tout en étant servies par deux URLs Substack
    # distinctes. Elles ont donc été téléchargées deux fois. C'est un gisement
    # de dédoublonnage, pas un défaut de l'archive.
    taille_par_url, taille_par_empreinte = {}, {}
    for r in lignes:
        if r["sha256"]:
            taille_par_url[r["url"]] = int(r["octets"] or 0)
            taille_par_empreinte[r["sha256"]] = int(r["octets"] or 0)
    octets_disque = sum(taille_par_url.values())
    octets_uniques = sum(taille_par_empreinte.values())

    echecs = [f for f in lignes if f["etat"].startswith("ÉCHEC")]
    resume = {
        "genere": date.today().isoformat(),
        "source": "inventaire_archive.csv — produit par rapatrier_medias.py",
        "racine": "archive_medias/",
        "note": ("L'archive elle-même n'est pas versionnée : 879 Mo d'images, et le dépôt "
                 "est destiné à devenir public. Ce fichier en est le catalogue vérifiable."),
        "total": {
            "articles": len(articles),
            "fichiers": len(lignes),
            "distinctes": len(porteurs),
            "urls": len(taille_par_url),
            "octets": octets_disque,
            "octets_uniques": octets_uniques,
            "octets_cumules": sum(a["octets"] for a in articles),
            "echecs": len(echecs),
        },
        "articles": articles,
    }

    json.dump(resume, open(SORTIE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    t = resume["total"]
    print(f"  {t['articles']} articles · {t['fichiers']} fichiers rangés · "
          f"{t['urls']} fichiers sur le disque · {t['distinctes']} images distinctes par contenu")
    print(f"  disque {t['octets']/1e6:.0f} Mo · contenu unique {t['octets_uniques']/1e6:.0f} Mo · "
          f"cumul apparent {t['octets_cumules']/1e6:.0f} Mo · {t['echecs']} échec(s)")
    print(f"  écrit : {SORTIE}")
    sans_titre = [a["slug"] for a in articles if not a["oeuvre"]]
    if sans_titre:
        print(f"  {len(sans_titre)} dossier(s) sans œuvre correspondante : {', '.join(sans_titre[:6])}")


if __name__ == "__main__":
    main()
