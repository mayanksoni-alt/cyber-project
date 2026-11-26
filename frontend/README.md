# Frontend — NetHawk UI

React + Vite single-page app. Clean, fast, card-based interface.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
```
Make sure the backend is running on port 4000 (the dev server proxies `/api` to it).

## Build for production
```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Structure
```
index.html
src/
  main.jsx                   React entry
  App.jsx                    page + polling logic
  api.js                     backend calls
  styles.css                 all styling
  components/
    ScanForm.jsx             URL input
    ScoreRing.jsx            circular score gauge (SVG)
    SummaryBar.jsx           severity count chips
    VulnCard.jsx             expandable finding card
    HistoryList.jsx          recent scans
```
