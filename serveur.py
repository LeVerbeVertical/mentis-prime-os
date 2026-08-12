#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serveur local de l'inventaire Mentis Prime.

Aucune dépendance à installer : uniquement la bibliothèque standard de Python.
Rien ne sort de ta machine. Aucun accès réseau sortant, aucune clé, aucun compte.

Usage :  python3 serveur.py
Puis ouvre  http://localhost:8420  dans ton navigateur.
"""

import http.server
import json
import os
import shutil
import socketserver
import sys
import webbrowser
from datetime import datetime
from urllib.parse import urlparse

PORT = 8420
ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")
WEB = os.path.join(ICI, "web")
SAUV = os.path.join(DATA, "_versions")

TYPES = ["oeuvre", "concept", "personnage", "document", "ia",
         "outil", "projet", "canal", "institution"]


def lire_json(nom):
    chemin = os.path.join(DATA, nom)
    if not os.path.exists(chemin):
        return [] if nom != "schema.json" else {}
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def ecrire_json(nom, contenu):
    chemin = os.path.join(DATA, nom)
    tmp = chemin + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(contenu, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, chemin)


def sauvegarder():
    """Copie horodatée avant chaque écriture. Garde les 20 dernières.

    L'horodatage descend à la milliseconde, et le dossier est créé en mode
    exclusif. Avec une précision à la seconde, deux enregistrements rapprochés
    tombaient dans le MÊME dossier et le second écrasait la sauvegarde du
    premier — la copie de secours disparaissait donc exactement quand on en
    avait le plus besoin, c'est-à-dire pendant une rafale de modifications.
    """
    os.makedirs(SAUV, exist_ok=True)
    base = datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:-3]
    dossier = os.path.join(SAUV, base)
    suffixe = 0
    while True:
        try:
            os.makedirs(dossier)      # exclusif : échoue si le dossier existe
            break
        except FileExistsError:
            suffixe += 1
            dossier = os.path.join(SAUV, f"{base}-{suffixe}")
    for nom in os.listdir(DATA):
        src = os.path.join(DATA, nom)
        if os.path.isfile(src) and nom.endswith(".json"):
            shutil.copy2(src, os.path.join(dossier, nom))

    versions = sorted(d for d in os.listdir(SAUV)
                      if os.path.isdir(os.path.join(SAUV, d)))
    for vieux in versions[:-20]:
        shutil.rmtree(os.path.join(SAUV, vieux), ignore_errors=True)


def valider(schema, elements, relations):
    """Tout ce qui doit être vrai avant d'écrire. Renvoie la liste des refus.

    Le serveur ne se contentait que de deux contrôles : types connus, et
    relations pointant vers des éléments existants. C'était trop peu. Une
    interface qui bafouille, un fichier corrigé à la main un peu vite, et des
    données incohérentes s'installaient en silence — pour n'être découvertes
    que des semaines plus tard, quand un compteur se met à mentir.

    On refuse donc l'écriture ENTIÈRE dès qu'un problème est trouvé. Un refus
    est réparable ; une base à demi cohérente ne l'est pas vraiment.
    """
    pbs = []
    types = schema.get("types", {})
    verbes = schema.get("verbes", {})

    vus = {}
    for t, liste in elements.items():
        if t not in types:
            pbs.append(f"type inconnu : {t}")
            continue
        statuts = set(types[t].get("statuts", []))
        for e in liste:
            eid = e.get("id")
            if not eid or not isinstance(eid, str):
                pbs.append(f"{t} : un élément sans identifiant")
                continue
            if eid in vus:
                pbs.append(f"identifiant en double : {eid} ({vus[eid]} et {t})")
            vus[eid] = t
            if e.get("type") != t:
                pbs.append(f"{eid} : rangé dans {t} mais se déclare « {e.get('type')} »")
            st = e.get("statut")
            # Un statut vide est accepté : un élément peut être en cours de
            # saisie. Un statut inventé ne l'est pas — il casse les filtres et
            # les compteurs sans que rien ne le signale.
            if st and statuts and st not in statuts:
                pbs.append(f"{eid} : statut « {st} » inconnu pour {t} "
                           f"(attendus : {', '.join(sorted(statuts))})")

    deja = set()
    for r in relations:
        de, verbe, vers = r.get("de"), r.get("verbe"), r.get("vers")
        if verbe not in verbes:
            pbs.append(f"verbe inconnu : {verbe}")
            continue
        if de not in vus or vers not in vus:
            manquant = de if de not in vus else vers
            pbs.append(f"relation vers un élément inexistant : {manquant}")
            continue
        cle = (de, verbe, vers)
        if cle in deja:
            pbs.append(f"relation en double : {de} {verbe} {vers}")
        deja.add(cle)
        # Le vocabulaire est fermé ET typé : « publie_sur » va d'une œuvre vers
        # un canal, pas l'inverse. C'est ce qui empêche la carte de devenir un
        # plat de spaghettis où tout serait lié à tout.
        contraintes = verbes[verbe]
        for cote, val in (("de", de), ("vers", vers)):
            permis = contraintes.get(cote)
            if permis and vus[val] not in permis:
                pbs.append(f"{de} {verbe} {vers} : « {cote} » est un "
                           f"{vus[val]}, or {verbe} attend {' ou '.join(permis)}")

    return pbs


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WEB, **kw)

    def log_message(self, fmt, *args):
        # Ne journaliser que les appels d'API. Les arguments ne sont pas toujours
        # des chaînes (un 404 passe un code entier) : tout convertir avant de filtrer.
        try:
            ligne = fmt % args
        except Exception:
            ligne = fmt
        if "/api/" in ligne:
            sys.stderr.write("  %s\n" % ligne)

    def _json(self, contenu, code=200):
        corps = json.dumps(contenu, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        chemin = urlparse(self.path).path

        if chemin == "/api/tout":
            # Les trois derniers ne sont pas des « éléments » : ils ne portent
            # ni relation ni fiche éditable, et /api/enregistrer ne les réécrit
            # jamais. Ce sont des lectures — le catalogue de l'archive, le
            # registre inter-agents, et la trace de provenance de l'export
            # Airtable. Ils voyagent avec le reste pour éviter trois allers-
            # retours au démarrage, rien de plus.
            etat = {
                "schema": lire_json("schema.json"),
                "elements": {t: lire_json(f"{t}.json") for t in TYPES},
                "relations": lire_json("relations.json"),
                "media": lire_json("media.json"),
                "handoffs": lire_json("handoff.json"),
                "registre": lire_json("_registre.json"),
            }
            return self._json(etat)

        if chemin == "/api/versions":
            if not os.path.isdir(SAUV):
                return self._json([])
            return self._json(sorted(os.listdir(SAUV), reverse=True))

        return super().do_GET()

    def do_POST(self):
        chemin = urlparse(self.path).path

        if chemin != "/api/enregistrer":
            return self._json({"erreur": "route inconnue"}, 404)

        try:
            taille = int(self.headers.get("Content-Length", 0))
            charge = json.loads(self.rfile.read(taille).decode("utf-8"))
        except Exception as e:
            return self._json({"erreur": f"lecture impossible : {e}"}, 400)

        elements = charge.get("elements", {})
        relations = charge.get("relations", [])

        problemes = valider(lire_json("schema.json"), elements, relations)
        if problemes:
            return self._json({
                "erreur": f"écriture refusée — {len(problemes)} incohérence(s)",
                "detail": problemes[:8],
            }, 400)

        try:
            sauvegarder()
            for t in TYPES:
                ecrire_json(f"{t}.json", elements.get(t, []))
            ecrire_json("relations.json", relations)
        except Exception as e:
            return self._json({"erreur": f"écriture impossible : {e}"}, 500)

        total = sum(len(v) for v in elements.values())
        return self._json({"ok": True, "elements": total, "relations": len(relations)})


class Serveur(socketserver.TCPServer):
    allow_reuse_address = True


def main():
    if not os.path.isdir(DATA):
        print("Le dossier data/ n'existe pas.")
        print("Lance d'abord :  python3 amorcer.py")
        sys.exit(1)

    url = f"http://localhost:{PORT}"
    print()
    print("  Mentis Prime OS")
    print("  " + "-" * 44)
    print(f"  Ouvre : {url}")
    print("  Arrêter : Ctrl+C")
    print("  Tout reste sur cette machine.")
    print()

    try:
        webbrowser.open(url)
    except Exception:
        pass

    with Serveur(("127.0.0.1", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Arrêté. Les données sont dans data/\n")


if __name__ == "__main__":
    main()
