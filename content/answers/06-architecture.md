# Architecture, Docker, CI/CD

## Monolith vs Microservices
? Monolith aur microservices mein farak kya hai, aur kab kaunsa chunoge?
**Monolith** mein poori application **ek hi deployable unit** hai — saare modules (users, orders, payments, reports) ek codebase, ek process, aur aam taur pe ek database. **Microservices** mein application chhoti, **independently deployable services** mein bati hoti hai — har service ek business capability ki maalik, apna database, aur doosri services se API ya messages se baat karti hai.

Monolith ke fayde: shuru mein **simple** — ek project, ek deployment, local debugging aasaan, transactions seedhe (ek DB), network calls nahi. Nuksaan: badhne pe codebase bhaari, ek chhote change ke liye poori app deploy, ek module ka bug ya memory leak poori app gira de, poori app ko ek saath scale karna padta hai.

Microservices ke fayde: har service **alag deploy** aur **alag scale**, teams independently kaam karein, ek service fail ho to baaki chalti rahein (agar sahi design ho), alag tech stack possible. Nuksaan: **distributed system ki complexity** — network failures, latency, distributed transactions (Saga), data consistency (eventual), monitoring/tracing, service discovery, zyada infra aur DevOps.

**Balanced jawab**: zyada tar naye projects ke liye **well-structured modular monolith** se shuru karo, aur jab koi module sach mein alag scale ya alag team maange tab use service mein nikalo. Microservices tabhi jab unke fayde unki operational complexity ko justify karein.

| Monolith | Microservices |
|---|---|
| Ek deployable application | Kai independent services |
| Shuru mein simple | Operational complexity zyada |
| Local debugging aasaan | Distributed debugging, tracing chahiye |
| Poori app scale | Har service alag scale |
| Ek DB, seedhe transactions | Har service ka DB, eventual consistency |
| Ek bug poori app gira sakta hai | Fault isolation (sahi design pe) |

> Microservices ek tool hai, goal nahi. Pehle modular monolith.

## Microservices
? Microservices kya hain? Inke challenges kya hain?
**Microservices architecture** mein system chhoti services mein bata hota hai, jahan har service ek **business capability** (User, Order, Payment, Notification) ki poori maalik hai. Typical setup: client → **API Gateway** → services → har service ka apna database.

Core principles:
- **Independent deployment** — Order service badlo, sirf wahi deploy
- **Database per service** — koi service doosri ke DB mein seedha nahi jhaankti; data API/events se milta hai. Shared DB = distributed monolith
- **Communication** — sync (REST/gRPC) jab turant jawab chahiye, async (Kafka/RabbitMQ events) jab loose coupling chahiye
- **Fault isolation + resilience** — timeouts, retries, **circuit breaker** (Polly) taaki ek slow service baaki ko na giraye
- **Observability** — centralized logging, metrics, **distributed tracing** (correlation ID har request ke saath)
- **Independent scaling** — sirf busy service ke zyada instances

Distributed transactions ka problem: order place karna = order save + payment + inventory, teen alag DBs mein. Ek ACID transaction possible nahi. **Saga pattern** — har step apna local transaction, fail hone pe **compensating actions** (payment refund). **Outbox pattern** — DB change aur event publish ko reliable banana.

```text
Angular → API Gateway → Order Service ─(REST)→ Inventory Service
                              │
                              └─(Kafka: OrderCreated)→ Notification Service
                                                     → Analytics Service
```

! "Saari services ek hi database share karengi" — ye microservices nahi, distributed monolith hai: saari services DB schema se bandh jaati hain.

## Synchronous
? Microservices mein synchronous communication kya hai? Iske risks kya hain?
**Synchronous communication** mein caller request bhejta hai aur **jawab aane tak wait karta hai** — REST/HTTP ya gRPC call. Order service ne inventory service ko call kiya "stock hai?", aur jawab ke bina aage nahi badh sakti.

Kab sahi hai: jab **turant jawab chahiye** user ko dikhane ke liye ya aage ka faisla lene ke liye — login validate karna, price check, stock check before checkout.

Problems: **temporal coupling** — agar inventory service down hai to order service bhi fail. Ek chain (A → B → C → D) mein latency jud jaati hai aur koi bhi ek slow ho to poora slow. Isliye sync calls ke saath **timeout** (hamesha!), limited **retry** (exponential backoff), aur **circuit breaker** zaroori hain. .NET mein `IHttpClientFactory` + Polly (ya .NET 8 ka `AddStandardResilienceHandler`).

```csharp
builder.Services.AddHttpClient<InventoryClient>(c => c.BaseAddress = new("http://inventory"))
    .AddStandardResilienceHandler();     // timeout + retry + circuit breaker

var inStock = await inventory.CheckAsync(productId);   // jawab tak wait
```

