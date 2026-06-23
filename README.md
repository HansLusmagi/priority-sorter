# Priority Sorter

A single-file HTML card sorting tool for workshop facilitators. Drag cards into priority columns, add notes, and export results as JSON with impact scores.

## Features

- **6 priority columns** — Cards to sort, Must have, Big win, Solid, Minor improvement, Barely matters
- **Drag & drop** — HTML5 native drag API
- **Multi-board** — create, rename, and switch between boards via the sidebar
- **Notes** — add, edit, and remove notes on individual cards
- **Column configuration** — right-click a column header to rename, change icon, or pick a color
- **Dark / light mode** — toggle in the sidebar footer
- **Export JSON** — download board data with impact scores for ICE analysis
- **Share via URL** — encode board data into the URL hash for easy team sharing
- **Import from JSON** — paste board JSON to import shared boards
- **Offline** — no runtime dependencies, works offline after initial load

## Usage

1. Open `index.html` in a browser
2. Click **+** on a column to add cards
3. Drag cards between columns to sort by priority
4. Click **Export JSON** to download results

### Sharing a board

Click **Share** in the top bar → copy the URL → send it to your team. Recipients open the link and are prompted to import.

## Deploy

Host as a static site — works on Cloudflare Pages, Netlify, GitHub Pages, or any static server. No build step required.

Files to deploy: `index.html`, `lucide.min.js`
