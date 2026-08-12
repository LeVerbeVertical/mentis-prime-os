# Mentis Prime OS

L'interface de l'écosystème Mentis Prime. On l'ouvre, et on voit le système :
la Bibliothèque Axiale, le corpus, les concepts, les personnages, les médias
archivés, les chantiers avec leur plan d'action, et une carte de l'écosystème.

> **NORTH STAR OPÉRATIONNELLE — L'œuvre avant le logiciel.**
> Mentis Prime OS existe pour transformer le corpus en écosystème créatif et
> économique : créer, diffuser, gagner en visibilité, développer une audience,
> vendre, acquérir des lecteurs/prospects/clients qualifiés et récupérer du temps
> grâce à l'automatisation. **Toute infrastructure qui ne sert pas concrètement
> cette boucle doit être différée.**
>
> — Schéma Directeur v0.1, transcrit dans la table `Droits & Expansion canonique`

**Le système fonctionne en [MODE PILOTE](MODE_PILOTE.md)** : il choisit une
prochaine action utile et réversible, l'exécute, la vérifie, met le registre à
jour, et informe. Il ne renvoie pas de micro-choix à l'auteur. Cinq choses
seulement remontent à lui : le canon, une dépense, une action irréversible, les
données sensibles, un changement de cap.

---

## L'ouvrir

