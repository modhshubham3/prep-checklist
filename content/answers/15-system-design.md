# System design — building blocks

## System design interview ko kaise approach karein
Design round mein "perfect answer" nahi hota — interviewer **soch ka tareeka** dekhta hai. Seedha boxes banana shuru mat karo. Ye order follow karo (45 min mein):

1. **Requirements clarify (5 min)** — **functional** (kya karna hai: "user URL chhota kare, redirect ho") aur **non-functional** (kitne users, reads vs writes, latency, availability, consistency kitni zaroori). Sawaal poochho — ye khud score karta hai.
2. **Estimation (3–5 min)** — rough numbers: requests/sec, storage per saal, bandwidth. "10 lakh users × 10 requests/din ≈ 1 crore/din ≈ ~120/sec average, peak 3–5x".
3. **API design** — main endpoints (`POST /urls`, `GET /{code}`).
4. **Data model** — tables/entities, SQL ya NoSQL aur kyun.
5. **High-level design** — client → load balancer → API servers → cache → DB, queues, workers.
6. **Deep dive** — interviewer jo hissa chune (ya sabse mushkil hissa): scaling, bottleneck, failure.
7. **Trade-offs aur bottlenecks** — kya toot sakta hai, single points of failure, kya improve karoge.

Har decision ke saath **"kyun"** aur **trade-off** bolo: "Redis cache lagaya kyunki reads 100x zyada hain; trade-off — thoda stale data."

> Clarify → estimate → API → data → diagram → deep dive → trade-offs. Seedha diagram pe mat koodo.

## Back-of-the-envelope estimation — numbers jo yaad rakhne chahiye
Estimation se pata chalta hai ek server kaafi hai ya sharding chahiye. Kaam ke numbers:

| Cheez | Approx |
| --- | --- |
| 1 din | ~86,400 sec (~10⁵ maan lo) |
| 1 million requests/din | ~12 req/sec |
| 1 crore (10M)/din | ~120 req/sec |
| Memory (RAM) read | nanoseconds |
| SSD read | ~100 microseconds |
| Same datacenter network round trip | ~0.5 ms |
| India → US round trip | ~150–250 ms |
| Ek achha API server | hazaaron simple req/sec |
| Ek PostgreSQL (tuned) | hazaaron simple queries/sec |
| Redis | ~1 lakh ops/sec per instance |

**Storage**: har record ka size × records per din × 365 × saal. Example: GPS point ~100 bytes × 5000 vehicles × har 10 sec (8640/din) ≈ 4.3 GB/din ≈ 1.5 TB/saal → partitioning + retention policy chahiye.

Peak traffic average ka 2–5x maano. Exact hona zaroori nahi — **order of magnitude** sahi ho.

## Load balancing aur health checks
**Load balancer** traffic ko kai servers mein baant-ta hai — scale aur availability dono. (Algorithms aur L4/L7 DevOps section mein.)

Design mein kya bolna hai:
- **Health checks** — LB har few seconds server ka `/health` endpoint check karta hai; fail ho to us server ko traffic band, theek hone pe wapas. ASP.NET: `AddHealthChecks().AddNpgSql(...).AddRedis(...)`, `MapHealthChecks("/health")`.
- **Liveness vs readiness** — liveness = process zinda hai (nahi to restart); readiness = traffic lene ke liye tayyar hai (DB connected, warm-up done). Readiness mein har dependency check mat daalo — DB thoda slow hua to saare servers "unhealthy" ho jaayenge.
- **LB khud single point of failure** na bane — managed LBs (Azure/AWS) redundant hote hain; self-hosted ho to do nginx + keepalived/floating IP.
- **Sticky sessions** se bacho — server stateless rakho.
- **Connection draining** — deploy/scale down pe server ko nayi requests band, chal rahi requests poori hone do.
- **SSL termination** LB pe — backend servers pe load kam.

## Database replication aur sharding
**Replication** — same data ki **copies** kai servers pe.
- **Primary–replica (master–slave)**: saari **writes primary** pe, **reads replicas** se. Read-heavy apps ke liye (reports, dashboards replica pe). Primary gire to replica promote (failover).
- **Replication lag** — async replication mein replica thoda peeche hota hai; user ne abhi update kiya aur replica se padha to purana data (**read-your-writes** problem → apna data primary se padho).
- Sync replication = consistent par writes slow; async = tez par lag.

