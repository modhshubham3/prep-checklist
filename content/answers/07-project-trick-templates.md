# Project, performance aur security answers

## Project Architecture
? Apne current project ki architecture explain karo.
"Apne project ka architecture samjhao" — ye lagbhag har interview mein aata hai, aur yahan interviewer check karta hai ki tumne sach mein system dekha hai ya sirf apna ek module. **Sirf wahi layers aur technologies bolo jo tumne sach mein use ki hain** — follow-up questions mein banaya hua sab khul jaata hai.

Request ke safar ki tarah bolo — upar se neeche:

**Angular frontend** → components service ke through `HttpClient` se call karte hain → **HTTP Interceptor** JWT token jodta hai aur errors sambhalta hai → **Nginx / load balancer** (SSL, routing, kai instances) → **.NET Web API** → **Controller** (routing, validation, DTOs) → **Service layer** (business logic) → **Repository / data layer** (EF Core ya Dapper, ya PostgreSQL functions) → **PostgreSQL**. Saath mein: authentication (JWT), logging (structured logs, Elasticsearch/Kibana agar hai), caching (Redis agar hai), messaging (Kafka/RabbitMQ agar hai), deployment (Docker, Jenkins).

Whiteboard pe 3 minute mein bolne layak ready rakho, aur apna **role** saaf batao — "maine ye module banaya, ye APIs, ye DB functions". Ek line business context bhi: system kiske liye hai aur kya problem solve karta hai.

```text
Angular ──HttpClient──► Interceptor (JWT) ──► Nginx / LB ──► .NET Web API
                                                              │
                                   Controller → Service → Repository
                                                              │
                                                         PostgreSQL
            + Logging (Elastic/Kibana)  + Docker/Jenkins deploy  + Redis/Kafka (agar hai)
```

! Jo cheez use nahi ki (Kubernetes, microservices, Kafka) wo impressive dikhne ke liye mat bolo — ek follow-up mein pakde jaoge aur baaki jawab ki credibility bhi jaayegi.

## Explain One API
? Apne project ki ek API ka poora flow batao — request se response tak.
"Apni koi ek API end-to-end samjhao" — interviewer dekhta hai ki tum request ke har step ko samajhte ho. Ek aisi API chuno jo tumne khud banayi ho aur jisme thoda asli logic ho (sirf CRUD nahi).

Is sequence mein bolo:

1. **Request** — method + URL + input: `GET /api/vehicles?status=Active&page=1`, ya `POST` body mein DTO.
2. **Authentication/Authorization** — JWT validate, role/policy check.
3. **Controller** — model binding, validation (400 agar galat), service ko call.
4. **Service / business logic** — rules, calculations, doosri services, transaction.
5. **Database** — query ya PostgreSQL function; paging, filtering, indexes ka zikr.
6. **Mapping** — entity/row → **DTO** (sensitive fields nahi).
7. **Response** — status code (200/201/404/409) + JSON; errors global handler se ProblemDetails.
8. **Cross-cutting** — logging, caching agar hai, performance ka koi kaam kiya ho.

Aakhir mein ek **challenge** jodo: "Is API mein ye problem aayi thi, maine aise solve ki" — sabse zyada impact wala hissa yahi hota hai.

```text
GET /api/vehicles?status=Active&page=1
 → [Authorize] JWT check
 → VehiclesController.List(filter)       validate page/pageSize
 → VehicleService.GetAsync(filter)       business rules
 → Repository / fn_get_vehicles(...)     WHERE + ORDER BY + LIMIT/OFFSET, index use
 → map to VehicleDto
 → 200 { data, totalCount, page, pageSize }
```

## Pagination
? API mein pagination kaise implement karoge? Offset aur keyset mein farak?
**Pagination** matlab bada data ek saath bhejne ki jagah **chhote pages** mein bhejna. Isse DB, server memory, network aur browser — sab bachte hain.

**Offset pagination** (sabse common): frontend `page` aur `pageSize` bhejta hai. Backend: `skip = (page - 1) × pageSize`. Page 2, size 10 → skip 10. SQL: `ORDER BY id LIMIT 10 OFFSET 10`. Saath mein `totalCount` (alag `COUNT` query) taaki frontend total pages dikha sake.

**Deterministic `ORDER BY` zaroori hai** — bina order ke database kisi bhi order mein rows de sakta hai, pages mein items repeat ya gayab ho jaayenge. Unique column (jaise id) tie-breaker ke roop mein rakho.

