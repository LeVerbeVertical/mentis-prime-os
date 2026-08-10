# Mentis Prime OS — Personal Creative Operating System

Contexte
--------
Mentis Prime OS est mon tableau de bord personnel pour piloter mes œuvres (univers narratifs, articles, livres, personnages) et orchestrer plusieurs intelligences artificielles (Claude, ChatGPT) et outils (Airtable, Drive, Substack, KDP). Ce dépôt est strictement privé et destiné à un usage personnel.

Objectif
--------
Fournir une base simple, claire et extensible pour :
- décider quoi faire aujourd'hui (Command Center),
- inventorier et suivre les projets (Corpus/Œuvres),
- cartographier les connexions conceptuelles (Knowledge Map),
- orchestrer des agents IA avec rôles et permissions (AI Operations),
- formaliser stratégie de publication (Strategy),
- expérimenter en sécurité (AI Lab).

Principes directeurs
--------------------
1. Priorité aux fonctions : faire marcher les workflows avant toute décoration.  
2. Lisibilité et simplicité du code/structure.  
3. Orchestration et permissions explicites pour les agents IA.  
4. Isolation stricte de l’AI Lab pour toute action sensible.  
5. Confidentialité : dépôt privé, usage personnel uniquement.

Architecture (6 couches)
------------------------
1. Command Center
   - Ce qui demande ma décision aujourd'hui : tâches priorisées, décisions en attente, actions rapides.
   - Composants attendus : dashboard minimal (Markdown / JSON), liste de tâches datée.

2. Corpus / Œuvres
   - Inventaire des projets (statuts, dépendances, métadonnées).
   - Composants attendus : fichiers manifest (YAML/JSON) par œuvre, index central.

3. Knowledge Map
   - Graphe visuel reliant œuvres, concepts, IA et canaux.
   - Composants attendus : export du graphe (graphml/JSON), cartes source (notes / obsidian / md).

4. AI Operations
   - Définition des agents, rôles, tâches, niveaux d’autonomie et règles de validation humaine.
   - Composants attendus : spec agents (agents.yaml), policies d’autonomie, simulateur local (scripts).

5. Strategy
   - Objectifs, calendrier de publication et canaux de distribution.
   - Composants attendus : roadmap.md, matrix de distribution (CSV/Sheets).

6. AI Lab
   - Espace expérimental isolé ; toute action sensible doit exiger validation humaine explicite.
   - Composants attendus : workspace/experiments/, checklist de validation, logs d’audit.

Organisation du dépôt (fichiers recommandés)
---------------------------------------------
- README.md (ce fichier)
- .gitignore (fichier minimal ci‑dessous)
- docs/
  - architecture.md (détails de conception et décisions)
  - roadmap.md
- manifest/
  - corpus.yaml (index des œuvres)
  - agents.yaml (définitions d’agents et permissions)
- command-center/
  - today.md (liste quotidienne)
- ai-lab/
  - experiments/ (répertoires isolés pour chaque expérimentation)
  - policy.md (règles de validation)
- tools/
  - scripts/ (scripts d’utilité locale, non distribués)
- private/ (emplacement réservé pour secrets locaux ; ne jamais committer de clés)

Comment démarrer (premier commit)
-------------------------------
1. Cloner le dépôt privé ou initialiser localement si vous partez de zéro.  
2. Copier ces fichiers (README.md et .gitignore) à la racine.  
3. Committer avec un message simple : `chore: first clean commit — README + structure initiale`.  

Commandes (exemple)
```bash
git clone git@github.com:LeVerbeVertical/mentis-prime-os.git
cd mentis-prime-os
# si le dépôt est vide et pas encore initialisé localement, vous pouvez init:
# git init
# git remote add origin git@github.com:LeVerbeVertical/mentis-prime-os.git

# ajouter les fichiers README.md et .gitignore puis commit + push
git add README.md .gitignore
git commit -m "chore: first clean commit — README + structure initiale"
git push origin main
```

Remarques de sécurité et confidentialité
---------------------------------------
- Ce dépôt doit rester privé. Ne commitez jamais de clés API, mots de passe ou exports non chiffrés dans le repo.
- Placez les secrets dans des fichiers locaux listés dans `.gitignore` et utilisez des variables d’environnement pour les scripts.
- AI Lab : toute expérimentation qui peut publier ou publier automatiquement doit obligatoirement inclure une étape de confirmation humaine.

Étapes suivantes recommandées (après ce commit initial)
-------------------------------------------------------
1. Créer les fichiers de manifeste minimal : `manifest/corpus.yaml` et `manifest/agents.yaml`.  
2. Mettre en place une checklist d’expérimentation dans `ai-lab/policy.md`.  
3. Ajouter un petit script d’export quotidien depuis `command-center/today.md` (optionnel).  
4. Ne pas déployer d’infrastructure avancée avant d’avoir validé la structure et les fichiers ci‑dessous.

Contact et notes
----------------
Ce dépôt est personnel — adaptez les formats (YAML/JSON/MD) selon vos outils habituels (Airtable, Obsidian, etc.). Si vous voulez, je peux générer les fichiers `manifest/agents.yaml` et `manifest/corpus.yaml` de base ensuite.