**Sharding (horizontal partitioning)** — data ko **alag-alag servers** mein baantna (har shard mein kuch rows). Jab ek DB ki write capacity/storage kam pad jaaye.
- **Shard key** chunna sabse important — `customer_id` / `vehicle_id` (hash se). Achhi key data aur load ko barabar baante; buri key = **hot shard**.
- Nuksaan: cross-shard joins/transactions mushkil, resharding dard bhara, complexity bahut.

**Partitioning** (ek hi DB server ke andar table ko todna — PostgreSQL declarative partitioning by date) sharding se pehle ka aasan step hai: time-series data (GPS logs) ke liye month-wise partitions, purane partitions drop karna tez.

Order: pehle **indexes + query tuning** → **caching** → **read replicas** → **partitioning** → aakhir mein **sharding**.

## CAP theorem
Distributed system mein jab **network partition** ho (servers ke beech connection toota), to tumhe chunna padta hai:

- **C — Consistency**: har read ko latest write dikhe (sab nodes same data).
- **A — Availability**: har request ko jawab mile (chahe purana data).
- **P — Partition tolerance**: network tootne pe bhi system chale.

Network partitions real world mein hote hi hain, to **P chhod nahi sakte** — asli choice **partition ke waqt C ya A**:
- **CP** — consistent raho, kuch requests reject/wait. Banking balance, inventory, payments. (Traditional RDBMS cluster, ZooKeeper, etcd.)
- **AP** — jawab do, data thoda purana ho sakta hai, baad mein sync (**eventual consistency**). Social feed, likes count, vehicle ki last location, product catalog. (Cassandra, DynamoDB, DNS.)

**PACELC** — extension: partition na ho tab bhi **Latency vs Consistency** ka trade-off hota hai.

Interview mein: "ye system ke liye kya zyada important hai" batao — "vehicle ki live location 2 second purani ho to chalega (AP), par ticket payment consistent chahiye (CP)."

## Event-driven architecture aur message queues
Services seedha ek doosre ko call karne (sync REST) ki jagah **events publish** karti hain ("OrderPlaced"), aur jinko chahiye wo **subscribe** karke react karti hain (email service, inventory service, analytics).

**Fayde:**
- **Loose coupling** — producer ko pata hi nahi kaun sun raha hai; naya consumer jodna = producer mein koi change nahi.
- **Load absorb** — traffic spike queue mein ruk jaata hai, consumers apni speed se process (backpressure).
- **Resilience** — consumer down ho to messages queue mein wait karte hain, kho nahi jaate.

**Nuksaan:** eventual consistency, debugging mushkil (correlation IDs + tracing chahiye), duplicate/out-of-order messages handle karne padte hain, infra complexity.

**Tools**: **Kafka** (high throughput, log retain, replay, ordering per partition — event streaming, GPS data), **RabbitMQ** (classic queue, routing, per-message ack — task queues), **Azure Service Bus** / AWS SQS+SNS (managed).

Zaroori patterns:
- **Idempotent consumers** — at-least-once delivery mein same message do baar aa sakta hai.
- **Outbox pattern** — DB update aur event publish dono atomic: event ko same transaction mein outbox table mein likho, background worker publish kare.
- **Dead letter queue** — baar-baar fail hone wale messages alag, taaki queue na atke.

## Circuit breaker, retry with backoff aur timeouts
Distributed system mein doosri services **fail/slow hongi hi**. Teen patterns saath mein:

