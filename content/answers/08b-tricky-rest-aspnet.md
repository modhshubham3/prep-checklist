# Tricky — REST, HTTP aur ASP.NET Core scenarios

## REST ke principles (constraints) kaunse hain?
REST (Representational State Transfer) koi protocol ya library nahi — Roy Fielding ka **architectural style** hai, jo **6 constraints** se define hota hai. Jo API inhe follow karti hai use "RESTful" kehte hain. Interviewer aksar "5 principles" bolta hai kyunki chhatha (Code on Demand) optional hai.

1. **Client–Server** — UI (client) aur data/business logic (server) alag hain. Dono independently badal aur scale ho sakte hain. Angular badlo, API nahi badalti.
2. **Stateless** — har request apne aap mein **poori** hoti hai; server pichhli requests ya session yaad nahi rakhta. Auth token har request mein aata hai. Isse koi bhi server instance koi bhi request sambhal sakta hai — horizontal scaling aasaan.
3. **Cacheable** — response batata hai ki use cache kar sakte hain ya nahi (`Cache-Control`, `ETag`, `Last-Modified`). Isse repeat requests server tak aati hi nahi.
4. **Uniform Interface** — sabse important. Resources **URL se pehchaane** jaate hain (`/api/orders/42`), kaam **standard HTTP methods** se (GET/POST/PUT/DELETE), data ek **representation** mein (JSON), messages self-descriptive (Content-Type, status codes), aur **HATEOAS** (response mein aage ke links).
5. **Layered System** — client ko pata nahi hota ki wo seedha server se baat kar raha hai ya beech mein load balancer, cache, API gateway hai. Layers add/remove karne se client nahi tootta.
6. **Code on Demand** *(optional)* — server client ko executable code bhej sakta hai (jaise JavaScript).

Practically "RESTful" API ka matlab: nouns wale URLs, sahi HTTP methods aur status codes, stateless auth (JWT), JSON, aur caching headers.

| # | Constraint | Ek line |
|---|---|---|
| 1 | Client–Server | UI aur server alag |
| 2 | Stateless | Server session yaad nahi rakhta |
| 3 | Cacheable | Response cache-able hai ya nahi, batao |
| 4 | Uniform Interface | URL = resource, HTTP method = kaam |
| 5 | Layered System | Beech mein proxies/LB ho sakte hain |
| 6 | Code on Demand | Optional — server code bhej sake |

> "CS-CULC": Client-server, Stateless, Cacheable, Uniform interface, Layered, Code on demand.

## REST protocol hai? REST vs SOAP
**REST protocol nahi hai** — ek architectural style hai (constraints ka set). HTTP pe chalta hai par HTTP khud REST nahi hai. **SOAP ek protocol hai** — strict XML envelope, WSDL contract, apne standards (WS-Security, WS-ReliableMessaging).

REST: halka, JSON (ya kuch bhi), HTTP ke features (methods, status codes, caching) use karta hai, browsers aur mobile ke liye aasaan. SOAP: bhaari XML, par formal contract aur enterprise features — purane banking/government systems mein abhi bhi milta hai.

| REST | SOAP |
|---|---|
| Architectural style | Protocol |
| JSON/XML/anything | Sirf XML |
| HTTP methods + status codes | Mostly POST, envelope ke andar sab |
| Contract optional (OpenAPI) | WSDL contract compulsory |
| Halka, fast | Bhaari, strict |

## Richardson Maturity Model kya hai?
Ye batata hai ki API **kitni RESTful** hai — 4 levels:

**Level 0** — ek hi URL, sab kuch POST (`/api` pe `{ "action": "getOrder", "id": 42 }`). Asal mein RPC over HTTP. **Level 1** — alag **resources** ke alag URLs (`/orders/42`), par methods abhi bhi galat (sab POST). **Level 2** — resources + **sahi HTTP verbs aur status codes** (GET padhna, POST banana, 404, 201…). Zyada tar production "REST" APIs yahin hain. **Level 3** — **HATEOAS**: response mein links hote hain ki aage kya kar sakte ho (`"cancel": "/orders/42/cancel"`), client URLs hardcode nahi karta.

Interview mein bolo: "Hamari API Level 2 pe hai — resources, sahi verbs aur status codes. Level 3 kam hi log implement karte hain."

