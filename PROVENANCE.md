# Provenance des données

> D'où vient chaque chiffre affiché par le Dashboard. À lire avant de faire
> confiance à un compteur.

**Statut au 11/08/2026.** Le Dashboard n'est connecté à aucune source en direct :
rien ne se met à jour tout seul, tout finira par diverger. Mais la qualité des
données a changé de nature avec l'export Substack officiel du 10/08/2026.

| Origine | Ce qu'elle garantit |
|---|---|
| **Export Substack** | Titres, sous-titres, dates de publication, statut publié/brouillon, audience. **Vérifiés, pas devinés.** |
| Banque de liens (11/08) | URLs et rattachement aux 6 sections. Fournie par Hamza. |
| PDF institutionnel | Les axes, le noyau conceptuel, les 4 axes de recherche. |
| Lecture Airtable | Les 3 personnages, l'état des tables. |
| Conversation | Outils, IA, canaux, projets. |

### Ce qui ne quitte jamais cette machine

L'export Substack contient deux choses qui ne sont **pas** versionnées, et que
le `.gitignore` bloque explicitement :

- `email_list.leverbevertical.csv` — les adresses de 103 abonnés
- `posts/*.html` — le corpus intégral, dont **5 articles réservés aux abonnés payants**

Seules les métadonnées dérivées entrent dans `data/`. Publier le dépôt ne
publie ni tes abonnés, ni tes textes payants.

---

## Tableau de provenance

| Fichier | Origine | Fiable ? |
|---|---|---|
| `schema.json` | Écrit à la main. Aucune source externe. | Le modèle est une décision, pas une donnée |
| `oeuvre.json` | 103 œuvres. Titres, sous-titres et dates **confirmés par l'export Substack**. URLs et sections issues de la banque de liens. 84 publiés, 19 brouillons. | **Vérifié** — sauf 1 titre encore déduit (`intuition-numineuse`, absent de l'export) |
| `concept.json` | Noyau conceptuel et 4 axes : sections III et IV du PDF. Les 7 archétypes sont déduits des titres des articles 1 à 7. Définitions reformulées. | Fidèle au PDF, reformulé |
| `personnage.json` | **Airtable**, table `Personnages` (`tblBkNntbHz5EikKn`), lue le 10/08/2026. | ⚠ Voir ci-dessous |
| `document.json` | 1 document vérifié (le PDF EN, présent dans le dépôt `International-version`). 2 déduits du PDF : la version FR et le codex — **jamais localisés**. | 1 sur 3 vérifié |
| `ia.json` | Écrit d'après la conversation. | ⚠ **Airtable a la vraie source** : table `Agents & Rôles`, 3 lignes. Non reprise |
| `outil.json` | Mélange : conversation, observation directe de la base Airtable, et outils cités en cours de route. | ⚠ Les 4 lignes de `Outils & Modalités` ne sont **pas** reprises telles quelles |
| `projet.json` | **Aucune source.** Déduit des lacunes constatées pendant la construction. | ⚠ **Écart principal — voir ci-dessous** |
| `canal.json` | Déduit du PDF et de la conversation. | Non vérifié |
| `institution.json` | Vide. | — |
| `relations.json` | 390 liens. La hiérarchie et les canaux sont écrits à la main ; les 72 rattachements `traite_de` sont **comptés dans le texte réel des articles** (seuil : 4 occurrences), avec le compte inscrit en note. | Mixte — les `traite_de` sont attestés |

---

## Les trois écarts à connaître

### 1. Les Projets n'ont pas de source

La base Airtable ne contient **aucune table Projets**. Les 7 projets affichés par
le Dashboard ont été rédigés par Claude Code à partir des manques observés.

Ils sont pertinents, mais ils ne sont le reflet de rien. C'est le principal écart
architectural : l'onglet le plus opérationnel du Dashboard est le moins ancré.

**Deux issues possibles**, à trancher :
- créer une table `Projets` dans Airtable, qui devient la source ;
- assumer que le Dashboard porte les projets et qu'Airtable ne les porte pas.

Tant que le choix n'est pas fait, ces 7 lignes sont une proposition, pas un registre.

