# Asli interviews mein poochhe gaye (tumhare)

## Bucket kya hota hai?
? Interviewer ne poocha "bucket kya hota hai" — kaunse context mein kya jawab doge?
**Ek line:** "bucket" ka matlab **context pe depend** karta hai — pehle ek line mein poochh lo *"Storage bucket (S3/Azure) ki baat kar rahe hain, ya hash table / rate limiting wala bucket?"* Clarify karna kamzori nahi, samajhdari dikhata hai. Phir jo context ho uska jawab do. Chaaron common matlab:

| Context | Bucket matlab | Ek line |
| --- | --- | --- |
| **Cloud storage** (sabse common) | Files rakhne ka **top-level container** | AWS S3 / Google Cloud Storage "bucket", Azure mein "container" — andar objects (files) key se |
| **Hash table / Dictionary** | Array ka ek **khaana (slot)** | Key ka hash → bucket number; collision ho to ek bucket mein kai items |
| **Rate limiting** | **Token bucket / leaky bucket** algorithm | Bucket mein tokens, har request ek token; khaali = 429 |
| **Data / time-series** | Range ka **group** | Har 5 minute ka bucket, salary 0–10k ka bucket (histogram) |

**1. Cloud storage bucket (S3 / GCS / Azure Blob container):**
- Unique naam wala container jisme **objects** (file + metadata) rehte hain. Folder jaisa dikhta hai par asal mein flat hai — "folder" sirf key ka prefix (`invoices/2026/09/a.pdf`).
- Har bucket ki apni **region**, **access policy** (private/public), **versioning**, **lifecycle rules** (30 din baad sasti storage class, 1 saal baad delete), encryption.
- App se: file upload → bucket, DB mein sirf key/URL. Private file dikhani ho to **pre-signed URL** (thodi der ke liye valid link).
- AVLS jaise system mein: purane GPS logs / reports / device firmware files bucket mein archive — DB halka rehta hai.

**2. Hash table bucket:** Dictionary andar ek array rakhta hai; `hash(key) % size` = bucket index. Ek bucket mein kai keys aa jaayein (collision) to `Equals()` se sahi wali dhoondhi jaati hai. Achha hash = keys saare buckets mein barabar bikhar jaati hain = O(1).

**3. Token bucket (rate limiting):** bucket mein max N tokens, fixed rate se refill; har request ek token leti hai. Burst allow (bucket bhara ho to ek saath N requests), par average limit ke andar. .NET mein `AddTokenBucketLimiter`.

**4. Time bucket:** time-series data ko intervals mein group karna — "har 5 minute ka average speed" — `date_trunc('hour', ts)`, TimescaleDB ka `time_bucket('5 minutes', ts)`.

```csharp
// Azure Blob "container" (= bucket) mein upload
var container = new BlobContainerClient(conn, "vehicle-reports");
await container.CreateIfNotExistsAsync();
await container.UploadBlobAsync($"2026/09/{vehicleId}.pdf", stream);

// Rate limiting token bucket
builder.Services.AddRateLimiter(o => o.AddTokenBucketLimiter("api", t =>
{
    t.TokenLimit = 20; t.TokensPerPeriod = 10; t.ReplenishmentPeriod = TimeSpan.FromSeconds(1);
}));
```

! Seedha ek matlab bol dena (jaise sirf S3) jab interviewer hash table ki baat kar raha tha — pehle context poochho.

> Bucket = container. Storage mein files ka, hash table mein keys ka, rate limit mein tokens ka, time-series mein time range ka. Pehle poochho kaunsa.

## Kafka kyun use karte ho AVLS processing ke liye, WebSockets kyun nahi?
? GPS data processing ke liye Kafka kyun, seedha WebSockets se kyun nahi? Dono mein farak kya hai?
**Ek line:** dono **alag problem** solve karte hain, isliye "ya to ye ya wo" nahi hai. **WebSocket** = ek client aur server ke beech **live connection** (data bhejne ka *pipe*) — koi storage nahi. **Kafka** = backend services ke beech **durable message log** — data **save** hota hai, kai services alag-alag padh sakti hain, replay ho sakta hai, load aane pe buffer karta hai. AVLS mein **dono use hote hain**, alag jagah.

| | WebSocket | Kafka |
| --- | --- | --- |
| Kya hai | Transport — ek connection | Distributed, durable **log** (broker) |
| Kiske beech | Browser/device ↔ server | Service ↔ service (backend) |
| Data save hota hai? | ❌ Connection toota, message gaya | ✅ Disk pe, retention tak (din/hafte) |
| Consumer down ho to | Message kho gaya | Wapas aake **wahin se** padhega (offset) |
| Ek message kitne padhein | Sirf woh connection | **Kai consumer groups** — processing, geofence, DB writer, analytics — sab apni speed se |
| Traffic spike | Server overload / drop | **Buffer** — queue badhti hai, kuch nahi girta |
| Ordering | Ek connection ke andar | **Har partition mein** (key = vehicle ID → har vehicle ke points order mein) |
| Scale | Connections sambhalna mushkil | Partitions badhao, consumers badhao |

