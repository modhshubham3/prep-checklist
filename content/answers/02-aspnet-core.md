# ASP.NET Core — pipeline, API, auth

## ASP.NET Core
**ASP.NET Core** Microsoft ka modern, **cross-platform, open-source** framework hai Web APIs, websites aur real-time apps (SignalR) banane ke liye. Ye .NET pe chalta hai aur Windows, Linux, Docker — kahin bhi deploy ho sakta hai.

Iske core building blocks: **Kestrel** (built-in, bahut tez web server), **middleware pipeline** (har request isse guzarti hai), **built-in Dependency Injection**, **configuration system** (appsettings, environment variables, secrets), **logging**, aur routing. APIs do style mein ban sakti hain — **Controllers** (classic, attribute-based) aur **Minimal APIs** (chhote endpoints ke liye kam code).

Production mein aksar Kestrel ke aage **Nginx/IIS/load balancer** reverse proxy rehta hai jo SSL, compression aur load balancing sambhalta hai. Purane ASP.NET (Framework) se ye bilkul alag hai — wo sirf Windows/IIS pe chalta tha aur `System.Web` pe tika tha.

- Kestrel + middleware + DI + configuration + logging
- Controllers ya Minimal APIs
- Cross-platform, container-friendly, high performance

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("up"));   // minimal API
app.Run();
```

## Program.cs
**Program.cs** application ka **entry point** aur startup configuration hai. .NET 6 se `Startup.cs` alag nahi hota — sab kuch yahin, do hisson mein:

**1. Services register karna** (`builder.Services...`) — DI container mein batao kaunsi services available hain: controllers, DbContext, authentication, CORS, apni repositories/services. Ye `app` banne se **pehle** hota hai.

**2. Middleware pipeline banana** (`app.Use...`) — `builder.Build()` ke baad batao request kis order mein kin steps se guzregi: exception handling, HTTPS redirect, CORS, authentication, authorization, endpoints. **Yahan order bahut matter karta hai.**

`WebApplication.CreateBuilder` apne aap config (appsettings.json, `appsettings.{Environment}.json`, environment variables, command line), logging aur Kestrel set kar deta hai.

```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Services (DI)
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

var app = builder.Build();

// 2. Middleware pipeline (order important)
app.UseExceptionHandler("/error");
app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

> Build() se pehle services, Build() ke baad pipeline.

## appsettings.json
**appsettings.json** application ki **configuration** file hai — connection strings, API URLs, feature flags, logging levels, JWT settings. ASP.NET Core ise startup pe apne aap padh leta hai.

Configuration **layers** mein aati hai, aur baad wali pehle wali ko override karti hai: `appsettings.json` → `appsettings.Development.json` / `appsettings.Production.json` (environment ke hisaab se, `ASPNETCORE_ENVIRONMENT` se decide) → User Secrets (sirf development) → **environment variables** → command-line args. Isliye production mein connection string environment variable se de sakte ho, file badle bina. Nested keys environment variable mein double underscore se likhte hain: `ConnectionStrings__Default`.

Values padhne ke do tareeke: `IConfiguration["Key"]` (seedha), ya behtar — **Options pattern**: ek class banao, section bind karo, aur `IOptions<T>` inject karo. Isse strongly typed config milta hai.

**Secrets (password, API keys) appsettings.json mein commit mat karo** — dev mein User Secrets, production mein environment variables ya Key Vault.

```json
{
  "ConnectionStrings": { "Default": "Host=db;Database=app;Username=app" },
  "Jwt": { "Issuer": "myapi", "ExpiryMinutes": 60 },
  "Logging": { "LogLevel": { "Default": "Information" } }
}
```

```csharp
public class JwtOptions { public string Issuer { get; set; } = ""; public int ExpiryMinutes { get; set; } }

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

public class TokenService(IOptions<JwtOptions> opt)
{
    private readonly JwtOptions _jwt = opt.Value;
}
```

! Password/API key Git mein commit ho gaya to wo hamesha ke liye history mein hai — rotate karna padta hai.

