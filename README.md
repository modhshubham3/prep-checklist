# Interview prep checklist

C#, ASP.NET Core, Angular and PostgreSQL topics with a three-state checklist
(haan / thoda / naa) and two searchable cheatsheets. Progress is saved in the
browser's `localStorage`.

Plain static site — no framework, no build step.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```
npx serve .
```

## Editing content

All questions live in `js/data.js`:

| Constant | What it is |
|---|---|
| `DATA`   | The checklist — sections → groups → items |
| `CHEAT`  | Cheatsheet 1 — `[term, one-line answer]` pairs |
| `CHEAT2` | Cheatsheet 2 — `{ q, a, ex?, h?, t? }` objects (`t` renders a table) |

Progress is keyed by the **text** of each item, so reordering is safe. Editing
an item's text (the question, term or topic) starts its tick fresh; editing
only an answer keeps it.

## Sync between devices

`api/progress.js` is a Vercel function that stores progress in Upstash Redis.
No accounts: one device creates a random sync code, other devices enter it.
Marks merge per item by timestamp, and clearing a mark wins over an older mark.

Needs a Redis store connected to the Vercel project (Storage → Upstash Redis).
The integration injects `KV_REST_API_URL`/`KV_REST_API_TOKEN` or
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`; either pair works.
Without it the site still works, and the Sync panel says storage is missing.

## Deploy

Hosted on Vercel as a static site: import the repo, framework preset
**Other**, no build command, output directory = repo root.

`robots.txt` and a `noindex` meta tag keep it out of search results. Remove
both if it should be findable.