**AVLS mein asli flow (ye whiteboard pe bolo):**
1. GPS device → **TCP** → device gateway (parse + ACK).
2. Gateway → **Kafka topic** (key = vehicle/device ID).
3. Kafka se **alag-alag consumers**: live location processor (Redis), geofence/alerts, trip/stop logic, DB history writer — har ek independent, apni speed se.
4. Live update → **SignalR (WebSocket)** → dashboard browser.

To **WebSocket aakhri hissa** hai (server → browser push); **Kafka beech ki reedh ki haddi** hai (ingestion aur processing ke beech).

**WebSockets se hi processing kyun nahi:**
- Processing service restart / deploy / crash hui to beech ke saare GPS points **gaye** — Kafka mein wo ruke rehte, service wapas aake padh leti.
- Ek hi data **4–5 services** ko chahiye — WebSocket pe har service ko alag connection aur fan-out khud likhna padta.
- Peak time (subah hazaaron buses ek saath) — Kafka **backpressure** sambhalta hai, gateway pe load nahi aata.
- **Replay**: bug fix ke baad pichhle 2 din ka data dobara process karna ho — Kafka mein offset peeche karo. WebSocket mein possible hi nahi.
- Gateway aur processing **decoupled** — dono alag scale/deploy.

**Kafka ki keemat** (ye bhi bolo, balance dikhta hai): extra infra (brokers, ZooKeeper/KRaft), monitoring (consumer lag), thodi latency (milliseconds), aur team ko Kafka samajhna padta hai. Chhote system mein Redis Streams / RabbitMQ bhi chal jaata.

> WebSocket = pipe (live, bina yaad). Kafka = register (save, kai padhne wale, replay, buffer). AVLS: device → TCP → Kafka → processors → SignalR → browser.

## Paise ke transaction (payment / transfer) ke liye API kaise design karoge?
? Money transfer / payment ke liye API design karni hai — kya-kya dhyan rakhoge?
**Ek line:** sirf "authenticate karke DB mein commit/rollback" kaafi nahi — wo sirf ek hissa hai. Paise wali API mein **5 cheezein** pakki chahiye: **(1) duplicate na ho (idempotency), (2) data atomic aur consistent (DB transaction + locking), (3) har step ka record (ledger + status), (4) bahar ke system fail hone ka plan (gateway, retries, reconciliation), (5) security + audit.**

**Tumne jo bola (auth + commit/rollback)** sahi disha thi — ab poora jawab:

**1. Request aur validation**
- `POST /api/transfers` — body: `fromAccountId`, `toAccountId`, `amount`, `currency`, `reference`.
- **Authentication + authorization**: token valid hai, aur ye account **isi user ka** hai (resource ownership check) — sirf login kaafi nahi.
- Server pe validation: amount > 0, max limit, currency match, from ≠ to. Amount **`decimal`** mein (float kabhi nahi), ya paise (integer) mein.

**2. Idempotency — double charge se bachav (sabse zaroori)**
- Client har transfer ke saath **`Idempotency-Key`** header (UUID) bheje.
- Server key ko DB mein (unique index) save kare. Same key dobara aaye (retry, double click, network timeout) → **naya transfer nahi**, pehle wala result lautao.

**3. DB transaction + locking (tumhara commit/rollback yahan)**
- Debit + credit + ledger entries **ek hi transaction** mein — ya sab, ya kuch nahi (atomicity).
- **Race condition** se bachav: do requests ek saath same account se → balance negative. Rows lock karo (`SELECT ... FOR UPDATE`) **hamesha same order** mein (chhoti ID pehle — deadlock se bachav), ya atomic update `UPDATE accounts SET balance = balance - @amt WHERE id = @id AND balance >= @amt`, ya optimistic concurrency (version column).
- **Double-entry ledger**: har transfer = do rows (debit −500, credit +500); balance = ledger ka sum. Kabhi row update/delete nahi — sirf nayi entry (reversal bhi nayi entry). Audit aur reconciliation aasan.

**4. Status aur bahar ka payment gateway**
- Transfer ka **status**: `PENDING → SUCCESS / FAILED` (state machine). Gateway (Razorpay/bank) ko call karna ho to DB transaction ke **bahar** — network call ko DB lock ke andar mat rakho.
- Gateway fail / timeout → status `PENDING` hi rahe, **retry with backoff** (idempotency key ke saath), phir bhi na ho to `FAILED` + paisa wapas (**compensation**, saga).
- Final status gateway ke **webhook** se (signature verify karke) + roz ka **reconciliation job** (hamara record vs bank ka statement).
- Events (SMS, email, notification) **outbox pattern** se — DB commit ke saath outbox table mein, worker baad mein bheje; commit hua par SMS nahi gaya jaisa aadha kaam nahi.

**5. Security, audit, response**
- HTTPS, rate limiting, fraud checks (limit/velocity), sensitive data log mein nahi (card number, OTP).
- **Audit log**: kisne, kab, kahan se (IP), kya kiya.
- Response: `201 Created` (ho gaya) ya `202 Accepted` (pending, status baad mein — `GET /api/transfers/{id}`); `409` duplicate/conflict, `422` insufficient balance, `400` invalid.