## Middleware
**Middleware** ek software component hai jo **HTTP request ke raaste** mein baitha hai. Har request pipeline mein ek-ek karke middlewares se guzarti hai, aur har middleware do kaam kar sakta hai: request pe kuch kare aur **aage bhej de** (`next()`), ya wahin **short-circuit** karke response lauta de (jaise authentication fail hone pe 401).

Response ulte order mein wapas aata hai — isliye middleware request ke pehle aur response ke baad dono jagah code chala sakta hai (jaise timing measure karna, response headers jodna).

Built-in middlewares: exception handling, HTTPS redirection, static files, routing, CORS, authentication, authorization, response compression, rate limiting. Apna middleware bhi likh sakte ho — logging, correlation ID, request timing ke liye.

**Order hi sab kuch hai**: `UseAuthentication()` hamesha `UseAuthorization()` se pehle, exception handler sabse pehle (taaki baaki sabke errors pakde), CORS authentication se pehle.

```csharp
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();                                  // aage bhejo
    context.Response.Headers["X-Elapsed-Ms"] = sw.ElapsedMilliseconds.ToString();
});

public class CorrelationIdMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var id = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString();
        ctx.Response.Headers["X-Correlation-Id"] = id;
        await next(ctx);
    }
}
app.UseMiddleware<CorrelationIdMiddleware>();
```

! Response start hone ke baad (body likhne ke baad) headers badalne ki koshish karoge to exception aayega.

> Authentication hamesha Authorization se PEHLE. Ulta kiya to sab 401.

## Routing
**Routing** incoming URL ko sahi **endpoint** (controller action ya minimal API handler) se jodta hai. `GET /api/orders/42` aaya → routing dekhta hai kaunsa endpoint is URL aur HTTP method se match karta hai → us action ko chalata hai, aur `42` ko parameter mein daal deta hai.

ASP.NET Core mein **endpoint routing** hai: `UseRouting()` pehle match karta hai ki kaunsa endpoint chalega (taaki beech ke middleware — jaise authorization — usko jaan sakein), aur `MapControllers()`/`MapGet()` endpoints register karte hain. .NET 6+ mein `UseRouting` aur `UseEndpoints` aksar apne aap lag jaate hain.

Route templates mein **constraints** laga sakte ho (`{id:int}`, `{slug:alpha}`, `{id:guid}`) — galat format pe route match hi nahi hoga aur 404 milega, action ke andar check nahi karna padega. Optional parameter `{id?}`, default value `{page=1}`.

```csharp
app.MapGet("/api/orders/{id:int}", (int id) => $"Order {id}");
app.MapGet("/api/products/{category}/{page:int=1}", (string category, int page) => Results.Ok());

// Conventional routing (MVC)
app.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
```

## Attribute Routing
**Attribute routing** mein route **attributes ke through controller aur action pe hi** likhte ho — `[Route]`, `[HttpGet]`, `[HttpPost]` wagairah. Web APIs mein yahi standard hai kyunki URL design action ke bilkul saath dikhta hai.

Controller pe `[Route("api/[controller]")]` — `[controller]` token class ke naam se "Controller" hata ke replace hota hai (`OrdersController` → `api/orders`). Action pe HTTP verb attribute aur baaki path. `[ApiController]` attribute ke saath attribute routing **compulsory** hai, aur ye automatic model validation (400) aur binding source inference bhi deta hai.

Route constraints yahan bhi lagte hain, aur `Name` de ke `CreatedAtAction`/`Url.Link` se URLs bana sakte ho.

```csharp
[ApiController]
[Route("api/[controller]")]                  // api/orders
public class OrdersController : ControllerBase
{
    [HttpGet]                                 // GET api/orders
    public IActionResult List([FromQuery] int page = 1) => Ok();

    [HttpGet("{id:int}", Name = "GetOrder")]  // GET api/orders/42
    public IActionResult Get(int id) => Ok();

    [HttpPost]                                // POST api/orders
    public IActionResult Create(CreateOrderDto dto)
        => CreatedAtRoute("GetOrder", new { id = 1 }, dto);   // 201 + Location header

    [HttpGet("{id:int}/items")]               // GET api/orders/42/items
    public IActionResult Items(int id) => Ok();
}
```

