#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyse volumétrique et extraction du manifeste des médias.

    python3 analyser_corpus.py /chemin/vers/export_substack

Ce script LIT l'export et n'en copie aucun texte. Il produit deux choses :

1. Des mesures par article — mots, images référencées, liens, ouvertures,
   envois — ajoutées aux fiches de `data/oeuvre.json`.

2. `medias_manifeste.csv` — la liste des URLs d'images référencées par les
   articles. L'export Substack ne contient AUCUN fichier image : il ne garde
   que des liens vers le CDN de Substack. Tant que ces fichiers ne sont pas
   sauvegardés ailleurs, la partie visuelle de l'œuvre dépend entièrement
   d'un service tiers. Ce manifeste est ce qu'il faut pour les rapatrier.

Le manifeste ne contient que des URLs publiques, aucune donnée personnelle.
"""

import csv
import json
import os
import re
import sys
from collections import Counter
from html import unescape
from urllib.parse import unquote

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")

def source_reelle(u):
    """Une URL substackcdn encapsule l'URL S3 d'origine, encodée. On remonte
    à la source : sinon la même image est comptée deux fois, une fois en
    original et une fois en variante redimensionnée."""
    m = re.search(r"(https?%3A%2F%2F[^\s\"']+)", u)
    if m:
        return unquote(m.group(1))
    m = re.search(r"/(https?://.+)$", u)
    if m:
        return m.group(1)
    return u


BALISE = re.compile(r"<[^>]+>")
ESPACES = re.compile(r"\s+")
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
HREF = re.compile(r'<a[^>]+href=["\']([^"\']+)["\']', re.I)


def texte_de(html):
    t = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", html)
    return ESPACES.sub(" ", unescape(BALISE.sub(" ", t)))


def compter_lignes(chemin):
    """Nombre d'enregistrements d'un CSV de statistiques, en-tête exclu."""
    try:
        with open(chemin, encoding="utf-8", errors="ignore") as f:
            return max(0, sum(1 for _ in csv.reader(f)) - 1)
    except OSError:
        return 0


def main(racine):
    dossier = os.path.join(racine, "posts")
    if not os.path.isdir(dossier):
        sys.exit(f"dossier posts/ introuvable dans {racine}")

    oeuvres = json.load(open(os.path.join(DATA, "oeuvre.json"), encoding="utf-8"))
    par_slug = {o["url"].rsplit("/p/", 1)[-1]: o for o in oeuvres if "/p/" in o.get("url", "")}

    total = Counter()
    medias = []
    domaines = Counter()
    apparies = 0

    for fn in sorted(os.listdir(dossier)):
        if not fn.endswith(".html"):
            continue
        pid, reste = fn.split(".", 1)
        slug = reste[:-5]
        brut = open(os.path.join(dossier, fn), encoding="utf-8", errors="ignore").read()

        mots = len(texte_de(brut).split())
        # Seuls les <img src> sont retenus : ce sont les originaux S3.
        # Les srcset n'ajoutent que des variantes redimensionnées des mêmes
        # images, servies par le CDN — et on ne peut pas les découper
        # naïvement sur la virgule, car les paramètres de transformation du
        # CDN en contiennent (« $s_!X-sj!,f_auto,q_auto:good »). Une première
        # version le faisait et tronquait les URLs, gonflant le compte.
        imgs = list(dict.fromkeys(source_reelle(u) for u in IMG.findall(brut)))
        liens = HREF.findall(brut)

        total["fichiers"] += 1
        total["mots"] += mots
        total["images"] += len(imgs)
        total["liens"] += len(liens)

        # Les fichiers de statistiques sont nommés {pid}.opens.csv — sans le
        # slug, contrairement aux fichiers HTML. Une première version cherchait
        # {pid}.{slug}.opens.csv et ne trouvait donc jamais rien.
        ouvertures = compter_lignes(os.path.join(dossier, f"{pid}.opens.csv"))
        envois = compter_lignes(os.path.join(dossier, f"{pid}.delivers.csv"))
        if ouvertures:
            total["fichiers_opens"] += 1
        if envois:
            total["fichiers_delivers"] += 1

        for u in imgs:
            medias.append({"slug": slug, "post_id": pid, "url": u})
            m = re.match(r"https?://([^/]+)", u)
            if m:
                domaines[m.group(1)] += 1

        o = par_slug.get(slug)
        if o is not None:
            apparies += 1
            o["mots"] = mots
            o["images"] = len(imgs)
            o["liens_sortants"] = len(liens)
            if envois:
                o["envois"] = envois
            if ouvertures:
                o["ouvertures"] = ouvertures

    with open(os.path.join(DATA, "oeuvre.json"), "w", encoding="utf-8") as f:
        json.dump(oeuvres, f, ensure_ascii=False, indent=2)
        f.write("\n")

    chemin_manifeste = os.path.join(ICI, "medias_manifeste.csv")
    with open(chemin_manifeste, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["slug", "post_id", "url"])
        w.writeheader()
        w.writerows(medias)

    print(f"  fichiers analysés     : {total['fichiers']}")
    print(f"  appariés à une œuvre  : {apparies}")
    print(f"  mots (approximatif)   : {total['mots']:,}".replace(",", " "))
    print(f"  images distinctes     : {total['images']}  (sources dédoublonnées)")
    print(f"  liens dans les textes : {total['liens']}")
    print(f"  fichiers opens        : {total['fichiers_opens']}")
    print(f"  fichiers delivers     : {total['fichiers_delivers']}")
    print()
    print("  domaines des images :")
    for d, n in domaines.most_common(8):
        print(f"     {n:>4}  {d}")
    print()
    print(f"  manifeste écrit : {chemin_manifeste} ({len(medias)} lignes)")
    print("  AUCUN fichier image n'est présent dans l'export : ce sont des liens.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
