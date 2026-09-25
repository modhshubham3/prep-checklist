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

**Answers** (the main page) are written in markdown under `content/answers/`,
one file per topic, read in filename order. After editing, rebuild:

```
node tools/build-answers.js
```

That regenerates `js/answers.js` — commit both. The markdown format (tables,
bullets, code blocks, `! interview trap`, `> memory hook`) is described at the
top of `tools/build-answers.js`. The build fails on a question with no answer
or a duplicated question.

The **checklist** (`DATA`) and **Cheatsheet 1** (`CHEAT`) are still plain
arrays in `js/data.js`.

Progress is keyed by the **text** of each item, so reordering is safe. Editing
an item's text (the question, term or topic) starts its tick fresh; editing
only an answer keeps it.

## Sync between devices

`api/progress.js` is a Vercel function that stores progress in Redis.
No accounts: one device creates a random sync code, other devices enter it.
Marks merge per item by timestamp, and clearing a mark wins over an older mark.

Needs a Redis store connected to the Vercel project (Storage). Either works:
- Redis Cloud (`REDIS_URL`, a redis:// connection string) — uses the `redis` package in package.json
- Upstash (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_*`) — plain REST, preferred if both are set
Without it the site still works, and the Sync panel says storage is missing.

## Deploy

Hosted on Vercel as a static site: import the repo, framework preset
**Other**, no build command, output directory = repo root.

`robots.txt` and a `noindex` meta tag keep it out of search results. Remove
both if it should be findable.