## Model Binding
**Model binding** HTTP request ke data (route, query string, headers, form, JSON body) ko **automatically action ke parameters aur C# objects** mein convert kar deta hai. Tumhe `Request.Query["page"]` parse nahi karna padta.

Source attributes se batate ho data kahan se aayega: `[FromRoute]` (URL path ka hissa), `[FromQuery]` (`?page=2`), `[FromBody]` (JSON body — ek action mein sirf **ek** `[FromBody]` ho sakta hai, kyunki body stream ek hi baar padhi jaati hai), `[FromHeader]`, `[FromForm]` (form/file upload), `[FromServices]` (DI se).

`[ApiController]` ke saath defaults samajhdaar hain: complex type → body, simple type jo route mein hai → route, baaki simple types → query. Binding fail hone pe (galat JSON, type mismatch) `ModelState` invalid hota hai aur `[ApiController]` apne aap **400 Bad Request** lauta deta hai.

```csharp
[HttpPut("{id:int}")]
public IActionResult Update(
    [FromRoute] int id,                          // /api/orders/42
    [FromQuery] bool notify,                     // ?notify=true
    [FromHeader(Name = "X-Tenant")] string tenant,
    [FromBody] UpdateOrderDto dto)               // JSON body
{
    return NoContent();
}
```

! Do `[FromBody]` parameters ek action mein — nahi chalega. Ek DTO banao jisme dono ho.

## Model Validation
**Model validation** check karta hai ki bind hua data **rules follow karta hai ya nahi** — required field, length, range, email format. Rules **Data Annotations** attributes se DTO pe lagte hain: `[Required]`, `[StringLength]`, `[Range]`, `[EmailAddress]`, `[RegularExpression]`, `[Compare]`.

`[ApiController]` ke saath agar validation fail hui to action chalta hi nahi — framework apne aap **400** ke saath `ValidationProblemDetails` (field-wise errors) lauta deta hai. Bina `[ApiController]` ke tumhe khud `if (!ModelState.IsValid) return BadRequest(ModelState);` likhna padta hai.

Complex rules (ek field doosre pe depend kare, DB check) ke liye **FluentValidation** library popular hai — rules alag class mein, saaf aur testable. Yaad rakho: client-side (Angular) validation sirf UX ke liye hai; **server-side validation hamesha zaroori** hai kyunki koi bhi API ko seedha Postman se call kar sakta hai.

```csharp
public class CreateUserDto
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = "";

    [Required, EmailAddress]
    public string Email { get; set; } = "";

    [Range(18, 120)]
    public int Age { get; set; }
}
// Invalid body → 400 { "errors": { "Email": ["The Email field is not a valid e-mail address."] } }
```

> Frontend validation = user ki suvidha. Backend validation = suraksha.

## ControllerBase
`ControllerBase` **Web API controllers** ki base class hai. Isme API ke liye saari helpful cheezein hain: `HttpContext`, `Request`, `Response`, `User` (claims), `ModelState`, aur response banane ke helper methods — `Ok()`, `Created()`, `CreatedAtAction()`, `NoContent()`, `BadRequest()`, `NotFound()`, `Unauthorized()`, `Forbid()`, `Conflict()`, `Problem()`.

Isme **Views (HTML) ka support nahi** hai — jo API ke liye sahi hai, kyunki API JSON lautati hai. Isse class halki rehti hai. API controllers pe hamesha `[ApiController]` attribute bhi lagao.

