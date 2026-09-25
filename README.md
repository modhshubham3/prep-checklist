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

**Saved progress is keyed by position**, e.g. `c2-3-7` = group 3, item 7. Add
new items at the **end** of a group. Inserting or deleting in the middle shifts
every later key, so ticks will land on the wrong questions.

## Deploy

Hosted on Vercel as a static site: import the repo, framework preset
**Other**, no build command, output directory = repo root.

`robots.txt` and a `noindex` meta tag keep it out of search results. Remove
both if it should be findable.