## Asynchronous
? Asynchronous (message-based) communication kya hai aur kab better hai?
**Asynchronous communication** mein caller **message/event bhej ke aage badh jaata hai** — jawab ka wait nahi karta. Message broker (**Kafka**, **RabbitMQ**, Azure Service Bus) message ko rakhta hai, aur jo services interested hain wo apni speed se consume karti hain.

Fayde: **loose coupling** — publisher ko pata bhi nahi ki kaun consume karega; nayi service jodni ho (analytics) to publisher nahi badalta. **Resilience** — consumer down hai to messages queue mein wait karte hain, baad mein process. **Load leveling** — traffic spike ko queue absorb kar leti hai. Ek event kai services ko.

Challenges: **eventual consistency** — data turant har jagah update nahi hota. **Duplicate messages** — brokers "at-least-once" deliver karte hain, isliye consumers **idempotent** hone chahiye (same message do baar aaye to do baar effect na ho). Message ordering, dead-letter queues (jo messages baar-baar fail hon), aur debugging mushkil.

```text
Order Service ──publish──► [Kafka topic: order-created] ──► Notification Service (email)
                                                        ──► Inventory Service (stock kam)
                                                        ──► Analytics Service
Order service turant user ko "Order placed" bol deti hai.
```

## Sync vs async communication — kab kaunsa?
**Sync (REST/gRPC)** jab caller ko **abhi jawab chahiye** aage badhne ke liye — user ke saamne dikhana hai, ya response pe decide karna hai. Simple hai, samajhne aur debug karne mein aasaan, par services ko runtime pe baandh deta hai (ek down = dono prabhavit).

**Async (Kafka/RabbitMQ)** jab kaam **baad mein** ho sakta hai aur caller ko result ka wait nahi karna — notifications, emails, reports, analytics, doosri services ko "ye hua" batana. Loose coupling aur resilience deta hai, par eventual consistency aur complexity laata hai.

Asli systems mein **dono mix** hote hain. Example — order placement: stock check aur payment authorization **sync** (user ko turant pata hona chahiye), aur `OrderCreated` event **async** (email, SMS, inventory update, analytics).

| Sync | Async |
|---|---|
| Caller wait karta hai | Caller aage badh jaata hai |
| REST, gRPC | Kafka, RabbitMQ, Service Bus |
| Turant jawab, strong consistency | Eventual consistency |
| Temporal coupling | Loose coupling |
| Stock check, login, price | Email, notifications, analytics |

## API Gateway
? API Gateway kya hai aur microservices mein kyun chahiye?
**API Gateway** clients (Angular, mobile) aur backend microservices ke beech ek **single entry point** hai. Client ko 10 services ke alag URLs nahi jaanne padte — sirf gateway ko call karta hai, aur gateway request ko sahi service tak route karta hai.

Common responsibilities (cross-cutting concerns jo har service mein dohrane na padein):
- **Routing** — `/api/orders/*` → Order service
- **Authentication** — JWT ek jagah validate
- **Rate limiting / throttling**
- **Request aggregation** — ek client call pe kai services se data jod ke ek response (BFF — Backend for Frontend)
- **SSL termination, caching, logging, CORS**
- Kabhi-kabhi load balancing aur request/response transformation

.NET mein **YARP** ya **Ocelot**; cloud mein Azure API Management, AWS API Gateway; ya Nginx/Kong. Risk: gateway **single point of failure** aur bottleneck ban sakta hai — isliye iske kai instances aur ise patla rakho (business logic gateway mein nahi).

```json
// YARP appsettings: /api/orders → order service
"ReverseProxy": {
  "Routes":   { "orders": { "ClusterId": "orders", "Match": { "Path": "/api/orders/{**rest}" } } },
  "Clusters": { "orders": { "Destinations": { "d1": { "Address": "http://order-service:8080/" } } } }
}
```

## CQRS
? CQRS pattern kya hai aur kab use karna chahiye?
**CQRS (Command Query Responsibility Segregation)** ka matlab: data **badalne** (Commands) aur data **padhne** (Queries) ke liye **alag models/raaste** rakhna.

- **Command** — kuch badalta hai, kuch lautata nahi (ya sirf id): `CreateOrderCommand`, `CancelOrderCommand`. Validation aur business rules yahan.
- **Query** — sirf padhta hai, kuch nahi badalta: `GetOrderByIdQuery`, `GetDashboardQuery`. Read-optimized — DTO projection, Dapper, ya alag read database/materialized view.

Kyun? Aksar reads aur writes ki zaroorat alag hoti hai — writes ko business rules aur consistency chahiye, reads ko speed aur alag shapes (dashboard, report). Ek hi model dono ke liye use karo to wo dono mein kharab ho jaata hai. Alag karke har side ko alag optimize aur scale kar sakte ho.