Return type ke liye `ActionResult<T>` best hai: success pe seedha `T` return kar sakte ho (JSON ban jaata hai), aur error pe `NotFound()` — aur Swagger ko bhi response type pata chal jaata hai.

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserService svc) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> Get(int id)
    {
        var user = await svc.GetAsync(id);
        if (user is null) return NotFound();
        return user;                              // 200 + JSON
    }
}
```

## Controller
`Controller` class **`ControllerBase` se inherit** karti hai aur usme **MVC Views** ka support jodti hai: `View()`, `PartialView()`, `ViewBag`, `ViewData`, `TempData`, `RedirectToAction()` (HTML page redirect ke saath), `Json()`.

Isliye: **server-rendered web pages** (Razor views, jahan server HTML banata hai) → `Controller`. **Pure JSON API** (Angular/React frontend ya mobile app ke liye) → `ControllerBase`. API mein `Controller` use karna galat nahi hai par bekaar ka weight hai aur intent saaf nahi hota.

| ControllerBase | Controller |
|---|---|
| Web API ke liye | MVC (views) ke liye |
| JSON/data return | HTML views + data |
| `Ok()`, `NotFound()`… | Upar ke sab + `View()`, `ViewBag`, `TempData` |
| `[ApiController]` ke saath | Aksar bina `[ApiController]` |

```csharp
public class HomeController : Controller
{
    public IActionResult Index() => View();            // Views/Home/Index.cshtml render
}
```

## Middleware Pipeline
**Middleware pipeline** middlewares ki wo **chain** hai jisse har HTTP request guzarti hai. Request upar se neeche jaati hai (har middleware `next()` bula ke aage bhejta hai), endpoint pe pahunchti hai, aur response **ulte order** mein wapas aata hai. Koi bhi middleware short-circuit karke aage jaane se rok sakta hai.

Typical recommended order neeche table mein hai.

**Order kyun matter karta hai?** Exception handler sabse pehle hona chahiye taaki wo neeche ke **saare** errors pakad sake. Authentication pehle chalta hai (user kaun hai — `HttpContext.User` set karta hai), phir authorization (kya use access hai) — ulta kiya to authorization ke paas user hi nahi hoga, sab 401/403. CORS ko authentication se pehle hona chahiye taaki browser ki preflight (OPTIONS) request block na ho. Static files jaldi rakhte hain taaki image/CSS requests bekaar mein auth tak na jaayein.

Interview answer: "Middleware request pipeline ke components hain. Request registered middlewares se sequentially guzarti hai; har middleware request/response inspect ya modify kar sakta hai, aage bhej sakta hai ya short-circuit kar sakta hai. Order important hai — exception handling sabse bahar, authentication authorization se pehle."

| # | Middleware | Kaam |
|---|---|---|
| 1 | `UseExceptionHandler` | Neeche ke saare errors pakde |
| 2 | `UseHsts` / `UseHttpsRedirection` | HTTPS enforce |
| 3 | `UseStaticFiles` | Files seedha serve, aage nahi |
| 4 | `UseRouting` | Endpoint match |
| 5 | `UseCors` | Cross-origin + preflight |
| 6 | `UseAuthentication` | User kaun hai |
| 7 | `UseAuthorization` | Access hai ya nahi |
| 8 | `UseRateLimiter` | Limit check |
| 9 | `MapControllers` | Endpoint chalao |

```text
Request  → Exception → HTTPS → Routing → CORS → AuthN → AuthZ → Controller
Response ← Exception ← HTTPS ← Routing ← CORS ← AuthN ← AuthZ ← Controller
```

## Global Exception Handling
**Global exception handling** matlab unhandled exceptions ko **ek hi jagah** pakadna — har controller mein try/catch likhne ki jagah. Isse teen fayde: saare errors **log** hote hain (stack trace ke saath), client ko **consistent error format** milta hai, aur **internal details** (stack trace, SQL, file paths) bahar leak nahi hote.

Tareeke: (1) apna **exception middleware** jo `try { await next(ctx); } catch` kare; (2) built-in `UseExceptionHandler`; (3) .NET 8 ka **`IExceptionHandler`** interface — sabse saaf. Response ka standard format **ProblemDetails** (RFC 7807) hai: `type`, `title`, `status`, `detail`, `traceId`.

Achhi practice: custom exceptions (`NotFoundException`, `ValidationException`, `ConflictException`) ko sahi status codes pe map karo (404, 400, 409), baaki sab 500. Response mein `traceId`/correlation ID do taaki user wo ID de aur tum logs mein turant dhoondh sako.

```csharp
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            NotFoundException   => (404, "Not found"),
            ValidationException => (400, "Validation failed"),
            _                   => (500, "Something went wrong")
        };
        log.LogError(ex, "Unhandled exception, trace {TraceId}", ctx.TraceIdentifier);

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status, Title = title,
            Extensions = { ["traceId"] = ctx.TraceIdentifier }
        }, ct);
        return true;
    }
}

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

