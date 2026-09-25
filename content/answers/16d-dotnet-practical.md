# .NET practical — config, jobs, collections

## Configuration kaise kaam karti hai — appsettings, environments aur IOptions
ASP.NET Core config **kai sources** se aati hai, aur **baad wala pehle wale ko override** karta hai:
1. `appsettings.json` (common)
2. `appsettings.{Environment}.json` (`Development`, `Staging`, `Production`)
3. **User secrets** (sirf Development)
4. **Environment variables** — `ConnectionStrings__Db` (double underscore = nesting)
5. Command-line args
6. (optional) Azure Key Vault / AWS Secrets Manager

Environment `ASPNETCORE_ENVIRONMENT` variable se decide hota hai.

**Options pattern** — config section ko ek **strongly-typed class** se bind karo, aur DI se inject karo. `config["Smtp:Host"]` jaise magic strings har jagah nahi.

| | Kab padhta hai | Lifetime |
| --- | --- | --- |
| **`IOptions<T>`** | App start pe ek baar | Singleton — config badle to restart chahiye |
| **`IOptionsSnapshot<T>`** | Har request pe fresh | Scoped — singleton mein inject nahi ho sakta |
| **`IOptionsMonitor<T>`** | Hamesha latest + change notification | Singleton-safe — background services ke liye |

**Validation**: `.ValidateDataAnnotations().ValidateOnStart()` — galat/missing config pe app **start hi na ho** (production mein aadhi raat ko crash se better).

```csharp
// appsettings.json
// "Smtp": { "Host": "smtp.example.com", "Port": 587, "From": "no-reply@example.com" }

public class SmtpOptions
{
    [Required] public string Host { get; set; } = "";
    [Range(1, 65535)] public int Port { get; set; }
    [Required, EmailAddress] public string From { get; set; } = "";
}

builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

public class EmailSender(IOptions<SmtpOptions> opt)
{
    private readonly SmtpOptions _smtp = opt.Value;
}
```

## Background jobs — BackgroundService, Hangfire aur Quartz
Kuch kaam request ke andar nahi hone chahiye — email bhejna, report banana, har raat cleanup, har 5 minute sync. Options:

**`BackgroundService` / `IHostedService`** (built-in) — app ke saath chalne wala loop. Queue consume karna (Kafka consumer), timer-based polling. Simple, koi extra dependency nahi.
- Nuksaan: **persistence nahi** — app restart hua to jo kaam queue mein tha wo gaya; retry, dashboard, scheduling khud likhna padta hai; **kai instances** pe har instance pe chalega (duplicate) jab tak lock na lagao.
- Scoped service (DbContext) chahiye to **`IServiceScopeFactory.CreateScope()`** — BackgroundService singleton hai.

**Hangfire** — jobs **DB mein store** (SQL Server/PostgreSQL/Redis): fire-and-forget, delayed, **recurring (cron)**, automatic **retry**, **dashboard** (`/hangfire`), kai servers pe safe distribution. "Order ke 1 ghante baad reminder email" jaise kaam ke liye perfect.

**Quartz.NET** — powerful **scheduler** (complex cron, calendars, misfire handling, clustering). Scheduling heavy ho to.

Chunne ka tareeka: simple loop/consumer → BackgroundService; reliable jobs + retry + dashboard → Hangfire; complex schedules → Quartz; bahut scale/alag services → message queue + worker service.

```csharp
public class CleanupService(IServiceScopeFactory scopes, ILogger<CleanupService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct))
        {
            using var scope = scopes.CreateScope();                  // DbContext scoped hai
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var n = await db.Sessions.Where(s => s.ExpiresAt < DateTime.UtcNow).ExecuteDeleteAsync(ct);
            log.LogInformation("Removed {Count} expired sessions", n);
        }
    }
}
builder.Services.AddHostedService<CleanupService>();

// Hangfire
BackgroundJob.Enqueue<IEmailSender>(s => s.SendWelcome(userId));
BackgroundJob.Schedule<IEmailSender>(s => s.SendReminder(orderId), TimeSpan.FromHours(1));
RecurringJob.AddOrUpdate<IReportJob>("daily-report", j => j.RunAsync(), Cron.Daily(2));
```