**Offset ki problem**: `OFFSET 100000` pe bhi database ko 100000 rows padh ke phenkni padti hain — gehre pages slow. Aur page padhte waqt koi naya record insert hua to items khisak jaate hain. **Keyset (cursor) pagination** ise solve karti hai: "last dekhi id ke baad wale 10" — `WHERE id > :lastId ORDER BY id LIMIT 10`. Index se seedha wahan pahunchta hai, har page utna hi tez. Infinite scroll aur bade tables ke liye best; par "page 57 pe jaao" jaisa jump nahi hota.

Server-side pagination poora dataset application memory mein laane se bachata hai. `pageSize` ki max limit lagao.

```sql
-- Offset
SELECT id, reg_no, status FROM vehicles
ORDER BY id LIMIT 10 OFFSET 10;                    -- page 2
SELECT COUNT(*) FROM vehicles;                 -- total

-- Keyset (gehre pages bhi tez)
SELECT id, reg_no, status FROM vehicles
WHERE id > 20                                      -- pichhle page ki aakhri id
ORDER BY id LIMIT 10;
```

| Offset | Keyset |
|---|---|
| `LIMIT/OFFSET` | `WHERE id > last LIMIT` |
| Kisi bhi page pe jump | Sirf next/previous |
| Gehre pages slow | Har page utna hi tez |
| Inserts se items khisak sakte hain | Stable |

## Logging
? Apne project mein logging kaise karte ho?
**Logging** production ki aankhein hain — bug aaye to logs hi batate hain kya hua. Achhi logging ke rules:

**Structured logging**: message ko string jod ke mat banao; **named placeholders** use karo — `_logger.LogError(ex, "Failed to fetch vehicle {VehicleId}", id)`. Isse log mein `VehicleId` ek alag searchable field banta hai (Kibana mein `VehicleId: 42` filter kar sakte ho). String interpolation (`$"..."`) se ye fayda chala jaata hai.

**Log levels sahi use karo**: `Trace/Debug` (development detail), `Information` (important business events — order placed), `Warning` (kuch ajeeb par app chal rahi hai — retry hua), `Error` (operation fail — exception), `Critical` (app ya bada hissa down). Production mein level `Information` ya `Warning` rakho.

**Kya log karein**: exceptions (stack trace ke saath — `LogError(ex, ...)`, sirf `ex.Message` nahi), important business operations, external calls ka result/time, slow queries. **Correlation/Trace ID** har log mein, taaki ek request ke saare logs (aur kai services mein) jod sako.

**Kya kabhi log mat karo**: passwords, JWT tokens, OTP, card details, poora PII — logs aksar bahut logon ke paas pahunchte hain.

**Centralized logging**: kai servers/containers ke logs ek jagah — **ELK/Elastic stack** (Elasticsearch + Kibana), Seq, Grafana Loki, Application Insights. .NET mein **Serilog** popular hai (sinks: console, file, Elasticsearch).

```csharp
_logger.LogInformation("Order {OrderId} placed by {UserId}, amount {Amount}", order.Id, userId, order.Total);

try { await _gateway.ChargeAsync(order); }
catch (Exception ex)
{
    _logger.LogError(ex, "Payment failed for order {OrderId}", order.Id);   // stack trace ke saath
    throw;
}

// GALAT: _logger.LogError($"Payment failed {ex.Message}");   // structure nahi, stack trace nahi
```

## Difficult Production Issue
? Sabse mushkil production issue jo tumne solve kiya — batao.
"Koi mushkil production issue batao jo tumne solve kiya" — ye behavioural + technical dono hai. **STAR** format use karo: **Situation → Task → Action → Result**.

- **Situation** — kya ho raha tha, kitna bada impact (kitne users, kaunsa feature, kab se).
- **Task** — tumhari zimmedari kya thi.
- **Action** — sabse bada hissa. **Kaise debug kiya** (logs, metrics, EXPLAIN ANALYZE, reproduce), kya hypotheses the, kaunsa galat nikla, asli root cause kya tha, kya fix kiya aur kyun.
- **Result** — numbers ke saath: "response time 8s se 300ms", "OOM kills band", "incident dobara nahi hua". Aur kya seekha / kya prevention lagaya (alert, test, monitoring).

Example structure: "Production API slow thi (Situation). Mujhe root cause dhoondhna tha (Task). Logs se pata chala zyada time ek DB query mein ja raha tha; `EXPLAIN ANALYZE` mein Seq Scan dikha kyunki filter wale column pe index nahi tha aur data 1 crore rows tak badh gaya tha. Composite index banaya CONCURRENTLY taaki table lock na ho, aur query ko paging ke saath rewrite kiya (Action). Response time 6 second se 200 ms aaya aur DB CPU 90% se 30% (Result)."