! Production mein client ko `ex.Message` ya stack trace bhejna security issue hai — DB structure, file paths leak hote hain.

## Web API
**Web API** ek HTTP service hai jo data (usually **JSON**) lautati hai, HTML nahi — Angular app, mobile app ya doosri services ise call karti hain. REST style mein har cheez ek **resource** hai (URL se pehchani jaati hai), aur kya karna hai ye **HTTP method** batata hai.

REST design ke rules: URLs mein **naam (nouns)**, verbs nahi — `GET /api/orders/42`, `/api/getOrder?id=42` nahi. Plural collections (`/api/orders`). Nested resources (`/api/orders/42/items`). Sahi status codes. Stateless — har request apne aap mein poori (auth token saath mein). Versioning (`/api/v1/`).

**Idempotent** ka matlab: ek hi request baar-baar bhejo to result wahi rahe. GET, PUT, DELETE idempotent hain; **POST nahi** (do baar bhejo to do records). Isliye payment jaise POST mein **idempotency key** use karte hain.

| Method | Kaam | Example | Success code | Idempotent |
|---|---|---|---|---|
| GET | Padhna | `GET /api/users/10` | 200 | Haan |
| POST | Naya banana | `POST /api/users` | 201 + Location | Nahi |
| PUT | Poora replace/update | `PUT /api/users/10` | 200 / 204 | Haan |
| PATCH | Thoda update | `PATCH /api/users/10` | 200 / 204 | Zaroori nahi |
| DELETE | Hatana | `DELETE /api/users/10` | 204 | Haan |

```http
POST /api/orders
Content-Type: application/json

{ "customerId": 7, "items": [{ "productId": 3, "qty": 2 }] }

HTTP/1.1 201 Created
Location: /api/orders/1051
```

> PUT = poora object bhejo. PATCH = sirf badla hua hissa.

## HTTP Status Codes
Status code client ko batata hai request ka **kya hua**, aur sahi code dena achhi API ki pehchaan hai — frontend isi pe decide karta hai ki error dikhana hai, login pe bhejna hai, ya retry karna hai.

Families: **2xx** success, **3xx** redirect, **4xx** client ki galti (request theek karo), **5xx** server ki galti (client ki galti nahi, retry ho sakta hai).

**401 vs 403** — sabse zyada poocha jaata hai. **401 Unauthorized** asal mein "unauthenticated" hai: token nahi hai, expire ho gaya, ya invalid hai — "pehle batao tum kaun ho". **403 Forbidden**: user login hai (pehchaana gaya), par use is cheez ki **permission nahi** — jaise normal user admin endpoint maange.

**400 vs 422**: 400 malformed request (galat JSON), 422 format sahi par business rules fail (ASP.NET validation by default 400 deta hai). **409 Conflict**: duplicate email, ya concurrency conflict.

| Code | Matlab | Kab |
|---|---|---|
| 200 OK | Success | GET/PUT successful |
| 201 Created | Naya bana | POST — Location header ke saath |
| 204 No Content | Success, body nahi | DELETE, PUT jisme kuch return nahi |
| 400 Bad Request | Galat input | Validation fail, galat JSON |
| 401 Unauthorized | Pehchaan nahi | Token missing/expired/invalid |
| 403 Forbidden | Permission nahi | Role/policy allow nahi karti |
| 404 Not Found | Resource nahi | Id exist nahi karti |
| 409 Conflict | State conflict | Duplicate email, version mismatch |
| 429 Too Many Requests | Rate limit | Bahut zyada calls |
| 500 Internal Server Error | Server bug | Unhandled exception |
| 503 Service Unavailable | Server down/overloaded | Maintenance, dependency down |

> 401 = "tum kaun ho?" 403 = "pata hai tum kaun ho, par ijaazat nahi".

