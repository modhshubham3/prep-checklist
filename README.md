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
bullets, code blocks, `? practice prompt`, `! interview trap`, `> memory hook`) is described at the
top of `tools/build-answers.js`. The build fails on a question with no answer
or a duplicated question.

Give a question a `? ...` line when its title is just a term ("CLR") — practice
mode shows that line instead, phrased the way an interviewer would ask.

The **checklist** (`DATA`) and **Cheatsheet 1** (`CHEAT`) are still plain
arrays in `js/data.js`.

Progress is keyed by the **text** of each item, so reordering is safe. Editing
an item's text (the question, term or topic) starts its tick fresh; editing
only an answer keeps it.

## Sync between devices

`api/progress.js` is a Vercel function that stores progress in Redis.
No accounts: one device creates a random sync code, other devices enter it.
Marks, notes and user records (interview diary entries, own questions, daily
practice counts) merge per item by timestamp; a clear or delete wins over an
older copy. Record shapes are documented in `api/progress.js`.

Needs a Redis store connected to the Vercel project (Storage). Either works:
- Redis Cloud (`REDIS_URL`, a redis:// connection string) — uses the `redis` package in package.json
- Upstash (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_*`) — plain REST, preferred if both are set
Without it the site still works, and the Sync panel says storage is missing.

## Answer judge (practice mode)

Practice answers (typed, or spoken via the browser's speech recognition) are
graded by `api/judge.js`: Claude compares the answer with the card's notes and
returns a score, right/partial/wrong, what was covered and missed, mistakes,
feedback and a model answer. Mock interview mode asks 8 mixed questions and
ends with a hire / next round / not selected verdict from the scores.

Setup — add one key to the Vercel project's environment variables and redeploy:
- `GEMINI_API_KEY` (free tier from Google AI Studio; Google may use free-tier
  content to improve its products). Model: `GEMINI_MODEL`, default
  `gemini-3.8-flash`.
- or `ANTHROPIC_API_KEY` (paid). Model: `JUDGE_MODEL`, default `claude-opus-5`.
With both set, Claude is used unless `JUDGE_PROVIDER=gemini`. Limits:
`JUDGE_PER_HOUR` (per IP, default 60) and `JUDGE_PER_DAY` (site-wide, default
400), kept in the sync Redis. Without a key the page falls back to a rough
keyword check and says so; "AI app ke liye copy" puts a grading prompt on the
clipboard for any chat app.

## PDF of all answers

```
node tools/print.js out/answers.html
chrome --headless=new --no-pdf-header-footer --user-data-dir=out/profile --print-to-pdf=out/answers.pdf out/answers.html
```

Every card in full (written order, tables, code, trap, hook) grouped with a
clickable index, plus the cheatsheet as an appendix. Diagrams are left out.
`--user-data-dir` keeps it from handing off to an already-open Chrome.

The full PDF is ~9.5 MB — too big for uploads capped near 11 MB once
encoded. `node tools/print.js out/part1.html 1/3` (then `2/3`, `3/3`) splits
it at group boundaries into ~3 MB parts; numbering continues across parts and
the cheatsheet goes in the last one.

## Deploy

Hosted on Vercel as a static site: import the repo, framework preset
**Other**, no build command, output directory = repo root.

`robots.txt` and a `noindex` meta tag keep it out of search results. Remove
both if it should be findable.
