# Provenance des données

> D'où vient chaque chiffre affiché par le Dashboard. À lire avant de faire
> confiance à un compteur.

**Statut au 11/08/2026 : le Dashboard n'est connecté à aucune source.**
Toutes les données de `data/` ont été saisies à la main par Claude Code, à partir
de trois origines : le PDF institutionnel, une lecture ponctuelle d'Airtable, et
la conversation. **Rien ne se met à jour tout seul. Tout va diverger.**

---

## Tableau de provenance

| Fichier | Origine | Fiable ? |
|---|---|---|
| `schema.json` | Écrit à la main. Aucune source externe. | Le modèle est une décision, pas une donnée |
| `oeuvre.json` | Les 17 articles viennent de l'annexe du PDF `Univers_Mentis_Prime_Institutional_Document_EN.pdf`, pages 18–19. L'univers-racine a été ajouté comme conteneur, il n'existe pas dans le PDF. | Titres fiables · **URLs jamais saisies** |
| `concept.json` | Noyau conceptuel et 4 axes : sections III et IV du PDF. Les 7 archétypes sont déduits des titres des articles 1 à 7. Définitions reformulées. | Fidèle au PDF, reformulé |
| `personnage.json` | **Airtable**, table `Personnages` (`tblBkNntbHz5EikKn`), lue le 10/08/2026. | ⚠ Voir ci-dessous |
| `document.json` | 1 document vérifié (le PDF EN, présent dans le dépôt `International-version`). 2 déduits du PDF : la version FR et le codex — **jamais localisés**. | 1 sur 3 vérifié |
| `ia.json` | Écrit d'après la conversation. | ⚠ **Airtable a la vraie source** : table `Agents & Rôles`, 3 lignes. Non reprise |
| `outil.json` | Mélange : conversation, observation directe de la base Airtable, et outils cités en cours de route. | ⚠ Les 4 lignes de `Outils & Modalités` ne sont **pas** reprises telles quelles |
| `projet.json` | **Aucune source.** Déduit des lacunes constatées pendant la construction. | ⚠ **Écart principal — voir ci-dessous** |
| `canal.json` | Déduit du PDF et de la conversation. | Non vérifié |
| `institution.json` | Vide. | — |
| `relations.json` | **100 % écrites à la main.** Aucune n'est importée. | ⚠ Voir ci-dessous |

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
