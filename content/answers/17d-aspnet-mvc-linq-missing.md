# ASP.NET Core, MVC aur LINQ — chhoote hue topics

## app.Use vs app.Run vs app.Map — aur static files
? Program.cs mein app.Use, app.Run aur app.Map mein kya farak hai? UseStaticFiles kahan lagta hai?
**Ek line:** teeno pipeline mein middleware jodte hain. **`Use`** = kaam karke **`next()`** se aage bhejta hai. **`Run`** = **aakhri** middleware, aage kuch nahi. **`Map`** = URL path ke hisaab se **alag branch**.

| | Aage bhejta hai? | Kab |
| --- | --- | --- |
| `app.Use` | ✅ `await next()` | Logging, headers, timing — beech ke kaam |
| `app.Run` | ❌ Pipeline yahin khatam | Aakhri fallback response |
| `app.Map("/path", ...)` | Us path ke liye alag pipeline | `/health`, `/admin` jaise branch |
| `app.MapWhen(cond, ...)` | Condition pe branch | Header/query ke hisaab se |

**Aise socho:** railway line — `Use` = beech ke **station** (ruk ke aage jaao), `Run` = **aakhri station**, `Map` = **junction** jahan ek line alag disha mein chali jaati hai.

**Static files:** `app.UseStaticFiles()` **`wwwroot`** folder ki files (css, js, images) seedha serve karta hai — controller tak jaaye bina. Pipeline mein **routing/auth se pehle** rakhte hain taaki static files pe bekaar kaam na ho (private files ke liye auth ke baad ya controller se serve karo).

```csharp
app.UseStaticFiles();                               // wwwroot/*
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-App"] = "prep";
    await next();                                   // aage bhejo
});
app.Map("/ping", branch => branch.Run(async ctx => await ctx.Response.WriteAsync("pong")));
app.MapControllers();
app.Run(async ctx => { ctx.Response.StatusCode = 404; await ctx.Response.WriteAsync("Not found"); });
```

! `app.Use` mein `next()` bulana bhool gaye → request wahin atak jaati hai, aage ke middleware kabhi nahi chalte.

> Use = station (aage bhejo). Run = aakhri station. Map = junction.

## MVC request lifecycle — browser se view tak
? ASP.NET MVC mein request aane se view render hone tak kya-kya hota hai?
**Ek line:** request → **middleware pipeline** → **routing** (kaunsa controller/action) → **controller banta hai** (DI se) → **model binding** + validation → **filters** → **action** chalta hai → **result** (View/JSON) → view render / JSON serialize → response wapas pipeline se.

1. **Request** — browser `GET /orders/details/5` bhejta hai; Kestrel leta hai.
2. **Middleware** — exception handler, HTTPS, static files, auth…
3. **Routing** — URL se `OrdersController.Details(id: 5)` chuna.
4. **Controller instance** — DI se dependencies inject.
5. **Model binding** — URL/query/form/body se parameters bhare; **validation** (`ModelState`).
6. **Filters** — authorization → resource → action filter (pehle).
7. **Action** — business logic, service/DB call, `return View(model)` ya `Ok(data)`.
8. **Result filters** → **result execute** — Razor view HTML banata hai, ya JSON serialize.
9. **Response** — pipeline se ulta wapas, browser tak.

**Aise socho:** hospital — gate pe security (middleware), reception batata hai kaunsa doctor (routing), file mein details bhari jaati hain (model binding), doctor dekhta hai (action), report print (view render).

> Middleware → Routing → Controller → Model binding → Filters → Action → Result → Response.

## ViewData vs ViewBag vs TempData vs Session (MVC)
? MVC mein controller se view tak data bhejne ke tareeke kya hain, aur redirect ke baad kaunsa kaam karta hai?
**Ek line:** **ViewData / ViewBag** = sirf **usi request** mein controller → view. **TempData** = **agli request** tak (redirect ke baad) — ek baar padhne pe khatam. **Session** = user ke **poore session** mein, jab tak hatao nahi.