**Sirf apna asli issue batao**, aur measurable impact tabhi bolo jab sach mein ho. Interviewer "ye kaise pata chala?", "aur kya try kiya?" jaise follow-ups se depth check karta hai.

```text
S: Kya toota, kitna impact
T: Meri zimmedari
A: Kaise debug kiya → hypothesis → root cause → fix (aur kyun ye fix)
R: Numbers + prevention + seekh
```

! Sirf "maine fix kar diya" — kaise pata chala aur kyun wahi fix, ye missing ho to jawab kamzor lagta hai.

## Security
? Apni API ko secure kaise karte ho?
API security ek list nahi, **layers** hai — ek toote to doosri bachaye. Main points:

- **HTTPS everywhere** — data encrypted, HSTS.
- **Authentication** — JWT/OAuth2/OpenID Connect; tokens short-lived, refresh tokens; passwords **hash** (bcrypt/Argon2/ASP.NET Identity), kabhi plain ya reversible encryption nahi.
- **Authorization** — har endpoint pe `[Authorize]`, roles/policies, aur **resource-level check**: user sirf apna order dekh sake (`order.UserId == currentUserId`) — iske bina **IDOR** (id badal ke doosre ka data dekhna) — ye bahut common vulnerability hai.
- **Input validation** — server-side, hamesha; whitelist approach.
- **SQL injection** se bachav — **parameterized queries** / EF Core / Dapper parameters; string concatenation se SQL kabhi nahi.
- **XSS** — output encoding (Angular by default karta hai; `innerHTML`/`bypassSecurityTrust` sochke), Content-Security-Policy header.
- **CORS** — sirf apne frontend origins allow, `*` credentials ke saath kabhi nahi.
- **Rate limiting** — login aur expensive endpoints pe (.NET 7+ built-in `AddRateLimiter`).
- **Secrets** — Git mein nahi; environment variables, Key Vault; appsettings mein passwords nahi.
- **Error handling** — client ko stack trace/SQL nahi; generic message + traceId.
- **Logging/auditing** — kaun, kab, kya badla; par logs mein passwords/tokens nahi.
- **Dependencies** update — vulnerable NuGet/npm packages (`dotnet list package --vulnerable`, `npm audit`).
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options/CSP frame-ancestors.

```csharp
// SQL injection — GALAT
var sql = $"SELECT * FROM users WHERE email = '{email}'";

// SAHI — parameterized
var user = await conn.QueryFirstOrDefaultAsync<User>("SELECT * FROM users WHERE email = @email", new { email });
var user2 = await db.Users.FirstOrDefaultAsync(u => u.Email == email);   // EF bhi parameter banata hai

// IDOR se bachav
var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == currentUserId);
if (order is null) return NotFound();
```

> SQL injection ka ilaaj: parameterized queries. IDOR ka ilaaj: har record pe "kya ye isi user ka hai?"

## API Performance
? API performance kaise improve ki? Numbers ke saath batao.
API performance improve karne ke tareeke — par pehle **measure** karo (APM, logs mein timing, `EXPLAIN ANALYZE`), phir sabse bade bottleneck pe kaam karo. Andaze se optimize karna time barbaad karta hai.

1. **Database query optimization** — zyada tar slow APIs ka asli kaaran. N+1 hatao, sirf zaroori columns, sahi JOINs.
2. **Proper indexes** — WHERE, JOIN, ORDER BY columns pe; `EXPLAIN` se verify.
3. **Async I/O** — `async/await` end-to-end; `.Result`/`.Wait()` nahi (thread pool starvation).
4. **Pagination** — bada data kabhi ek saath nahi.
5. **DTO projection** — `Select` se sirf zaroori fields; `AsNoTracking` read queries pe.
6. **Caching** — baar-baar same data (master data, config, dashboards) — IMemoryCache / Redis.
7. **External calls kam aur smart** — parallel karo (`Task.WhenAll`) jahan independent hon, timeouts lagao, `IHttpClientFactory` use karo (socket exhaustion se bachne ke liye).
8. **Resource management** — connections/streams dispose, connection pool sahi size.
9. **Response compression** — gzip/Brotli.
10. **Monitoring/profiling** — p95/p99 latency track karo, sirf average nahi; regression pakadne ke liye alerts.

Aur bhaari kaam (report generation, bulk import, emails) ko request ke andar mat karo — **background job/queue** mein daal do aur client ko turant `202 Accepted` do.

```csharp
// Independent calls — parallel
var profileTask = _profile.GetAsync(id);
var ordersTask  = _orders.GetRecentAsync(id);
await Task.WhenAll(profileTask, ordersTask);

builder.Services.AddResponseCompression(o => o.EnableForHttps = true);
builder.Services.AddHttpClient<PaymentClient>(c => c.Timeout = TimeSpan.FromSeconds(10));
```