- **Timeout** — har external call pe limit (e.g. 3 sec). Bina timeout ke ek slow service tumhare saare threads/connections pakad ke poore system ko gira deti hai (**cascading failure**).
- **Retry with exponential backoff + jitter** — temporary errors (network blip, 503) pe dobara try: 1s, 2s, 4s… + thoda random (jitter) taaki saare clients ek saath retry karke service ko dubara na gira dein. Sirf **transient** errors aur **idempotent** operations pe retry (400 Bad Request retry karna bekaar).
- **Circuit breaker** — agar service lagatar fail ho rahi hai to kuch der ke liye calls **band** (circuit **open**) — turant fail/fallback, service ko recover hone ka time. States: **Closed** (normal) → failures threshold paar → **Open** (sab calls turant reject) → timeout ke baad **Half-open** (kuch test calls) → success to Closed, fail to Open.
- **Fallback** — cached data, default value, "abhi available nahi" message.
- **Bulkhead** — alag dependencies ke liye alag resource pools, taaki ek ke slow hone se sab na atkein.

.NET mein **Polly** (ab `Microsoft.Extensions.Http.Resilience`) — `HttpClient` pe ek line mein standard resilience pipeline.

```csharp
builder.Services.AddHttpClient<PaymentClient>(c => c.BaseAddress = new Uri("https://pay.example.com"))
    .AddStandardResilienceHandler();    // retry + backoff + circuit breaker + timeouts, sensible defaults

// Custom
builder.Services.AddHttpClient<SmsClient>()
    .AddResilienceHandler("sms", p => p
        .AddRetry(new() { MaxRetryAttempts = 3, BackoffType = DelayBackoffType.Exponential, UseJitter = true })
        .AddCircuitBreaker(new() { FailureRatio = 0.5, BreakDuration = TimeSpan.FromSeconds(30) })
        .AddTimeout(TimeSpan.FromSeconds(3)));
```

## Caching strategies aur cache invalidation
Cache kahan-kahan ho sakta hai: **browser** (Cache-Control), **CDN** (static files, images), **API gateway / reverse proxy**, **application** (IMemoryCache — ek server), **distributed** (Redis — sab servers share), **DB** ka apna buffer cache.

**Patterns:**
- **Cache-aside (lazy loading)** — sabse common: cache mein dekho → nahi mila to DB se laao aur cache mein daalo (TTL ke saath). Write pe DB update + cache key **delete**.
- **Write-through** — write pe DB aur cache dono saath update. Cache hamesha fresh, writes slow.
- **Write-behind** — pehle cache mein, DB mein baad mein batch. Tez, par crash pe data loss ka risk.

**Problems:**
- **Invalidation** — data badla to purana cache? TTL + write pe delete. ("Computer science ki do mushkil cheezein: cache invalidation aur naming.")
- **Cache stampede** — popular key expire hui aur hazaar requests ek saath DB pe → lock / single-flight, ya expire se pehle refresh, TTL mein jitter.
- **Cache penetration** — aisi keys jo DB mein bhi nahi (attack) → null bhi thodi der cache karo.
- **Stale data** — kitna purana chalega, ye business decide karta hai.

.NET 9 **`HybridCache`** — L1 memory + L2 Redis aur stampede protection built-in.

## SQL vs NoSQL — design mein kab kya
| | SQL (PostgreSQL, SQL Server) | NoSQL |
| --- | --- | --- |
| Data | Structured, fixed schema, relations | Flexible schema |
| Consistency | ACID transactions | Aksar eventual (BASE), kuch mein ACID |
| Scaling | Vertical + read replicas; sharding mushkil | Horizontal scaling built-in |
| Queries | Joins, complex queries, aggregations | Key/document lookup tez, joins nahi |
| Best for | Orders, payments, users, inventory, reporting | Huge scale, flexible data, caching, logs, real-time |

NoSQL types: **Key-value** (Redis, DynamoDB), **Document** (MongoDB, Cosmos DB — JSON), **Wide-column** (Cassandra — bahut zyada writes, time-series), **Graph** (Neo4j — relationships), **Time-series** (TimescaleDB, InfluxDB — sensor/GPS data), **Search** (Elasticsearch).

Interview jawab: "Default PostgreSQL — ACID, joins, mature, aur JSONB se flexible data bhi. NoSQL tab jab specific zaroorat ho — jaise bahut high write volume time-series, ya sub-millisecond cache." Aksar dono saath (**polyglot persistence**): orders PostgreSQL mein, cache Redis mein, search Elasticsearch mein.