Levels: **simple CQRS** — same DB, bas code mein commands aur queries alag (MediatR handlers) — ye common aur sasta hai. **Full CQRS** — alag read/write databases, events se sync, aksar Event Sourcing ke saath — bahut complex, eventual consistency. Har CRUD app pe full CQRS lagana over-engineering hai; tabhi use karo jab read/write workloads sach mein alag hon.

```csharp
public record CreateOrderCommand(int CustomerId, List<ItemDto> Items) : IRequest<int>;
public record GetOrderQuery(int Id) : IRequest<OrderDto?>;

public class CreateOrderHandler(AppDbContext db) : IRequestHandler<CreateOrderCommand, int>
{
    public async Task<int> Handle(CreateOrderCommand c, CancellationToken ct)
    {
        var order = Order.Create(c.CustomerId, c.Items);   // business rules
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order.Id;
    }
}
// Controller: var id = await mediator.Send(new CreateOrderCommand(...));
```

## Clean Architecture
? Clean Architecture kya hai? Layers aur dependency rule samjhao.
**Clean Architecture** code ko **layers** mein organize karti hai taaki **business logic database, framework aur UI se independent** rahe. Golden rule — **Dependency Rule**: dependencies hamesha **andar ki taraf** jaati hain. Andar ki layer ko bahar ki layer ka kuch pata nahi hota.

Layers (andar se bahar):
- **Domain** — entities, value objects, business rules. Kisi pe depend nahi (na EF, na ASP.NET).
- **Application** — use cases (CreateOrder, CancelOrder), interfaces (`IOrderRepository`, `IEmailSender`), DTOs, validation. Sirf Domain pe depend.
- **Infrastructure** — interfaces ke asli implementations: EF Core DbContext, repositories, email, file storage, external APIs.
- **Presentation / API** — controllers, middleware, DI setup. Composition root yahan.

Trick: Application layer interface define karti hai, Infrastructure implement karta hai — **Dependency Inversion**. Isliye database badalna ho to sirf Infrastructure badlega; business logic ko unit test bina DB ke kar sakte ho.

Trade-off: chhote CRUD apps mein itni layers boilerplate aur indirection laati hain. Medium/badi apps jahan business logic asli hai, wahan fayda dikhta hai.

| Layer | Zimmedari | Example |
|---|---|---|
| Presentation | HTTP, UI | `OrdersController` |
| Application | Use cases, interfaces | `CreateOrderHandler`, `IOrderRepository` |
| Domain | Business rules | `Order`, `Money`, `Order.Cancel()` |
| Infrastructure | DB, external systems | `PgOrderRepository`, `SmtpEmailSender` |

```text
Presentation ──► Application ──► Domain
Infrastructure ──► Application (interfaces implement karta hai)
Domain kisi pe depend nahi karta.
```

## Caching
? Caching kya hai? In-memory aur distributed caching mein farak batao.
**Caching** matlab baar-baar maange jaane wale data ko **tez jagah** (memory, Redis) pe rakhna taaki har baar database ya slow API tak na jaana pade. Sahi jagah lagaya to response time aur DB load dono kaafi girte hain.

Types:
- **In-memory cache (`IMemoryCache`)** — app process ki memory mein. Sabse tez, par sirf ek instance ka — load balancer ke peeche 3 instances hain to 3 alag caches (inconsistent), aur restart pe khali.
- **Distributed cache (Redis, `IDistributedCache`)** — sab instances share karte hain, restart pe bacha rehta hai. Network call hai, par phir bhi DB se bahut tez.
- **HTTP / response caching, CDN** — browser ya CDN pe static/public responses.
- .NET 9 ka **HybridCache** — in-memory + distributed dono, stampede protection ke saath.

**Cache-aside pattern** (sabse common): request aayi → cache mein dekho → mila to lautao → nahi mila to DB se laao, cache mein rakho (expiry ke saath), lautao.

Mushkil hissa — **invalidation**: data badla to cache purana (stale). Tareeke: **expiry (TTL)** — absolute ya sliding; data update pe cache **remove** karo; ya events se invalidate. **Cache stampede**: popular key expire hui aur ek saath 1000 requests DB pe gir padi — lock ya early refresh se bachao. Kya cache karein: jo baar-baar padha jaaye aur kam badle (config, master data, dashboards). User-specific ya sensitive data ki key mein user id zaroor ho.

```csharp
public async Task<List<CityDto>> GetCitiesAsync()
{
    return await _cache.GetOrCreateAsync("cities:all", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
        return await _db.Cities.AsNoTracking().Select(c => new CityDto(c.Id, c.Name)).ToListAsync();
    }) ?? [];
}

public async Task UpdateCityAsync(City c)
{
    await _db.SaveChangesAsync();
    _cache.Remove("cities:all");          // invalidate
}
```

> Cache mein do mushkil cheezein hain: invalidation aur naming.