| | Kab tak | Type | Use |
| --- | --- | --- | --- |
| `ViewData["x"]` | Sirf current request | Dictionary, cast chahiye | Chhota data view ko |
| `ViewBag.X` | Sirf current request | `dynamic` (ViewData ka wrapper) | Same, likhna aasaan |
| `TempData["x"]` | Agli request tak, padhte hi gayab (`Keep`/`Peek` se rok sakte) | Dictionary | Redirect ke baad "Saved!" message |
| `Session["x"]` | Session khatam hone tak | Server pe (ya Redis) | Cart, user preferences |
| **Strongly-typed model** | Request | Class | **Best** — main data hamesha model se |

**Aise socho:** ViewData/ViewBag = kisi ko **haath mein** kaagaz dena (abhi ke abhi). TempData = **sticky note** darwaze pe — agli baar aaoge to padh ke phenk doge. Session = **locker** — jab tak chaho.

```csharp
public IActionResult Edit(int id)
{
    ViewData["Title"] = "Order edit";
    ViewBag.Statuses = new[] { "Pending", "Paid" };
    return View(_repo.Get(id));                      // main data = model
}

[HttpPost]
public IActionResult Edit(OrderVm vm)
{
    _repo.Save(vm);
    TempData["Msg"] = "Order save ho gaya";          // redirect ke baad dikhega
    return RedirectToAction(nameof(Index));
}
// View: @TempData["Msg"]
```

> ViewData/ViewBag = abhi. TempData = agli request (redirect). Session = poora session. Main data = model.

## Razor, HTML Helpers, Tag Helpers aur Partial View
? Razor view mein HTML Helper aur Tag Helper mein kya farak hai? Partial view kab use karte ho?
**Ek line:** **Razor** = HTML ke andar C# (`@`) likhne ka syntax. **HTML Helpers** (`@Html.TextBoxFor`) purana C#-method tareeka; **Tag Helpers** (`<input asp-for="Name">`) naya, HTML jaisa dikhne wala — dono model se input, label, validation banate hain. **Partial view** = view ka **reusable tukda**.

| | HTML Helper | Tag Helper |
| --- | --- | --- |
| Dikhta | `@Html.TextBoxFor(m => m.Name)` | `<input asp-for="Name" class="form-control" />` |
| Padhna / designer friendly | Kam | ✅ HTML jaisa |
| Kab | Purane MVC 5 projects | **ASP.NET Core** mein default |

**Partial view** (`_OrderRow.cshtml`): header, table row, address block — kai views mein same. `<partial name="_OrderRow" model="o" />`. Apna logic/data khud laana ho to **View Component** better.

**Layout** (`_Layout.cshtml`) = har page ka common dhaancha (`@RenderBody()`); `_ViewStart` batata hai kaunsa layout; `_ViewImports` mein common `@using` aur tag helpers.

```cshtml
@model OrderVm
<form asp-action="Edit" method="post">
    <label asp-for="CustomerName"></label>
    <input asp-for="CustomerName" class="form-control" />
    <span asp-validation-for="CustomerName" class="text-danger"></span>

    @* Purana tareeka *@
    @Html.LabelFor(m => m.Total) @Html.TextBoxFor(m => m.Total)

    @foreach (var item in Model.Items) { <partial name="_OrderRow" model="item" /> }
    <button type="submit">Save</button>
</form>
```

> Razor = HTML + C#. Tag Helper (naya) / HTML Helper (purana) = model se form. Partial = reusable tukda.

## Swagger / OpenAPI — setup aur fayda
? Swagger kya hai aur project mein kaise lagate ho? JWT wali API Swagger se kaise test karoge?
**Ek line:** **OpenAPI** = API ka standard description (endpoints, parameters, models) JSON mein. **Swagger UI** = us description se bana **browser page** jahan se API **dekh aur chala** sakte ho. Frontend, QA, doosri team — sab ke liye live documentation.

