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
| `oeuvre.json` | 103 œuvres. Titres, sous-titres et dates **confirmés par l'export Substack**. URLs et sections issues de la banque de liens. 84 publiés, 18 brouillons, 1 stabilisé. Le registre Airtable en retient 96 (hors 6 sections et univers-racine) : **78 publiés, 18 brouillons**. | **Vérifié** — sauf 1 titre encore déduit (`intuition-numineuse`, absent de l'export) |
| `concept.json` | Noyau conceptuel et 4 axes : sections III et IV du PDF. Les 7 archétypes sont déduits des titres des articles 1 à 7. Définitions reformulées. | Fidèle au PDF, reformulé |
| `personnage.json` | **Airtable**, table `Personnages` (`tblBkNntbHz5EikKn`), lue le 10/08/2026. | ⚠ Voir ci-dessous |
| `document.json` | 1 document vérifié (le PDF EN, présent dans le dépôt `International-version`). 2 déduits du PDF : la version FR et le codex — **jamais localisés**. | 1 sur 3 vérifié |
| `ia.json` | Écrit d'après la conversation. | ⚠ **Airtable a la vraie source** : table `Agents & Rôles`, 3 lignes. Non reprise |
| `outil.json` | Mélange : conversation, observation directe de la base Airtable, et outils cités en cours de route. | ⚠ Les 4 lignes de `Outils & Modalités` ne sont **pas** reprises telles quelles |
| `projet.json` | **Airtable**, tables `Projets` et `Plan d'action`, créées et lues le 11/08/2026. 14 chantiers, 43 étapes. Chaque ligne porte son `recId`. | **Vérifié** — photo datée, pas une synchronisation |
| `handoff.json` | **Airtable**, table `Handoffs IA` (`tblIeLkEknzotSk1H`), 5 lignes, lues le 11/08/2026. | Vérifié — résumés ; le texte intégral reste dans Airtable |
| `media.json` | Produit par `generer_medias.py` depuis `inventaire_archive.csv`, lui-même produit par le rapatriement réel des fichiers. 83 dossiers, 436 images distinctes, empreintes SHA-256. | **Mesuré** — c'est le seul fichier de `data/` issu d'une vérification physique |
| `_registre.json` | Écrit à la main d'après ce qui a réellement été lu dans Airtable. | Trace de provenance, pas une donnée |
| `canal.json` | Déduit du PDF et de la conversation. | Non vérifié |
| `institution.json` | Vide. | — |
| `relations.json` | 390 liens. La hiérarchie et les canaux sont écrits à la main ; les 72 rattachements `traite_de` sont **comptés dans le texte réel des articles** (seuil : 4 occurrences), avec le compte inscrit en note. | Mixte — les `traite_de` sont attestés |

---

## Les trois écarts à connaître

### 1. Les Projets n'avaient pas de source — comblé le 11/08/2026

*C'était le principal écart architectural : l'onglet le plus opérationnel du
Dashboard était le moins ancré. Les 7 projets affichés avaient été rédigés par
Claude Code à partir des manques observés ; ils ne reflétaient rien.*

La première des deux issues envisagées a été retenue. Deux tables ont été créées :

| Table Airtable | Id | Lignes |
|---|---|---|
| `Projets` | `tblDqdx4gZQihq303` | 14 |
| `Plan d'action` | `tblF6i0g0huoKNeJv` | 43 |

Airtable est désormais la source, le Dashboard en est la lecture. Chaque projet de
`data/projet.json` porte son `recId` d'origine dans le champ `airtable` : tout ce
qui s'affiche est retrouvable dans le registre.

Les 7 projets d'origine ont été migrés, les 5 chantiers de la feuille de route du
11/08 ajoutés, et 2 écarts jusque-là seulement documentés ici sont devenus des
chantiers à part entière — le rattachement des personnages au corpus, et le niveau
canonique.

**Ce qui reste à surveiller** : c'est une photo datée, pas une synchronisation.
Aucune clé d'API n'est stockée dans le dépôt ; l'export se refait en le demandant
à Claude, pas en lançant un script. `data/_registre.json` porte la date de la
dernière photo, et l'écran Sources l'affiche.

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

Sur les 390 relations, **72 sont attestées** — les rattachements `traite_de`,
comptés dans le texte réel des articles. Toutes les autres sont écrites à la main.
Aucune ne vient d'Airtable.