## Jwt Authentication
**JWT (JSON Web Token)** ek **signed token** hai jisme user ki info (**claims**) hoti hai — user id, email, roles, expiry. Server login pe token banata hai, client har request ke saath bhejta hai, aur server bina database dekhe sirf **signature verify** karke user pehchaan leta hai. Isliye JWT **stateless** hai — server pe session store nahi karna padta, jo scaling ke liye achha hai.

JWT ke 3 hisse dot se jude: **Header** (algorithm, jaise HS256) . **Payload** (claims) . **Signature** (header + payload ko secret key se sign kiya). Koi payload badle to signature match nahi karega aur token reject.

**Flow**: Angular login form → `POST /api/auth/login` → .NET credentials check karta hai → JWT generate → Angular store karta hai → **HTTP Interceptor** har request mein `Authorization: Bearer <token>` jodta hai → ASP.NET Core `AddJwtBearer` token validate karta hai (signature, expiry, issuer, audience) → `[Authorize]` wale endpoints chalte hain.

**Security baatein**: JWT **encrypted nahi**, sirf signed hai — payload koi bhi base64-decode karke padh sakta hai, isliye password ya sensitive data mat daalo. Access token **short-lived** rakho (15–60 min) aur **refresh token** se naya lo. Token revoke karna mushkil hai (stateless hai) — isliye short expiry zaroori. Browser mein localStorage XSS se chori ho sakta hai; httpOnly cookie ek option hai.

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new()
    {
        ValidateIssuer = true, ValidIssuer = "myapi",
        ValidateAudience = true, ValidAudience = "myapp",
        ValidateLifetime = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
    });

[Authorize(Roles = "Admin")]
[HttpDelete("{id}")] public IActionResult Delete(int id) => NoContent();
```

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJBZG1pbiJ9.sig…
                      └─ header ─┘ └──────── payload (sirf base64) ────────┘ └sig┘
```

! "JWT encrypted hota hai" — galat. Signed hota hai. Payload koi bhi padh sakta hai, badal nahi sakta.

> Authentication = tum kaun ho? Authorization = tumhe kya karne ki ijaazat hai?

## Action Filters
**Filters** MVC/controller pipeline ke andar chalte hain — action ke **aas-paas** — aur cross-cutting kaam (logging, caching, validation, authorization) ek jagah likhne dete hain. Middleware poori HTTP pipeline pe kaam karta hai; filters ko **MVC context** milta hai — kaunsa controller, kaunsa action, action ke arguments, `ModelState`, action ka result.

Filter types, is order mein chalte hain: **Authorization** filters (sabse pehle — access check), **Resource** filters (model binding se pehle/baad — caching), **Action** filters (action method ke theek pehle `OnActionExecuting` aur baad `OnActionExecuted` — logging, argument validation), **Exception** filters (action/filters mein exception), **Result** filters (result execute hone ke pehle/baad — response format).

Filter ko teen level pe laga sakte ho: ek action pe, poore controller pe, ya globally (`options.Filters.Add`). DI chahiye to `[ServiceFilter(typeof(MyFilter))]`.

| Middleware | Filter |
|---|---|
| Poori HTTP pipeline | Sirf MVC/controller actions |
| Har request pe (static files bhi) | Sirf jo action tak pahunche |
| Action/arguments ka pata nahi | Action, arguments, ModelState milta hai |
| Global cheezein: CORS, auth, compression | Action-specific: audit, validation |

```csharp
public class AuditFilter(ILogger<AuditFilter> log) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        log.LogInformation("Calling {Action}", ctx.ActionDescriptor.DisplayName);
        var executed = await next();                       // action chala
        log.LogInformation("Done, status {Code}", (executed.Result as ObjectResult)?.StatusCode);
    }
}

builder.Services.AddScoped<AuditFilter>();
[ServiceFilter(typeof(AuditFilter))]
public class PaymentsController : ControllerBase { }
```

## DTO
**DTO (Data Transfer Object)** ek simple class/record hai jo **sirf data le jaane** ke liye hai — API request mein kya aayega aur response mein kya jaayega. Isme business logic nahi hota.