## gRPC
? gRPC kya hai aur REST se kab behtar hai?
**gRPC** Google ka high-performance **RPC (Remote Procedure Call)** framework hai. Tum ek `.proto` file mein service aur messages define karte ho, aur usse client aur server ka code **generate** hota hai — doosri service ka method aise call karo jaise local method ho.

Tez kyun hai: **HTTP/2** (ek connection pe kai requests multiplex, header compression) aur **Protocol Buffers** (compact binary format — JSON se chhota aur parse karne mein tez). **Strongly typed contract** — dono taraf ek hi `.proto`, to field ka naam/type galat hone ki galti compile time pe. **Streaming** support — server streaming, client streaming, bidirectional (live updates).

Limitations: **browsers seedha gRPC call nahi kar sakte** (gRPC-Web ya JSON transcoding chahiye), payload binary hai to Postman/curl se padhna mushkil, aur public APIs ke liye REST zyada familiar hai. Isliye aam pattern: **public/frontend APIs = REST, internal service-to-service = gRPC**.

| REST | gRPC |
|---|---|
| JSON (text) | Protobuf (binary, compact) |
| HTTP/1.1 ya 2 | HTTP/2 |
| Browser-friendly | Browser ke liye gRPC-Web chahiye |
| Contract optional (OpenAPI) | `.proto` contract compulsory |
| Human-readable | Tez, chhota payload |
| Public APIs | Internal microservice calls, streaming |

```protobuf
syntax = "proto3";
service Inventory {
  rpc CheckStock (StockRequest) returns (StockReply);
  rpc WatchStock (StockRequest) returns (stream StockReply);   // server streaming
}
message StockRequest { int32 product_id = 1; }
message StockReply   { int32 available = 1; }
```

## Docker
? Docker kya hai aur .NET app ko containerize kaise karoge?
**Docker** application ko uski saari dependencies (runtime, libraries, config) ke saath ek **container** mein pack karta hai, taaki wo har jagah — developer laptop, test server, production — **bilkul ek jaisa** chale. "Mere machine pe to chal raha tha" wali problem khatam.

Concepts:
- **Image** — read-only template (app + runtime + OS libraries). Layers mein banti hai aur cache hoti hai.
- **Container** — image ka **running instance**. Ek image se kai containers. VM se bahut halka — host ka OS kernel share karta hai, seconds mein start.
- **Dockerfile** — image banane ki recipe.
- **Registry** — images ka store (Docker Hub, Azure Container Registry, Harbor).
- **Volume** — data jo container restart/delete pe bhi bache (database files). Container ka apna filesystem temporary hai.
- **Network** — containers ek doosre ko service name se dhoondhte hain (`api` → `postgres:5432`).
- **Docker Compose** — kai containers (API + Postgres + Redis) ek YAML file se ek saath chalana.

.NET ke liye **multi-stage Dockerfile**: SDK image mein build/publish, phir chhoti `aspnet` runtime image mein sirf output copy — final image chhoti aur secure. **Resource limits** (`--memory`, `--cpus`) lagao — bina limit ke ek container poore host ki memory kha sakta hai. Container mein .NET ka GC in limits ko samajhta hai.

| Command | Kaam |
|---|---|
| `docker build -t api:1.0 .` | Image banao |
| `docker run -d -p 8080:8080 api:1.0` | Container chalao, port map |
| `docker ps` / `docker ps -a` | Running / saare containers |
| `docker logs -f api` | Logs dekho |
| `docker exec -it api sh` | Container ke andar shell |
| `docker stats` | CPU/memory usage |
| `docker compose up -d` | Poora stack chalao |

