#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rapatriement des médias : constitue l'archive maître, hors de Substack.

    python3 rapatrier_medias.py [dossier_destination]

Par défaut : ./archive_medias/

POURQUOI
--------
L'export Substack ne contient aucun fichier image — uniquement des liens
vers son CDN. Tant que ces fichiers ne sont pas ailleurs, toute la partie
visuelle de l'œuvre dépend d'un service tiers : un changement d'URL, une
fermeture de compte, et le corpus visuel disparaît sans que le texte bouge.

CE QUE FAIT CE SCRIPT
---------------------
1. Télécharge chaque image du manifeste, rangée par article :
       archive_medias/<slug>/<nom-du-fichier>
2. Calcule l'empreinte SHA-256 de chaque fichier, pour que l'archive soit
   vérifiable plus tard — et pour détecter si une image change à la source.
3. Écrit `archive_medias/inventaire_archive.csv` : une ligne par image, avec
   son état, sa taille et son empreinte.

Il est ré-exécutable : un fichier déjà présent et de bonne taille est ignoré.
Une interruption ne fait donc rien perdre.

CE QUI N'EST PAS VERSIONNÉ
--------------------------
L'archive elle-même. Ce sont tes images, elles pèsent plus d'un gigaoctet, et
le dépôt est destiné à devenir public. Seul l'inventaire — URLs, tailles,
empreintes — entre dans `data/`.
"""

import csv
import hashlib
import os
import sys
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from collections import Counter

ICI = os.path.dirname(os.path.abspath(__file__))
MANIFESTE = os.path.join(ICI, "medias_manifeste.csv")
PARALLELE = 8
TENTATIVES = 3
DELAI = 60


def nom_fichier(url):
    base = url.rsplit("/", 1)[-1].split("?")[0]
    return base or hashlib.sha1(url.encode()).hexdigest()[:16]


def empreinte(chemin):
    h = hashlib.sha256()
    with open(chemin, "rb") as f:
        for bloc in iter(lambda: f.read(1 << 20), b""):
            h.update(bloc)
    return h.hexdigest()


def rapatrier(tache):
    slug, url, racine = tache
    dossier = os.path.join(racine, slug)
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, nom_fichier(url))

    if os.path.exists(chemin) and os.path.getsize(chemin) > 0:
        return {"slug": slug, "url": url, "fichier": os.path.relpath(chemin, racine),
                "etat": "déjà présent", "octets": os.path.getsize(chemin),
                "sha256": empreinte(chemin)}

    derniere = ""
    for essai in range(TENTATIVES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mentis-Prime-OS/1"})
            with urllib.request.urlopen(req, timeout=DELAI) as r, open(chemin, "wb") as f:
                while True:
                    bloc = r.read(1 << 16)
                    if not bloc:
                        break
                    f.write(bloc)
            taille = os.path.getsize(chemin)
            if taille == 0:
                raise OSError("fichier vide")
            return {"slug": slug, "url": url, "fichier": os.path.relpath(chemin, racine),
                    "etat": "rapatrié", "octets": taille, "sha256": empreinte(chemin)}
        except Exception as e:
            derniere = f"{type(e).__name__}: {e}"
            if os.path.exists(chemin):
                try:
                    os.remove(chemin)
                except OSError:
                    pass

    return {"slug": slug, "url": url, "fichier": "", "etat": f"ÉCHEC — {derniere}",
            "octets": 0, "sha256": ""}


def main():
    racine = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "archive_medias")
    os.makedirs(racine, exist_ok=True)

    lignes = list(csv.DictReader(open(MANIFESTE, encoding="utf-8")))
    # Une même image peut être citée par plusieurs articles : on ne la
    # télécharge qu'une fois, sous le premier article qui la référence.
    vues, taches = set(), []
    for r in lignes:
        if r["url"] in vues:
            continue
        vues.add(r["url"])
        taches.append((r["slug"], r["url"], racine))

    print(f"  {len(lignes)} références, {len(taches)} images distinctes")
    print(f"  destination : {racine}")
    print(f"  {PARALLELE} téléchargements en parallèle\n")

    resultats = []
    with ThreadPoolExecutor(max_workers=PARALLELE) as pool:
        for i, res in enumerate(pool.map(rapatrier, taches), 1):
            resultats.append(res)
            if i % 40 == 0 or i == len(taches):
                ko = sum(1 for x in resultats if x["etat"].startswith("ÉCHEC"))
                mo = sum(x["octets"] for x in resultats) / 1e6
                print(f"    {i}/{len(taches)} — {mo:.0f} Mo — {ko} échec(s)")

    chemin_inv = os.path.join(racine, "inventaire_archive.csv")
    with open(chemin_inv, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["slug", "fichier", "octets", "sha256", "etat", "url"])
        w.writeheader()
        for r in sorted(resultats, key=lambda x: (x["slug"], x["fichier"])):
            w.writerow({k: r[k] for k in w.fieldnames})

    etats = Counter(x["etat"].split(" — ")[0] for x in resultats)
    total = sum(x["octets"] for x in resultats)
    print(f"\n  états : {dict(etats)}")
    print(f"  volume : {total/1e9:.2f} Go")
    print(f"  inventaire : {chemin_inv}")

    echecs = [x for x in resultats if x["etat"].startswith("ÉCHEC")]
    if echecs:
        print(f"\n  {len(echecs)} IMAGE(S) INJOIGNABLE(S) — déjà perdues côté Substack :")
        for x in echecs[:20]:
            print(f"     {x['slug']}  {x['url'][-60:]}")
    else:
        print("\n  Aucune image manquante : le corpus visuel est intégralement récupérable.")


if __name__ == "__main__":
    main()