## Database Performance
? Database performance kaise improve ki?
Slow PostgreSQL query ko theek karne ka step-by-step tareeka:

1. **Reproduce** — exact query aur parameters (app logs, `pg_stat_statements` se sabse zyada total time wali queries).
2. **`EXPLAIN (ANALYZE, BUFFERS)`** — asli plan aur time.
3. **Scans dekho** — bade table pe Seq Scan jahan thodi rows chahiye = index missing ya use nahi ho raha.
4. **Joins dekho** — galat join type, bade nested loops, missing join condition (rows explode).
5. **Filters** — column pe function (`DATE(created_at)`, `lower(email)`) index ko bekaar karta hai; implicit type cast bhi.
6. **Indexes** — sahi column order wala composite index, partial index, covering (`INCLUDE`) index. Unused indexes hatao (writes slow karte hain).
7. **Row estimates vs actual** — bada farak = stale statistics → `ANALYZE table`.
8. **Unnecessary columns kam** — `SELECT *` ki jagah zaroori columns; Index Only Scan possible ho sakta hai.
9. **Data volume** — bina filter ka bada data, purana data archive, bade tables ko partition.
10. **Re-test** — same `EXPLAIN ANALYZE`, aur production mein metrics se verify.

Saath mein: bloat (VACUUM), locks (`pg_locks`, lambi transactions), connection count (PgBouncer), aur `work_mem` (sorts disk pe spill ho rahe hon to).

```sql
SELECT query, calls, round(mean_exec_time::numeric, 1) AS avg_ms, round(total_exec_time::numeric) AS total_ms
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;      -- sabse bhaari queries

EXPLAIN (ANALYZE, BUFFERS) SELECT ... ;

-- Function wala filter index nahi use karta:
-- WHERE DATE(created_at) = '2026-09-01'
-- Better:
-- WHERE created_at >= '2026-09-01' AND created_at < '2026-09-02'
```

# Trick questions — yahan log fisalte hain

## Does async create a new thread?
**Nahi, apne aap nahi.** `async` keyword sirf method ko state machine mein badalta hai taaki usme `await` ho sake. Method caller ke thread pe hi synchronously shuru hota hai, aur pehle `await` tak wahin chalta hai.

Jab `await` kisi **I/O** operation (DB, HTTP, file) pe aata hai, to wait ke dauraan **koi thread use nahi hota** — thread wapas pool mein chala jaata hai, aur OS jawab aane pe notify karta hai. Continuation baad mein kisi pool thread pe chal sakti hai. Naya thread (pool se) tab use hota hai jab tum explicitly `Task.Run()` karo — jo CPU-bound kaam ke liye hai.

Isliye async ka asli fayda **threads bachana** hai (scalability), naye threads banana nahi.

```csharp
public async Task<string> GetAsync()
{
    Console.WriteLine(Environment.CurrentManagedThreadId);   // caller ka thread
    var s = await http.GetStringAsync(url);                   // wait mein koi thread busy nahi
    return s;
}
await Task.Run(() => HeavyCpuWork());   // YAHAN pool thread use hota hai
```

## Is IQueryable always faster than IEnumerable?
**Nahi.** Ye **provider, query aur data** pe depend karta hai.

IQueryable ka fayda tab hai jab data source **database** ho — filtering, sorting, paging SQL mein jaata hai aur kam data network pe aata hai. Par agar data already **memory** mein hai (List), to IQueryable (`AsQueryable()`) ka koi fayda nahi — ulta expression tree banane ka overhead hai.

Aur IQueryable ke saath bhi slow ho sakta hai: complex LINQ jo EF bura SQL banaye, bina index ke column pe filter, N+1, ya aisa expression jo translate na ho. Kabhi-kabhi data ek baar laake (`ToList`) memory mein kai operations karna, DB pe baar-baar jaane se tez hota hai.

Sahi jawab: "IQueryable DB pe filtering push karne deta hai, jo aam taur pe bade data pe fayda deta hai — par ye hamesha tez nahi; generated SQL aur execution plan dekhna padta hai."

## Should every DB column have an index?
**Nahi.** Har index ki keemat hai:

- **Writes slow** — har `INSERT`, `UPDATE` (indexed column ka), `DELETE` pe har index bhi update hota hai. 10 indexes = har insert pe 11 jagah likhna.
- **Disk aur memory** — index jagah leta hai, aur cache (shared_buffers) mein data ke saath competition karta hai.
- **Planner** ko zyada options, maintenance (VACUUM, bloat) zyada.