```csharp
[HttpPost("api/transfers")]
public async Task<IActionResult> Transfer(TransferDto d, [FromHeader(Name = "Idempotency-Key")] Guid key)
{
    var existing = await db.Transfers.AsNoTracking().FirstOrDefaultAsync(t => t.IdempotencyKey == key);
    if (existing != null) return Ok(existing.ToDto());                       // retry → same result

    await using var tx = await db.Database.BeginTransactionAsync();
    // Atomic debit — balance kam ho to 0 rows
    var debited = await db.Accounts
        .Where(a => a.Id == d.FromAccountId && a.OwnerId == User.GetId() && a.Balance >= d.Amount)
        .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance - d.Amount));
    if (debited == 0) return UnprocessableEntity("Balance kam hai ya account aapka nahi");

    await db.Accounts.Where(a => a.Id == d.ToAccountId)
        .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance + d.Amount));

    var t = new Transfer { IdempotencyKey = key, From = d.FromAccountId, To = d.ToAccountId, Amount = d.Amount, Status = "SUCCESS" };
    db.Transfers.Add(t);
    db.Ledger.AddRange(LedgerEntry.Debit(t), LedgerEntry.Credit(t));        // double-entry
    db.Outbox.Add(OutboxMessage.For(new TransferCompleted(t.Id)));           // SMS/email baad mein
    await db.SaveChangesAsync();
    await tx.CommitAsync();                                                  // sab ek saath, ya kuch nahi
    return CreatedAtAction(nameof(Get), new { id = t.Id }, t.ToDto());
}
```

! "Authenticate karke commit/rollback" — interviewer yahan idempotency (double charge), race condition (do requests ek saath) aur gateway fail hone ka case sunna chahta hai. Ye teen nahi bole to jawab adhoora maana jaata hai.

> Paise ki API = Idempotency key + ek DB transaction mein debit/credit/ledger + locking + status (PENDING/SUCCESS/FAILED) + gateway ke liye retry/webhook/reconciliation + audit.

## JWT mein kya store karein aur kya nahi — password ya image claim mein daal sakte hain?
? JWT claims mein kya-kya store kar sakte ho? Password ya user ki image claim mein daal sakte hain? Kyun nahi?
**Ek line:** JWT ka payload **encrypted nahi, sirf Base64 encoded** hai — koi bhi jwt.io pe token daal ke **padh sakta** hai. Signature sirf ye guarantee deta hai ki token **badla nahi gaya**, ye nahi ki chhupa hai. Isliye claims mein sirf **chhoti, non-secret identity info** rakho.

| Store karo ✅ | Kabhi mat karo ❌ | Kyun |
| --- | --- | --- |
| `sub` (user id), `name`, `email` | Password / password hash | Koi bhi decode karke padh lega |
| `role`, permissions, `tenant_id` | Image / file (Base64) | Token **har request** ke header mein jaata hai — bada token = har call slow; header limits (~8 KB) |
| `exp`, `iat`, `iss`, `aud`, `jti` | Card number, Aadhaar, OTP, secrets | Sensitive data leak |
| Chhote flags (`is_admin`) | Baar-baar badalne wala data (balance, cart) | Token expiry tak **purana** data dikhega |

Image chahiye to claim mein sirf **`picture` URL** (OIDC standard claim) — image khud storage/CDN pe.

**Standard claims yaad rakho:** `sub` (kaun), `iss` (kisne diya), `aud` (kiske liye), `exp` (kab expire), `iat` (kab bana), `nbf` (kab se valid), `jti` (unique id — revoke/blacklist ke liye).

**Aise socho:** JWT = **postcard** — koi bhi padh sakta hai, par us pe government ki **seal (signature)** hai jisse pata chalta hai kisi ne badla nahi. Postcard pe ATM PIN nahi likhte, aur photo album chipka ke nahi bhejte.

```csharp
var claims = new List<Claim>
{
    new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
    new(JwtRegisteredClaimNames.Email, user.Email),
    new(ClaimTypes.Role, "Dispatcher"),
    new("depot_id", user.DepotId.ToString()),
    new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
};
// ❌ new Claim("password", ...)   ❌ new Claim("photo", base64Image)
```

! "JWT secure hai isliye kuch bhi rakh sakte hain" — galat. JWT **signed** hai (tamper-proof), **encrypted nahi** (JWE alag cheez hai). Interviewer yahi pakadta hai.

> JWT = postcard with seal: padh koi bhi sakta hai, badal koi nahi sakta. Sirf id, role, expiry — password/image kabhi nahi.

## JWT authentication ko project mein implement karne ke steps
? Agar tumhe ek .NET API + Angular app mein JWT authentication lagani ho to step by step kya karoge?
**Ek line:** **login endpoint** jo credentials check karke **signed token** de → API pe **JwtBearer** middleware jo har request ka token verify kare → endpoints pe `[Authorize]` → Angular mein token save + **interceptor** se har request mein header → expiry/refresh handle.