! BackgroundService ke constructor mein `AppDbContext` inject karna — singleton mein scoped service. Scope khud banao.

## EF Core mein optimistic concurrency — RowVersion / concurrency token
**Problem (lost update)**: do users ek hi record kholte hain; A save karta hai, phir B apna save karta hai — **A ka change chupchaap mit gaya**, kisi ko pata nahi.

**Optimistic concurrency** — lock nahi lagate (maante hain conflict kam hoga), par save ke waqt **check karte hain ki beech mein kisi ne badla to nahi**:
- Table mein ek **version column** — SQL Server `rowversion` (`[Timestamp]`), PostgreSQL mein `xmin` system column ya apna `int Version` / `Guid`.
- EF UPDATE mein `WHERE Id = @id AND Version = @originalVersion` lagata hai. **0 rows update** hui = kisi ne beech mein badla → **`DbUpdateConcurrencyException`**.
- Handle karo: user ko batao "record badal gaya hai, reload karo" (API mein **409 Conflict**), ya latest values leke merge/retry.

**Pessimistic** (ulta) — padhte waqt hi lock: `SELECT ... FOR UPDATE`. Conflict bahut zyada ho ya paisa/stock jaisa critical ho tab. Lock lamba chala to doosre atakte hain.

Simple counters ke liye dono ki zaroorat nahi — **atomic update**: `UPDATE products SET stock = stock - 1 WHERE id = 5 AND stock > 0` (EF 7+: `ExecuteUpdateAsync`).

```csharp
public class Product
{
    public int Id { get; set; }
    public int Stock { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = [];     // SQL Server
}
// PostgreSQL (Npgsql): modelBuilder.Entity<Product>().Property<uint>("xmin").IsRowVersion();

try
{
    product.Stock -= qty;
    await db.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException)
{
    return Conflict("Stock kisi aur ne update kar diya — dobara try karo");   // 409
}

// Atomic alternative
var ok = await db.Products.Where(p => p.Id == id && p.Stock >= qty)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - qty)) == 1;
```

## Collections ki time complexity — List, Dictionary, HashSet
Sahi collection chunna performance ka sabse sasta fix hai. Yaad rakhne layak:

| Operation | `List<T>` | `Dictionary<K,V>` / `HashSet<T>` | `SortedDictionary` | `LinkedList<T>` |
| --- | --- | --- | --- | --- |
| Index se access | **O(1)** | — | — | O(n) |
| Search (value / key) | **O(n)** | **O(1)** average | O(log n) | O(n) |
| End mein add | O(1) amortized | O(1) average | O(log n) | O(1) |
| Beech mein insert/remove | O(n) (shift) | O(1) average | O(log n) | O(1) (node mil gaya ho to) |
| Order | Insertion order | Guaranteed nahi | Key se sorted | Insertion order |

Practical rules:
- Loop ke andar `list.Contains(x)` = **O(n²)** chhupa hua. Lookup bahut hai to pehle **`HashSet`/`Dictionary`** banao.
- `Dictionary` ka O(1) key ke **achhe `GetHashCode`** pe depend karta hai. Apni class key ho to `Equals` + `GetHashCode` dono override (ya `record` use karo).
- `List` ka capacity pata ho to `new List<T>(capacity)` — baar-baar resize (copy) nahi.
- **Queue/Stack**: Enqueue/Dequeue, Push/Pop sab O(1). Priority chahiye to `PriorityQueue<T, P>` (O(log n)).
- Sorting: `List.Sort` / `OrderBy` **O(n log n)**.
- LINQ `Count()` `IEnumerable` pe O(n) ho sakta hai; `List.Count` property O(1).

Big-O yaad: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).