- Package: `Swashbuckle.AspNetCore` (ya .NET 9+ ka built-in `Microsoft.AspNetCore.OpenApi` + Scalar/Swagger UI).
- XML comments (`/// <summary>`) se description; `[ProducesResponseType]` se response types.
- **JWT**: `AddSecurityDefinition("Bearer", ...)` → UI mein "Authorize" button, token daalo, har call mein header jaayega.
- Production mein aam taur pe **band** rakho (ya auth ke peeche) — API ka poora naksha sabko mat dikhao.
- Swagger JSON se **client code generate** (NSwag, openapi-generator) — Angular service apne aap.

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
```

> OpenAPI = API ka naksha. Swagger UI = naksha dekh ke seedha chala ke dekho. Production mein band ya protected.

## JSON serialization — System.Text.Json vs Newtonsoft, aur content negotiation
? System.Text.Json aur Newtonsoft.Json mein kya farak hai? camelCase, enum as string, cycles kaise sambhaloge?
**Ek line:** **serialization** = object → JSON, **deserialization** = JSON → object. ASP.NET Core ka default **System.Text.Json** (tez, built-in); **Newtonsoft.Json** purana, zyada features/flexible — legacy projects mein.

| | System.Text.Json | Newtonsoft.Json |
| --- | --- | --- |
| Speed / memory | ✅ Tez | Dheema |
| Built-in | ✅ | NuGet |
| Flexibility (dynamic, JObject, loose parsing) | Kam | ✅ Zyada |
| Default naming | camelCase (ASP.NET mein) | Jaisa property |
| Source generator (AOT) | ✅ | ❌ |

Common settings:
- **Enum as string**: `JsonStringEnumConverter`.
- **Cycles** (Order → Customer → Orders…): `ReferenceHandler.IgnoreCycles` — par asli fix **DTO** lautana.
- Null skip: `DefaultIgnoreCondition = WhenWritingNull`.
- Property ignore/rename: `[JsonIgnore]`, `[JsonPropertyName("order_id")]`.

**Content negotiation** = client `Accept` header se batata hai kaunsa format chahiye (JSON/XML); ASP.NET sahi formatter chunta hai. Default sirf JSON; XML chahiye to `.AddXmlSerializerFormatters()`.

```csharp
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var json = JsonSerializer.Serialize(order);                    // object → JSON
var back = JsonSerializer.Deserialize<Order>(json);            // JSON → object
```

> Default System.Text.Json (tez). Newtonsoft = legacy/flexible. Cycles ka asli ilaaj = DTO.

## IActionResult vs ActionResult<T> — Ok, NotFound, BadRequest
? Controller action IActionResult lautaye ya ActionResult<T>? Common result methods kaunse hain?
**Ek line:** **`IActionResult`** = koi bhi HTTP result (status + body), par type pata nahi. **`ActionResult<T>`** = "ya to `T` (200 ke saath) ya koi aur result" — **type safe**, aur Swagger ko response ka model pata chalta hai. API mein **`ActionResult<T>`** prefer karo.

| Method | Status | Kab |
| --- | --- | --- |
| `Ok(data)` / `return data;` | 200 | Mil gaya |
| `CreatedAtAction(nameof(Get), new { id }, dto)` | 201 + Location | Naya bana |
| `NoContent()` | 204 | Update/delete, body nahi |
| `BadRequest(errors)` / `ValidationProblem()` | 400 | Galat input |
| `Unauthorized()` / `Forbid()` | 401 / 403 | Login nahi / permission nahi |
| `NotFound()` | 404 | Nahi mila |
| `Conflict()` | 409 | Duplicate / version conflict |
| `Problem(...)` | 500 (ya koi bhi) | ProblemDetails format mein error |
| `File(bytes, type, name)` | 200 | Download |

```csharp
[HttpGet("{id}")]
public async Task<ActionResult<OrderDto>> Get(int id)
{
    var o = await _svc.GetAsync(id);
    if (o is null) return NotFound();
    return o;                                      // implicit Ok(o) — ActionResult<T> ka fayda
}