```dockerfile
# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore                       # alag layer — csproj na badle to cache
COPY . .
RUN dotnet publish -c Release -o /app

# Stage 2: runtime (chhoti image)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

> "Mere machine pe to chal raha tha" ka ilaaj.

## Exit Code 137
? Container exit code 137 ke saath band ho gaya — iska matlab kya hai aur kaise debug karoge?
**Exit code 137** ka matlab: process ko **SIGKILL (signal 9)** se maara gaya (128 + 9 = 137). Process ne khud exit nahi kiya — use bahar se zabardasti khatam kiya gaya, aur SIGKILL ko process pakad ya handle nahi kar sakta.

Sabse common wajah: **OOM (Out of Memory) kill**. Container ne apni memory limit (`--memory` / Kubernetes limit) cross ki, ya host ki memory khatam hui, aur Linux kernel ke **OOM killer** ne process maar diya. Doosri wajahein: `docker kill`, ya Kubernetes ne liveness probe fail hone pe container restart kiya.

Kaise check karein: `docker inspect <container>` mein `State.OOMKilled: true` dekho; `docker stats` se memory usage; host pe `dmesg` / `journalctl -k` mein "Out of memory: Killed process"; Kubernetes mein `kubectl describe pod` mein `OOMKilled`.

Fix: pehle **samjho memory kyun badh rahi hai** — memory leak (static collections, un-disposed objects, event handlers), bina paging ke bada data load, bade caches. Limit badhana sirf tab jab app ko sach mein zyada chahiye. .NET mein GC ko container limit pata hoti hai; kai .NET containers ek host pe hain aur har ek bina limit ke hai, to har ek ka GC poori host memory apni samajhta hai — aur OOM kills. Har container pe memory limit lagao.

```bash
docker inspect api --format '{{.State.OOMKilled}} {{.State.ExitCode}}'   # true 137
docker stats --no-stream
dmesg -T | grep -i "killed process"
docker run -d --memory=512m --memory-swap=512m api:1.0      # limit lagao
```

! "137 matlab app crash hua" — nahi. App ko bahar se maara gaya, aksar memory limit ki wajah se. App logs mein aksar kuch nahi milta.

## Nginx
? Nginx kya hai aur .NET app ke aage reverse proxy kyun lagaate hain?
**Nginx** ek high-performance web server hai jo aksar in roles mein use hota hai:

- **Reverse proxy** — client Nginx se baat karta hai, Nginx request peeche .NET API (Kestrel) ko bhejta hai. Backend seedha internet pe expose nahi hota.
- **SSL/TLS termination** — HTTPS certificate Nginx pe; peeche plain HTTP (internal network mein).
- **Load balancer** — ek `upstream` mein kai backend instances, requests baant ke (round robin, least_conn, ip_hash).
- **Static file server** — Angular ka build (`dist/`) seedha serve karna, bahut tez.
- **Caching, gzip compression, rate limiting, security headers**.

Typical: `Browser → Nginx :443 → Kestrel :8080`. Angular SPA serve karte waqt `try_files $uri /index.html;` zaroori hai, warna `/orders/5` pe refresh karne se 404 aayega (route Angular ka hai, file nahi).

Reverse proxy ke peeche .NET ko asli client IP aur scheme (https) batane ke liye `X-Forwarded-For`/`X-Forwarded-Proto` headers bhejo aur .NET mein `UseForwardedHeaders()` lagao. Common errors: **502 Bad Gateway** (backend down / port galat), **504 Gateway Timeout** (backend ne `proxy_read_timeout` ke andar jawab nahi diya), **413** (upload `client_max_body_size` se bada).

```nginx
upstream api_backend {
    server api1:8080;
    server api2:8080;
}
server {
    listen 443 ssl;
    server_name app.example.com;
    ssl_certificate     /etc/ssl/app.crt;
    ssl_certificate_key /etc/ssl/app.key;

    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;      # Angular routes
    }
}
```

## CI/CD / Jenkins
? CI/CD kya hai? Apne project ki pipeline explain karo.
**CI (Continuous Integration)**: har code push pe automatically **build aur test** chalana, taaki galtiyan jaldi pakdi jaayein aur main branch hamesha working rahe. **CD (Continuous Delivery/Deployment)**: tested build ko automatically environments (dev → UAT → prod) pe **deploy** karna. Delivery mein prod deploy ek manual approval ke baad; Deployment mein wo bhi automatic.

**Jenkins** ek open-source automation server hai jo ye pipelines chalata hai. Pipeline ek **Jenkinsfile** (code mein, Git mein version-controlled) mein stages ke roop mein likhi jaati hai. Alternatives: GitHub Actions, GitLab CI, Azure DevOps.

Typical pipeline: Git push → checkout → restore/build → unit tests → code quality/security scan (SonarQube) → Docker image build → registry push (version tag, jaise commit SHA) → deploy (SSH + docker compose, ya Kubernetes) → **health check** → fail ho to rollback.

Achhi practices: secrets Jenkins credentials store mein (Jenkinsfile mein kabhi nahi), images ko immutable tag do (`latest` pe bharosa mat karo), har deploy ke baad health check, aur rollback ka tareeka tay rakho. `node_modules` jaisi cheezein repo mein commit mat karo — clone aur pipeline dono slow ho jaate hain; dependency caching use karo.

```groovy
pipeline {
  agent any
  environment { IMAGE = "registry.local/api:${env.GIT_COMMIT.take(7)}" }
  stages {
    stage('Build') { steps { sh 'dotnet build -c Release' } }
    stage('Test')  { steps { sh 'dotnet test --no-build -c Release' } }
    stage('Image') { steps { sh "docker build -t $IMAGE . && docker push $IMAGE" } }
    stage('Deploy') {
      steps {
        sh "ssh deploy@server 'IMAGE=$IMAGE docker compose up -d api'"
        sh "curl -fsS --retry 5 --retry-delay 5 https://api.example.com/health"
      }
    }
  }
}
```

# Production scenarios — kya poocha jata hai

## Production: API Slow
? Production mein ek API achanak slow ho gayi — kaise debug karoge?
Interviewer yahan dekhna chahta hai ki tum **andaaze se nahi, data se** debug karte ho. "Server restart kar dunga" ya "RAM badha dunga" sabse kharab jawab hai — bina root cause ke.

Structured approach:

1. **Scope samjho** — saari APIs slow hain ya ek? Sab users ya kuch? Kab se? Kisi deployment ke baad? Har waqt ya peak load pe?
2. **Logs aur metrics** — slow endpoint ka response time (p50/p95/p99), error rate. APM (Application Insights, Elastic APM) se pata chalta hai time kahan ja raha hai — DB mein, external API mein, ya code mein.
3. **Database** — sabse common culprit. Slow query log / `pg_stat_statements` se query nikaalo, `EXPLAIN ANALYZE` chalao — Seq Scan (missing index), N+1 queries, bina paging ke bada data, lock waits.
4. **Resources** — server/container ka CPU, memory, disk I/O. DB connection pool exhaust to nahi (requests connection ka wait kar rahi hain)?
5. **External dependencies** — koi third-party API slow ho gayi? Timeouts set hain?
6. **Code** — sync-over-async (`.Result`) se thread pool starvation, bina paging ke `ToList()`, loop mein DB calls, bade objects serialize karna.
7. **Recent changes** — last deployment, config change, data volume achanak badha?
8. **Fix karo, phir verify** — same metrics dobara dekho ki sach mein theek hua.

Answer structure: "Pehle measure karta hoon kahan time ja raha hai, phir us layer mein root cause dhoondhta hoon, fix karta hoon aur metrics se verify karta hoon." Apne project ka ek real example do to aur achha.

```text
Slow API
 ├─ APM/logs: kaunsa endpoint, p95 kitna, kab se?
 ├─ DB: pg_stat_statements → EXPLAIN ANALYZE → index / N+1 / paging
 ├─ Resources: CPU, memory, connection pool
 ├─ External calls: timeout, latency
 ├─ Code: .Result, loops mein DB call, bada payload
 └─ Fix → deploy → same metric se verify