**Backend (.NET):**
1. Package `Microsoft.AspNetCore.Authentication.JwtBearer`; `appsettings` mein `Issuer`, `Audience`, signing key (key **Key Vault / env** mein, code mein nahi).
2. `AddAuthentication().AddJwtBearer(...)` — `TokenValidationParameters`: issuer, audience, lifetime, signing key validate; `ClockSkew` chhota.
3. Pipeline: `app.UseAuthentication(); app.UseAuthorization();` — **isi order** mein.
4. **Login API** (`POST /auth/login`): user dhoondho, **password hash verify** (bcrypt / Identity `PasswordHasher`), claims banao, token sign karo (HS256 shared key ya RS256 private key), short expiry (15–60 min). Saath mein refresh token (optional).
5. Controllers pe `[Authorize]`, roles/policies (`[Authorize(Roles = "Admin")]`), public ke liye `[AllowAnonymous]`.

**Frontend (Angular):**
6. Login ke baad token save (memory/ sessionStorage; refresh token HttpOnly cookie behtar).
7. **HTTP interceptor** har request mein `Authorization: Bearer <token>`.
8. 401 aaye → refresh try, na ho to logout + login page; **route guard** protected pages pe.

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = cfg["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = cfg["Jwt:Audience"],
        ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!)),
    });