[HttpPost]
public async Task<ActionResult<OrderDto>> Create(CreateOrderDto d)
{
    var o = await _svc.CreateAsync(d);
    return CreatedAtAction(nameof(Get), new { id = o.Id }, o);
}
```

> ActionResult<T> = type safe + Swagger ko model pata. Sahi status code ka sahi method.

## HTTP verbs aur idempotency — PUT vs PATCH
? GET, POST, PUT, PATCH, DELETE — kaunse idempotent hain? PUT aur PATCH mein kya farak hai?
**Ek line:** **idempotent** = same request **kitni bhi baar** bhejo, server ki state **ek baar bhejne jaisi** hi rahe. GET, PUT, DELETE idempotent hain; **POST nahi** (har baar naya record); PATCH depend karta hai.

| Verb | Kaam | Safe (kuch nahi badalta) | Idempotent |
| --- | --- | --- | --- |
| GET | Padhna | ✅ | ✅ |
| POST | Naya banana / action | ❌ | ❌ — do baar = do orders |
| PUT | **Poora** resource replace | ❌ | ✅ |
| PATCH | **Kuch fields** badalna | ❌ | Aam taur pe haan (`status=Paid`), par `stock -1` jaisa ho to nahi |
| DELETE | Hatana | ❌ | ✅ (doosri baar 404/204, state same) |

**PUT vs PATCH**: PUT = poora object bhejo, jo field nahi bheja wo **khaali/default** ho sakta hai. PATCH = sirf badli hui fields (JSON Patch `[{ "op":"replace","path":"/status","value":"Paid" }]` ya simple partial DTO).

**Aise socho:** PUT = **poora form dobara bharna**. PATCH = form mein sirf **ek galti sudhaarna**. POST = **naya form jama karna** — do baar dabaya to do form.

Retry safe banana: POST pe **Idempotency-Key** header — server key yaad rakhe, dobara aaye to pehla result lautaye (payment double charge se bachav).

```csharp
[HttpPut("{id}")]   public async Task<IActionResult> Replace(int id, OrderDto full) { await _svc.ReplaceAsync(id, full); return NoContent(); }
[HttpPatch("{id}")] public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto d) { await _svc.SetStatusAsync(id, d.Status); return NoContent(); }
```

> Idempotent = baar-baar bhejo, result ek jaisa. POST nahi hai. PUT = poora, PATCH = thoda.

## Kestrel, IIS aur in-process vs out-of-process hosting
? Kestrel kya hai? IIS ke saath ASP.NET Core in-process aur out-of-process hosting mein kya farak hai?
**Ek line:** **Kestrel** = ASP.NET Core ka apna **built-in, cross-platform web server** — har ASP.NET Core app isi pe chalti hai. Production mein aage aksar ek **reverse proxy** (IIS, Nginx, load balancer) hota hai — HTTPS, compression, static caching, security ke liye.

**IIS ke saath do modes** (ASP.NET Core Module ke through):

| | In-process (default) | Out-of-process |
| --- | --- | --- |
| App kahan chalti | **IIS ke worker process (w3wp.exe) ke andar** | Alag `dotnet.exe` process, Kestrel pe |
| Request ka raasta | IIS → seedha app | IIS → proxy → Kestrel |
| Speed | ✅ Tez (ek hop kam) | Thoda slow |
| Kab | Windows + IIS normal case | Isolation chahiye, ya purana setup |

Linux pe: **Nginx → Kestrel** (systemd service). Containers mein: Kestrel seedha, aage ingress/load balancer.

**Aise socho:** Kestrel = restaurant ka **kitchen**; IIS/Nginx = **front desk** jo mehmaan ko sambhalta, security check karta aur order andar bhejta hai. In-process = front desk aur kitchen **ek hi kamre** mein; out-of-process = **alag kamre**, beech mein darwaza.

```xml
<!-- .csproj -->
<AspNetCoreHostingModel>InProcess</AspNetCoreHostingModel>
```

> Kestrel = built-in server. Aage IIS/Nginx reverse proxy. IIS in-process = tez, ek hi process.

## JWT vs session-based authentication
? JWT aur session/cookie authentication mein farak kya hai? Kab kaunsa use karoge?
**Ek line:** **Session**: server login ke baad **session ID** cookie mein deta hai aur user ki info **server pe** yaad rakhta hai. **JWT**: server ek **signed token** deta hai jisme user info (claims) **token ke andar** hi hai — server ko kuch yaad nahi rakhna (stateless).

| | Session (cookie) | JWT (bearer token) |
| --- | --- | --- |
| State kahan | Server (memory / Redis / DB) | Token ke andar (client pe) |
| Kai servers | Shared session store chahiye | ✅ Koi bhi server verify kar le |
| Logout / revoke | ✅ Session delete karo — turant | Mushkil — token expiry tak valid (short expiry + refresh token / blacklist) |
| Mobile / SPA / microservices | Theek-thaak | ✅ Natural fit |
| CSRF | Cookie hai to dhyan (SameSite) | Header mein bheja to CSRF nahi (par XSS se token chori ka dhyan) |
| Size | Chhota ID | Bada (har request pe claims jaate) |

**Aise socho:** session = cinema mein **coat check** — tumhe token number milta hai, coat (data) counter pe hai. JWT = **stamp wala ticket** — seat, show sab ticket pe likha hai, gate wala stamp (signature) dekh ke andar jaane deta hai, register nahi dekhta.

Aam choice: server-rendered MVC website → cookie session. Angular SPA + API, mobile, microservices → JWT (access token short + refresh token).

> Session = server yaad rakhe (turant logout). JWT = token khud bataye (stateless, scale aasaan, revoke mushkil).

## Refresh token kya hai aur kyun chahiye
? Access token 15 minute mein expire hota hai to user baar-baar login kyun nahi karta? Refresh token kaise kaam karta hai?
**Ek line:** **access token** chhota jeeta hai (5–15 min) taaki chori ho to nuksaan kam. **Refresh token** lamba jeeta hai (din/hafte) aur sirf ek kaam karta hai — **naya access token** lena, bina dobara login.

Flow:
1. Login → server deta hai **access token** (short) + **refresh token** (long).
2. Har API call mein access token.
3. Access expire → API **401** → client (Angular interceptor) `/auth/refresh` pe refresh token bhejta hai.
4. Server refresh token check karta hai (DB mein hai, expire nahi, revoke nahi) → naya access token (+ aam taur pe **naya refresh token** — rotation).
5. Logout / password change → server refresh token **revoke** — ab naya access nahi milega.

Security:
- Refresh token **DB mein (hash karke)** rakho taaki revoke ho sake.
- **Rotation** — har use pe naya refresh token, purana invalid. Purana dobara use hua = chori ka signal → us user ke saare tokens revoke.
- Browser mein refresh token **HttpOnly, Secure cookie** mein — JS se padh na sake.

**Aise socho:** access token = **din ka visitor pass** (jaldi expire). Refresh token = **ID card** jo reception pe dikha ke naya pass le sakte ho — ID card kho jaaye to company usko **block** kar deti hai.

```csharp
[HttpPost("refresh")]
public async Task<IActionResult> Refresh([FromBody] string refreshToken)
{
    var stored = await _db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == Hash(refreshToken));
    if (stored is null || stored.ExpiresAt < DateTime.UtcNow || stored.Revoked) return Unauthorized();

    stored.Revoked = true;                                  // rotation
    var (access, newRefresh) = _tokens.Issue(stored.UserId);
    _db.RefreshTokens.Add(new RefreshToken { UserId = stored.UserId, TokenHash = Hash(newRefresh), ExpiresAt = DateTime.UtcNow.AddDays(7) });
    await _db.SaveChangesAsync();
    return Ok(new { access, refresh = newRefresh });
}
```

> Access = chhota pass (chori ho to kam nuksaan). Refresh = naya pass lene ka ID card (DB mein, revoke ho sake, rotate karo).

## Role-based vs claims-based vs policy-based authorization
? ASP.NET Core mein role, claims aur policy based authorization mein farak kya hai? "18+ users hi dekh sakein" kaise lagaoge?
**Ek line:** **Role** = user ka group ("Admin", "Manager") — `[Authorize(Roles = "Admin")]`. **Claim** = user ke baare mein koi bhi fact (`department=HR`, `age=25`, `permission=orders.delete`). **Policy** = naam wala **rule** jo roles/claims/custom logic mila ke decide kare — sabse flexible, **recommended**.

| | Example | Kab |
| --- | --- | --- |
| Role-based | `[Authorize(Roles = "Admin,Manager")]` | Simple, kuch hi roles |
| Claims-based | Policy: `RequireClaim("department", "HR")` | User ki property pe decide |
| Policy-based | `[Authorize(Policy = "CanDeleteOrders")]` + requirement/handler | Complex rules, resource ke hisaab se (ye order is user ka hai?) |

Policies ka fayda: rule **ek jagah** (Program.cs / handler), controllers mein sirf naam. Rule badla to ek jagah badlo. **Resource-based** authorization (`IAuthorizationService.AuthorizeAsync(user, order, "CanEdit")`) — "sirf apna order edit kar sake".

```csharp
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("HrOnly", p => p.RequireClaim("department", "HR"));
    o.AddPolicy("CanDeleteOrders", p => p.RequireRole("Admin").RequireClaim("permission", "orders.delete"));
    o.AddPolicy("Adult", p => p.Requirements.Add(new MinAgeRequirement(18)));
});
builder.Services.AddSingleton<IAuthorizationHandler, MinAgeHandler>();