## Monolith vs microservices — design round mein kya bolna hai
**Monolith** — ek deployable app. Shuruaat mein simple, tez development, ek DB, transactions aasan, debugging aasan. Bada hone pe: deploy risk, ek hissa scale karne ke liye poora scale, team conflicts.

**Microservices** — chhoti independent services, har ek ka apna DB, alag deploy/scale. Fayde: independent teams, alag scaling, fault isolation, alag tech. Nuksaan: network calls, distributed transactions (saga), eventual consistency, monitoring/tracing, DevOps overhead bahut.

**Achha jawab**: "Shuru mein **modular monolith** — saaf module boundaries (Clean Architecture). Jab koi module ka scale ya team alag ho jaaye (jaise real-time GPS ingestion jo baaki app se 100x zyada load leta hai), tab usko alag service banao." Microservices ek team structure aur scale ka solution hai, default nahi.

Microservices ke saath aane wali cheezein: API Gateway, service discovery, message broker, distributed tracing, per-service DB, saga pattern, containers + orchestration.

# System design — practice problems

## Design: real-time vehicle tracking system
Tumhare domain ka sawaal — yahan depth dikhao. (Generic design; apne project ke real numbers note mein.)

**Requirements**: har vehicle ka GPS device har 5–10 sec location bheje; live map pe vehicles dikhein; geofence entry/exit alerts; overspeed alerts; route history playback; reports (distance, trips). Non-functional: hazaaron vehicles, live latency ~seconds, data loss nahi, history mahino tak.

**Flow:**
1. **Ingestion** — GPS devices **TCP** (ya MQTT/HTTP) pe **device gateway** servers se connect. Gateway sirf parse + validate + ACK karta hai aur message **Kafka** mein daal deta hai (key = device ID, taaki ek vehicle ke messages order mein ek partition mein). Gateway halka rehta hai — heavy kaam nahi.
2. **Processing** (Kafka consumers, alag consumer groups):
   - **Live state** — vehicle ki latest location/speed/status **Redis** mein (hash per vehicle) — dashboard yahin se padhta hai.
   - **Geofencing** — point-in-polygon check (PostGIS, Tile38 jaisa geo engine, ya in-memory spatial index); entry/exit event pe alert.
   - **Rules** — overspeed, idle, trip start/end detection.
   - **History writer** — batch insert time-series store mein (PostgreSQL partitioned by day/month, TimescaleDB).
3. **Real-time push** — **SignalR** (Redis backplane, multiple servers) se browser ko updates; user sirf apne vehicles/area ka group join kare, har message sabko broadcast nahi.
4. **API + frontend** — Angular map (Leaflet/OpenLayers/Google Maps), REST APIs reports/history ke liye (reports replica se).

**Scaling aur failure points**: gateway horizontally scale (LB — TCP ke liye L4); Kafka partitions = parallelism; consumer lag monitor; device offline/reconnect aur buffered (purane) packets — timestamp device ka use karo, arrival ka nahi; out-of-order points; GPS jitter filter; history data ki retention/archival; alerts ka dedup.

> Device → Gateway → Kafka → (Redis live / geofence / DB history) → SignalR → map. Ye ek line mein bolna aana chahiye.

## Design: notification service (email, SMS, push)
**Requirements**: doosri services notification bhejne ko kahein (OTP, order update, alert); channels — email, SMS, push, in-app; user preferences (kaunse channel, quiet hours); templates; retry; high volume; OTP jaise kuch **priority** mein.

**Design:**
1. **Notification API** — `POST /notifications { userId, type, data, priority }`. Validate, user preferences check, template render, phir **queue** mein daalo aur turant 202 Accepted lautao.
2. **Queues per channel** (Kafka topics / Service Bus / RabbitMQ) — email, SMS, push alag, taaki SMS provider slow ho to email na atke. **Priority queue** alag — OTP marketing ke peeche na phase.
3. **Channel workers** — providers ko call (SendGrid/SES, SMS gateway, FCM/APNs). **Retry with backoff**, provider down pe **fallback provider**, circuit breaker.
4. **DB** — notification log (status: queued/sent/delivered/failed), templates, user preferences. Delivery status **webhooks** se update.
5. **Idempotency** — har request ka ID; same OTP do baar na jaaye.
6. **Rate limiting** — per user (spam se bachao) aur provider limits ke hisaab se throttle.
7. **Dead letter queue** + monitoring (failure rate, queue depth).

