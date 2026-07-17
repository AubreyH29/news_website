# The Daily Ledger

A responsive news foundation with a React editorial interface, Express API and PostgreSQL persistence.

## Run locally

1. Copy `.env.example` to `.env`.
2. No API key is required for real headlines: the server aggregates the public RSS feeds from BBC News, NPR, The Guardian, and ESPN. Optional: register at [NewsAPI](https://newsapi.org/register), then put its key in `NEWS_API_KEY` to add NewsAPI headlines to that mix.
3. Run `docker compose up --build` and open http://localhost:5173.

For development without Docker, run `npm install` and `npm run dev`. The API runs on port 4000 and Vite proxies `/api` to it.

## Features

- Landing page with a lead story and editor's selection.
- Filterable feed with an intersection-observer infinite scroll.
- Dedicated article pages, including full-source attribution and a source link.
- API normalizes real public RSS and optional NewsAPI articles into categories; saved articles are stored in PostgreSQL.