public record MinAgeRequirement(int Age) : IAuthorizationRequirement;
public class MinAgeHandler : AuthorizationHandler<MinAgeRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx, MinAgeRequirement req)
    {
        var dob = ctx.User.FindFirst("birthdate")?.Value;
        if (dob != null && DateTime.Parse(dob).AddYears(req.Age) <= DateTime.Today) ctx.Succeed(req);
        return Task.CompletedTask;
    }
}

[Authorize(Policy = "CanDeleteOrders")]
[HttpDelete("{id}")] public IActionResult Delete(int id) => NoContent();
```

> Role = group. Claim = fact. Policy = naam wala rule (roles + claims + custom logic) — ye use karo.

## DI container — constructor vs property injection, built-in vs Autofac
? Constructor injection aur property injection mein kya farak hai? Built-in DI kaafi hai ya Autofac jaisa chahiye?
**Ek line:** **constructor injection** = dependency constructor mein — object bina uske ban hi nahi sakta (**default, best**). **Property injection** = baad mein property set — optional dependency ke liye; ASP.NET Core ka built-in container isko support nahi karta.

| | Constructor | Property | Method (`[FromServices]`) |
| --- | --- | --- | --- |
| Dependency zaroori | ✅ Guarantee | ❌ Null ho sakti | Sirf ek action mein |
| Dikhta hai kya chahiye | ✅ Constructor dekho | ❌ Chhupa | ✅ |
| Built-in container | ✅ | ❌ | ✅ |

**Built-in vs Autofac (third-party):**
- Built-in: lifetimes, generics, `IEnumerable<T>`, factories, **keyed services** (.NET 8) — **zyada tar projects ke liye kaafi**.
- Autofac/Scrutor tab: **assembly scanning** (convention se sab register), **decorators**, property injection, modules, child scopes, interceptors (AOP).

Constructor mein **bahut saari** (7–8+) dependencies = class bahut kaam kar rahi hai (SRP tootna) — todo.

```csharp
public class OrderService(IOrderRepo repo, IEmailSender email, ILogger<OrderService> log)   // constructor (primary)
{
    public Task PlaceAsync(Order o) => repo.SaveAsync(o);
}