Index wahan banao jahan **query patterns** maangte hain — WHERE, JOIN, ORDER BY mein aksar aane wale columns, aur jahan `EXPLAIN` dikhaye ki fayda hai. Kam distinct values wale columns (boolean, gender) pe normal index aksar bekaar hai (partial index shayad). Unused indexes dhoondh ke hatao (`pg_stat_user_indexes` mein `idx_scan = 0`).

```sql
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;
```

## Does DELETE always release disk space?
**Nahi, PostgreSQL mein nahi.** MVCC ki wajah se `DELETE` rows ko physically nahi hatata — sirf **dead** mark karta hai. File ka size wahi rehta hai.

**VACUUM** dead rows ki jagah **reusable** banata hai (nayi rows wahan aa jaayengi), par OS ko space wapas nahi deta. OS ko space wapas chahiye to **VACUUM FULL** (exclusive lock, poori table rewrite) ya **pg_repack** (online). Regularly purana data hatana hai to **partitioning** aur purana partition `DROP` — turant aur poori jagah wapas.

`TRUNCATE` aur `DROP` turant space wapas dete hain — par wo saari rows / poori table hatate hain.

## Is Singleton always best for performance?
**Nahi.** Singleton ek hi instance banata hai to object creation ki cost bachti hai — par **lifetime resource ki zaroorat aur thread-safety** se match honi chahiye, performance se nahi.

Problems: (1) **Thread-safety** — ek instance ko ek saath saari requests use karengi; mutable state pe lock lagana padega, jo khud contention aur slowness laata hai. (2) **Captive dependency** — Singleton mein Scoped service (DbContext) inject kiya to wo bhi hamesha zinda — DbContext thread-safe nahi, change tracker memory bharta rahega, stale data. (3) Memory — jo data Singleton mein pada hai wo kabhi free nahi hota.

Sahi rule: **stateless ya thread-safe, mehngi cheezein** (config, cache, HttpClient factory) → Singleton. **Per-request state** (DbContext, unit of work) → Scoped. **Halki, stateless helpers** → Transient bhi bilkul theek hai (object banana sasta hai).

## Should microservices be used everywhere?
**Nahi.** Microservices ki **operational complexity** badi hai — network failures, distributed transactions (Saga), eventual consistency, service discovery, har service ka alag deploy/monitor, distributed tracing, zyada infra aur DevOps skill. Chhoti team ya naye product ke liye ye complexity fayde se zyada nuksaan deti hai.

Microservices tab justify hoti hain jab: alag parts ko **alag scale** karna ho, **kai teams** independently deploy karna chahein, alag hisson ki alag reliability/tech needs hon, aur organisation ke paas DevOps maturity ho.

Aam salah: **modular monolith** se shuru karo — saaf module boundaries ke saath. Jab kisi module ko sach mein alag hona pade, tab use service mein nikalo. Complexity requirement se justify honi chahiye, trend se nahi.

## Is JWT encrypted?
**Normal JWT (JWS) encrypted nahi, sirf signed hai.** Header aur payload sirf **Base64URL encoded** hain — koi bhi token ko jwt.io pe daal ke saare claims padh sakta hai. Signature sirf ye guarantee deta hai ki token **badla nahi gaya** aur issuer ne hi banaya hai (integrity + authenticity), confidentiality nahi.

Isliye payload mein **password, card number, sensitive personal data kabhi mat daalo** — sirf user id, roles, expiry jaisi cheezein. Aur token hamesha **HTTPS** pe bhejo (warna network pe koi chura ke use kar sakta hai).

Encryption chahiye to **JWE** (JSON Web Encryption) hota hai — par zyada tar APIs mein zaroorat nahi padti.

```text
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiI0MiIsInJvbGUiOiJBZG1pbiJ9 . <signature>
   {"alg":"HS256"}       {"sub":"42","role":"Admin"}   ← koi bhi decode karke padh sakta hai
```

## Is authentication the same as authorization?
**Nahi.** **Authentication** = "**tum kaun ho?**" — identity verify karna (username/password, JWT, OTP). **Authorization** = "**tumhe kya karne ki ijaazat hai?**" — authenticated user ko specific resource/action ka access hai ya nahi (roles, policies, ownership).

Order hamesha: pehle authentication, phir authorization — isliye ASP.NET Core mein `UseAuthentication()` pehle, `UseAuthorization()` baad mein. Status codes bhi alag: authentication fail = **401 Unauthorized**, authorization fail = **403 Forbidden**.