```csharp
// O(n*m) — slow
var common = orders.Where(o => blockedCustomerIds.Contains(o.CustomerId)).ToList();   // List.Contains

// O(n + m) — fast
var blocked = blockedCustomerIds.ToHashSet();
var common2 = orders.Where(o => blocked.Contains(o.CustomerId)).ToList();
```

## API versioning kaise karte ho?
API public ho ya mobile app use kare to purane clients ko todna nahi chahiye — breaking change (field hatana/rename, response shape badalna) **naye version** mein.

Tareeke:
- **URL path** — `/api/v1/orders`, `/api/v2/orders`. Sabse saaf aur common, browser/Swagger mein dikhta hai.
- **Query string** — `/api/orders?api-version=2.0`
- **Header** — `api-version: 2.0` (URL saaf, par dikhta nahi).
- Media type — `Accept: application/json;v=2` (kam use).

.NET mein **`Asp.Versioning.Mvc`** package: `[ApiVersion("1.0")]`, `[MapToApiVersion]`, default version, aur response header mein supported/deprecated versions.

Breaking vs non-breaking: **naya optional field jodna** non-breaking hai (version ki zaroorat nahi); field hatana, type badalna, required field jodna = breaking. Purane version ko **deprecate** karke kuch time baad hatao, clients ko pehle batao.

```csharp
builder.Services.AddApiVersioning(o =>
{
    o.DefaultApiVersion = new ApiVersion(1, 0);
    o.AssumeDefaultVersionWhenUnspecified = true;
    o.ReportApiVersions = true;                         // response headers mein versions
}).AddMvc();

[ApiController, ApiVersion("1.0"), ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/orders")]
public class OrdersController : ControllerBase
{
    [HttpGet, MapToApiVersion("1.0")] public IActionResult GetV1() => Ok(/* old shape */);
    [HttpGet, MapToApiVersion("2.0")] public IActionResult GetV2() => Ok(/* new shape */);
}
```

## Minimal APIs vs Controllers
.NET 6 se API do tareeke se likh sakte ho:

**Controllers** — classes, `[ApiController]`, attributes, filters, model binding conventions. Bade projects, bahut endpoints, team ko familiar structure.

**Minimal APIs** — `app.MapGet("/orders/{id}", handler)` — kam boilerplate, **thoda tez** (kam overhead), Native AOT friendly. Chhoti services, microservices, simple endpoints ke liye badhiya.

Minimal APIs mein bhi sab possible hai: DI (handler parameters mein), validation (filters/.NET 10 built-in), auth (`RequireAuthorization()`), **route groups** (`MapGroup("/api/orders")`) se organize, `TypedResults` se Swagger ko sahi response types.

Interview jawab: "Existing bade project mein controllers; nayi chhoti service mein minimal APIs try karta. Dono ek hi app mein saath chal sakte hain." Performance difference aam app mein itna bada nahi ki sirf uske liye migrate karo.

```csharp
var orders = app.MapGroup("/api/orders").RequireAuthorization();

orders.MapGet("/{id:int}", async Task<Results<Ok<OrderDto>, NotFound>> (int id, AppDbContext db) =>
    await db.Orders.Where(o => o.Id == id).Select(o => new OrderDto(o.Id, o.Total)).FirstOrDefaultAsync()
        is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound());

orders.MapPost("/", async (CreateOrderDto d, IOrderService svc) =>
{
    var id = await svc.CreateAsync(d);
    return TypedResults.Created($"/api/orders/{id}", id);
});
```

## Health checks aur graceful shutdown
**Health checks** — ek endpoint (`/health`) jo batata hai app theek hai ya nahi. Load balancer, Kubernetes, Docker aur monitoring isi ko dekh ke traffic bhejte/restart karte hain.