[HttpGet("report")]
public IActionResult Report([FromServices] IReportBuilder builder) => Ok(builder.Build());    // sirf is action mein

// Scrutor — scanning + decorator
builder.Services.Scan(s => s.FromAssemblyOf<OrderService>().AddClasses(c => c.Where(t => t.Name.EndsWith("Service"))).AsImplementedInterfaces().WithScopedLifetime());
```

> Constructor injection = default. Built-in container zyada tar kaafi; scanning/decorators chahiye to Scrutor/Autofac.

## File upload API kaise banate ho
? ASP.NET Core mein file upload API kaise banaoge? Size limit, validation aur badi files ka kya?
**Ek line:** chhoti files ke liye **`IFormFile`** (multipart/form-data); badi files ke liye **streaming** ya seedha cloud storage pe **pre-signed URL**. Hamesha **size limit, type validation, aur apna file naam**.

Checklist:
- **Size limit**: `[RequestSizeLimit(10_000_000)]` / `FormOptions.MultipartBodyLengthLimit`; Kestrel/IIS/Nginx ki limits bhi (`client_max_body_size`).
- **Type**: extension whitelist **aur** content (magic bytes) check — sirf `ContentType` header pe bharosa nahi (client jhooth bol sakta hai).
- **Naam**: user ka file naam kabhi path mein mat use karo (`../../web.config`) — apna GUID naam.
- **Kahan**: `wwwroot` mein nahi (koi bhi execute/download kar le) — alag folder ya Blob/S3; DB mein sirf metadata.
- Virus scan, image resize → background job.
- Badi files: streaming (`MultipartReader`), ya client ko **SAS/pre-signed URL** do — upload seedha storage pe, API server pe load nahi.

```csharp
[HttpPost("upload")]
[RequestSizeLimit(5 * 1024 * 1024)]                         // 5 MB
public async Task<IActionResult> Upload(IFormFile file)
{
    if (file is null || file.Length == 0) return BadRequest("File khaali hai");
    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (ext is not (".pdf" or ".png" or ".jpg")) return BadRequest("Sirf pdf/png/jpg");

    var name = $"{Guid.NewGuid()}{ext}";                     // apna naam, user ka nahi
    var path = Path.Combine(_uploadRoot, name);              // wwwroot ke bahar
    await using (var fs = System.IO.File.Create(path))
        await file.CopyToAsync(fs);

    _db.Files.Add(new StoredFile { Name = name, Original = file.FileName, Size = file.Length });
    await _db.SaveChangesAsync();
    return Ok(new { id = name });
}
```

> IFormFile + size limit + extension/content check + apna GUID naam + wwwroot ke bahar. Badi files → pre-signed URL.

## LINQ method syntax vs query syntax, aur let
? LINQ ke method syntax aur query syntax mein kya farak hai? let keyword kab kaam aata hai?
**Ek line:** dono **same kaam** karte hain — compiler query syntax ko method calls mein badal deta hai. **Method syntax** (`.Where().Select()`) zyada common aur har operator deta hai; **query syntax** (`from ... where ... select`) SQL jaisa — **joins, `let`, kai `from`** mein zyada padhne layak.

| | Method syntax | Query syntax |
| --- | --- | --- |
| Dikhta | `emps.Where(e => e.Salary > 50000).Select(e => e.Name)` | `from e in emps where e.Salary > 50000 select e.Name` |
| Saare operators | ✅ (`Take`, `Distinct`, `Any`…) | Kuch hi — baaki ke liye method mix karo |
| Joins / let | Lamba | ✅ Saaf |

**`let`** = query ke beech mein ek **naya variable** — ek calculation baar-baar na likhni pade.

```csharp
// Method
var high = emps.Where(e => e.Salary > 50000).OrderBy(e => e.Name).Select(e => e.Name);

