# Portfolio - Ilan KONAN

Personal game development portfolio built with HTML, CSS, and JavaScript.

Live version: [https://kossouurio.github.io/Portfolio/](https://kossouurio.github.io/Portfolio/)

## Overview

This website includes:

- A complete landing page (hero, about, skills, contact)
- A dynamically loaded Featured Projects section
- Client-side project sorting
- A project details page with GitHub README rendering

## Features

- Loads featured projects from [assets/projects.json](assets/projects.json)
- Enriches project data using the GitHub API (description, stars, language, updated date, etc.)
- Robust fallback: cards still render even if the GitHub API is unavailable
- Available sort options in the UI:
   - Default
   - Alphabetical (A-Z)
   - Most recent
   - Language
   - Label
- Displays a project type badge on each card (based on label/type in JSON)
- Links each card to a dedicated details page: [readme.html](readme.html)

## Project Structure

```
Portfolio
├── assets/
│   ├── fonts/
│   └── projects.json        # Featured projects configuration
├── css/
│   ├── reset.css
│   └── style.css
├── documents/
├── js/
│   ├── github.js            # Project loading, sorting, and rendering logic
│   └── main.js              # Global animations and interactions
├── index.html               # Main page
├── readme.html              # Project details page
└── README.md
```

## Projects Configuration

Featured projects are defined in [assets/projects.json](assets/projects.json):

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

Supported fields:

- `url` (required)
- `label` (recommended, used as project type)
- `type` (also supported as an alternative to `label`)
- `description` (optional)
- `demoUrl` (optional)
- `imageUrl` (optional)

## Run Locally

Simple option with VS Code Live Server:

1. Open the project folder
2. Start a local server from [index.html](index.html)

Terminal option:

1. From the project root, run:

```bash
python3 -m http.server 8000
```

2. Open:

```text
http://localhost:8000
```

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub REST API
- Marked.js (Markdown rendering in [readme.html](readme.html))

## Notes

- No build step or npm dependencies are required.
- A fallback strategy is already implemented to reduce issues caused by GitHub API limits.

## License

This project is released under the MIT License.