Example: office building — gate pe ID card check karna authentication hai; ID card se sirf apne floor ka darwaza khulna authorization hai.

## Does ToList() execute IQueryable?
**Haan, generally.** `ToList()` (aur `ToListAsync`) query ko **materialize** karta hai — isi pal EF Core SQL generate karke database pe bhejta hai aur results ko memory mein ek `List` mein bhar deta hai.

Iske baad ke saare LINQ operations **memory mein** (LINQ to Objects) chalte hain, database pe nahi. Isliye filtering, sorting, paging `ToList()` se **pehle** karo. Doosre materializing methods bhi query chalate hain: `ToArray`, `ToDictionary`, `First/Single` (+OrDefault), `Count`, `Any`, `Sum`, `Max`, aur `foreach`.

```csharp
var q = db.Orders.Where(o => o.Total > 100);   // abhi SQL nahi
var list = await q.ToListAsync();               // ab SQL chala
var top = list.OrderBy(o => o.Id).Take(10);     // ye ab memory mein — DB pe nahi
```

## Is AsNoTracking always faster?
**Aksar, par hamesha nahi aur hamesha farak laayak nahi.** `AsNoTracking` change tracking ka overhead hatata hai (snapshots, identity map), jo **read-only queries pe, khaas kar bade result sets pe**, memory aur time dono bachata hai.

Par: (1) do-chaar rows pe farak na ke barabar hai. (2) Agar same entity result mein kai baar aati hai (join se), no-tracking har baar **naya object** banata hai — memory zyada ho sakti hai (`AsNoTrackingWithIdentityResolution` iska ilaaj). (3) Agar data update karna hai to no-tracking entity pe `SaveChanges` kuch nahi karega — phir attach/load karna padega. (4) `Select` projection waise bhi track nahi hota.

Sahi jawab: "Read-only queries ke liye tracking overhead kam karta hai, par context matter karta hai — update scenario mein galat choice hai."

## Is Angular *ngIf same as [hidden]?
**Nahi.** `*ngIf` false hone pe element ko **DOM se hata deta hai** — component **destroy** hota hai (state khatam, `ngOnDestroy`), aur true hone pe **naya bana** (`ngOnInit`, API calls phir se).

`[hidden]` element ko **DOM mein rakhta hai**, sirf CSS se chhupata hai (`display: none`) — component zinda, state aur subscriptions chalti rehti hain, content page source mein dikhta hai.

Choice: bhaari, kabhi-kabhi dikhne wale hisse → `*ngIf`; baar-baar toggle aur state bachani ho → `[hidden]`.

## Does every Observable require manual unsubscribe?
**Nahi.** Jo Observables **khud complete** ho jaate hain unka unsubscribe zaroori nahi — jaise **HttpClient** calls (ek response deke complete), `of()`, `from(array)`, `first()`/`take(1)` wale streams. Complete hone pe RxJS apne aap cleanup kar deta hai.

**Long-lived / infinite** streams ko band karna zaroori hai, warna memory leak aur destroyed component mein code chalta rehta hai: `interval`, `fromEvent`, `Subject`/`BehaviorSubject`/store subscriptions, router events, form `valueChanges`, WebSockets.

Best tareeke: template mein **`async` pipe** (khud unsubscribe), `takeUntilDestroyed()` (Angular 16+), ya `takeUntil(destroy$)`. HTTP ke saath bhi `takeUntilDestroyed` lagana harmless hai aur component chhodne pe chalti request cancel kar deta hai.

## Is throw same as throw ex?
**Nahi.** Catch block mein exception dobara phenkne ke do tareeke:

**`throw;`** — original exception ko **uske original stack trace ke saath** aage bhejta hai. Logs mein exact line dikhegi jahan asli error hua. **Yahi use karo.**

**`throw ex;`** — stack trace ko **reset** kar deta hai — ab trace us catch block wali line se shuru hoga, aur asli error kahan hua wo jaankari **kho jaati** hai. Debugging bahut mushkil.

Agar extra context jodna hai to naya exception phenko aur original ko **inner exception** mein rakho: `throw new OrderException("…", ex);` — dono traces bache rahenge.

```csharp
try { ProcessOrder(); }
catch (Exception ex)
{
    _logger.LogError(ex, "Order processing failed");
    throw;                                            // SAHI — original stack trace bacha
    // throw ex;                                      // GALAT — stack trace yahin se shuru
    // throw new OrderFailedException("Context", ex); // context + original inner exception
}
```

## Is POST idempotent?
**Generally nahi.** **Idempotent** ka matlab: same request **baar-baar** bhejo to server pe effect **ek baar bhejne jaisa** hi rahe. POST aam taur pe naya resource banata hai — do baar bhejo to **do orders**, do payments.