// Query + let
var result =
    from e in emps
    let yearly = e.Salary * 12                  // ek baar calculate
    where yearly > 600000
    orderby yearly descending
    select new { e.Name, yearly };

// Do from = SelectMany (har order ke har item)
var items = from o in orders from i in o.Items select new { o.Id, i.ProductId };
```

> Dono same. Roz method syntax; joins aur `let` mein query syntax saaf.

## LINQ set operations — Distinct, Union, Intersect, Except
? Do lists mein common, sirf pehli wali mein, aur dono milake unique items LINQ se kaise nikaaloge?
**Ek line:** set operations do sequences ko **sets ki tarah** compare karte hain — `Distinct` (duplicate hatao), `Union` (dono, unique), `Intersect` (dono mein common), `Except` (pehli mein hai, doosri mein nahi), `Concat` (jodna, duplicate ke saath).

| | Result (A = 1,2,3,3 · B = 3,4) |
| --- | --- |
| `A.Distinct()` | 1, 2, 3 |
| `A.Union(B)` | 1, 2, 3, 4 |
| `A.Intersect(B)` | 3 |
| `A.Except(B)` | 1, 2 |
| `A.Concat(B)` | 1, 2, 3, 3, 3, 4 |

Objects pe ye **Equals/GetHashCode** use karte hain — normal class ke do alag objects same values ke saath bhi "alag" hain. Records use karo, `IEqualityComparer` do, ya .NET 6+ ke **`DistinctBy`, `UnionBy`, `IntersectBy`, `ExceptBy`** (key se).

```csharp
int[] a = [1, 2, 3, 3], b = [3, 4];
var common = a.Intersect(b);                                       // 3
var onlyA  = a.Except(b);                                          // 1, 2