In-app ke liye SignalR/WebSocket + DB mein unread notifications.

## Design: URL shortener (bit.ly jaisa)
**Requirements**: lamba URL → chhota code (`sho.rt/aB3xK9`); code pe redirect; optional custom alias, expiry, click analytics. **Read-heavy** (redirect 100x zyada vs create).

**Estimation**: 1 crore naye URLs/mahina, 7-character Base62 code = 62⁷ ≈ 3.5 lakh crore combinations — kaafi.

**Code generation options:**
- **Counter + Base62** — DB sequence/ID ko Base62 mein badlo (0-9, a-z, A-Z). Unique guaranteed, par codes predictable (guess ho sakte hain). Distributed ke liye har server ko ID ranges de do.
- **Hash** (MD5/SHA of URL, pehle 7 chars) — collision check chahiye.
- **Random** 7 chars + uniqueness check (unique index, collision pe retry).

**Data**: `urls(code PK, long_url, user_id, created_at, expires_at)`. Simple key-value lookup — PostgreSQL bhi chalega, bahut scale pe DynamoDB/Cassandra.

**Redirect path** (hot path): `GET /{code}` → **Redis cache** (popular links) → miss pe DB → **301** (permanent, browser cache karega — server load kam, par analytics nahi milte) ya **302** (har baar server pe aayega — analytics ke liye). Analytics event async queue mein, redirect slow na ho.

Aur: malicious URL check, rate limit on create, expired links cleanup job.

## Design: rate limiter
**Requirements**: per user / IP / API key limit (e.g. 100 req/min); multiple API servers ke across sahi count; tez (har request pe chalta hai — ~1 ms); limit paar pe **429** + `Retry-After`; alag endpoints ke alag rules.

**Kahan lagaayein**: API gateway / middleware (har service mein alag logic nahi).

**Algorithm choice:**
- **Fixed window counter** — Redis key `rl:{user}:{minute}` pe `INCR` + `EXPIRE`. Simple, par window boundary pe 2x burst (59th sec pe 100, 61st pe 100).
- **Sliding window log** — har request ka timestamp sorted set mein; accurate par memory zyada.
- **Sliding window counter** — pichhli aur current window ka weighted mix; achha balance.
- **Token bucket** — bucket mein N tokens, fixed rate se refill, har request ek token. Bursts allow karta hai par average limit mein. Sabse common (AWS, Stripe).

**Distributed**: counter **Redis** mein (sab servers share). Race condition se bachne ke liye check + increment **atomic** — `INCR` khud atomic hai, complex logic ke liye **Lua script**. Redis down ho to? — **fail open** (requests jaane do, availability) ya fail closed (security-critical endpoints) — trade-off bolo.

```csharp
// Fixed window in Redis (StackExchange.Redis)
public async Task<bool> AllowAsync(string userId, int limit = 100)
{
    var key = $"rl:{userId}:{DateTime.UtcNow:yyyyMMddHHmm}";
    var count = await _redis.StringIncrementAsync(key);      // atomic
    if (count == 1) await _redis.KeyExpireAsync(key, TimeSpan.FromMinutes(1));
    return count <= limit;
}
```

## Design: file upload service (images/documents)
**Requirements**: users bade files upload karein (images, PDFs, videos); download/preview; virus scan; thumbnails; scale.

**Achha design — file API server se mat guzaaro:**
1. Client API se **upload URL maange** → API ek **pre-signed URL** (S3 / Azure Blob SAS token, 10 min valid) deta hai.
2. Client **seedha Blob storage pe upload** karta hai — API servers pe bandwidth/memory load nahi.
3. Storage event (upload complete) → queue → **workers**: virus scan, thumbnail/resize, metadata DB mein, status "ready".
4. Download: **CDN** ke through, private files ke liye short-lived signed URLs.

Bade files ke liye **chunked/multipart upload** (resume ho sake). DB mein sirf metadata (naam, size, type, owner, blob path) — file khud DB mein kabhi nahi. File type validation (extension nahi, content/magic bytes), size limit.
