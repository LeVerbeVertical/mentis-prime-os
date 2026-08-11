# Inventaire Mentis Prime

Le tableau de bord de ton écosystème. Il répond à une seule question :
**qu'est-ce qui existe, où est-ce, dans quel état, et comment tout cela est-il relié ?**

Tout tourne sur ta machine. Rien ne part sur internet, aucune clé, aucun compte, aucun dépôt.

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

---

## Ce qu'il y a dedans au démarrage

| | |
|---|---|
| **60 éléments** | 18 œuvres, 18 concepts, 9 outils, 5 projets, 4 canaux, 3 documents, 3 IA |
| **95 relations** | qui relie quoi à quoi |
| **0 personnage, 0 institution** | ces deux-là, je ne les connais pas — c'est à toi |

Tout est pré-rempli à partir du corpus des 17 articles, du document institutionnel
et des outils que tu utilises. Ce qui manque est signalé dans l'écran **État des lieux**.

---

## Les quatre écrans

**État des lieux** — les compteurs, et surtout ce qui manque : documents perdus,
projets bloqués, articles sans lien, éléments reliés à rien. Clique sur un compteur
pour ouvrir la liste correspondante.

**Inventaire** — tout, cherchable et filtrable. Clique sur une ligne pour ouvrir sa fiche.

**Projets** — la seule vue orientée action : statut, priorité, prochaine action, blocage.

**Carte** — le graphe. Il est *calculé* depuis les données, jamais dessiné à la main.
Si un nœud est là, l'élément existe. Glisse un nœud pour le déplacer, la molette zoome,
un clic ouvre la fiche.

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

- aucune connexion à Drive, Airtable, Notion, Substack ou GitHub
- aucune clé d'API
- aucun agent autonome, aucune orchestration entre IA
- aucune automatisation, aucune publication
- aucun envoi de données vers l'extérieur

Les fiches `IA` et `outil` sont **descriptives** : elles enregistrent ce qui existe,
elles ne pilotent rien.

La séquence est : **inventorier → cartographier → structurer → stocker → connecter
→ orchestrer → automatiser → expérimenter**. On en est aux deux premiers.

---

## La suite

Quand l'inventaire sera fiable — personnages saisis, documents localisés,
URLs complétées — on pourra parler de GitHub, de stockage partagé et de connecteurs.
Pas avant.