var uniqueCustomers = orders.DistinctBy(o => o.CustomerId);        // key se
var newUsers = todayUsers.ExceptBy(yesterdayUsers.Select(u => u.Id), u => u.Id);
```

> Distinct = unique. Union = dono unique. Intersect = common. Except = sirf pehli mein. Objects pe *By versions.

## LINQ mein Join, GroupJoin aur left join
? LINQ mein inner join, group join aur left join kaise likhte ho? EF Core mein navigation property kab better hai?
**Ek line:** **`Join`** = SQL INNER JOIN. **`GroupJoin`** = har left item ke saath uske matching items ki **list** (one-to-many). **Left join** = GroupJoin + `DefaultIfEmpty()` (ya .NET 10 ka `LeftJoin`). EF Core mein navigation properties hon to aksar seedha `Include`/`Select` hi saaf hai.

```csharp
// Inner join — method syntax
var q1 = orders.Join(customers, o => o.CustomerId, c => c.Id, (o, c) => new { o.Id, c.Name });

// Inner join — query syntax
var q2 = from o in orders join c in customers on o.CustomerId equals c.Id select new { o.Id, c.Name };

// GroupJoin — har customer ke saath uske orders ki list
var q3 = from c in customers
         join o in orders on c.Id equals o.CustomerId into custOrders
         select new { c.Name, Count = custOrders.Count(), Total = custOrders.Sum(x => x.Total) };

// Left join — jinka order nahi wo bhi (order null)
var q4 = from c in customers
         join o in orders on c.Id equals o.CustomerId into g
         from o in g.DefaultIfEmpty()
         select new { c.Name, OrderId = (int?)o.Id };

// EF Core with navigation — join khud likhne ki zaroorat nahi
var q5 = db.Customers.Select(c => new { c.Name, Count = c.Orders.Count() });
```

! Query syntax mein `equals` likhte hain, `==` nahi — aur left side pehli sequence ki key honi chahiye.

> Join = inner. GroupJoin = parent + children list. Left join = GroupJoin + DefaultIfEmpty. EF mein navigation ho to usi se.