## Client ne PUT mein sirf naam bheja — baaki fields ka kya hoga?
```http q
PUT /api/users/10
{ "name": "Ravi" }

-- DB mein pehle: { name: "Asha", email: "a@x.com", age: 30 }
```
Sahi REST semantics mein **PUT poora resource replace** karta hai — jo field nahi bheji wo **null/default** ho jaayegi: `{ name: "Ravi", email: null, age: 0 }` (ya validation fail agar email required hai). Isliye PUT mein client ko **poora object** bhejna chahiye.

Sirf kuch fields badalni hon to **PATCH** — wahi fields update hoti hain jo bheji. Kai APIs PUT ko hi partial update ki tarah implement kar deti hain — kaam chalta hai par semantics galat hai, aur "field ko null karna hai" vs "field bheji hi nahi" mein farak nahi kar paate.

> PUT = replace, PATCH = modify.

## GET request mein body bhej sakte hain?
Technically HTTP spec GET body ko mana nahi karta, par **uska koi defined meaning nahi hai** — aur practically problems hain: kai proxies, load balancers, CDNs aur caches GET body **drop** kar dete hain, kuch clients (browsers ka `fetch`) GET mein body bhejne hi nahi dete, aur caching URL pe hoti hai (body ignore).

Isliye GET mein data **query string** ya URL path mein bhejo. Agar search filter itna bada/complex hai ki URL mein nahi aata, to **POST** `/api/orders/search` endpoint banao (ya naya `QUERY` method, jo abhi naya standard hai).

## Token valid hai par role Admin nahi — kaunsa status code?
```text q
Case 1: Authorization header hi nahi bheja
Case 2: Token expire ho gaya
Case 3: Token valid, user "Viewer", endpoint [Authorize(Roles = "Admin")]
Case 4: Token valid, user apna nahi, doosre user ka order /orders/99 maang raha hai
```
- **Case 1 → 401** — pata hi nahi tum kaun ho.
- **Case 2 → 401** — pehchaan invalid (client refresh token se naya token le ke retry kare).
- **Case 3 → 403** — pehchaan ho gayi, par permission nahi.
- **Case 4 → 403 ya 404** — permission nahi hai. Kai APIs **404** lautati hain taaki attacker ko pata na chale ki order 99 exist bhi karta hai (information leakage se bachav). Dono defensible hain; bas **200 kabhi nahi** (wo IDOR vulnerability hai).

> 401 = identity problem, 403 = permission problem.

## Delete kiya record dobara DELETE kiya — kya lautaoge?
Pehla `DELETE /api/orders/42` → **204 No Content** (ya 200). Doosri baar: record hai hi nahi — do common choices: **404 Not Found** (resource nahi mila) ya **204** (end state "deleted" hi hai).

Dono ke saath DELETE **idempotent** rehta hai, kyunki idempotency **server state** ke baare mein hai, response code ke baare mein nahi — dono baar ke baad record gayab hi hai. Team ek convention tay kar le. Interviewer yahi check karta hai ki tum idempotency ko response se confuse to nahi kar rahe.

## POST ke baad 200 kyun nahi, 201?
**201 Created** client ko batata hai ki **naya resource bana**, aur saath mein **`Location` header** deta hai ki naya resource kahan hai (`Location: /api/orders/1051`). Client wahan se turant GET kar sakta hai; body mein bhi naya object (id ke saath) lautate hain. 200 bhi galat nahi, par 201 zyada precise hai aur REST convention hai.

Agar POST koi naya resource nahi banata (jaise `/api/orders/42/cancel` action ya search), to **200** (result ke saath) ya **202 Accepted** (kaam queue mein daala, baad mein hoga).

```csharp
[HttpPost]
public async Task<ActionResult<OrderDto>> Create(CreateOrderDto dto)
{
    var order = await _svc.CreateAsync(dto);
    return CreatedAtAction(nameof(Get), new { id = order.Id }, order);   // 201 + Location
}
```

## UseAuthorization ko UseAuthentication se pehle likh diya
```csharp q
app.UseRouting();
app.UseAuthorization();
app.UseAuthentication();
app.MapControllers();
```
Nateeja: `[Authorize]` wale **saare endpoints 401** dene lagenge, chahe token bilkul sahi ho.

