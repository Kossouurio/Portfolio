# Portfolio - Ilan KONAN

Portfolio personnel orienté Game Development, réalisé en HTML, CSS et JavaScript.

Version en ligne: [https://kossouurio.github.io/Portfolio/](https://kossouurio.github.io/Portfolio/)

## Apercu

Ce site presente:

- Une page d'accueil complete (hero, about, skills, contact)
- Une section Featured Projects chargee dynamiquement
- Un tri cote utilisateur des projets
- Une page detail par projet avec affichage du README GitHub

## Fonctionnalites

- Chargement des projets depuis [assets/projects.json](assets/projects.json)
- Enrichissement via API GitHub (description, stars, language, date, etc.)
- Fallback robuste: les cartes restent affichables meme si l'API GitHub est indisponible
- Tri disponible dans l'interface:
   - Default
   - Alphabetical (A-Z)
   - Most recent
   - Language
   - Label
- Affichage du type de projet sur les cartes (base sur label/type du JSON)
- Navigation vers une page detail via [readme.html](readme.html)

## Structure Du Projet

```
Portfolio
├── assets/
│   ├── fonts/
│   └── projects.json        # Configuration des projets affiches
├── css/
│   ├── reset.css
│   └── style.css
├── documents/
├── js/
│   ├── github.js            # Chargement/tri/rendu des projets
│   └── main.js              # Animations et interactions globales
├── index.html               # Page principale
├── readme.html              # Page detail projet
└── README.md
```

## Configuration Des Projets

Les projets affiches sont definis dans [assets/projects.json](assets/projects.json):

```json
{
   "repositories": [
      {
         "url": "https://github.com/OWNER/REPO",
         "label": "Game",
         "description": "Short description"
      }
   ]
}
```

Champs pris en charge:

- `url` (obligatoire)
- `label` (recommande pour le type affiche sur la carte)
- `type` (supporte aussi comme alternative a `label`)
- `description` (optionnel)
- `demoUrl` (optionnel)
- `imageUrl` (optionnel)

## Lancer Le Projet En Local

Option simple avec VS Code Live Server:

1. Ouvrir le dossier du projet
2. Lancer un serveur local sur [index.html](index.html)

Option terminal:

1. Depuis la racine du projet, executer:

```bash
python3 -m http.server 8000
```

2. Ouvrir ensuite:

```text
http://localhost:8000
```

## Stack Technique

- HTML5
- CSS3
- JavaScript (Vanilla)
- GitHub REST API
- Marked.js (rendu markdown dans [readme.html](readme.html))

## Notes

- Le projet ne necessite pas de build step ni de dependances npm.
- Pour eviter les limites API GitHub, une strategie de fallback est deja integree.

## Licence

Ce projet est distribue sous licence MIT.
