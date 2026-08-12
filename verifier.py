#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Contrôle l'état du système. Reproductible, sans dépendance, sans réseau.

    python3 verifier.py

Sortie 0 si tout est cohérent, 1 sinon. Les avertissements ne font pas échouer :
ils signalent ce qui vieillit, pas ce qui est cassé.

POURQUOI
--------
Le MODE PILOTE autorise à agir sans demander. Cela ne tient que si l'on peut
dire, à tout moment et sans jugement humain, si l'état est cohérent. C'est ce
que fait ce script — avant une modification comme après.

Il réutilise `valider()` du serveur plutôt que de réimplémenter les règles :
deux jeux de règles finiraient par diverger, et le contrôle certifierait alors
un état que le serveur refuse.
"""

import csv
import json
import os
import sys
from datetime import date, datetime

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")
sys.path.insert(0, ICI)
from serveur import valider, TYPES          # noqa: E402  (après sys.path)

FRAICHEUR_JOURS = 7      # au-delà, la photo Airtable est signalée comme vieille


def lire(nom, defaut=None):
    chemin = os.path.join(DATA, nom)
    if not os.path.exists(chemin):
        return defaut
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def main():
    erreurs, avertis, notes = [], [], []

    # ---- 1. Le modèle et les données ---------------------------------------
    schema = lire("schema.json", {})
    elements = {t: lire(f"{t}.json", []) for t in TYPES}
    relations = lire("relations.json", [])
    if not schema:
        erreurs.append("schema.json est absent ou vide — rien n'est vérifiable")
        return rendre(erreurs, avertis, notes)

    erreurs += valider(schema, elements, relations)
    total = sum(len(v) for v in elements.values())
    notes.append(f"{total} éléments · {len(relations)} relations · "
                 f"{len(schema.get('types', {}))} types · "
                 f"{len(schema.get('verbes', {}))} verbes")

    # ---- 2. La règle de séquence -------------------------------------------
    # « Une seule étape structurante à la fois » n'est pas un principe décoratif :
    # c'est ce qui empêche la feuille de route de redevenir une liste de vœux.
    for p in elements.get("projet", []):
        plan = p.get("plan") or []
        en_cours = [e for e in plan if e.get("statut") == "en cours"]
        if len(en_cours) > 1:
            erreurs.append(f"{p['id']} : {len(en_cours)} étapes « en cours » — "
                           f"la règle en autorise une seule")
        ordres = [e.get("ordre") for e in plan]
        if len(set(ordres)) != len(ordres):
            erreurs.append(f"{p['id']} : deux étapes portent le même ordre")
        if plan and not en_cours and p.get("statut") == "actif":
            avertis.append(f"{p['id']} est actif mais aucune étape n'est en cours")

    actifs = [p for p in elements.get("projet", []) if p.get("statut") == "actif"]
    if len(actifs) > 1:
        avertis.append(f"{len(actifs)} chantiers actifs en parallèle — "
                       f"le MODE PILOTE en veut un seul")
    notes.append(f"{len(elements.get('projet', []))} chantiers, "
                 f"{sum(len(p.get('plan') or []) for p in elements.get('projet', []))} étapes")

    # ---- 3. Le lien avec le registre ---------------------------------------
    registre = lire("_registre.json")
    if not registre:
        avertis.append("data/_registre.json absent — la provenance n'est plus traçable")
    else:
        sans_rec = [p["id"] for p in elements.get("projet", []) if not p.get("airtable")]
        if sans_rec:
            erreurs.append(f"{len(sans_rec)} chantier(s) sans identifiant Airtable : "
                           f"{', '.join(sans_rec[:3])}")
        try:
            pris = datetime.strptime(registre["export"]["date"], "%Y-%m-%d").date()
            age = (date.today() - pris).days
            notes.append(f"photo Airtable du {pris.strftime('%d/%m/%Y')} — {age} jour(s)")
            if age > FRAICHEUR_JOURS:
                avertis.append(f"la photo Airtable a {age} jours : au-delà de "
                               f"{FRAICHEUR_JOURS}, elle a probablement dérivé")
        except (KeyError, ValueError):
            avertis.append("la date d'export du registre est illisible")

    # ---- 4. Le catalogue médias contre l'inventaire réel -------------------
    media = lire("media.json")
    inv = os.path.join(ICI, "inventaire_archive.csv")
    if media and os.path.exists(inv):
        lignes = list(csv.DictReader(open(inv, encoding="utf-8")))
        t = media["total"]
        reel = {
            "fichiers": len(lignes),
            "urls": len({r["url"] for r in lignes if r["sha256"]}),
            "distinctes": len({r["sha256"] for r in lignes if r["sha256"]}),
        }
        for cle, attendu in reel.items():
            if t.get(cle) != attendu:
                erreurs.append(f"media.json annonce {t.get(cle)} pour « {cle} », "
                               f"l'inventaire en compte {attendu} — "
                               f"relancer generer_medias.py")
        # Les trois chiffres doivent rester ordonnés, sinon l'un des trois a
        # été calculé sur la mauvaise unité.
        if not (t["distinctes"] <= t["urls"] <= t["fichiers"]):
            erreurs.append("les trois comptes médias ne sont plus ordonnés "
                           "(contenus ≤ fichiers ≤ entrées)")
        notes.append(f"médias : {t['distinctes']} contenus · {t['urls']} fichiers · "
                     f"{t['fichiers']} entrées · {t['echecs']} perte(s)")
    elif media:
        avertis.append("inventaire_archive.csv absent — catalogue médias non recoupé")

    # ---- 5. Nature des rattachements conceptuels ---------------------------
    # Un lien « traite_de » vient d'un COMPTAGE de mots, pas d'une lecture. La
    # distinction doit rester visible dans la donnée elle-même, sinon une
    # mesure lexicale finit par se faire passer pour un jugement de sens.
    traite = [r for r in relations if r.get("verbe") == "traite_de"]
    lexicaux = [r for r in traite if r.get("origine") == "lexical"]
    semantiques = [r for r in traite if r.get("origine") == "semantique"]
    muets = [r for r in traite if not r.get("origine")]
    if traite:
        notes.append(f"{len(traite)} rattachements traite_de : "
                     f"{len(lexicaux)} lexicaux (comptés), "
                     f"{len(semantiques)} sémantiques (déduits)")
    if muets:
        erreurs.append(f"{len(muets)} rattachement(s) traite_de sans origine déclarée : "
                       f"on ne peut plus dire si c'est une mesure ou un jugement")
    sans_compte = [r for r in lexicaux if not isinstance(r.get("occurrences"), int)]
    if sans_compte:
        erreurs.append(f"{len(sans_compte)} rattachement(s) déclarés lexicaux "
                       f"mais sans compte d'occurrences")
    faibles = [r for r in lexicaux if (r.get("occurrences") or 0) < 4]
    if faibles:
        avertis.append(f"{len(faibles)} rattachement(s) lexicaux sous le seuil de "
                       f"4 occurrences : une mention isolée n'est pas un sujet")

    return rendre(erreurs, avertis, notes)


def rendre(erreurs, avertis, notes):
    print()
    for n in notes:
        print(f"  · {n}")
    if avertis:
        print()
        for a in avertis:
            print(f"  ⚠ {a}")
    print()
    if erreurs:
        print(f"  ÉCHEC — {len(erreurs)} incohérence(s) :")
        for e in erreurs:
            print(f"     {e}")
        print()
        return 1
    print(f"  Cohérent{'' if not avertis else f' — {len(avertis)} avertissement(s), rien de cassé'}.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