Authentication middleware hi request se token padh ke `HttpContext.User` set karta hai. Authorization middleware usse pehle chal gaya, to use user **anonymous** dikha → challenge → 401. Baad mein authentication chalta hai par tab tak faisla ho chuka.

Sahi order: `UseRouting → UseCors → UseAuthentication → UseAuthorization → MapControllers`.

> pehle "kaun ho" (authentication), phir "ijaazat hai?" (authorization).

## Postman mein chal rahi hai, Angular mein CORS error
**CORS browser ki security** hai, server ki nahi. Browser ek origin (`http://localhost:4200`) ke page ko doosre origin (`https://api.example.com`) pe request karne se pehle check karta hai ki server ne **`Access-Control-Allow-Origin`** header se us origin ko allow kiya hai ya nahi. Postman browser nahi hai — wo CORS check karta hi nahi, isliye wahan chal jaata hai.

Fix **server pe**: ASP.NET Core mein CORS policy — specific origins allow karo, aur `UseCors` ko authentication se pehle rakho (taaki preflight block na ho). `AllowAnyOrigin()` ke saath `AllowCredentials()` allowed nahi hai (aur khatarnak bhi hota). Development mein Angular proxy (`proxy.conf.json`) bhi ek tareeka hai — same origin ban jaata hai.

```csharp
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins("http://localhost:4200", "https://app.example.com")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

app.UseCors("frontend");          // UseAuthentication se pehle
```

! "CORS error aa raha hai to server pe `*` allow kar do" — security hole. Sirf apne origins allow karo.

## Preflight (OPTIONS) request kab jaati hai?
Browser actual request se pehle ek **OPTIONS** request bhejta hai (preflight) jab request **"simple" nahi** hoti — yaani:
- Method GET/HEAD/POST ke alawa ho (PUT, PATCH, DELETE)
- Custom headers ho — jaise **`Authorization`** (JWT!), `X-Correlation-Id`
- `Content-Type` form/text ke alawa ho — jaise **`application/json`**

Yani JWT wali lagbhag har Angular API call preflight karwati hai. Server OPTIONS pe allowed origin/methods/headers batata hai, tabhi asli request jaati hai. Agar authentication middleware OPTIONS ko 401 de de to asli request kabhi nahi jaayegi — isliye CORS middleware pehle. `Access-Control-Max-Age` se browser preflight result cache karta hai.

## Singleton service mein DbContext inject kiya
```csharp q
builder.Services.AddDbContext<AppDbContext>(...);      // Scoped
builder.Services.AddSingleton<ReportCache>();

public class ReportCache(AppDbContext db) { }
```
Development environment mein app **start hote hi error** deti hai: *Cannot consume scoped service 'AppDbContext' from singleton 'ReportCache'.* (Scope validation dev mein default on hai.) Production mein validation off ho to app chal jaayegi — aur wahi asli khatra hai.

Singleton hamesha zinda rehta hai, to uske andar ka DbContext bhi hamesha zinda — saari requests ek hi DbContext share karengi. DbContext **thread-safe nahi**: ek saath requests pe "second operation started on this context" errors, change tracker mein entities jama hote jaayenge (memory leak), aur stale data.

Fix: Singleton mein `IServiceScopeFactory` (ya `IDbContextFactory<AppDbContext>`) inject karo aur har kaam ke liye naya scope/context banao.

```csharp
public class ReportCache(IDbContextFactory<AppDbContext> factory)
{
    public async Task<int> CountAsync()
    {
        await using var db = await factory.CreateDbContextAsync();
        return await db.Orders.CountAsync();
    }
}
```

> captive dependency — lambi life wali service choti life wali ko pakad leti hai.

## Entity seedha return ki — JSON error aaya
```csharp q
[HttpGet("{id}")]
public async Task<Order> Get(int id) =>
    await db.Orders.Include(o => o.Customer).FirstAsync(o => o.Id == id);

// Order.Customer, Customer.Orders — dono taraf navigation
```
Error: **`JsonException: A possible object cycle was detected`**. Serializer `Order → Customer → Orders → Order → Customer …` ka **cycle** mein phans jaata hai.

Asli fix: **DTO** return karo — sirf zaroori fields, koi cycle nahi, sensitive data leak nahi. Workaround `ReferenceHandler.IgnoreCycles` hai, par wo sirf symptom chhupata hai — entity return karne ki baaki problems (over-exposure, lazy loading queries) waisi hi rehti hain.