```

! "Server restart kar dunga" — temporary relief ho sakta hai, par root cause wahin hai aur problem wapas aayegi.

## Production: Database Full
? Production DB ki disk full ho gayi — kya karoge?
Disk full hone pe PostgreSQL naye writes band kar deta hai (aur WAL ke liye jagah na mile to crash bhi ho sakta hai) — ye emergency hai. Pehle **andhadhund delete mat karo** — pehle pata karo jagah kaun kha raha hai.

Investigation order:

1. `df -h` — kaunsa disk/mount full hai (data directory, WAL, logs alag ho sakte hain).
2. **Database sizes** — `pg_database_size`. Kaunsa DB bada hai.
3. **Sabse badi tables aur indexes** — `pg_total_relation_size` se top 10.
4. **Bloat** — bahut saare dead tuples (`pg_stat_user_tables.n_dead_tup`)? Autovacuum chal raha hai? Koi lambi "idle in transaction" session VACUUM ko rok rahi hai?
5. **WAL (`pg_wal`)** — agar bahut bada hai: koi **inactive replication slot** WAL ko rok ke rakhe hue hai, ya archiving fail ho rahi hai. Ye bahut common aur khatarnak cause hai.
6. **Log files** — PostgreSQL logs (khaas kar `log_statement = all` on ho) ya app logs same disk pe.
7. **Temp files** — bade sorts/hash joins disk pe spill.

Remediation (cause ke hisaab se): purana data **archive/delete** (batches mein) + VACUUM; bhaari time-series tables ko **partition** karke purane partitions drop; inactive replication slot hatao; logs rotate/compress; unused indexes drop; aur agar data genuinely badh raha hai to **storage badhao**. Aage ke liye **disk usage alert** (70–80% pe) lagao.

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));

SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;                     -- inactive slot = WAL jama ho raha hai

SELECT pid, state, now() - xact_start AS age, query
FROM pg_stat_activity WHERE state = 'idle in transaction' ORDER BY age DESC;
```

## Delete But Disk Not Reducing
Strong answer: **PostgreSQL MVCC use karta hai.** `DELETE` row ko physically nahi hatata — sirf use **dead** mark karta hai, kyunki ho sakta hai koi purani transaction abhi bhi use dekh rahi ho. Isliye table ki file ka size wahi rehta hai.

**VACUUM** (ya autovacuum) dead rows ki jagah ko **reusable** bana deta hai — nayi rows usi jagah aa jaayengi — par file chhoti **nahi** hoti (sirf table ke end ke khaali pages trim ho sakte hain). Yani disk usage badhna ruk jaata hai, par OS ko space wapas nahi milta.