// Login
var token = new JwtSecurityToken(cfg["Jwt:Issuer"], cfg["Jwt:Audience"], claims,
    expires: DateTime.UtcNow.AddMinutes(30),
    signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
return Ok(new { access = new JwtSecurityTokenHandler().WriteToken(token) });
```

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
```

> Login → sign token → JwtBearer verify → [Authorize] → Angular interceptor → 401 pe refresh/logout.

## JWT ke alawa authentication ke kaunse tareeke hain?
? JWT ke alawa aur kaunse authentication methods jaante ho? Kab kaunsa use karoge?
**Ek line:** "sirf JWT aata hai" mat bolo — kam se kam ye 5 naam aur ek line ka use-case bolo:

| Tareeka | Kaise | Kab |
| --- | --- | --- |
| **Cookie / session** (ASP.NET Core Identity) | Login ke baad server session, browser cookie | Server-rendered MVC / Razor apps |
| **OAuth 2.0 + OpenID Connect** | Identity provider (Keycloak, Azure AD/Entra, Google) login karwata hai, tokens deta hai | SSO, "Login with Google", enterprise apps |
| **API key** | Header mein fixed key | Server-to-server, third-party integrations, devices |
| **Client credentials (OAuth)** | Service apni id+secret se token leti hai | Microservice → microservice |
| **Certificate / mTLS** | Client certificate se pehchaan | Bank/government integrations, high security |
| **Windows / Kerberos** | Domain login | Intranet apps |
| **MFA / OTP** | Password ke saath OTP | Payments, admin panels (auth ke upar extra layer) |

JWT asal mein **token ka format** hai — OAuth/OIDC bhi aksar JWT hi issue karte hain. Financial domain mein aam: OAuth2/OIDC + MFA + mTLS for bank APIs.

> JWT = token format. Methods: cookie session, OAuth2/OIDC (SSO), API key, client credentials, certificate, MFA.

## SOLID — sahi matlab (Open/Closed connection wala nahi hai)
? SOLID ke paanchon principles ek-ek line mein example ke saath batao.
**Ek line:** SOLID = paanch **class design** ke rules — code badalna aasaan aur tootna kam ho.

| Letter | Naam | Matlab (ek line) | Chhota example |
| --- | --- | --- | --- |
| **S** | Single Responsibility | Ek **class** ka badalne ka **ek hi reason** ho | `ReportService` report banaye; email bhejna `EmailService` ka kaam |
| **O** | Open/Closed | Class **naye behaviour ke liye khuli** (extend), **purana code badalne ke liye band** | Naya payment type = nayi class `UpiPayment : IPayment`, purana `switch` nahi chhedna |
| **L** | Liskov Substitution | **Child class parent ki jagah** bina gadbad chal sake | `Square : Rectangle` jahan width set karne pe height bhi badle — toota; `ReadOnlyList.Add()` throw kare — toota |
| **I** | Interface Segregation | **Chhote focused interfaces** — class ko wo methods implement na karne padein jo use nahi karti | `IPrinter`, `IScanner` alag; `IMachine` mein sab nahi |
| **D** | Dependency Inversion | Upar ki class **interface pe depend** kare, concrete class pe nahi — DI se milti hai | `OrderService(IOrderRepo repo)`, `new SqlOrderRepo()` andar nahi |

**Aise yaad rakho:**
- **O** = software ke liye "extension cord" — naya device jodne ke liye deewar nahi todte, plug lagate ho.
- **L** = "beta baap ki jagah duty kar sake" — parent ke kaam mein child kuch naya exception ya ajeeb behaviour na laaye.
- **D** = "interface pe baat karo" — DI iska tool hai, principle nahi.

! "Open/Closed = jo connection open kiya use close karo" — **bilkul galat** (wo `using`/Dispose ki baat hai). O ka matlab: extension ke liye open, modification ke liye closed. Aur S **class** ke liye hai ("ek class, ek reason to change"), sirf method ke liye nahi.

> S = ek class ek kaam. O = jodo, chhedo mat. L = child parent ki jagah chale. I = chhote interfaces. D = interface pe depend karo.

## Garbage Collection — Gen 0, 1, 2 kaise kaam karti hai (sahi version)
? .NET garbage collection kaise kaam karti hai? Gen 0, Gen 1, Gen 2 mein kya hota hai?
**Ek line:** GC **heap** pe bane un objects ki memory wapas leti hai jinka **ab koi reference nahi bacha**. Generations isliye hain kyunki **zyada tar objects jaldi mar jaate hain** — to naye objects ko baar-baar aur purane ko kabhi-kabhi check karna sasta padta hai.

| Generation | Kya hota hai | Kitni baar check |
| --- | --- | --- |
| **Gen 0** | **Naye** objects yahan bante hain (chhote, short-lived — request ke DTOs, strings) | Sabse zyada baar, sabse tez |
| **Gen 1** | Jo Gen 0 ki GC se **bach gaye** | Buffer — beech wala |
| **Gen 2** | Jo Gen 1 se bhi bach gaye — **lambe jeene wale** (cache, singleton services, static data) | Kam baar, mehenga (full GC) |
| **LOH** (Large Object Heap) | 85 KB se bade objects (bade arrays/strings) — seedha Gen 2 ke saath | Kam baar; compact nahi hota by default |

Process: **mark** (reachable objects dhoondho — roots: static, stack variables, CPU registers) → **sweep** (baaki hatao) → **compact** (bache hue paas-paas, gaps khatam) → bache hue agli generation mein **promote**.

**GC kya nahi karti:** file, DB connection, socket jaise **unmanaged resources** band nahi karti — uske liye `IDisposable` / `using`. Isliye connections GC pe nahi chhodte.

```csharp
var x = new byte[100];            // Gen 0 mein
GC.Collect(0);                    // (sirf demo — production mein khud GC.Collect mat bulao)
Console.WriteLine(GC.GetGeneration(x));   // bach gaya to 1
```

! "Gen 0 mein local variables hote hain, Gen 2 mein connections hote hain jo clear nahi hote" — galat. Local **value types stack** pe hote hain (GC ke bahar); Gen 0 = **naye heap objects**; Gen 2 = jo **lambe time se zinda** hain. Connections GC nahi, `Dispose` band karta hai.

> Naya = Gen 0 (baar-baar check). Bacha = Gen 1. Lamba jeene wala = Gen 2 (kabhi-kabhi). Unmanaged cheezein = using/Dispose.

## Thread vs async/await — farak kya hai?
? Thread aur async/await mein farak kya hai? Kya async naya thread banata hai?
**Ek line:** **thread** = kaam karne wala **worker** (OS ka execution unit). **async/await** = ek **tareeka** jisse worker I/O ke **wait mein khaali na baithe** — async **naya thread nahi banata**, sirf thread ko wait ke dauraan free karta hai.

| | Thread / multithreading | async / await |
| --- | --- | --- |
| Kya hai | Kai workers ek saath kaam karein | Wait (DB, API, file) ke time thread free |
| Kiske liye | **CPU-heavy** kaam parallel (image processing, calculations) | **I/O-bound** kaam (DB query, HTTP call) |
| Naya thread? | Haan (ya ThreadPool se) | Nahi — await ke baad koi bhi pool thread continue karta hai |
| Kharcha | Har thread ~1 MB stack, context switching | Halka — ek state machine |
| .NET mein | `Thread`, `Task.Run`, `Parallel.ForEach` | `async Task`, `await db.ToListAsync()` |

**Aise socho:** threads = **zyada waiters hire karna**. async = ek hi waiter jo order kitchen mein dekar **doosri table** pe chala jaata hai. 1000 requests ke liye 1000 waiters (threads) nahi chahiye — async se 10 waiters bhi sambhal lete hain, kyunki zyada tar time sab kitchen (DB) ka wait kar rahe hote hain.

Web API mein: har request ThreadPool ke thread pe aati hai; `await` pe thread wapas pool mein — isliye async API zyada load sambhalti hai. `.Result`/`.Wait()` se thread **block** — async ka fayda khatam.

> Thread = worker. async = worker ko wait mein khaali mat baithne do. I/O → async; CPU-heavy → threads/Parallel.

## Correlated subquery kya hai
? Correlated subquery kya hoti hai? Normal subquery se kaise alag hai aur performance pe kya asar hai?
**Ek line:** **correlated subquery** andar se **outer query ki row ka column** use karti hai — isliye **har outer row ke liye dobara** chalti hai. Normal (non-correlated) subquery **ek baar** chalti hai aur result outer query use karti hai.

| | Non-correlated | Correlated |
| --- | --- | --- |
| Outer query pe depend | ❌ Akele chal sakti hai | ✅ `e.dept_id` jaisa outer column |
| Kitni baar chalti | Ek baar | Har outer row pe (logically) |
| Example | Company average se zyada salary | Apne **department** ke average se zyada salary |
| Performance | Tez | Bade data pe slow ho sakti hai — JOIN / window function se rewrite |

**Aise socho:** non-correlated = class ka **ek average** nikaalo, phir sabse compare. Correlated = har bachche ke liye **uske section** ka average alag se nikaalo.

```sql
-- Non-correlated: ek baar
SELECT name, salary FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Correlated: har employee ke department ka average
SELECT e.name, e.salary, e.dept_id FROM employees e
WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id);

-- Same result, window function se (aksar tez)
SELECT name, salary, dept_id FROM (
  SELECT *, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg FROM employees
) t WHERE salary > dept_avg;

-- EXISTS bhi correlated hota hai
SELECT c.* FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

> Correlated = andar wali query outer row ka column use kare → har row pe chale. Slow ho to JOIN / window function.

## CTE vs subquery — sahi farak (CTE loop ya performance ke liye nahi)
? CTE aur subquery mein kya farak hai? Kya CTE performance ke liye use karte hain?
**Ek line:** **CTE** (`WITH naam AS (...)`) = query ke andar ek **naam wala temporary result**, jo **query khatam hote hi** khatam. Main fayda **readability** (lambi query steps mein) aur **recursion** (tree/hierarchy) — performance nahi. Subquery = query ke andar seedha likhi query.

| | Subquery | CTE |
| --- | --- | --- |
| Kahan likhte | `WHERE`, `FROM`, `SELECT` ke andar | Query ke **upar** `WITH` mein |
| Naam | Nahi (FROM mein alias) | ✅ Naam — ek query mein **kai baar** reference |
| Recursion | ❌ | ✅ `WITH RECURSIVE` — manager chain, category tree |
| Padhne mein | Nested hoke uljhi | Steps mein, saaf |
| Performance | Same | PostgreSQL 12+ mein aam taur pe **same** (inline); `MATERIALIZED` se ek baar calculate |

CTE function nahi hai aur baad mein call nahi hota — sirf usi ek query ke liye hai. Kai queries mein reuse chahiye → **view** ya **temp table**.

```sql
WITH dept_total AS (
  SELECT dept_id, SUM(salary) AS total FROM employees GROUP BY dept_id
), top_dept AS (
  SELECT dept_id FROM dept_total ORDER BY total DESC LIMIT 1
)
SELECT e.* FROM employees e JOIN top_dept USING (dept_id);   -- 2 steps, saaf
```

! "CTE loop mein baar-baar query chalane ke liye aur performance ke liye hai" — galat. CTE = naam wale steps + recursion; performance subquery jaisi hi.

> CTE = naam wala step (readability + recursion). Subquery = andar likhi query. Speed aam taur pe same.

## Query pehle 2 second leti thi, ab 30 second — kya check karoge?
? Ek query jo 2 second mein chalti thi ab achanak 30 second le rahi hai — step by step kya check karoge?
**Ek line:** "achanak slow" = **kuch badla hai**. Order mein dekho: **plan** badla? **data** badha? **locks**? **server** thaka? — `EXPLAIN ANALYZE` se shuru, par sirf wahi nahi.

1. **Abhi kya ho raha hai** — `pg_stat_activity`: query kisi lock ka **wait** to nahi kar rahi (`wait_event_type = Lock`)? Kaun block kar raha hai (`pg_blocking_pids`)?
2. **EXPLAIN (ANALYZE, BUFFERS)** — pehle wale plan se compare: Index Scan tha ab **Seq Scan**? Estimated rows vs actual rows mein bada farak?
3. **Statistics purani** — bahut data aaya/delete hua, planner galat andaza laga raha → `ANALYZE table_name;`. Autovacuum chal raha hai ya nahi.
4. **Data badha** — table 10x ho gayi, ya kisi filter value ke liye bahut rows (skew).
5. **Index** — kisi ne drop/change kiya? Naya column filter mein bina index? Index **bloat** → `REINDEX CONCURRENTLY`.
6. **Table bloat** — bahut UPDATE/DELETE, VACUUM peeche → dead rows padhni pad rahi (`n_dead_tup` in `pg_stat_user_tables`).
7. **Query / code badla** — naya deploy, parameter type change (implicit cast se index na lage), ORM ne alag SQL banaya.
8. **Server resources** — CPU, RAM, disk I/O, disk full, doosri heavy query/backup/report saath chal rahi.
9. **Parameter-sensitive plan** — prepared statement ka generic plan kuch values ke liye kharab (SQL Server mein "parameter sniffing").

Fix ke baad: pehle/baad ka time dikhao, aur `pg_stat_statements` + alert lagao taaki agli baar pehle pata chale.

```sql
SELECT pid, now() - query_start AS running, wait_event_type, wait_event, left(query, 80)
FROM pg_stat_activity WHERE state <> 'idle' ORDER BY running DESC;

EXPLAIN (ANALYZE, BUFFERS) SELECT ...;          -- plan + asli time
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables WHERE relname = 'orders';
ANALYZE orders;
```

> Locks → plan (EXPLAIN ANALYZE) → stats (ANALYZE) → data/bloat → index → deploy change → server. "Kya badla?" poochho.

## .NET CI/CD pipeline ke stages kya honge?
? Agar tumhe .NET project ke liye CI/CD pipeline banani ho to kaunse stages rakhoge, shuru kahan se karoge?
**Ek line:** pipeline = code push se production tak ke **automatic steps**. Shuruaat: repo mein **Dockerfile + Jenkinsfile** (pipeline as code), Git webhook se trigger. Stages order mein:

| # | Stage | Kya hota hai |
| --- | --- | --- |
| 1 | **Checkout** | Git se branch ka code (webhook / push pe trigger) |
| 2 | **Restore** | `dotnet restore` — NuGet packages (cache ke saath) |
| 3 | **Build** | `dotnet build -c Release` — compile errors yahin |
| 4 | **Test** | `dotnet test` — unit tests; fail = pipeline ruk jaaye |
| 5 | **Code quality / security** | SonarQube, vulnerable packages scan (`dotnet list package --vulnerable`) |
| 6 | **Publish + Docker image** | `dotnet publish` → `docker build -t app:<version/commit>` |
| 7 | **Push** | Image registry mein (Docker Hub / GCR / ACR / Harbor) |
| 8 | **Deploy to Dev/QA** | Server pe `docker compose pull && up -d`, ya Kubernetes |
| 9 | **Smoke test** | `/health` check, ek-do API calls |
| 10 | **Approval → Production** | Manual approve, same image prod pe (rebuild nahi) |
| 11 | **Notify / rollback** | Teams/email; fail pe pichhla image tag wapas |

Angular ke liye bhi same: `npm ci` → `ng build` → nginx image → deploy.

Dhyan: **same image** dev se prod tak (rebuild nahi); secrets Jenkins credentials / vault mein; `node_modules`, `bin/obj` git mein commit nahi (pipeline slow); image tag = commit SHA taaki rollback aasan.

```groovy
pipeline {
  agent any
  environment { IMAGE = "registry.example.com/orders-api:${env.GIT_COMMIT.take(7)}" }
  stages {
    stage('Restore & Build') { steps { sh 'dotnet restore && dotnet build -c Release --no-restore' } }
    stage('Test')            { steps { sh 'dotnet test -c Release --no-build' } }
    stage('Docker Build')    { steps { sh 'docker build -t $IMAGE .' } }
    stage('Push')            { steps { withCredentials([usernamePassword(credentialsId: 'registry', usernameVariable: 'U', passwordVariable: 'P')]) {
                                 sh 'echo $P | docker login registry.example.com -u $U --password-stdin && docker push $IMAGE' } } }
    stage('Deploy QA')       { steps { sh 'ssh deploy@qa "IMAGE=$IMAGE docker compose up -d"' } }
    stage('Approve Prod')    { steps { input 'Production pe deploy karein?' } }
    stage('Deploy Prod')     { steps { sh 'ssh deploy@prod "IMAGE=$IMAGE docker compose up -d"' } }
  }
  post { failure { echo 'Build fail — team ko notify' } }
}
```

> Checkout → restore → build → test → quality → docker image → push → deploy QA → smoke → approve → prod → notify.

## Financial transaction kya hota hai?
? Financial transaction ki definition kya hai aur ek achhe transaction system mein kya-kya zaroori hai?
**Ek line:** **financial transaction** = paise ki value ek account se doosre mein jaane ka **pakka record** — har transaction mein **debit aur credit ka jodi** hoti hai (double-entry) aur dono ka jod **zero** hona chahiye; ya to poora hoga ya bilkul nahi (**ACID**).

Zaroori properties:
- **Atomic** — debit ho gaya aur credit nahi, aisa kabhi nahi.
- **Consistent** — kabhi balance negative / paisa gayab nahi; total debit = total credit.
- **Isolated** — do transactions ek hi account ko ek saath badlein to galat balance nahi (locking).
- **Durable** — commit ke baad crash bhi ho to record rahe.
- **Idempotent** — retry pe double nahi (idempotency key).
- **Immutable ledger** — galti ho to row edit nahi, **reversal entry**; poora audit trail.
- **Status lifecycle** — `INITIATED → PENDING → SUCCESS / FAILED / REVERSED`.
- **Reconciliation** — hamare records bank/gateway ke statement se roz milao.

Example: A se B ko ₹500 — ledger mein do entries: A **debit −500**, B **credit +500**, same `transaction_id`, ek hi DB transaction mein.

> Financial transaction = debit + credit jodi, ACID, idempotent, immutable ledger, status + reconciliation.

## Cloud experience sirf VM / Docker ka hai — Azure/AWS ke sawaal kaise sambhalein
? Interviewer poochhe "Azure/AWS pe kaam kiya hai? Azure Functions, App Service, Lambda?" aur tumhara experience sirf GCP VM pe Docker ka hai — kaise jawab doge?
**Ek line:** **sach bolo, par jo aata hai use cloud ki bhasha mein bolo, aur equivalents jaano.** "Nahi aata" pe mat ruko — "Hands-on GCP Compute Engine (IaaS) pe hai; Azure/AWS mein iske equivalents ye hain, aur main AZ-900 kar raha hoon" — ye bahut behtar lagta hai.

Tumhara asli kaam cloud terms mein:
- GCP **Compute Engine** VMs (IaaS) pe apps **Docker** containers mein, **Nginx reverse proxy** + domain routing.
- **Kafka, Redis, Tile38** jaise services khud install/manage (self-managed), logs aur monitoring.
- **Jenkins CI/CD** — build, image, deploy.
- VPC / firewall rules, SSH, disk/memory issues debug.

Equivalents jo pata hone chahiye:

| Kaam | GCP (tumhara) | Azure | AWS |
| --- | --- | --- | --- |
| VM | Compute Engine | Virtual Machines | EC2 |
| Web app host (PaaS) | Cloud Run / App Engine | **App Service** | Elastic Beanstalk / App Runner |
| Serverless function | Cloud Functions | **Azure Functions** | **Lambda** |
| File storage | Cloud Storage (bucket) | Blob Storage (container) | S3 (bucket) |
| Managed DB | Cloud SQL | Azure Database for PostgreSQL | RDS |
| Queue / events | Pub/Sub | Service Bus / Event Hubs | SQS / SNS / MSK (Kafka) |
| Secrets | Secret Manager | Key Vault | Secrets Manager |
| CI/CD | Cloud Build | Azure DevOps Pipelines | CodePipeline |

**Azure Functions / Lambda ek line mein:** event aane pe (HTTP call, queue message, timer, file upload) chalne wala **chhota function** — server manage nahi, jitna chala utna paisa; cold start aur time limit ka dhyan.

**Rating kitni?** Jo kiya uske hisaab se — "self-managed VMs/Docker/CI-CD mein 7, managed PaaS/serverless mein abhi 4–5, seekh raha hoon" — alag-alag rating zyada imaandaar aur samajhdaar lagti hai.

**Aage ke liye:** AZ-900 (Azure Fundamentals, ~1–2 hafte) + ek chhoti .NET API **Azure App Service free tier** pe deploy karke dikhao — interview mein "haan, deploy kiya hai" bol paoge.

> Sach + equivalents + plan. "GCP VM pe Docker/Jenkins hands-on; Azure mein App Service/Functions ye hain; AZ-900 kar raha hoon."

## Project mein Agile/Scrum follow nahi hota — kaise jawab dein
? Interviewer poochhe "Agile follow karte ho? Standup hota hai?" aur tumhare project mein proper Scrum nahi hai — kya bologe?
**Ek line:** "Nahi, koi methodology nahi" mat bolo — jo **asal mein hota hai** use sahi naam do. Zyada tar teams **informal Kanban / iterative** kaam karti hain, bas naam nahi dete.

Jaise: "Hum formal Scrum nahi karte, par kaam **weekly iterations** mein hota hai — hafte ki shuruaat mein tasks tay hote hain (planning), daily team/lead ke saath status (standup jaisa), kaam complete hone pe client/onsite team ko demo/update (review), production issues priority pe (Kanban style). Tasks ticket/tracker mein hote hain." Phir: "Scrum ke ceremonies — sprint planning, daily standup, review, retrospective — mujhe pata hain aur follow karne mein koi dikkat nahi."

Scrum basics saath mein yaad: sprint (2 hafte), Product Owner, Scrum Master, team; story points; backlog; retro.

> Jo hota hai use naam do (weekly iterations, Kanban-style) + "Scrum ceremonies pata hain, follow kar sakta hoon."

## Roz kaam mein AI tools use karte ho? Kaise?
? Kya tum daily kaam mein AI tools use karte ho? Kaise aur kis tarah verify karte ho?
**Ek line:** haan bolo, **naam lo, use-case batao, aur verify kaise karte ho** ye zaroor bolo — companies AI use karne wale chahti hain, par jo aankh band karke copy na karein.

Structure:
- **Tools**: GitHub Copilot / Claude / ChatGPT.
- **Kahan**: boilerplate code, unfamiliar legacy code samajhna, SQL/regex/LINQ likhna, error messages debug, unit test cases, documentation.
- **Kaise verify**: generated code **padh ke samajhta hoon**, local pe chala ke test karta hoon, edge cases khud check, company code/secrets bahar ke tools mein nahi daalta (policy ka dhyan).
- **Example**: "Legacy module ka flow samajhne mein AI se summary lekar code se match kiya — 2 din ka kaam aadhe din mein."

> Haan + tools + use-cases + "verify karta hoon, blindly copy nahi" + ek chhota example.

## Apna project aur architecture — resume se match karke bolo
? Apne current project ka architecture kya hai — monolith ya microservices? Team size aur tumhari role kya hai?
**Ek line:** jo resume pe likha hai wahi bolo — agar resume pe "microservices / event-driven" hai aur interview mein "monolithic" bol diya, to interviewer ko **mismatch** dikhta hai aur trust girta hai. Pehle apna architecture **sahi naam** ke saath tay kar lo.

Aksar asli picture **mixed** hoti hai — aise bolo:
"Humara core product ek **modular** .NET application hai (kai modules ek saath deploy), par real-time tracking hissa **event-driven** hai: GPS devices se data TCP gateway pe aata hai, **Kafka** ke through alag processing services (live location, geofence/trip logic, DB writer) consume karti hain, **Redis** mein live state, aur **SignalR** se dashboard pe push. To main isko monolith + event-driven services ka hybrid bolunga."

Role aur team:
- **Kitne log**: poore product mein ~X, mere module(s) pe main + Y.
- **Meri ownership**: kaunse modules end-to-end (Angular + .NET API + PostgreSQL), kaunsi infra cheezein (Docker, Jenkins, Kafka/Redis servers).
- **Client interaction**: requirements meetings, site visits, production support.

> Resume aur jawab ek jaise hon. "Modular core + event-driven real-time pipeline (Kafka → services → Redis → SignalR)". Team size aur ownership numbers ke saath.
