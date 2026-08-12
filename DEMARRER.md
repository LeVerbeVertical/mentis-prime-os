# Mentis Prime OS

L'interface de ton écosystème. Tu l'ouvres, et tu vois le système :
la Bibliothèque Axiale, le corpus, les concepts, les personnages, les médias
archivés, les chantiers avec leur plan d'action, et une carte de l'écosystème.

Tout tourne sur ta machine. Rien ne part sur internet, aucune clé, aucun compte.

---

## Le lancer

Il te faut **Python 3**, déjà installé sur Mac et sur Linux.
Sur Windows : installe-le depuis python.org en cochant « Add Python to PATH ».

Ouvre un terminal dans ce dossier, puis :

```bash
python3 serveur.py
```

Ton navigateur s'ouvre sur `http://localhost:8420`.
Pour arrêter : `Ctrl+C` dans le terminal.

C'est tout. Rien à installer.

**Vérifier que tout est cohérent** — à tout moment, avant comme après une
modification :

```bash
python3 verifier.py
```

Il contrôle les données contre le modèle, la règle « une seule étape en cours »,
la fraîcheur de l'export Airtable et la cohérence du catalogue médias. Il sort 0
si tout va bien. Les avertissements signalent ce qui vieillit, pas ce qui casse.

---

## Le consulter sans rien lancer

Pour simplement **regarder** le système — depuis un téléphone, ou pour le
montrer à quelqu'un — il existe une copie en lecture seule, en un seul fichier :

```bash
python3 construire_page.py
```

Cela produit `mentis-prime-os.html` : l'interface **et** les données dans un
fichier unique, qui s'ouvre d'un double-clic, sans Python et sans serveur.
Rien n'y est enregistrable, et la page ne contacte personne — aucune requête
ne sort, jamais.

La version qui **s'édite** reste `python3 serveur.py`. La copie ne remplace pas
le serveur : elle sert à voir, pas à travailler.

---

## Ce qu'il y a dedans

| | |
|---|---|
| **108 éléments** | 103 œuvres, 18 concepts, 14 chantiers, 12 outils, 4 canaux, 3 documents, 3 IA, 3 personnages |
| **390 relations** | qui relie quoi à quoi |
| **436 images archivées** | 83 dossiers d'article, hors de Substack, avec leurs empreintes |

Le corpus vient de l'export Substack officiel. Les chantiers viennent de la table
**Projets** d'Airtable. L'archive médias a été rapatriée fichier par fichier.
Ce qui manque est signalé sur l'**Accueil** et détaillé dans **Sources**.

---

## Les écrans

**Accueil** — le panorama, l'étape en cours, et les quatre capacités que le
Schéma Directeur exige du système : retrouver, relier, vérifier, traverser.
Chaque carte mène à l'écran qui la démontre.

**Écosystème** — la carte des quatre couches du Schéma Directeur, avec la
Bibliothèque Axiale au centre et chaque plateforme à sa place. Chaque nœud
porte son état **réel** : lu en direct, photo datée, sans canal, jamais branché.
Filtre par état ; clique un compteur pour savoir de quoi il est fait, une
plateforme pour l'état de sa connexion.

**Bibliothèque** — tout, cherchable et filtrable. Clique une ligne pour sa fiche.

**Médias** — le catalogue de l'archive maître. Par article : les fichiers, leur
taille, leur empreinte SHA-256, et lesquels sont partagés avec un autre article.

**Projets** — les chantiers dans l'ordre décidé, chacun avec son plan d'action
étape par étape. Une seule étape est en cours à la fois. Chaque étape porte son
livrable et son critère de fin — sans lui, une étape ne se ferme jamais.

**Sources** — d'où vient chaque chiffre, et ce que le système ignore. Les tables
reprises d'Airtable, celles qui ne le sont pas, et pourquoi.

**Carte · Dossier Axial · Réseau Axial** — les trois représentations du graphe.
Toutes *calculées* depuis les données, jamais dessinées à la main. Si un nœud est
là, l'élément existe.

---

## Comment ça s'utilise

**Modifier** — ouvre une fiche, change un champ. C'est enregistré tout seul.
En haut à droite, l'indicateur passe de « modification… » à « enregistré ».