Or la table `VENTE — Circuit France` contient **28 nœuds** avec leurs relations,
stockées en texte libre dans les champs `Entrée depuis` et `Sortie vers` — pas en
liens Airtable. C'est le plus gros gisement de relations réelles de l'écosystème,
et il n'est pas dans la carte.

---

## Couverture Airtable → Dashboard

| Table Airtable | Lignes | Repris ? |
|---|---|---|
| `Projets` | 14 | **Oui** → `projet.json` |
| `Plan d'action` | 43 | **Oui** → tableau `plan` de chaque projet |
| `Handoffs IA` | 5 | **Oui** → `handoff.json`, en résumé |
| `Personnages` | 6 | **Oui**, dédoublonné en 3 |
| `Corpus` | 96 | Non — `oeuvre.json` en contient 103, périmètre différent |
| `Concepts` | 18 | Non — `concept.json` est écrit indépendamment |
| `Agents & Rôles` | 3 | Non — `ia.json` est écrit indépendamment |
| `KDP — Performance` | 0 | Sans objet — schéma prêt, aucune donnée importée |
| `VENTE — Circuit France` | 28 | Non |
| `Droits & Expansion canonique` | 4 | Non |
| `Expériences éditoriales` | 1 | Non |
| `Outils & Modalités` | 4 | Partiellement |
| `LUCID — Sync Queue` | 2 | Non |

**4 tables sur 13 sont reprises.** Le Dashboard n'est pas une vue d'Airtable :
c'est une lecture partielle et datée, qui dit ce qu'elle ne lit pas.

Ce tableau est aussi affiché dans l'interface, écran **Sources**, où le compte est
recalculé à chaque rendu plutôt qu'écrit — de sorte qu'il ne peut pas dériver
d'avec la réalité sans que ça se voie.

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


---

## Une date sur un brouillon : ce n'est pas une erreur

`xxxxy-la-matrice-gyno-androgyne` est marqué **brouillon** et porte pourtant une
date de publication au 21/12/2025. C'est exact : `posts.csv` le donne avec
`is_published: false`, un titre complet et un `post_date` renseigné — le seul
cas sur 23 brouillons. Substack date certains brouillons qui ont été programmés
ou dépubliés.

La date est conservée telle quelle. La description du champ Airtable disait
« vide pour les brouillons » : c'est cette description qui était fausse, pas la
donnée. Elle a été corrigée. Effacer une date vraie pour faire coïncider les
faits avec une étiquette, ce serait détruire de l'information.


---

## L'archive médias : trois volumes, et pourquoi ils diffèrent

L'écran Médias affiche trois chiffres de volume. Les confondre donne trois fois
un faux chiffre — ils se distinguent par ce qu'on dédoublonne.

| Chiffre | Unité dédoublonnée | Valeur | Ce que c'est |
|---|---|---|---|
| Cumul apparent | rien | 1,46 Go | La somme brute des lignes. **Faux au sens du disque** : les réutilisations sont des liens physiques et ne pèsent rien. |
| Volume sur le disque | l'URL téléchargée | 920 Mo | Ce que `du` mesure. 482 fichiers. |
| Contenu unique | l'empreinte SHA-256 | 841 Mo | Ce qui resterait en dédoublonnant aussi par contenu. 436 images. |

L'écart entre les deux derniers n'est pas une erreur : **46 images sont identiques
au bit près tout en étant servies par deux URLs Substack distinctes.** Elles ont
donc été téléchargées deux fois. C'est un gisement de dédoublonnage, pas un défaut.

Contrôle croisé : 920 Mo = 877 Mio calculés, contre 879 M mesurés par `du` — l'écart
est l'inventaire CSV et les blocs de répertoire.

### Pourquoi chaque dossier d'article est complet

Le téléchargement dédoublonne : une image citée par cinq articles n'est récupérée
qu'une fois, sous le premier qui la référence. Sans correction, les quatre autres
dossiers auraient été incomplets — et la colonne « Archive maître » d'Airtable, qui
pointe vers `archive_medias/<slug>/`, aurait menti.

Une passe de complétion pose un **lien physique** vers le fichier déjà présent :
même inode, aucun octet supplémentaire. 220 réutilisations reliées. C'est ce qui
explique 702 fichiers rangés pour 482 fichiers réels sur le disque.
