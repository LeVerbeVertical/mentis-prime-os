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
    """Copie horodatée avant chaque écriture. Garde les 20 dernières."""
    os.makedirs(SAUV, exist_ok=True)
    horo = datetime.now().strftime("%Y%m%d-%H%M%S")
    dossier = os.path.join(SAUV, horo)
    os.makedirs(dossier, exist_ok=True)
    for nom in os.listdir(DATA):
        src = os.path.join(DATA, nom)
        if os.path.isfile(src) and nom.endswith(".json"):
            shutil.copy2(src, os.path.join(dossier, nom))

    versions = sorted(d for d in os.listdir(SAUV)
                      if os.path.isdir(os.path.join(SAUV, d)))
    for vieux in versions[:-20]:
        shutil.rmtree(os.path.join(SAUV, vieux), ignore_errors=True)


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
            etat = {
                "schema": lire_json("schema.json"),
                "elements": {t: lire_json(f"{t}.json") for t in TYPES},
                "relations": lire_json("relations.json"),
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

        inconnus = [t for t in elements if t not in TYPES]
        if inconnus:
            return self._json({"erreur": f"types inconnus : {inconnus}"}, 400)

        # Les relations ne doivent pointer que vers des éléments existants.
        ids = {e["id"] for liste in elements.values() for e in liste}
        orphelines = [r for r in relations
                      if r.get("de") not in ids or r.get("vers") not in ids]
        if orphelines:
            return self._json({
                "erreur": "relation vers un élément inexistant",
                "detail": orphelines[:5],
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
    print("  Inventaire Mentis Prime")
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