```csharp
return await db.Orders.Where(o => o.Id == id)
    .Select(o => new OrderDto(o.Id, o.Amount, o.Customer.Name))
    .FirstOrDefaultAsync() is { } dto ? Ok(dto) : NotFound();
```

## Har request pe new HttpClient banaya
```csharp q
public async Task<string> GetRate()
{
    using var client = new HttpClient();
    return await client.GetStringAsync("https://rates.example.com/usd");
}
```
Kam traffic pe chal jaata hai, par load pe **socket exhaustion** — `SocketException`, "Only one usage of each socket address…" jaise errors.

`HttpClient` dispose karne pe bhi uska TCP connection turant band nahi hota — OS use **TIME_WAIT** mein ~2–4 minute rakhta hai. Har request naya connection → hazaaron sockets TIME_WAIT mein → ports khatam.

Ulta extreme — ek hi `static HttpClient` hamesha ke liye — sockets reuse karta hai par **DNS changes nahi pakadta** (IP badla to purane pe hi jaata rahega).

Sahi: **`IHttpClientFactory`** — handlers pool karta hai (connection reuse) aur time-time pe rotate karta hai (DNS refresh). Typed clients ke saath resilience (retry, timeout) bhi.

```csharp
builder.Services.AddHttpClient<RatesClient>(c => c.BaseAddress = new("https://rates.example.com"));

public class RatesClient(HttpClient http)
{
    public Task<string> UsdAsync() => http.GetStringAsync("/usd");
}
```

## [ApiController] hata diya — kya badlega?
`[ApiController]` attribute ye sab automatically karta hai; hataoge to ye sab **band**:

- **Automatic 400** — invalid model pe action chalta hi nahi tha; ab action chalega aur tumhe khud `if (!ModelState.IsValid) return BadRequest(ModelState);` likhna padega. Bhool gaye to invalid data seedha business logic tak.
- **Binding source inference** — complex type apne aap `[FromBody]` maana jaata tha; ab explicitly likhna padega, warna wo form/query se bind hone ki koshish karega aur null milega.
- **ProblemDetails** error responses.
- **Attribute routing ki requirement**.

Isliye API controllers pe hamesha `[ApiController]` lagao — ya base controller pe ek baar.

## Exception handler ko pipeline mein neeche rakh diya
```csharp q
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseExceptionHandler("/error");
```
Controller mein exception aaya to ye handler **use pakdega hi nahi**. Middleware sirf un exceptions ko pakad sakta hai jo uske **baad** (andar ki taraf) register hue components mein aayein. `MapControllers` endpoint pehle hi request ko handle kar leta hai; neeche ka middleware bekaar hai.

Exception handler **sabse pehle** (pipeline mein sabse upar) hona chahiye taaki baaki sab uske andar hon.

> middleware apne neeche walon ke exceptions hi pakad sakta hai.

## Server restart kiya — logged in users ke JWT chalenge?
**Haan**, agar **signing key same** hai. JWT stateless hai — server kuch store nahi karta; har request pe sirf signature aur expiry check hoti hai. Restart se kuch nahi badalta. (Agar key restart pe randomly generate hoti hai — jaise galti se code mein `new RandomKey()` — to saare tokens invalid ho jaayenge. Isliye key config/secret store se aani chahiye.)

**Follow-up: "Logout kiya to token band ho jaata hai?"** — **Nahi, apne aap nahi.** Client token delete kar deta hai, par agar kisi ne token copy kar liya hai to wo expiry tak valid hai. Isliye: access token **short-lived** (15–30 min), refresh token server pe store/revoke, aur zaroori ho to **denylist** (token id `jti` Redis mein) ya user ka "token version" check.

## User ne JWT decode karke role Admin kar diya
User token ko base64-decode kar sakta hai (JWT encrypted nahi hai), payload mein `"role": "Admin"` likh ke dobara encode kar sakta hai — **par signature match nahi karega**. Signature header + payload se secret key ke saath bana tha; payload badla to signature galat. Server validate karte hi token reject → **401**.

Isliye JWT ka payload **padha ja sakta hai, badla nahi ja sakta**. Shart: server `ValidateIssuerSigningKey` karta ho aur algorithm `none` accept na kare, aur secret key strong ho (HS256 ke liye kam se kam 256-bit).