**Entity seedha API se return kyun nahi karte?** (1) **Security** — entity mein `PasswordHash`, internal flags, audit columns hote hain jo leak ho jaayenge. (2) **Over-posting** — agar request mein entity bind kari to user `IsAdmin: true` bhej ke khud admin ban sakta hai. (3) **Circular references** — `Order.Customer.Orders...` JSON serializer ko infinite loop mein daal deta hai. (4) **Coupling** — DB column ka naam badla to API contract toot jaayega; DTO se API aur DB alag rehte hain. (5) **Performance** — sirf zaroori fields select karo.

Aam taur pe alag DTOs: `CreateOrderDto` (input), `UpdateOrderDto`, `OrderDto` (output), `OrderListItemDto` (list ke liye chhota). Mapping manual, `Select` projection se, ya AutoMapper/Mapster se.

```csharp
public record CreateUserDto(string Name, string Email, string Password);
public record UserDto(int Id, string Name, string Email);        // PasswordHash nahi

var users = await db.Users
    .Select(u => new UserDto(u.Id, u.Name, u.Email))              // projection — sirf 3 columns
    .ToListAsync();
```

! Entity ko `[FromBody]` mein bind karna = over-posting attack ka darwaza.

> Entity return karoge to password, internal flags aur navigation properties leak ho jaayengi.

## IEnumerable
`IEnumerable<T>` .NET ka sabse basic collection interface hai — sirf itna batata hai ki is par **ek-ek karke iterate** kiya ja sakta hai (`foreach`). Iska ek hi method hai `GetEnumerator()`. `List`, array, `HashSet`, `Dictionary` — sab `IEnumerable` hain.

Uske LINQ methods (`Enumerable.Where`, `Select`) **C# delegates** (`Func<T, bool>`) lete hain aur **memory mein** chalte hain. EF Core context mein iska matlab: agar tumne DB query ko `IEnumerable` bana diya (`AsEnumerable()`, ya repository ne `IEnumerable` return kiya aur caller ne `.Where` lagaya), to **poora data pehle database se aa jaayega** aur filtering app ki memory mein hogi. 10 lakh rows ki table pe ye app ko maar deta hai.

Ye bhi deferred hai — `yield return` wale methods aur LINQ results tab tak nahi chalte jab tak iterate na karo.

```csharp
IEnumerable<Order> all = db.Orders;           // abhi kuch nahi
var big = all.Where(o => o.Amount > 100);     // Enumerable.Where — C# filter
var list = big.ToList();                      // SQL: SELECT * FROM orders (poori table!)
                                              // phir filter memory mein
```

> Yeh interview ka favourite trap hai — galat use karoge to poora table memory mein aa jaayega.

## IQueryable
`IQueryable<T>` `IEnumerable<T>` ko extend karta hai, par farak bahut bada hai: iske LINQ methods (`Queryable.Where`, `Select`) **Expression trees** (`Expression<Func<T, bool>>`) lete hain — yani code ko data ki tarah. Ek **query provider** (EF Core) us expression tree ko padh ke **SQL** bana deta hai.

Isliye `db.Orders.Where(o => o.Amount > 100)` ka filter **database pe** chalta hai — SQL mein `WHERE amount > 100`, aur sirf matching rows network pe aati hain. `OrderBy`, `Skip`, `Take`, `Select` sab SQL mein jaate hain. Query tab tak execute nahi hoti jab tak `ToListAsync`, `FirstAsync`, `CountAsync` jaisa kuch na bulao.

Limitation: expression mein sirf wahi cheezein chal sakti hain jo SQL mein translate ho sakein. Apna C# method call karoge to EF error dega ("could not be translated"). Repository se `IQueryable` expose karna debate ka topic hai — flexible hai, par query logic poore app mein bikhar jaata hai.

```csharp
IQueryable<Order> q = db.Orders;
q = q.Where(o => o.Amount > 100);                    // expression tree
var page = await q.OrderBy(o => o.Id).Skip(20).Take(10).ToListAsync();
// SQL: SELECT ... FROM orders WHERE amount > 100 ORDER BY id LIMIT 10 OFFSET 20

// q.Where(o => MyHelper.IsVip(o))   // runtime error: could not be translated
```

> IQueryable = DB pe kaam, IEnumerable = memory mein kaam.