### 2. Les personnages sont dédoublonnés ici, pas à la source

Airtable contient **6 fiches pour 3 personnages** : Leonudus, Métaloquus et Exion
sont chacun présents deux fois, tous marqués « Canon verrouillé », **avec des
contenus différents**. Deux lots créés à ~40 secondes d'intervalle le 09/08/2026.

Le Dashboard affiche **3**, parce que la fusion a été faite à la main en gardant
la version la plus riche. Chaque note conserve les deux `recId` d'origine.

**Conséquence : le compteur du Dashboard et Airtable ne diront jamais la même
chose tant que la source n'est pas nettoyée.** Le Dashboard a raison sur le fond,
Airtable a raison sur les faits. C'est Airtable qu'il faut corriger.

### 3. Les relations ne sont importées de nulle part

Les 103 relations sont écrites à la main. Aucune ne vient d'Airtable.

Or la table `VENTE — Circuit France` contient **28 nœuds** avec leurs relations,
stockées en texte libre dans les champs `Entrée depuis` et `Sortie vers` — pas en
liens Airtable. C'est le plus gros gisement de relations réelles de l'écosystème,
et il n'est pas dans la carte.

---

## Couverture Airtable → Dashboard

| Table Airtable | Lignes | Repris ? |
|---|---|---|
| `Agents & Rôles` | 3 | Non — `ia.json` est écrit indépendamment |
| `Handoffs IA` | 5 | Non |
| `Personnages` | 6 | **Oui**, dédoublonné en 3 |
| `KDP — Performance` | 0 | Sans objet — schéma prêt, aucune donnée importée |
| `VENTE — Circuit France` | 28 | Non |
| `Droits & Expansion canonique` | 4 | Non |
| `Expériences éditoriales` | 1 | Non |
| `Outils & Modalités` | 4 | Partiellement |
| `LUCID — Sync Queue` | 2 | Non |

**1 table sur 9 est reprise.** Le Dashboard n'est pas une vue d'Airtable : c'est
un inventaire parallèle qui a emprunté une table.

---

## Une distinction à ne pas perdre

`KDP — Performance` contient 0 enregistrement. Cela ne veut **pas** dire zéro vente.
Cela veut dire qu'aucun rapport n'a été importé.

*Infrastructure prête · données absentes* et *données présentes valant zéro* sont
deux états différents. Le Dashboard ne sait pas encore les distinguer — il ne
connaît pas KDP du tout.

---

## Ce que ce document n'est pas

Ce n'est pas un plan de synchronisation. Aucune couche d'adaptation Airtable n'est
construite, aucun connecteur n'est branché, aucune clé n'est stockée.

C'est l'inverse : l'énoncé honnête de ce que le Dashboard sait, de ce qu'il devine,
et de ce qu'il ignore — pour qu'aucun chiffre affiché ne soit pris pour une vérité
mesurée alors qu'il est une saisie manuelle.


---

## Note de méthode : comment les concepts sont rattachés

Les liens `traite_de` ne sont plus devinés d'après l'URL. Chaque article de
l'export est lu, son texte est débarrassé de ses balises, et l'on compte les
occurrences d'un vocabulaire propre au corpus. Un lien n'est créé qu'à partir
de **4 occurrences** — une mention isolée n'est pas un sujet. Le compte figure
dans la note de chaque relation, donc chaque lien est contestable pièce en main.

### Ce que la première version comptait mal

Elle rattachait **77 articles sur 103** au concept de l'Axe. La cause : le terme
« le verbe vertical » figure dans le pied de page de *chaque* article. C'est la
signature de la publication, pas un sujet traité. Les mots « information »,
« performance » et « transmission » posaient le même problème : trop ordinaires
pour signifier quoi que ce soit.

Après resserrement du vocabulaire, il reste **72 rattachements** répartis ainsi :
14 articles sur l'Axe, 11 sur l'Individuation, 7 sur l'Épicothérapie, 6 sur
l'Êtrejectif, et le reste sur les archétypes.

C'est une méthode grossière, et elle ne prétend pas remplacer une lecture. Elle
donne un échafaudage vérifiable, pas un jugement sur le sens.