OS ko space wapas chahiye to: **VACUUM FULL** (table poori rewrite karta hai, chhoti file banti hai, par **ACCESS EXCLUSIVE lock** — us dauraan table na padh sakte ho na likh sakte ho; aur rewrite ke liye utni hi extra free disk chahiye). Production mein iske liye **pg_repack** better hai (online, minimal lock). Aage ke liye: agar regularly purana data hatana hai (logs, tracking data) to **table partitioning** — purana partition `DROP` karo, jo turant aur poori jagah wapas deta hai, bina bloat ke.

Aur check karo koi lambi transaction VACUUM ko rok to nahi rahi — uske rehte dead rows saaf hi nahi hongi.

```sql
DELETE FROM tracking WHERE created_at < now() - interval '180 days';   -- size same
VACUUM ANALYZE tracking;          -- jagah reusable, file same
-- OS ko wapas (maintenance window mein, lock ke saath):
VACUUM FULL tracking;

-- Behtar long-term: partition
DROP TABLE tracking_2025_q1;      -- turant, poori jagah wapas
```

> DELETE = dead mark. VACUUM = jagah reuse. VACUUM FULL / partition drop = OS ko jagah wapas.

## Some Users Login, Some Don't
"Kuch users login kar pa rahe hain, kuch nahi" — ye **inconsistency** batati hai ki problem kisi **specific hisse** mein hai, poore system mein nahi. Pehla sawaal: failing users mein **common kya hai?**

Hypotheses aur check:

1. **Load balancer ke peeche ek kharab instance** (sabse common) — requests round-robin se baant-ti hain; jo users bimaar instance pe gaye wo fail. Har backend instance ko alag se check karo: logs, health endpoint, config, version. Ek instance pe purani deployment, galat config (JWT key, connection string), ya DB connection toota ho sakta hai. Mila to use LB se nikaalo (isolate), fix karo, verify karo.
2. **Session/state instance mein** — agar login session in-memory hai aur **sticky sessions** nahi hain, to agli request doosre instance pe jaati hai jise session pata nahi → logout/login fail. Fix: distributed session (Redis) ya stateless JWT. Data Protection keys bhi sab instances mein same honi chahiye, warna ek instance ka cookie doosra decrypt nahi kar payega.
3. **User-specific data** — kuch accounts locked, password expire, role/permission missing, ya IDAM/identity provider mein un users ka data galat.
4. **Client-side** — specific browser/app version, purana cached JS, cookies (SameSite), clock skew (JWT `exp`/`nbf` validate nahi hota agar server ka time galat hai).
5. **Network/region** — ek region/ISP/VPN ka issue, DNS.

Answer structure: "Pehle pattern dhoondhta hoon — kya failing requests ek hi instance pe ja rahi hain? Logs mein correlation ID se trace karta hoon kaunsa backend node handle kar raha hai. Instance-wise compare karta hoon, bimaar instance ko isolate karke fix karta hoon, phir verify."

! "Sabke liye restart kar dete hain" — agar ek instance ki config galat hai to restart ke baad bhi wahi rahega.

## API 500
? API 500 error de rahi hai — step by step kaise debug karoge?
**500 Internal Server Error** ka matlab server pe koi **unhandled exception** hua — client ki galti nahi. Debug karne ka structured tareeka:

1. **Logs mein exception dhoondho** — request ke time/endpoint/correlation ID se. Stack trace batayega exact line aur exception type.
2. **Stack trace padho** — `NullReferenceException` (koi data missing), `DbUpdateException` (constraint violation, DB down), `TimeoutException`/`HttpRequestException` (external service), `InvalidOperationException` (jaise `Single()` ko do rows mili).
3. **Recent changes** — last deployment, config change, migration? Sab kuch usi waqt se shuru hua?
4. **Dependencies** — DB, Redis, external API, file storage — sab up hain? Connection string/credentials badle?
5. **Reproduce karo** — same input se (logs mein request body/params hon to), lower environment mein.
6. **Root cause fix** — sirf try/catch laga ke chhupao mat.
7. **Verify** — fix deploy karke logs/metrics mein error rate zero.

Saath mein prevention: **global exception handler** jo log kare aur client ko ProblemDetails + traceId de; client errors (validation, not found) ko sahi **4xx** do — taaki 500 sirf asli bugs ke liye rahe aur alert meaningful hon.

```text
500 → logs (traceId) → stack trace → recent changes → DB/external services
    → reproduce → root cause → fix → verify (error rate 0)
```

! Har error ko 500 lautana — validation ya "not found" 4xx hone chahiye; warna asli server bugs shor mein chhup jaate hain.

## Angular Slow
? Angular page bahut slow load ho raha hai — kya-kya check karoge?
Angular app slow hai — pehle pata karo **kya slow hai**: pehla load, navigation, ya ek specific screen pe interaction? Phir **measure** karo — Chrome DevTools (Network, Performance tab), Lighthouse, Angular DevTools profiler.

Check list:

1. **Network** — API calls kitni hain aur kitni slow? Aksar problem frontend nahi, **slow API** hoti hai.
2. **Payload size** — API 5 MB JSON bhej rahi hai jisme se 10 fields chahiye? DTO/paging backend pe.
3. **API calls ki ginti** — ek screen pe 30 calls? Duplicate calls (same data do components ne maanga)? Bina debounce search?
4. **Bundle size / pehla load** — bada `main.js`? Lazy loading nahi hai? Badi libraries (moment, lodash poora)?
5. **Change detection** — Default strategy + bada tree; OnPush lagao.
6. **Bade lists** — `*ngFor` bina `trackBy` ke; 5000 rows DOM mein → pagination/virtual scroll.
7. **Template mein function calls** — `{{ calculate() }}` har change detection pe chalta hai; pure pipe use karo.
8. **Subscriptions leak** — har visit pe naye subscriptions jo kabhi band nahi hote; app use karte-karte slow hoti jaaye to yahi.
9. **Memory** — DevTools memory snapshot se leak.

Possible fixes: OnPush, trackBy, pagination/virtual scroll, lazy loading, debounce, caching/`shareReplay`, API optimization, bundle optimization.

```text
Pehla load slow?     → bundle size, lazy loading, API ki speed
Navigation slow?     → route pe API calls, resolver, bade components
Typing/scroll slow?  → change detection, trackBy, template functions, bade lists
Time ke saath slow?  → subscription/memory leak
```

## Search API Every Keystroke
? Search box har keystroke pe API call kar raha hai — kaise fix karoge?
Problem: search box mein har keystroke pe API call — "A" → call, "An" → call, "Ang" → call… "Angular" type karne mein 7 calls, server pe bekaar load, aur **race condition**: purani request ka jawab baad mein aaya to wo naye results ko overwrite kar dega.

Solution — RxJS ka ek chhota pipeline:
- **debounceTime(300)** — user 300 ms rukega tabhi value aage jaayegi; tez typing ke beech calls nahi.
- **distinctUntilChanged()** — same value dobara aaye (type karke delete kiya) to call nahi.
- **filter** — bahut chhote terms (1 character) pe search mat karo.
- **switchMap** — nayi search aayi to **purani request cancel**; sirf latest ka result — race condition khatam.
- **catchError** — ek failed call se poora stream na mare.

Backend side bhi: search column pe index (`ILIKE '%x%'` ke liye `pg_trgm` GIN index), result limit (top 20), aur zaroorat ho to rate limiting.

Answer: "debounceTime rapid calls kam karta hai, distinctUntilChanged duplicates hatata hai, aur switchMap latest search ko priority deta hai aur purani requests cancel karta hai."

```typescript
this.results$ = this.searchCtrl.valueChanges.pipe(
  map(v => (v ?? '').trim()),
  filter(v => v.length >= 2),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.api.search(term).pipe(catchError(() => of([]))))
);
```

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);   -- ILIKE '%x%' tez
```

## Large API Response
? API bahut bada response bhej rahi hai (lakhs rows) — kaise handle karoge?
Bada API response (hazaaron records, MBs ka JSON) har jagah nuksaan karta hai: DB pe load, server memory, network time, browser mein parse aur render — aur mobile pe aur bura.

Solutions:
- **Pagination** — sabse zaroori. `?page=1&pageSize=20` (offset paging) ya **keyset/cursor paging** (`?after=lastId`) jo bade tables pe tez hai kyunki OFFSET ko skipped rows padhni padti hain. `pageSize` pe maximum limit lagao (jaise 100), warna koi `pageSize=1000000` bhej dega.
- **Filtering aur sorting server pe** — client ko saara data bhej ke filter karwana galat.
- **DTO projection** — sirf zaroori fields (`Select`), poori entity nahi.
- **Compression** — `UseResponseCompression` (gzip/Brotli), ya Nginx pe. JSON bahut compress hota hai.
- **Caching** — baar-baar same data.
- Bahut bade exports (report download) ke liye **streaming** (`IAsyncEnumerable`) ya background job jo file banaye aur link de.

Response mein metadata do taaki frontend paging UI bana sake: `data`, `totalCount`, `page`, `pageSize`.

```csharp
[HttpGet]
public async Task<PagedResult<VehicleDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
{
    pageSize = Math.Clamp(pageSize, 1, 100);
    var q = db.Vehicles.AsNoTracking().Where(v => v.IsActive);
    var total = await q.CountAsync();
    var data = await q.OrderBy(v => v.Id)
                      .Skip((page - 1) * pageSize).Take(pageSize)
                      .Select(v => new VehicleDto(v.Id, v.RegNo, v.Status))
                      .ToListAsync();
    return new PagedResult<VehicleDto>(data, total, page, pageSize);
}
// Keyset: .Where(v => v.Id > afterId).OrderBy(v => v.Id).Take(pageSize)
```
