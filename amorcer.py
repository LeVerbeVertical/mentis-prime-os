#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Amorçage de l'inventaire Mentis Prime.

Génère data/schema.json et data/*.json à partir de ce qui est déjà connu :
le corpus des 17 articles, le noyau conceptuel, les outils, les IA, les canaux.

Relancer ce script ÉCRASE les données. Il ne sert qu'au tout premier démarrage,
ou pour repartir de zéro. Une sauvegarde est faite dans data/_sauvegarde/ avant.
"""

import json
import os
import shutil
from datetime import date

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "data")
AUJOURDHUI = date.today().isoformat()

# =============================================================================
# SCHÉMA — la source de vérité du modèle. L'interface web le lit directement.
# =============================================================================

SCHEMA = {
    "champs_communs": ["id", "type", "titre", "statut", "maj", "note"],

    "types": {
        "oeuvre": {
            "libelle": "Œuvre",
            "pluriel": "Œuvres",
            "quoi": "Livres, articles, séries, univers, éditions, versions.",
            "statuts": ["idée", "brouillon", "stabilisé", "publié", "archivé"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["univers", "série", "livre", "article", "édition"]},
                "famille": {"libelle": "Famille", "type": "texte"},
                "langue": {"libelle": "Langue", "choix": ["fr", "en", "fr+en"]},
                "version": {"libelle": "Version", "type": "texte"},
                "url": {"libelle": "URL", "type": "url"},
            },
        },
        "concept": {
            "libelle": "Concept",
            "pluriel": "Concepts",
            "quoi": "Idées, théories, archétypes, axes de recherche, valeurs.",
            "statuts": ["exploratoire", "stabilisé", "abandonné"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["concept", "archétype", "théorie", "axe", "valeur"]},
                "definition": {"libelle": "Définition", "type": "long"},
            },
        },
        "personnage": {
            "libelle": "Personnage",
            "pluriel": "Personnages",
            "quoi": "Personnages, entités, figures narratives.",
            "statuts": ["idée", "brouillon", "stabilisé", "archivé"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["personnage", "entité", "figure"]},
                "role": {"libelle": "Rôle", "type": "texte"},
                "description": {"libelle": "Description", "type": "long"},
            },
        },
        "document": {
            "libelle": "Document",
            "pluriel": "Documents",
            "quoi": "PDF, textes, images, vidéos, couvertures, prompts, notes.",
            "statuts": ["à retrouver", "localisé", "archivé"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["pdf", "texte", "image", "vidéo", "couverture", "prompt", "note"]},
                "emplacement": {"libelle": "Emplacement", "choix": ["inconnu", "drive", "local", "notion", "substack", "canva", "github", "autre"]},
                "chemin": {"libelle": "Chemin ou lien", "type": "texte"},
                "langue": {"libelle": "Langue", "choix": ["fr", "en", "fr+en"]},
            },
        },
        "ia": {
            "libelle": "IA",
            "pluriel": "IA",
            "quoi": "Les intelligences artificielles, leur fonction et leurs limites.",
            "statuts": ["active", "en essai", "écartée"],
            "champs": {
                "fonction": {"libelle": "Fonction", "type": "texte"},
                "capacites": {"libelle": "Capacités", "type": "long"},
                "autorise": {"libelle": "Autorisé", "type": "long"},
                "interdit": {"libelle": "Interdit", "type": "long"},
                "autonomie": {"libelle": "Autonomie", "choix": ["L0 — lecture seule", "L1 — proposition", "L2 — écriture locale", "L3 — action externe"]},
            },
        },
        "outil": {
            "libelle": "Outil",
            "pluriel": "Outils",
            "quoi": "Plateformes et services : stockage, base, design, publication, code.",
            "statuts": ["actif", "en essai", "dormant", "abandonné"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["stockage", "base", "design", "publication", "édition", "boutique", "automatisation", "code", "note"]},
                "url": {"libelle": "URL", "type": "url"},
                "compte": {"libelle": "Compte", "type": "texte"},
            },
        },
        "projet": {
            "libelle": "Projet",
            "pluriel": "Projets",
            "quoi": "Ce qui est en cours, avec sa prochaine action.",
            "statuts": ["actif", "en attente", "bloqué", "terminé", "abandonné"],
            "champs": {
                "priorite": {"libelle": "Priorité", "choix": ["haute", "moyenne", "basse"]},
                "prochaine_action": {"libelle": "Prochaine action", "type": "texte"},
                "blocage": {"libelle": "Blocage", "type": "texte"},
                "responsable": {"libelle": "Responsable", "type": "texte"},
            },
        },
        "canal": {
            "libelle": "Canal",
            "pluriel": "Canaux",
            "quoi": "Diffusion et monétisation : publication, édition, vidéo, boutique.",
            "statuts": ["actif", "en préparation", "dormant", "fermé"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["publication", "édition", "vidéo", "produit", "boutique", "réseau"]},
                "url": {"libelle": "URL", "type": "url"},
                "audience": {"libelle": "Audience", "type": "texte"},
                "monetisation": {"libelle": "Monétisation", "type": "texte"},
            },
        },
        "institution": {
            "libelle": "Institution",
            "pluriel": "Institutions",
            "quoi": "Instituts, programmes, centres de recherche, contacts.",
            "statuts": ["repérée", "à contacter", "contactée", "en échange", "écartée"],
            "champs": {
                "genre": {"libelle": "Genre", "choix": ["institut", "fellowship", "laboratoire", "revue", "personne"]},
                "pays": {"libelle": "Pays", "type": "texte"},
                "contact": {"libelle": "Contact", "type": "texte"},
                "url": {"libelle": "URL", "type": "url"},
            },
        },
    },

    # -------------------------------------------------------------------------
    # Les 10 verbes. `de` et `vers` limitent ce que l'interface propose :
    # on ne peut pas créer une relation qui n'a pas de sens.
    # -------------------------------------------------------------------------
    "verbes": {
        "partie_de": {
            "libelle": "fait partie de",
            "question": "Quel document appartient à quelle œuvre ?",
            "de": ["document", "oeuvre"], "vers": ["oeuvre"],
        },
        "traite_de": {
            "libelle": "traite de",
            "question": "De quoi ce texte parle-t-il réellement ?",
            "de": ["oeuvre", "document"], "vers": ["concept"],
        },
        "apparait_dans": {
            "libelle": "apparaît dans",
            "question": "Où ce personnage existe-t-il ?",
            "de": ["personnage"], "vers": ["oeuvre"],
        },
        "stocke_dans": {
            "libelle": "est stocké dans",
            "question": "Quel outil contient quelle donnée ?",
            "de": ["document", "oeuvre"], "vers": ["outil"],
        },
        "publie_sur": {
            "libelle": "est publié sur",
            "question": "Où est-ce diffusé ?",
            "de": ["oeuvre", "document"], "vers": ["canal"],
        },
        "travaille_sur": {
            "libelle": "travaille sur",
            "question": "Quelle IA travaille sur quel projet ?",
            "de": ["ia"], "vers": ["projet", "oeuvre"],
        },
        "utilise": {
            "libelle": "utilise",
            "question": "De quoi ce projet a-t-il besoin ?",
            "de": ["projet", "canal"], "vers": ["outil", "ia"],
        },
        "depend_de": {
            "libelle": "dépend de",
            "question": "Quelle action dépend de quelle autre ?",
            "de": ["projet"], "vers": ["projet"],
        },
        "derive_de": {
            "libelle": "dérive de",
            "question": "D'où vient cette version ?",
            "de": ["document", "oeuvre"], "vers": ["document", "oeuvre"],
        },
        "vise": {
            "libelle": "vise",
            "question": "Quel projet s'adresse à quelle institution ?",
            "de": ["projet", "document"], "vers": ["institution"],
        },
    },
}


# =============================================================================
# DONNÉES D'AMORÇAGE
# =============================================================================

def el(id_, type_, titre, statut, note="", **champs):
    d = {"id": id_, "type": type_, "titre": titre, "statut": statut,
         "maj": AUJOURDHUI, "note": note}
    d.update(champs)
    return d


# --- Concepts : noyau conceptuel + 4 axes + 7 archétypes ---------------------

CONCEPTS = [
    el("concept.axe", "concept", "L'Axe (verticalité)", "stabilisé", genre="concept",
       definition="Principe de cohérence intérieure et collective. Donne son nom au Verbe Vertical."),
    el("concept.individuation", "concept", "Individuation", "stabilisé", genre="concept",
       definition="Condition première de toute harmonisation non violente."),
    el("concept.noetique", "concept", "Noétique", "stabilisé", genre="concept",
       definition="Régime de compréhension préverbal, incarné, non linéaire. Ni substitut ni adversaire de la raison — elle la cadre, l'oriente et la pèse."),
    el("concept.sens-info-performance", "concept", "Sens / information / performance", "stabilisé", genre="concept",
       definition="Trois registres à ne jamais confondre."),
    el("concept.epicotherapie", "concept", "Épicothérapie", "stabilisé", genre="théorie",
       definition="Architecture complète de la méthode d'individuation par les archétypes."),
    el("concept.beingjectif", "concept", "Le Beingjectif", "exploratoire", genre="concept",
       definition="Le point aveugle de l'esprit."),
    el("concept.qtlx", "concept", "Code QTLX", "exploratoire", genre="théorie",
       definition="Vers une technologie du sens."),

    # Les 4 axes de recherche
    el("axe.epistemique", "concept", "Axe épistémique", "stabilisé", genre="axe",
       definition="Statut du sens et des concepts. Distinguer concept, métaphore, mythe, symbole et artefact."),
    el("axe.methodologique", "concept", "Axe méthodologique", "stabilisé", genre="axe",
       definition="Protocole de recherche non linéaire. La temporalité comme paramètre méthodologique."),
    el("axe.anthropologique", "concept", "Axe anthropologique", "stabilisé", genre="axe",
       definition="Lien structurel entre individuation et fractures collectives."),
    el("axe.transmissibilite", "concept", "Axe de transmissibilité", "stabilisé", genre="axe",
       definition="Rendre la complexité habitable sans la simplifier ni la spectaculariser."),

    # Les 7 archétypes du parcours
    el("arch.crise", "concept", "La Crise Existentielle", "stabilisé", genre="archétype",
       definition="Premier archétype du parcours d'individuation."),
    el("arch.enfant", "concept", "L'Enfant Intérieur", "stabilisé", genre="archétype",
       definition="Cinq types d'enfants intérieurs, cinq blessures de l'âme."),
    el("arch.heros", "concept", "Le Héros Intérieur", "stabilisé", genre="archétype",
       definition="Énergie de transformation et syndromes du héros."),
    el("arch.sage", "concept", "Le Sage Intérieur", "stabilisé", genre="archétype",
       definition="Maître du repos, de l'équilibre et du discernement."),
    el("arch.juge", "concept", "Le Juge Intérieur", "stabilisé", genre="archétype",
       definition="Régulation éthique et justice intérieure."),
    el("arch.demon", "concept", "Le Démon Intérieur", "stabilisé", genre="archétype",
       definition="Intégration de l'ombre et puissance refoulée."),
    el("arch.transcende", "concept", "L'Enfant Transcendé", "stabilisé", genre="archétype",
       definition="Retour intégré, présence et contemplation."),
]

# --- Œuvres : l'univers + les 17 articles ------------------------------------

def art(slug, n, titre, famille, note=""):
    return el(f"oeuvre.{slug}", "oeuvre", titre, "publié", note,
              genre="article", famille=famille, langue="fr", version=f"n°{n}", url="")

OEUVRES = [
    el("univers.mentis-prime", "oeuvre", "Univers Mentis Prime", "stabilisé",
       "Univers-racine. Les 17 articles en font partie.",
       genre="univers", famille="—", langue="fr+en", version="", url="leverbevertical.substack.com"),

    art("crise-existentielle", 1, "La Crise Existentielle", "Épicothérapie"),
    art("enfant-interieur", 2, "L'Enfant Intérieur", "Épicothérapie"),
    art("heros-interieur", 3, "Le Héros Intérieur", "Épicothérapie"),
    art("sage-interieur", 4, "Le Sage Intérieur", "Épicothérapie"),
    art("juge-interieur", 5, "Le Juge Intérieur", "Épicothérapie"),
    art("demon-interieur", 6, "Le Démon Intérieur", "Épicothérapie"),
    art("enfant-transcende", 7, "L'Enfant Transcendé", "Épicothérapie"),
    art("epicotherapie", 8, "L'Épicothérapie", "Épicothérapie",
        "Texte pivot : les articles 1 à 7 y convergent."),

    art("ia-verticale", 9, "L'IA Verticale — Vers la Super-Intelligence", "Technologie"),
    art("chromato-semanto", 10, "Le Chromato-Symbolique vs le Sémanto-Symbolique", "Technologie"),
    art("qtlx", 16, "Le Code QTLX — Vers une technologie du sens", "Technologie"),

    art("8-valeurs", 11, "Les 8 Valeurs Épiques Fondamentales", "Philosophie"),
    art("beingjectif", 12, "Le Beingjectif — Le point aveugle de l'esprit", "Philosophie"),
    art("8-causes", 13, "Les 8 Causes Humanitaires", "Philosophie"),

    art("ecrire-survivre", 14, "J'écris pour survivre", "Personnel"),
    art("individuation-seuil", 15, "Individuation — Le Seuil", "Personnel"),

    el("oeuvre.fondation-institutionnelle", "oeuvre",
       "Univers Mentis Prime — La Fondation Institutionnelle", "stabilisé",
       "Article 17. Document de synthèse destiné au dialogue institutionnel.",
       genre="édition", famille="Institutionnel", langue="fr+en", version="janvier 2026", url=""),
]

# --- Documents ----------------------------------------------------------------

DOCUMENTS = [
    el("doc.fondation-en", "document", "Fondation Institutionnelle — version anglaise", "localisé",
       "20 pages. Version de travail vérifiée.",
       genre="pdf", emplacement="github",
       chemin="International-version/Univers_Mentis_Prime_Institutional_Document_EN.pdf",
       langue="en"),
    el("doc.fondation-fr", "document", "Fondation Institutionnelle — version française", "à retrouver",
       "Version originale. Le document anglais indique explicitement en dériver, mais je n'ai pas trouvé le fichier source.",
       genre="pdf", emplacement="inconnu", chemin="", langue="fr"),
    el("doc.codex", "document", "Codex écrit en hospitalisation", "à retrouver",
       "Mentionné dans la Fondation Institutionnelle comme matière première du cadre. Emplacement inconnu.",
       genre="texte", emplacement="inconnu", chemin="", langue="fr"),
]

# --- IA -----------------------------------------------------------------------

IA = [
    el("ia.claude-conversationnel", "ia", "Claude conversationnel", "active",
       "L'opérateur de la pensée, pas de la construction.",
       fonction="Réflexion, critique, rédaction, investigation",
       capacites="Analyse longue, contradiction qualifiée, reformulation, recherche",
       autorise="Critiquer, proposer, reformuler, structurer une idée",
       interdit="Rédiger un texte signé Le Verbe Vertical destiné à la publication",
       autonomie="L1 — proposition"),
    el("ia.claude-code", "ia", "Claude Code", "active",
       "L'opérateur de la construction.",
       fonction="Construction, fichiers, scripts, architecture, intégrations",
       capacites="Écriture de code, manipulation de fichiers, git, exécution locale",
       autorise="Créer et modifier des fichiers du projet",
       interdit="Publier, envoyer, ou pousser sans validation explicite",
       autonomie="L2 — écriture locale"),
    el("ia.chatgpt", "ia", "ChatGPT", "active",
       "L'opérateur de la continuité entre sessions.",
       fonction="Orchestration, analyse, création, continuité",
       capacites="Mémoire de session longue, synthèse, génération",
       autorise="Analyser, synthétiser, maintenir le fil entre les sessions",
       interdit="Décider seul d'une orientation du projet",
       autonomie="L1 — proposition"),
]

# --- Outils -------------------------------------------------------------------

OUTILS = [
    el("outil.drive", "outil", "Google Drive", "actif", "", genre="stockage", url="drive.google.com", compte=""),
    el("outil.airtable", "outil", "Airtable", "actif", "", genre="base", url="airtable.com", compte=""),
    el("outil.canva", "outil", "Canva", "actif", "Couvertures et visuels.", genre="design", url="canva.com", compte=""),
    el("outil.substack", "outil", "Substack", "actif", "Support du canal de publication principal.", genre="publication", url="leverbevertical.substack.com", compte="Le Verbe Vertical"),
    el("outil.kdp", "outil", "Amazon KDP", "en essai", "", genre="édition", url="kdp.amazon.com", compte=""),
    el("outil.shopify", "outil", "Shopify", "dormant", "", genre="boutique", url="shopify.com", compte=""),
    el("outil.zapier", "outil", "Zapier", "dormant", "Aucune automatisation active à ce stade — volontaire.", genre="automatisation", url="zapier.com", compte=""),
    el("outil.github", "outil", "GitHub", "actif", "Compte LeVerbeVertical. 2 dépôts : mentis-prime-os, International-version.", genre="code", url="github.com/LeVerbeVertical", compte="LeVerbeVertical"),
    el("outil.notion", "outil", "Notion", "actif", "Organisation structurée du corpus.", genre="note", url="notion.so/Le-Verbe-Vertical", compte=""),
]

# --- Canaux -------------------------------------------------------------------

CANAUX = [
    el("canal.substack", "canal", "Substack — Le Verbe Vertical", "actif",
       "Canal principal. Les 17 articles y sont publiés.",
       genre="publication", url="leverbevertical.substack.com", audience="", monetisation="abonnement possible"),
    el("canal.notion", "canal", "Notion — Le Verbe Vertical", "actif",
       "Organisation structurée du corpus, accessible publiquement.",
       genre="publication", url="notion.so/Le-Verbe-Vertical", audience="", monetisation="aucune"),
    el("canal.kdp", "canal", "Édition livre (KDP)", "en préparation", "",
       genre="édition", url="", audience="", monetisation="vente à l'unité"),
    el("canal.boutique", "canal", "Boutique", "dormant", "",
       genre="boutique", url="", audience="", monetisation="produits"),
]

# --- Projets ------------------------------------------------------------------

PROJETS = [
    el("projet.completer-corpus", "projet", "Compléter les métadonnées du corpus", "actif",
       "Les 17 articles sont inventoriés mais leurs URLs Substack manquent.",
       priorite="haute", prochaine_action="Coller les 17 liens Substack dans les fiches œuvre",
       blocage="", responsable="Hamza"),
    el("projet.retrouver-fr", "projet", "Retrouver la version française de la Fondation", "bloqué",
       "Le document anglais existe et dit dériver d'un original français introuvable.",
       priorite="haute", prochaine_action="Chercher dans Drive et Notion",
       blocage="Emplacement du fichier source inconnu", responsable="Hamza"),
    el("projet.liste-institutions", "projet", "Établir la liste des institutions cibles", "actif",
       "Instituts d'études avancées, centres transdisciplinaires, fellowships, labos IA éthique.",
       priorite="moyenne", prochaine_action="Repérer 10 institutions compatibles avec les conditions de viabilité",
       blocage="", responsable="Hamza"),
    el("projet.inventaire", "projet", "Construire l'inventaire Mentis Prime", "actif",
       "Ce tableau de bord. Phase 1 de la séquence.",
       priorite="haute", prochaine_action="Compléter les personnages et les projets manquants",
       blocage="", responsable="Claude Code"),
    el("projet.confidentialite", "projet", "Trancher la confidentialité du dépôt GitHub", "en attente",
       "Le README de mentis-prime-os annonce un dépôt privé ; il est actuellement public.",
       priorite="moyenne", prochaine_action="Décider : privé ou public",
       blocage="Décision à prendre", responsable="Hamza"),
]

# --- Institutions (vides — à toi de les remplir) -------------------------------

INSTITUTIONS = []

# --- Personnages (vides — je ne les connais pas) --------------------------------

PERSONNAGES = []


# =============================================================================
# RELATIONS
# =============================================================================

def rel(de, verbe, vers, note=""):
    return {"de": de, "verbe": verbe, "vers": vers, "note": note}

ARTICLES = [o["id"] for o in OEUVRES if o.get("genre") == "article"]

RELATIONS = []

# Tous les articles font partie de l'univers et sont publiés sur Substack.
for a in ARTICLES:
    RELATIONS.append(rel(a, "partie_de", "univers.mentis-prime"))
    RELATIONS.append(rel(a, "publie_sur", "canal.substack"))
    RELATIONS.append(rel(a, "stocke_dans", "outil.substack"))

RELATIONS += [
    rel("oeuvre.fondation-institutionnelle", "partie_de", "univers.mentis-prime"),

    # Chaque article d'archétype traite de son archétype.
    rel("oeuvre.crise-existentielle", "traite_de", "arch.crise"),
    rel("oeuvre.enfant-interieur", "traite_de", "arch.enfant"),
    rel("oeuvre.heros-interieur", "traite_de", "arch.heros"),
    rel("oeuvre.sage-interieur", "traite_de", "arch.sage"),
    rel("oeuvre.juge-interieur", "traite_de", "arch.juge"),
    rel("oeuvre.demon-interieur", "traite_de", "arch.demon"),
    rel("oeuvre.enfant-transcende", "traite_de", "arch.transcende"),

    # Le texte pivot traite de la méthode entière.
    rel("oeuvre.epicotherapie", "traite_de", "concept.epicotherapie"),
    rel("oeuvre.epicotherapie", "traite_de", "concept.individuation"),

    # Articles technologiques.
    rel("oeuvre.ia-verticale", "traite_de", "concept.axe"),
    rel("oeuvre.ia-verticale", "traite_de", "concept.sens-info-performance"),
    rel("oeuvre.chromato-semanto", "traite_de", "concept.sens-info-performance"),
    rel("oeuvre.qtlx", "traite_de", "concept.qtlx"),
    rel("oeuvre.qtlx", "traite_de", "concept.noetique"),

    # Articles philosophiques.
    rel("oeuvre.8-valeurs", "traite_de", "concept.axe"),
    rel("oeuvre.beingjectif", "traite_de", "concept.beingjectif"),
    rel("oeuvre.beingjectif", "traite_de", "concept.noetique"),
    rel("oeuvre.8-causes", "traite_de", "concept.axe"),

    # Articles personnels.
    rel("oeuvre.individuation-seuil", "traite_de", "concept.individuation"),

    # Le document institutionnel couvre les quatre axes et le noyau.
    rel("oeuvre.fondation-institutionnelle", "traite_de", "axe.epistemique"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "axe.methodologique"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "axe.anthropologique"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "axe.transmissibilite"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "concept.axe"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "concept.noetique"),
    rel("oeuvre.fondation-institutionnelle", "traite_de", "concept.individuation"),

    # Documents.
    rel("doc.fondation-en", "partie_de", "oeuvre.fondation-institutionnelle"),
    rel("doc.fondation-fr", "partie_de", "oeuvre.fondation-institutionnelle"),
    rel("doc.fondation-en", "derive_de", "doc.fondation-fr", "Traduction pour le dialogue académique international."),
    rel("doc.fondation-en", "stocke_dans", "outil.github"),
    rel("doc.codex", "derive_de", "oeuvre.fondation-institutionnelle", "Matière première du cadre."),

    # Canaux et outils.
    rel("canal.substack", "utilise", "outil.substack"),
    rel("canal.notion", "utilise", "outil.notion"),
    rel("canal.kdp", "utilise", "outil.kdp"),
    rel("canal.boutique", "utilise", "outil.shopify"),

    # Projets : ce dont ils ont besoin, et ce qui les bloque.
    rel("projet.completer-corpus", "utilise", "outil.substack"),
    rel("projet.retrouver-fr", "utilise", "outil.drive"),
    rel("projet.retrouver-fr", "utilise", "outil.notion"),
    rel("projet.inventaire", "utilise", "ia.claude-code"),
    rel("projet.liste-institutions", "utilise", "ia.chatgpt"),
    rel("projet.confidentialite", "utilise", "outil.github"),

    # Dépendances entre projets.
    rel("projet.liste-institutions", "depend_de", "projet.retrouver-fr",
        "Difficile de démarcher sans la version française du document."),
    rel("projet.completer-corpus", "depend_de", "projet.inventaire",
        "Les métadonnées se saisissent dans l'inventaire."),

    # Qui travaille sur quoi.
    rel("ia.claude-code", "travaille_sur", "projet.inventaire"),
    rel("ia.chatgpt", "travaille_sur", "projet.liste-institutions"),
    rel("ia.claude-conversationnel", "travaille_sur", "oeuvre.fondation-institutionnelle"),
]


# =============================================================================
# ÉCRITURE
# =============================================================================

FICHIERS = {
    "oeuvre": OEUVRES,
    "concept": CONCEPTS,
    "personnage": PERSONNAGES,
    "document": DOCUMENTS,
    "ia": IA,
    "outil": OUTILS,
    "projet": PROJETS,
    "canal": CANAUX,
    "institution": INSTITUTIONS,
}


def ecrire(chemin, contenu):
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(contenu, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    if os.path.isdir(DATA) and os.listdir(DATA):
        sauv = os.path.join(DATA, "_sauvegarde")
        shutil.rmtree(sauv, ignore_errors=True)
        os.makedirs(sauv, exist_ok=True)
        for nom in os.listdir(DATA):
            src = os.path.join(DATA, nom)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(sauv, nom))
        print(f"Sauvegarde de l'existant dans {sauv}")

    os.makedirs(DATA, exist_ok=True)

    ecrire(os.path.join(DATA, "schema.json"), SCHEMA)

    total = 0
    for type_, elements in FICHIERS.items():
        ecrire(os.path.join(DATA, f"{type_}.json"), elements)
        total += len(elements)
        print(f"  {type_:<12} {len(elements):>3} élément(s)")

    ecrire(os.path.join(DATA, "relations.json"), RELATIONS)

    print(f"\n{total} éléments et {len(RELATIONS)} relations écrits dans data/")
    print("Lance maintenant :  python3 serveur.py")


if __name__ == "__main__":
    main()