- `AddHealthChecks()` + dependencies ke checks: `.AddNpgSql(conn)`, `.AddRedis(...)`, custom `IHealthCheck`.
- **Liveness** (`/health/live`) — process zinda hai? Isme DB check **mat** daalo — DB down hone pe saare pods restart ho jaayenge, fayda kuch nahi.
- **Readiness** (`/health/ready`) — traffic lene layak? DB/Redis connected, warm-up done.
- Response: `Healthy` / `Degraded` / `Unhealthy` (+ JSON detail sirf internal).

**Graceful shutdown** — deploy/scale down pe app ko **SIGTERM** milta hai. ASP.NET Core nayi requests lena band karta hai aur chal rahi requests ko time deta hai (`HostOptions.ShutdownTimeout`, default 30s .NET 8+). `BackgroundService` ko `stoppingToken` milta hai — Kafka consumer offset commit kar le, batch flush kar de. Isse deploy pe requests fail nahi hoti aur data aadha nahi likha jaata.

```csharp
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Db")!, tags: ["ready"])
    .AddRedis(builder.Configuration["Redis"]!, tags: ["ready"]);

app.MapHealthChecks("/health/live", new() { Predicate = _ => false });          // sirf process
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });

builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(30));
```

## Response caching, output caching aur ETag
Server pe response **dobara na banana pade** — iske teen level:

- **HTTP caching headers** — `Cache-Control: public, max-age=60` → browser/CDN khud cache kare, request server tak aaye hi nahi. Static files, public data ke liye.
- **ETag / conditional request** — server response ke saath `ETag: "v5"` bhejta hai; client agli baar `If-None-Match: "v5"` bhejta hai; data nahi badla to **304 Not Modified** (body nahi) — bandwidth bachti hai.
- **Output caching** (.NET 7+, `AddOutputCache`) — **server** poora response memory (ya Redis) mein rakhta hai; policies, tags se invalidate (`EvictByTagAsync("products")`). Purane `ResponseCaching` middleware se zyada control.
- **Data caching** — `IMemoryCache` / `IDistributedCache` / `HybridCache` — response nahi, beech ka data cache.

Dhyan: **user-specific ya authorized data** ko shared cache (CDN/`public`) mein kabhi mat daalo — ek user ka data doosre ko dikh jaayega. Aise responses pe `Cache-Control: private, no-store`.

```csharp
builder.Services.AddOutputCache(o =>
    o.AddPolicy("products", p => p.Expire(TimeSpan.FromMinutes(5)).Tag("products")));
app.UseOutputCache();

app.MapGet("/api/products", GetProducts).CacheOutput("products");

// product update ke baad
await outputCache.EvictByTagAsync("products", ct);
```

## AutoMapper vs manual mapping
Entity → DTO mapping ke do tareeke:

**AutoMapper** — naam match karke properties apne aap copy. `mapper.Map<OrderDto>(order)`, `ProjectTo<OrderDto>()` (EF query mein seedha projection).
- Fayda: boilerplate kam, bahut saare DTOs mein.
- Nuksaan: **galti runtime pe** pata chalti hai (property rename hui to chupchaap null), debugging mushkil ("ye value kahan se aayi?"), complex mapping config uljha, performance thodi kam. (Naye versions commercial license pe gaye hain.)

**Manual mapping** — `new OrderDto(o.Id, o.Total)` ya extension method `o.ToDto()`, ya LINQ `Select` projection.
- Fayda: **compile-time safe**, tez, saaf dikhta hai. EF ke saath `Select` se sirf zaroori columns SQL mein.
- Nuksaan: zyada typing.

**Mapperly** jaise source generators — compile time pe mapping code generate: AutoMapper jaisi suvidha + manual jaisi speed/safety.

Aaj ka trend: manual ya source-generated. Interview mein dono ke trade-off bolo.

```csharp
// Manual — EF projection, sirf zaroori columns
var list = await db.Orders
    .Select(o => new OrderDto(o.Id, o.Customer.Name, o.Total))
    .ToListAsync();

// Extension method
public static class OrderMapping
{
    public static OrderDto ToDto(this Order o) => new(o.Id, o.Customer.Name, o.Total);
}
```