Ye real problem hai: network timeout pe client retry kare, ya user double-click kare, to duplicate records. Ilaaj: **Idempotency-Key** header — client har operation ke liye ek unique key bhejta hai; server key yaad rakhta hai aur same key dobara aaye to naya record banane ki jagah pehla result lauta deta hai. Payment gateways (Razorpay, Stripe) yahi karte hain. Frontend pe submit button disable/`exhaustMap` bhi madad karta hai, par asli guarantee server pe.

| Method | Idempotent | Safe (kuch nahi badalta) |
|---|---|---|
| GET | Haan | Haan |
| PUT | Haan | Nahi |
| DELETE | Haan | Nahi |
| POST | Nahi | Nahi |
| PATCH | Zaroori nahi | Nahi |

## Is PUT idempotent?
**Haan — HTTP semantics ke hisaab se designed idempotent hai**, agar sahi implement kiya jaaye. PUT resource ko **poori tarah replace** karta hai given state se: `PUT /users/10 { name: "Ravi", age: 30 }` ek baar bhejo ya das baar — end state wahi rahegi.

Par implementation pe depend karta hai: agar tumhara PUT handler `age = age + 1` ya "counter badhao" jaisa kaam kare, ya har call pe naya audit record banaye jo business state hai, to wo idempotent nahi rahega. Isliye PUT ko "yeh state set karo" ki tarah likho, "yeh change lagao" ki tarah nahi.

DELETE bhi idempotent hai — pehli baar delete, doosri baar resource hai hi nahi (response 404 ho sakta hai, par server state wahi). **PATCH** zaroori nahi — `{ "op": "increment" }` jaisa patch har baar badlega.

# Templates — tell me about yourself, project explain

## Project Questions
? Project ke baare mein aur kya-kya poochha ja sakta hai?
Project ke baare mein ye sawaal lagbhag pakke aate hain, aur har ek ke peeche interviewer kuch specific check kar raha hai. Har ek ka **apne project se** ek-do minute ka jawab ready rakho — asli naam, asli numbers, asli problems ke saath.

| Sawaal | Interviewer kya dekhna chahta hai |
|---|---|
| Tell me about yourself | 60–90 second ka professional summary |
| Explain your current project | Architecture + business purpose |
| What exactly is your responsibility? | Tumhara personal contribution |
| Which APIs did you develop? | Real backend experience |
| Which Angular features did you implement? | Frontend ownership |
| Which DB queries/functions did you write? | SQL ability |
| Tell me about a production issue | Debugging approach |
| Tell me about a performance issue | Optimization ability |
| How do you deploy? | DevOps understanding |
| How does authentication work? | Security understanding |
| How does pagination work? | Full-stack understanding |
| How do you handle exceptions? | Production maturity |
| How do you log errors? | Observability |
| How do you troubleshoot DB issues? | Database maturity |
| What would you improve? | Engineering judgment |

"**What would you improve?**" ko halke mein mat lo — yahan achha jawab (jaise "tests ki coverage kam hai", "N+1 queries hain jo main theek karna chahta hoon", "logging structured nahi hai") dikhata hai ki tum system ko critically dekhte ho. "Sab perfect hai" sabse kamzor jawab hai.

! "Hum" bahut zyada — "hamne ye banaya". Interviewer ko jaanna hai **tumne** kya kiya. "Maine" bolo jahan tumhara kaam tha.

## Tell Me About Yourself Template
Ye interview ka pehla sawaal aur pehla impression hai — **60–90 second**, rata hua nahi, bolne ka flow. Structure: **Present → Past → Skills → Why here**.

Template (apne hisaab se badlo):

"I have around 2–3 years of experience in software development, mainly working with **Angular, ASP.NET Core Web APIs and PostgreSQL**. In my current role, I work on **frontend development, API development, database queries and functions, debugging and production support**. I have also worked with **Docker, Nginx, Jenkins** and application monitoring and logging. My experience is mainly around **developing features end-to-end and troubleshooting real production issues** — for example [ek chhota asli achievement, number ke saath]. I'm now looking for a role where I can [kya chahte ho — bade scale, better practices, ownership]."

Tips: resume line-by-line mat padho. Ek **concrete achievement** zaroor daalo — wahi interviewer ka agla sawaal banega, to aisa chuno jisme tum strong ho. Personal life (hometown, hobbies) tab tak mat daalo jab tak poocha na jaaye. Aakhir mein naturally project pe le aao, taaki agla sawaal tumhare comfort zone mein aaye.