**Créer** — bouton `+ Nouvel élément` dans l'écran Inventaire.

**Relier deux choses** — dans une fiche, en bas de la section « Ce que cet élément pointe » :
choisis le sens, le verbe, la cible, puis `Relier`.
L'interface ne propose que les liens qui ont un sens : tu ne peux pas relier
n'importe quoi à n'importe quoi.

**Supprimer** — bouton rouge en bas de la fiche. Les liens associés partent avec.

---

## Où sont tes données

Dans le dossier `data/`, en fichiers JSON. Un par type, plus `relations.json`.

Tu peux les ouvrir dans n'importe quel éditeur de texte et corriger à la main.
C'est voulu : tant que le modèle est jeune, tu dois pouvoir tout réparer sans passer
par le logiciel. Relance simplement le serveur après une modification manuelle.

**Sauvegardes** — une copie horodatée est faite dans `data/_versions/` avant chaque
enregistrement. Les 20 dernières sont gardées. Si tu casses quelque chose, tu récupères
un dossier là-dedans.

**Repartir de zéro** — `python3 amorcer.py` régénère les données d'origine.
⚠️ Cela écrase ton travail (une sauvegarde est faite dans `data/_sauvegarde/` avant).

---

## Le modèle

**9 types d'éléments** : œuvre, concept, personnage, document, IA, outil, projet,
canal, institution.

**10 verbes de relation**, et seulement ceux-là :

| Verbe | Répond à |
|---|---|
| `partie_de` | Quel document appartient à quelle œuvre ? |
| `traite_de` | De quoi ce texte parle-t-il ? |
| `apparait_dans` | Où ce personnage existe-t-il ? |
| `stocke_dans` | Quel outil contient quelle donnée ? |
| `publie_sur` | Où est-ce diffusé ? |
| `travaille_sur` | Quelle IA travaille sur quoi ? |
| `utilise` | De quoi ce projet a-t-il besoin ? |
| `depend_de` | Quelle action dépend de quelle autre ? |
| `derive_de` | D'où vient cette version ? |
| `vise` | Quel projet s'adresse à quelle institution ? |

Le vocabulaire est volontairement **fermé**. C'est ce qui empêche la carte de devenir
un plat de spaghettis où tout serait « lié » à tout. Si un lien te manque vraiment,
il s'ajoute dans `data/schema.json`.

---

## Ce que ce produit ne fait pas

Volontairement, à ce stade :

- **aucune liaison en direct.** Ce qui vient d'Airtable, de Drive ou de Substack
  est une *photo datée* : une lecture faite à un instant, recopiée dans `data/`.
  Modifier Airtable ne modifie pas cet écran tant que l'export n'est pas refait.
- aucune clé d'API dans le dépôt — l'export se redemande, il ne se déclenche pas
- aucun agent autonome, aucune orchestration entre IA
- aucune automatisation, aucune publication
- aucun envoi de données vers l'extérieur : le serveur ne parle qu'à ton navigateur

Les fiches `IA` et `outil` sont **descriptives** : elles enregistrent ce qui existe,
elles ne pilotent rien.

La séquence est : **inventorier → cartographier → structurer → stocker → connecter
→ orchestrer → automatiser → expérimenter**. Les deux premiers sont faits ; le
troisième est en cours.

---

## Mode pilote

Le système avance seul sur ce qui est réversible : il choisit une action utile,
l'exécute, la vérifie, met le registre à jour et te le dit. **Il ne te demande
pas la permission de faire son travail.**

Cinq choses seulement remontent à toi : le **canon**, une **dépense**, une action
**irréversible**, les **données sensibles**, un **changement de cap**. Le reste
s'exécute puis se raconte — dans cet ordre.

Le contrat complet est dans `MODE_PILOTE.md`, et il est rappelé sur l'Accueil et
sur l'écran Projets.

---

## La suite

Le chantier **P0** se termine par un **durcissement**, pas par une validation :
il se ferme quand `verifier.py` est au vert et que les tests navigateur passent.
Les chantiers suivants — KDP, distribution, transmédia, diffusion — sont écrits
et ordonnés dans l'écran **Projets**, et s'ouvrent un par un.