> signature integrity deta hai, confidentiality nahi.

## Payment button pe double click — do baar charge
POST idempotent nahi hai, to do POST = do payments. Layers mein fix:

1. **Frontend** — button disable after click, `exhaustMap` (chalte request ke dauraan clicks ignore). Par ye kaafi nahi — network retry, do tabs, ya malicious client.
2. **Idempotency key** (asli fix) — client har payment attempt ke liye ek unique key (GUID) banata hai aur header mein bhejta hai (`Idempotency-Key`). Server key ko DB mein **unique constraint** ke saath save karta hai. Same key dobara aayi to naya payment nahi — pehle wala result lautao.
3. **DB constraint** — jaise `UNIQUE(order_id)` payments table pe, taaki ek order ka ek hi successful payment ho sake.

Razorpay, Stripe jaise gateways yahi pattern use karte hain.

## Load balancer ke peeche in-memory session — kya dikkat?
User ki request 1 server A pe gayi, session A ki memory mein bana. Request 2 load balancer ne server B pe bhej di — B ke paas session nahi → user **logged out** ya data gayab. Random behaviour, "kabhi chalta hai kabhi nahi".

Options: **sticky sessions** (LB ek user ko hamesha ek server pe bheje — par server down hua to session gaya, aur load barabar nahi baantta), **distributed session store** (Redis — sab servers share karein), ya best — **stateless** (JWT, koi server-side session nahi). ASP.NET Core mein **Data Protection keys** bhi sab instances mein share honi chahiye (Redis/file share), warna ek instance ka auth cookie doosra decrypt nahi kar payega.

> REST ka "stateless" constraint isi problem ko hatata hai.

## appsettings.json mein value hai, par app kuch aur use kar rahi hai
Configuration **layers** mein aati hai aur baad wali source pehle wali ko **override** karti hai: `appsettings.json` → `appsettings.{Environment}.json` → User Secrets (sirf Development) → **environment variables** → command line.

To agar production server pe `ConnectionStrings__Default` environment variable set hai, ya `appsettings.Production.json` mein alag value hai, to wahi jeetegi. Check karo: `ASPNETCORE_ENVIRONMENT` kya hai (Development/Staging/Production), Docker/compose mein kaunse env vars hain, aur Kubernetes secrets/config maps. Debug ke liye startup pe `builder.Configuration.GetDebugView()` (sirf dev mein — secrets print ho jaate hain).

## 429 Too Many Requests kab aur kaise?
**429** rate limiting ka status code hai — client ne tay limit se zyada requests bheji. Response mein **`Retry-After`** header batata hai kitni der baad dobara try kare.

Kyun lagate hain: brute-force login attempts rokna, abuse/scraping, ek client poora server na kha jaaye, costly endpoints (report, export) bachana. .NET 7+ mein built-in rate limiter — fixed window, sliding window, token bucket, concurrency limiters; per-user ya per-IP partition kar sakte ho. Kai instances hon to limit per-instance hoti hai — global limit ke liye gateway/Redis pe.

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddFixedWindowLimiter("login", l => { l.PermitLimit = 5; l.Window = TimeSpan.FromMinutes(1); });
});
app.UseRateLimiter();
app.MapPost("/api/auth/login", Login).RequireRateLimiting("login");
```

## Async controller ke andar .Result lagaya — ASP.NET Core mein deadlock?
```csharp q
[HttpGet]
public IActionResult Get()
{
    var data = _service.GetDataAsync().Result;
    return Ok(data);
}
```
**ASP.NET Core mein classic deadlock nahi hota** — kyunki yahan SynchronizationContext nahi hai, continuation kisi bhi thread pe chal sakti hai. (Purane ASP.NET/WinForms/WPF mein yahi code deadlock karta tha.)

Par problem phir bhi hai: `.Result` request thread ko **block** karta hai jab tak DB/HTTP jawab na de. Load badhne pe saare thread pool threads isi tarah blocked → naye requests ke liye thread nahi → **thread pool starvation** → app bina CPU use kiye jam ho jaati hai, timeouts. Aur exception `AggregateException` mein lipat ke aata hai.

Fix: `public async Task<IActionResult> Get() => Ok(await _service.GetDataAsync());` — async all the way.

> ASP.NET Core mein deadlock nahi, par blocking = starvation.