> Present (abhi kya karte ho) → Past (kya kiya) → Skills → Aage kya chahte ho. 60–90 second.

## Explain Your Project Template
? Apna project 2 minute mein explain karo.
Project explain karne ka order — isse jawab bikharta nahi:

1. **Problem** — project kya problem solve karta hai?
2. **Users** — kaun use karta hai?
3. **Angular ka role** — frontend kya karta hai
4. **.NET API ka role** — business operations
5. **PostgreSQL ka role** — kya data, kaise store
6. **Authentication** — login/token kaise
7. **Deployment** — kahan aur kaise chalta hai
8. **Tumhari responsibility** — exactly kya kiya
9. **Ek mushkil issue** — aur kaise solve kiya

Example (apne asli project se match karo):

"The application is a **transport/fleet management platform**. Angular is used for the frontend, ASP.NET Core Web APIs handle business operations, and PostgreSQL stores operational and reporting data. The frontend communicates with the APIs over HTTP; authentication is token-based; and services are deployed as containers behind a reverse proxy and load balancer. My responsibilities include Angular development, API development, PostgreSQL functions and queries, debugging and production issue resolution. One challenging issue I worked on was [asli issue — kya toota, kaise pakda, kya fix kiya, result]."

**Company ke internal naam, table names, client data interview mein mat batao** — generic shabdon mein samjhao ("vehicle tracking table", "trip data"). Aur wahi bolo jo tumhare project mein sach mein hai.

```text
Problem → Users → Angular → .NET API → PostgreSQL → Auth → Deployment → Meri zimmedari → Ek challenge
```

## 30 Questions To Master First
Agar time kam hai, to ye **30 sawaal pehle pakke karo** — inme se zyada tar har .NET full-stack interview mein kisi na kisi roop mein aate hain. Har ek ke liye **definition + example + apne project mein kahan** bol paana chahiye.

| # | Sawaal | Kya samjha paana chahiye |
|---|---|---|
| 1 | IEnumerable vs IQueryable vs List | Execution kahan + DB translation |
| 2 | Deferred execution | ToList() kab query chalata hai |
| 3 | async/await | I/O + threads (naya thread nahi) |
| 4 | Dependency Injection | Kyun + lifetimes |
| 5 | Scoped vs Singleton vs Transient | Real examples, captive dependency |
| 6 | Interface vs Abstract class | Kab kaunsa |
| 7 | ref / out / in | Exact farak |
| 8 | Value vs Reference type | Copy behaviour |
| 9 | Garbage Collection | Gen 0/1/2, IDisposable |
| 10 | == vs Equals | Equality, GetHashCode |
| 11 | Middleware | Request pipeline, order |
| 12 | Global exception handling | Middleware / IExceptionHandler |
| 13 | JWT | Poora authentication flow |
| 14 | Authentication vs Authorization | 401 vs 403 |
| 15 | ControllerBase vs Controller | API vs MVC |
| 16 | HTTP status codes | 200/201/204/400/401/403/404/409/500 |
| 17 | EF Core | DbContext, DbSet, change tracking |
| 18 | AsNoTracking | Read-only queries |
| 19 | Lazy vs Eager loading | Include() |
| 20 | N+1 problem | Pakadna + fix |
| 21 | SQL index | Fayde aur trade-offs |
| 22 | EXPLAIN ANALYZE | Query optimization |
| 23 | Transactions | Commit / Rollback |
| 24 | ACID | Har letter ka real example |
| 25 | DELETE / TRUNCATE / DROP | Exact farak |
| 26 | PostgreSQL MVCC / VACUUM | Disk kyun kam nahi hoti |
| 27 | Angular Observable | RxJS, lazy, unsubscribe |
| 28 | switchMap vs mergeMap | Practical use |
| 29 | Angular Interceptor | JWT + error handling |
| 30 | Project architecture | Angular → API → DB |

**Har bade sawaal ka answer formula**: 1. **Definition** (kya hai) → 2. **Why** (kyun chahiye) → 3. **Example** (code ya scenario) → 4. **Real project usage** ("mere project mein…") → 5. **Trade-off / limitation**.

Example — "What is Dependency Injection?": **Definition**: dependency class ke andar `new` se banne ki jagah bahar se di jaati hai. **Why**: loose coupling, testability, maintainability. **Example**: `public UserService(IUserRepository repository)`. **Real usage**: "mere project mein services aur repositories ASP.NET Core ke DI container se inject hoti hain." **Trade-off**: "galat lifetime choose karne se bekaar objects ya thread-safety problems aa sakti hain — jaise Singleton mein DbContext."

> Har jawab: What → Why → Example → Real project → Trade-off.