**Sans rien installer** — [ouvrir l'interface][preview]. Un seul fichier,
lecture seule, aucune requête sortante. Fonctionne sur téléphone.

**Pour travailler dedans** — il faut Python 3, rien d'autre :

```bash
git clone https://github.com/LeVerbeVertical/mentis-prime-os.git
cd mentis-prime-os
python3 serveur.py          # → http://localhost:8420
```

`python3 construire_page.py` régénère la copie autonome (`mentis-prime-os.html`).

[preview]: https://htmlpreview.github.io/?https://raw.githubusercontent.com/LeVerbeVertical/mentis-prime-os/claude/mentis-prime-os-guidance-10q1ya/mentis-prime-os.html

---

## Où vit la vérité

Quatre couches, dans l'ordre de stabilité. **Quand deux couches divergent, la
plus haute a raison.**

| Couche | Porte | Où |
|---|---|---|
| **I — Mémoire** | Sources maîtres : textes, PDF, images originales, archives | Drive · `archive_medias/` |
| **II — Registre** | L'état structuré et mutable : quoi existe, dans quel état | **Airtable** `appUqaTCTNgvQtrwq` |
| **III — Intelligence** | Les agents qui lisent, analysent, cartographient | Vertice · Claude Code |
| **IV — Circulation** | Publication, vente, diffusion | Substack · KDP · réseaux |

**Ce dépôt n'est aucune de ces couches.** C'est la mémoire technique : le code
qui lit les autres, plus une **photo datée** de ce qu'elles contenaient.

> Il n'existe **aucune liaison en direct**. Ce qui vient d'Airtable, de Drive ou
> de Substack a été lu une fois et recopié. Modifier Airtable ne modifie pas ce
> dépôt tant que l'export n'est pas refait. La date de la dernière photo est
> dans [`data/_registre.json`](data/_registre.json), et l'écran **Sources**
> l'affiche.

---

## Le dépôt

| | |
|---|---|
| `web/` | L'interface. Aucune bibliothèque externe, aucun outil de build. |
| `data/` | Les données, en JSON lisible et corrigeable à la main. |
| `data/_registre.json` | **D'où vient chaque fichier de `data/`**, et à quelle date. |
| `PROVENANCE.md` | Ce que le système sait, ce qu'il devine, ce qu'il ignore. |
| `MODE_PILOTE.md` | Le contrat de travail entre Hamza, Vertice et Claude Code. |
| `verifier.py` | **Contrôle reproductible.** Sort 0 si l'état est cohérent. |
| `serveur.py` | Serveur local, bibliothèque standard uniquement. |
| `construire_page.py` | Assemble la copie autonome à partir de `web/` et `data/`. |
| `amorcer.py` | Régénère les données d'origine. Écrase le travail en cours. |
| `rapatrier_medias.py` | A constitué l'archive maître des images, hors de Substack. |
| `mentis-prime-os.html` | La copie autonome, régénérée à chaque livraison. |

**Ce qui n'y est pas, et n'y sera jamais** : la liste des abonnés Substack, le
texte intégral des articles, les 5 textes réservés aux abonnés payants, les
920 Mo d'archive médias, et toute clé d'API. Le `.gitignore` les bloque
explicitement. Le dépôt est public ; ces choses ne le sont pas.

---

## L'état réel

Chiffres au 12/08/2026, tous recalculés depuis `data/` à chaque affichage.

| | |
|---|---|
| **103 œuvres** | 95 articles, 6 séries, 1 univers, 1 édition. Le registre Airtable en retient **96** : il ne compte que les objets Substack. Les deux chiffres sont justes — ils ne comptent pas la même chose. |
| **18 concepts** | Noyau conceptuel, axes de recherche, archétypes. |
| **3 personnages** | Logiques, après fusion. Airtable en contient **6 fiches**, toutes « Canon verrouillé », avec des contenus différents. Écart connu, non résolu. |
| **436 contenus visuels** | Distincts par empreinte SHA-256. Rangés en **482 fichiers** sur le disque, **702 entrées** réparties dans 83 dossiers d'article. Trois unités de comptage, aucune fausse. |
| **390 relations** | Dont 81 rattachements conceptuels, de deux natures qu'il ne faut pas confondre : **55 lexicaux** — comptés dans le texte réel, seuil de 4 occurrences, compte inscrit, donc contestables pièce en main — et **26 sémantiques**, déduits du titre et du propos. Une mesure et un jugement. Le reste est écrit à la main. |
| **14 chantiers** | Avec 43 étapes ordonnées. Une seule étape en cours à la fois. |

### Ce qui n'est pas prouvé

- **Zapier** — architecture préparée, aucun passage autonome prouvé. Le handoff
  de test porte un Passage ID vide. Signalé à Vertice : `ZAPIER-PREUVE-004`.
- **n8n** — workflow construit, jamais exécuté. Sa branche « Vers Claude » n'a
  pas de destination réelle.
- **KDP** — la table de suivi contient 0 enregistrement. Cela ne veut **pas**
  dire zéro vente : cela veut dire qu'aucun rapport n'a été importé.

---

## La séquence

Un seul chantier structurant à la fois. C'est une règle, pas un hasard.

| | Chantier | État |
|---|---|---|
| **P0** | Mentis Prime OS — interface et carte | **en cours** — durcissement après contre-audit |
| **P1** | Amazon KDP — rendre VIRILIS MENTIS PRIME vendable | à lancer |
| **P2** | Distribution — cartographier avant d'ouvrir | à lancer |
| **P3** | Transmédia — faire servir le patrimoine visuel | à lancer |
| **P4** | Diffusion — les réseaux comme surface, pas comme source | à lancer |

P0 se ferme **techniquement** — `python3 verifier.py` au vert et les tests
navigateur sans erreur — et non par une validation manuelle. P1 s'ouvre à cette
fermeture. Zapier et n8n ne sont pas prouvés mais **ne bloquent rien** : aucun
maillon de la boucle n'en dépend aujourd'hui.

Restent ouverts sans bloquer : dédoublonner les personnages, les rattacher au
corpus, poser le niveau canonique. Le détail de chaque plan est dans l'écran
**Projets**, et sa source dans Airtable.

> Attention à une collision de vocabulaire : les codes `P0/P1/P2` des tables
> `VENTE — Circuit France` et `Outils & Modalités` sont antérieurs et signifient
> « maintenant / prochain / plus tard ». Ils n'ont aucun rapport avec les
> chantiers ci-dessus.

---

## Deux histoires Git sans ancêtre commun

**Fait vérifié** : `main` et `claude/mentis-prime-os-guidance-10q1ya` n'ont
**aucun ancêtre commun**. `git merge-base` ne renvoie rien. `main` part du commit
`10ae93f` et ne contient qu'un README initial ; la branche de travail part de
`545bcd0` et contient tout le système.

**Conséquence pratique** : aucune fusion standard n'est possible, et un
`--allow-unrelated-histories` ou un `push --force` produirait un historique
faux ou détruirait une lignée. **Aucune des deux opérations ne sera faite.**

Ce n'est pas un problème aujourd'hui : la branche est publique et lisible, et
tout ce qui compte y est. C'en deviendra un le jour où quelqu'un ouvrira le
dépôt sans préciser la branche et croira le trouver vide.

**Ce qu'il faudra faire, plus tard, et seulement après la fermeture de P0** :
désigner la branche de travail comme branche par défaut du dépôt, puis archiver
`main` sous un autre nom plutôt que de tenter de réconcilier deux racines. Une
seule opération, réversible, sans réécriture d'historique — mais c'est une
décision de gouvernance du dépôt, pas une tâche technique, et elle appartient à
Hamza.

En attendant : **toutes les URL doivent préciser la branche.**

---

## Règles de travail

Elles viennent du Schéma Directeur et tiennent le système debout :

1. **Aucune IA ne convertit une interprétation en canon.** La décision
   canonique est humaine, toujours.
2. **La carte n'est pas décorative.** Chaque nœud est un élément réel, chaque
   trait une relation enregistrée. Rien n'y est dessiné à la main.
3. **Un chiffre affiché doit être calculé**, jamais recopié — sinon il dérive
   en silence.
4. **Airtable décrit, la Bibliothèque conserve, ce dépôt versionne.** Aucun ne
   remplace l'autre.
5. **Deux agents n'écrivent jamais sur la même source sans coordination.**
6. **Une action irréversible ne relève jamais du MODE PILOTE**, même petite.
   C'est la réversibilité qui décide, pas la taille.

---

*Le dépôt est public pour que le système soit inspectable. La Bibliothèque
Axiale, elle, ne dépend d'aucune plateforme — y compris celle-ci.*
