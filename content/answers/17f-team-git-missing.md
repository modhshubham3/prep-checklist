# Team aur Git — chhoote hue topics

## Git ka roz ka flow — clone, branch, add, commit, pull, push
? Naye project pe pehle din se feature push karne tak Git ke kaunse commands chalaoge? fetch aur pull mein kya farak hai?
**Ek line:** repo **clone** karo → apni **branch** banao → badlav karo → **add** (stage) → **commit** (local save) → **pull/rebase** (dusron ke badlav lo) → **push** (server pe bhejo) → Pull Request.

| Command | Kaam |
| --- | --- |
| `git clone <url>` | Repo pehli baar laptop pe |
| `git switch -c feature/ABC-12-login` | Nayi branch banao aur us pe jao (`checkout -b` purana) |
| `git status` | Kya badla, kya staged hai |
| `git add file` / `git add .` | Commit ke liye chuno (stage) |
| `git commit -m "..."` | **Local** save — abhi server pe nahi |
| `git fetch` | Server ke badlav **sirf laao**, tumhari branch nahi badalti |
| `git pull` | fetch + **merge** (ya `--rebase`) apni branch mein |
| `git push -u origin feature/...` | Apni branch server pe |
| `git log --oneline` | History |

**Aise socho:** `add` = parcel mein saamaan **rakhna**, `commit` = parcel **pack karke label** lagana (ghar pe hi), `push` = courier ko **dena**. `fetch` = dekhna ki koi naya parcel aaya hai; `pull` = aaya hua parcel **khol ke saaman milana**.

```bash
git clone https://github.com/company/shop.git && cd shop
git switch -c feature/ABC-12-order-export
# ... code ...
git add src/Orders/ExportService.cs
git commit -m "ABC-12: Order export to CSV"
git fetch origin && git rebase origin/main       # latest main ke upar
git push -u origin feature/ABC-12-order-export  # phir PR
```

> clone → branch → add → commit → pull/rebase → push → PR. fetch sirf laata hai, pull mila bhi deta hai.

## Onshore–offshore / distributed team ke saath communication
? Client US mein hai aur team India mein — timezone gap ke saath communication aur handover kaise sambhalte ho?
**Ek line:** alag timezone mein kaam **likhit, saaf aur pehle se** hota hai — taaki doosri team jaage to bina tumhare jawab ke aage badh sake.

Jo bolna chahiye (apna example ho to aur achha):
- **Overlap hours** mein hi zaroori calls (standup, clarifications) — baaki async.
- **End-of-day update**: kya hua, kya atka, kal kya — ticket/Teams/Slack pe, taaki onshore subah padh le.
- **Sawaal poore context ke saath**: kya try kiya, screenshot/log, 2 options aur tumhari recommendation — "ye kaam nahi kar raha" nahi.
- **Decisions likho** — call pe jo tay hua wo ticket/Confluence pe; baad mein confusion nahi.
- **Detailed PR description** — kya, kyun, kaise test kiya — reviewer doosre timezone mein hai.
- **Blocker jaldi batao** — deadline wale din nahi.
- Requirements pe **assumptions confirm** karo, chupchaap mat maano.

STAR example type: "Ek baar requirement unclear thi aur client se jawab ek din baad aata. Maine do options likh ke apni recommendation ke saath bheje aur us beech jo hissa clear tha wo bana liya — agle din jawab aate hi baaki kaam 2 ghante mein ho gaya."

> Likhit, context ke saath, pehle se. Overlap hours mein sirf wo jo call ke bina nahi ho sakta.
