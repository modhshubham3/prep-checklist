## Garbage Collection
? Garbage Collector kaise kaam karta hai?
**Garbage Collector (GC)** CLR ka wo hissa hai jo **heap** ki memory automatically free karta hai. Tum `new` se object banate ho, par use delete nahi karte — jab koi object "unreachable" ho jaata hai (koi variable, field ya static use point nahi kar raha), GC baad mein uski memory wapas le leta hai.

GC kaise decide karta hai? Wo **roots** se shuru karta hai — local variables, static fields, CPU registers — aur unse jude har object ko "zinda" mark karta hai. Jo mark nahi hua wo garbage hai. Phir wo zinda objects ko ek saath sarka deta hai (**compaction**) taaki memory mein chhed na rahein aur naya allocation tez ho.

Performance ke liye heap teen **generations** mein baanta hai (Gen 0, 1, 2), kyunki zyada tar objects bahut jaldi mar jaate hain. 85 KB se bade objects **Large Object Heap (LOH)** pe jaate hain jo kam baar compact hota hai. GC **sirf memory** sambhalta hai — file handle, DB connection, socket jaise resources ke liye `IDisposable`/`using` chahiye. Stack ki memory GC nahi chhoota; method khatam hote hi wo khud free ho jaati hai.

- Roots se reachable = zinda, baaki = garbage
- Mark → sweep → compact
- Gen 0 sabse zyada collect hota hai, Gen 2 sabse kam
- `GC.Collect()` khud mat bulao — GC ko pata hai kab chalna hai

```csharp
void Process()
{
    var order = new Order();   // heap pe
    order.Save();
}   // method khatam — order ka koi reference nahi, ab GC ise kabhi bhi collect kar sakta hai
```

! "GC memory leak se poori tarah bachata hai" — nahi. Static list mein objects daalte raho, ya event subscribe karke unsubscribe mat karo — objects reachable rahenge aur kabhi free nahi honge.

> Gen 0 (naye, sabse zyada saaf hote hain) → Gen 1 → Gen 2 (lambe chalne wale).

## Gen 0
? GC ki Gen 0 kya hai aur kaunse objects isme hote hain?
**Gen 0** mein **naye bane objects** jaate hain. Ye chhoti si jagah hai aur sabse **zyada baar** collect hoti hai — aur sabse **tez** bhi, kyunki usme thode hi objects hote hain.

Isake peeche idea ("generational hypothesis"): zyada tar objects **bahut kam jeete hain**. Method ke andar ka temporary string, DTO, LINQ ka iterator — ye sab kuch milliseconds mein bekaar ho jaate hain. Isliye GC poore heap ki jagah baar-baar sirf Gen 0 check karta hai. Jo object Gen 0 collection ke baad bhi zinda bacha, wo **Gen 1** mein promote ho jaata hai.

Gen 0 collection itni sasti hai ki short-lived allocations se darne ki zaroorat nahi. Problem tab hoti hai jab objects "adhe" lambe jeete hain aur Gen 2 tak pahunch jaate hain.

```csharp
for (int i = 0; i < 1_000_000; i++)
{
    var temp = $"Item {i}";    // Gen 0 — agle hi pal garbage, sasta collect
}
```

## Gen 1
? Gen 1 kya hai aur iska role kya hai?
**Gen 1** ek **buffer** hai — Gen 0 aur Gen 2 ke beech. Jo objects ek Gen 0 collection se bach gaye, wo yahan aate hain.

Ye objects "medium-lived" hote hain — jaise ek HTTP request ke dauraan bane objects jo request khatam hote hi mar jaate hain. Gen 1 collection Gen 0 se kam baar hoti hai. Iska kaam hai un objects ko pakadna jo thoda zyada jeete hain par permanent nahi hain, taaki wo Gen 2 (jo sabse mehnga hai) tak na pahunchein.

Gen 1 collection bachne wale objects ko **Gen 2** mein promote karti hai.

## Gen 2
? Gen 2 kya hai? Large Object Heap kya hai?
**Gen 2** mein **lambe samay tak jeene wale** objects rehte hain — caches, Singleton services, static data, config, connection pools. Ye kai collections se bach chuke hote hain.

Gen 2 collection ko **full GC** kehte hain aur ye sabse **mehnga** hai, kyunki poora heap (aur LOH) check hota hai. Isme app kuch der ke liye ruk sakti hai (pause), jo latency spikes ke roop mein dikhta hai. Isliye performance tuning ka ek bada hissa hai **Gen 2 collections kam karna**.

"Mid-life crisis" problem: agar objects bas itna jeete hain ki Gen 2 tak pahunch jaayein aur phir turant mar jaayein (jaise bade temporary buffers), to bahut mehnge full GCs hote hain. `ArrayPool<T>`, object pooling aur `Span<T>` isse bachne ke tools hain.

| Generation | Kaun se objects | Kitni baar collect | Cost |
|---|---|---|---|
| Gen 0 | Naye, temporary | Sabse zyada | Sabse sasti |
| Gen 1 | Gen 0 se bache | Kam | Medium |
| Gen 2 | Lambe jeene wale | Sabse kam | Sabse mehngi (full GC) |
| LOH | 85 KB+ objects | Gen 2 ke saath | Mehngi, kam compact |

## IDisposable
? `IDisposable` kya hai aur kab implement karte ho?
`IDisposable` ek interface hai jiska ek hi method hai: `Dispose()`. Ye un classes ke liye hai jo **unmanaged resources** pakadti hain — database connection, file handle, network socket, `HttpResponseMessage`, stream. Aise resources GC nahi sambhalta, aur agar turant chhode nahi gaye to wo khatam ho sakte hain (jaise connection pool khali ho jaana).

`Dispose()` ka matlab hai "ye resource **abhi** chhod do", GC ke intezaar ke bina. Dispose ke baad object use nahi karna chahiye (`ObjectDisposedException`). Achhi class ka `Dispose()` baar-baar call karne pe bhi safe hota hai.

Async resources ke liye `IAsyncDisposable` aur `DisposeAsync()` hai (`await using`). ASP.NET Core mein DI container scoped/transient services ko request khatam hone pe khud dispose kar deta hai — jaise `DbContext`.

```csharp
public class ReportWriter : IDisposable
{
    private readonly StreamWriter _writer = new("report.csv");
    private bool _disposed;

    public void Write(string line) => _writer.WriteLine(line);

    public void Dispose()
    {
        if (_disposed) return;          // dobara call safe
        _writer.Dispose();              // file handle turant chhodo
        _disposed = true;
    }
}
```

> GC memory sambhalta hai. IDisposable baaki resources (file, connection, socket).

## using
? `using` statement kya karta hai? Iske bina kya problem ho sakti hai?
`using` statement ek `IDisposable` object ko scope ke end pe **automatically Dispose** kar deta hai — **chahe exception aaye ya na aaye**. Andar se compiler ise `try/finally` mein badal deta hai, jahan `finally` mein `Dispose()` hota hai.

C# 8 se **using declaration** bhi hai (`using var x = ...;`) — isme braces nahi chahiye, aur object variable ke scope (usually method) ke end pe dispose hota hai. Async resource ke liye `await using`.

Dhyan rakho: `using` **namespace import** wala keyword bhi hai (`using System.Linq;`) — naam same hai, kaam bilkul alag. `HttpClient` ko har request pe `using` mein banana galat hai (socket exhaustion); use `IHttpClientFactory` se lo.

```csharp
// Purana tareeka
using (var conn = new NpgsqlConnection(cs))
{
    conn.Open();
}   // yahan Dispose — exception aaye tab bhi

// C# 8+
using var conn2 = new NpgsqlConnection(cs);
await conn2.OpenAsync();
// method ke end pe Dispose

// Compiler asal mein ye banata hai:
var c = new NpgsqlConnection(cs);
try { c.Open(); } finally { c?.Dispose(); }
```

! `using` ke andar se object return mat karo — bahar pahunchte hi wo dispose ho chuka hoga.

## Kya GC unused object turant hata deta hai?
**Nahi.** Object ka reference khatam hote hi wo sirf **eligible** ho jaata hai; GC **kab** chalega ye runtime decide karta hai. GC tab chalta hai jab Gen 0 bhar jaaye, system memory kam ho, ya `GC.Collect()` bulaya jaaye. Tab tak object memory mein pada reh sakta hai.

Isliye GC **non-deterministic** hai — tum exactly nahi bata sakte ki memory kab free hogi. Yahi wajah hai ki file/connection jaise resources ke liye GC pe bharosa nahi karte, balki `Dispose()`/`using` se **deterministic** cleanup karte hain.

`obj = null;` likhne se bhi turant collect nahi hota — bas ek reference hat jaata hai. Release build mein JIT itna smart hai ki last use ke baad variable ko already dead maan leta hai, isliye `null` assign karna aksar bekaar hai. Aur `GC.Collect()` manually bulana lagbhag hamesha galat hai — ye generational optimization tod deta hai aur app ko roke rakhta hai.

> Reference gaya = "collect ho sakta hai", "collect ho gaya" nahi.

## async
? `async` keyword kya karta hai? Kya ye method ko naye thread pe chala deta hai?
`async` keyword method ko **asynchronous** banata hai, taaki uske andar `await` use ho sake. Aise method ka return type `Task`, `Task<T>`, `ValueTask<T>` ya (sirf event handlers ke liye) `void` hota hai.

Asal fayda: jab method kisi **I/O** (database, HTTP call, file) ka wait kar raha hota hai, tab wo thread ko **block nahi karta** — thread wapas thread pool mein chala jaata hai aur doosri requests serve karta hai. Result aane pe method wahin se aage chalta hai. Isse web server kam threads mein zyada requests sambhal leta hai (**scalability**).

Sabse bada misconception: **`async` naya thread nahi banata.** `async` method synchronously shuru hota hai aur pehle `await` tak usi thread pe chalta hai. `async void` se bacho (exceptions pakde nahi jaate, caller wait nahi kar sakta) — sirf UI event handlers mein. Convention: naam ke end mein `Async`.

```csharp
public async Task<Order?> GetOrderAsync(int id)
{
    // thread yahan free ho jaata hai jab tak DB jawab na de
    return await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
}
```

! "async naya thread banata hai" — sabse common galat jawab. Thread tabhi alag hoga jab tum `Task.Run` karo.

> async = "main wait karte waqt thread ko pakad ke nahi baithunga".

## await
? `await` kya karta hai aur await ke dauraan thread ke saath kya hota hai?
`await` ek `Task` ke complete hone ka **intezaar karta hai bina thread block kiye**. Jab `await` kisi aise task pe aata hai jo abhi complete nahi hua, to method wahin **ruk (suspend)** jaata hai aur control caller ko wapas chala jaata hai. Task complete hone pe baaki method (continuation) chalta hai — ho sakta hai kisi doosre thread pe.

`await` task ka **result bhi nikalta hai** (`Task<int>` se `int`) aur agar task fail hua to uska **exception throw** karta hai — isliye normal `try/catch` async code pe bhi kaam karta hai.

Independent operations ek-ek karke `await` karoge to wo line se chalenge (total time = sab ka jod). Saath chalana ho to pehle tasks start karo, phir `Task.WhenAll` pe await karo. `.Result` ya `.Wait()` se await mat karo — thread block hota hai aur deadlock ka risk hai.

```csharp
// Sequential — 2 + 3 = ~5 second
var user   = await GetUserAsync(id);
var orders = await GetOrdersAsync(id);

// Parallel — ~3 second (dono ek saath)
var userTask   = GetUserAsync(id);
var ordersTask = GetOrdersAsync(id);
await Task.WhenAll(userTask, ordersTask);
var (u, o) = (userTask.Result, ordersTask.Result);   // yahan Result safe hai — task complete hai
```

> await ke baad ka code "continuation" ban jaata hai — compiler state machine banata hai.

## Task
? `Task` kya hai aur `Thread` se kaise alag hai?
`Task` ek **async operation ko represent** karta hai — "ek kaam jo abhi chal raha hai ya baad mein complete hoga". `Task<T>` wo kaam hai jo end mein `T` type ka result dega. Task ke paas status hota hai (Running, RanToCompletion, Faulted, Canceled), exception store ho sakta hai, aur usse continuation jod sakte ho.

**Task ≠ Thread.** Thread ek OS-level worker hai jo mehnga hota hai (lagbhag 1 MB stack). Task ek halka object hai jo sirf "kaam" batata hai. Ek I/O task (DB call) ke dauraan **koi thread use nahi hota** — OS jawab aane pe notify karta hai. CPU-bound kaam ke liye `Task.Run` thread pool ka thread use karta hai.

Useful helpers: `Task.WhenAll` (sab complete ho), `Task.WhenAny` (koi ek complete ho — timeout ke liye), `Task.FromResult` (already-complete task), `Task.Delay` (non-blocking wait), `CancellationToken` (cancel karne ke liye).

```csharp
Task<int> t = Task.Run(() => HeavyCalculation());   // CPU kaam, pool thread pe
int result = await t;

var tasks = urls.Select(u => http.GetStringAsync(u));
string[] pages = await Task.WhenAll(tasks);          // saare ek saath

var done = await Task.WhenAny(work, Task.Delay(5000));
if (done != work) throw new TimeoutException();
```

> Task = kaam. Thread = worker. Ek thread kai tasks chala sakta hai; I/O task ke dauraan thread hota hi nahi.

## Async I/O
? Async I/O kya hai aur ye server ki scalability kaise badhata hai?
**Async I/O** matlab input/output operation (DB query, HTTP call, file read, network) ke **wait** ke dauraan thread ko block na karna. Jab tum `await db.Orders.ToListAsync()` karte ho, request OS/driver ko chali jaati hai aur thread wapas pool mein. Database 200 ms baad jawab deta hai, tab koi bhi free thread continuation chala deta hai.

Web API ke liye ye kyun zaroori hai? Maano server ke paas 100 threads hain aur har request 200 ms DB ka wait karti hai. **Sync** code mein har request ek thread 200 ms tak pakad ke baithi rehti hai — 100 requests ek saath aaye to 101va wait karega (**thread pool starvation**), aur app slow ho jaayegi jabki CPU khaali baitha hai. **Async** mein wait ke dauraan thread free hota hai, to wahi 100 threads hazaaron requests sambhal lete hain.

Async I/O **ek request ko tez nahi karta** — DB utna hi time lega. Ye **throughput/scalability** badhata hai.

```csharp
// Sync — thread 200 ms blocked
var orders = db.Orders.ToList();

// Async — thread wait ke dauraan free
var orders2 = await db.Orders.ToListAsync();
var body    = await httpClient.GetStringAsync(url);
var text    = await File.ReadAllTextAsync(path);
```

! "Async se API fast ho jaati hai" — ek request fast nahi hoti; server zyada requests ek saath sambhal pata hai.

## Parallelism
? Parallelism aur async mein kya farak hai? `Parallel.ForEach` kab use karoge?
**Parallelism** matlab **CPU-bound kaam** ko kai CPU cores pe **ek saath** chalana taaki total time kam ho — jaise 10,000 images resize karna, bada calculation, data crunching.

Ye async se alag cheez hai. **Async** = wait karte waqt thread chhodna (I/O ke liye). **Parallel** = kaam ko tod ke kai threads/cores pe chalana (CPU ke liye). Tools: `Parallel.ForEach`, `Parallel.For`, PLINQ (`.AsParallel()`), `Task.Run`, aur async I/O ke liye `Parallel.ForEachAsync` (.NET 6+).

Dhyan rakhne wali baatein: shared data ko kai threads ek saath badlenge to **race condition** — `lock`, `Interlocked` ya concurrent collections chahiye. Chhote kaam ko parallel karne se thread overhead ki wajah se ulta slow ho sakta hai. ASP.NET Core request ke andar `Parallel.ForEach` se saare threads kha jaoge aur doosri requests starve hongi — web app mein sochke use karo.

| Async | Parallel |
|---|---|
| I/O-bound (DB, HTTP, file) | CPU-bound (calculation) |
| Wait ke dauraan thread free | Kai threads ek saath kaam karte hain |
| `async`/`await` | `Parallel.ForEach`, PLINQ, `Task.Run` |
| Throughput badhata hai | Ek kaam ka time kam karta hai |

```csharp
Parallel.ForEach(images, new ParallelOptions { MaxDegreeOfParallelism = 4 }, img => Resize(img));

var total = numbers.AsParallel().Where(IsPrime).Count();

await Parallel.ForEachAsync(urls, async (url, ct) =>
{
    var html = await http.GetStringAsync(url, ct);   // async + limited parallelism
});
```

## async/await andar se kaise kaam karta hai?
Compiler har `async` method ko ek **state machine** mein badal deta hai. Method ke har `await` point pe ek "state" banti hai. Jab `await` kisi incomplete task pe aata hai, state machine apni jagah (local variables, current state) save karti hai, task pe ek **continuation** register karti hai, aur method se **return** ho jaati hai — thread free.

Task complete hone pe continuation chalti hai: state machine wapas wahi state load karti hai aur agle `await` tak code chalati hai. Isliye await ke pehle aur baad ka code alag threads pe chal sakta hai.

**SynchronizationContext**: UI apps (WPF/WinForms) aur purane ASP.NET mein continuation ko original thread/context pe wapas bheja jaata hai. Isi wajah se wahan `.Result` se deadlock hota tha. **ASP.NET Core mein SynchronizationContext nahi hai**, isliye wahan ye deadlock nahi hota — par thread blocking ab bhi scalability kha jaata hai. Library code mein `ConfigureAwait(false)` likhte hain taaki continuation ko original context pe laane ki zaroorat na pade.

Agar awaited task **already complete** ho, to method suspend hi nahi hota — seedha aage chalta hai (isliye cache hit wale cases mein `ValueTask` use hota hai).

```text
GetDataAsync() call
  ├─ sync code chalta hai (caller ke thread pe)
  ├─ await db.QueryAsync()  → task incomplete → state save, return Task to caller
  │        ... thread free, doosri requests serve karta hai ...
  ├─ DB jawab deta hai → continuation queue hoti hai
  └─ koi pool thread state load karke baaki code chalata hai
```

> async naya thread nahi, ek state machine hai jo "yahan se aage baad mein" yaad rakhti hai.

## Transient
? DI mein Transient lifetime kya hai aur kab use karoge?
**Transient** lifetime mein DI container **har baar** naya instance deta hai — jitni jagah inject hoga, utne naye objects. Ek hi request mein do classes ne maanga to dono ko alag object milega.

Kab use karein? Halki (lightweight), **stateless** services ke liye jinka apna koi shared data nahi — jaise validators, mappers, calculators, email formatters. Transient + `IDisposable` service ko container request/scope end pe dispose karta hai.

Dhyan rakho: agar transient service ko Singleton mein inject kiya, to wo bhi Singleton jitna jiyega (captive dependency) — bas ek hi instance banega.

```csharp
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();
builder.Services.AddTransient<IPriceCalculator, PriceCalculator>();

// Controller aur Service dono inject karein → do alag PriceCalculator objects
```

> Transient = har baar naya. Halke, stateless kaam ke liye.

## Scoped
? Scoped lifetime kya hai aur DbContext scoped kyun hota hai?
**Scoped** lifetime mein **har scope ke liye ek instance** banta hai. ASP.NET Core mein **har HTTP request ek scope** hai — to ek request ke andar jitni baar bhi service inject ho, **wahi ek object** milega; agli request mein naya.

**DbContext by default scoped** hota hai (`AddDbContext`), aur ye bilkul sahi hai: ek request ke andar saare repositories ek hi DbContext share karte hain, isliye change tracking consistent rehti hai aur ek `SaveChanges` mein sab save ho jaata hai. DbContext thread-safe nahi hai — request ke bahar share nahi karna chahiye.

Background service (`BackgroundService`, jo Singleton hai) mein scoped service seedha inject nahi kar sakte. Wahan `IServiceScopeFactory` se khud scope banao.

```csharp
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));   // scoped

// BackgroundService mein:
using var scope = _scopeFactory.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
```

> Scoped = ek request, ek instance. DbContext ka ghar.

## Singleton
? Singleton lifetime kya hai, aur Singleton mein Scoped service inject karo to kya hoga?
**Singleton** lifetime mein poori application mein **sirf ek instance** banta hai — pehli baar maangne pe (ya startup pe), aur wo app band hone tak zinda rehta hai. Har request, har class ko wahi object milta hai.

Kab use karein? Jo cheez **mehngi banti hai** aur share ho sakti hai, ya jisme **app-wide state** ho: in-memory cache (`IMemoryCache`), configuration, `HttpClient` factory, logger. Kyunki ek hi object kai requests ek saath use karengi, **Singleton thread-safe hona chahiye** — mutable fields pe `lock` ya concurrent collections.

**Captive dependency** (bada trap): Singleton ke andar Scoped service (jaise DbContext) inject mat karo. Singleton hamesha zinda rehta hai, to wo DbContext bhi hamesha zinda reh jaayega — saari requests ek hi DbContext share karengi, jo thread-safe nahi hai, aur change tracker memory bharta rahega. ASP.NET Core Development mode mein ye error de deta hai (scope validation).

| Lifetime | Instance kitne | Typical use |
|---|---|---|
| Transient | Har injection pe naya | Stateless helpers |
| Scoped | Har request ka ek | DbContext, repositories, unit of work |
| Singleton | Poori app ka ek | Cache, config, HttpClient factory |

```csharp
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();

// GALAT — captive dependency
public class ReportCache(AppDbContext db) { }          // Singleton ke andar scoped DbContext
builder.Services.AddSingleton<ReportCache>();
```

> Singleton mein Scoped inject mat karo — DbContext phans jaayega (captive dependency).

## Dependency Injection kya hai aur kyun?
**Dependency Injection (DI)** ka matlab: class apni dependencies (jin objects pe wo kaam ke liye depend karti hai) **khud `new` se nahi banati**, balki bahar se — usually constructor ke through — **di jaati hain**. Class sirf batati hai "mujhe `IOrderRepository` chahiye", kaun sa implementation milega ye DI container decide karta hai.

**Kyun?** (1) **Loose coupling** — `OrderService` ko pata hi nahi ki database Postgres hai ya SQL Server; implementation badlo, service nahi badlegi. (2) **Testability** — unit test mein fake/mock repository inject kar do, asli DB ki zaroorat nahi. (3) **Lifetime management** — objects kab bane aur kab dispose hon, container sambhalta hai. (4) Code saaf — har class ki dependencies constructor mein saaf dikhti hain.

ASP.NET Core mein DI built-in hai: `Program.cs` mein `builder.Services.AddXxx` se register karo, aur constructor mein maango. Ye **Dependency Inversion Principle** (SOLID ka D) ko practically lagu karne ka tareeka hai. Constructor mein 6–7 se zyada dependencies aa jaayein to wo sign hai ki class bahut kuch kar rahi hai.

```csharp
// Bina DI — tightly coupled, test karna mushkil
public class OrderService
{
    private readonly SqlOrderRepository _repo = new SqlOrderRepository();
}

// DI ke saath
public class OrderService(IOrderRepository repo, ILogger<OrderService> log)
{
    public async Task PlaceAsync(Order o)
    {
        await repo.SaveAsync(o);
        log.LogInformation("Order {Id} placed", o.Id);
    }
}

builder.Services.AddScoped<IOrderRepository, PgOrderRepository>();
builder.Services.AddScoped<OrderService>();
```

! "DI aur Dependency Inversion same cheez hai" — nahi. Inversion ek principle hai (abstraction pe depend karo), DI usse lagu karne ka ek technique hai.

> Class kehti hai "kya chahiye", container deta hai "kaun sa".

## S — Srp
? Single Responsibility Principle kya hai? Ek violation aur uska fix batao.
**Single Responsibility Principle**: ek class ka **sirf ek kaam** hona chahiye — ya Robert Martin ke shabdon mein, "class badalne ki sirf ek wajah honi chahiye".

Maano `OrderService` order save bhi karta hai, invoice PDF bhi banata hai, aur email bhi bhejta hai. Ab email template badla to `OrderService` badlo, PDF format badla to bhi `OrderService` — har badlaav se order saving ka code risk mein. SRP kehta hai inhe alag karo: `OrderService`, `InvoiceGenerator`, `EmailNotifier`. Har ek chhota, samajhne mein aasaan aur alag se testable.

Practical sign ki SRP toot raha hai: class ka naam mein "And" ya "Manager" jaisa vague shabd, 1000+ lines, ya constructor mein bahut saari unrelated dependencies.

```csharp
// Bura — teen wajah se badlega
public class OrderService
{
    public void Save(Order o) { }
    public byte[] CreateInvoicePdf(Order o) => [];
    public void SendEmail(Order o) { }
}

// Achha
public class OrderService(IOrderRepository repo, IInvoiceGenerator pdf, INotifier notify) { }
```

## O — Ocp
? Open/Closed Principle kya hai? Example do.
**Open/Closed Principle**: code **extension ke liye open**, par **modification ke liye closed** hona chahiye. Yani naya feature jodne ke liye purana, tested code chhedna na pade — naya code likh ke jod do.

Classic galti: `if (type == "UPI") ... else if (type == "Card") ... else if (type == "Wallet")`. Har naye payment type pe ye method badlega aur purane cases todne ka risk hai. OCP ka tareeka: interface `IPaymentMethod` banao, har type ek class. Naya "NetBanking" chahiye? Nayi class likho aur DI mein register karo — koi purana code nahi badla.

Ye polymorphism aur strategy pattern se hota hai. Har chhoti cheez ke liye abstraction mat banao; jahan badlaav sach mein aane ki umeed hai wahan lagao.

```csharp
public interface IPaymentMethod { string Type { get; } Task PayAsync(decimal amt); }
public class UpiPayment  : IPaymentMethod { public string Type => "UPI";  public Task PayAsync(decimal a) => Task.CompletedTask; }
public class CardPayment : IPaymentMethod { public string Type => "Card"; public Task PayAsync(decimal a) => Task.CompletedTask; }

public class Checkout(IEnumerable<IPaymentMethod> methods)
{
    public Task Pay(string type, decimal amt) => methods.Single(m => m.Type == type).PayAsync(amt);
}
// Naya method = nayi class. Checkout nahi badla.
```

## L — Lsp
? Liskov Substitution Principle kya hai? Rectangle–Square wala example samjhao.
**Liskov Substitution Principle**: child class ko parent ki jagah **bina kuch tode** use kar sakna chahiye. Agar code `Animal` ke saath sahi chalta hai, to use `Dog` do tab bhi sahi chalna chahiye — koi surprise exception ya ulta behaviour nahi.

Famous example: `Square : Rectangle`. Maths mein square ek rectangle hai, par code mein `Rectangle` ki width badalne se height nahi badalti, jabki `Square` mein dono saath badalti hain. Jo code `rect.Width = 5; rect.Height = 10;` karke area 50 expect karta hai, use square pe 100 milega — contract toot gaya.

Aur ek common violation: child ka parent ka method `throw new NotImplementedException()` kar dena (jaise `Penguin : Bird` mein `Fly()`). Iska matlab hierarchy galat hai — shayad `IFlyable` alag interface hona chahiye.

```csharp
public class Bird { public virtual void Fly() { } }
public class Penguin : Bird
{
    public override void Fly() => throw new NotSupportedException();   // LSP toot gaya
}

// Better: capability alag karo
public interface IFlyable { void Fly(); }
public class Sparrow : IFlyable { public void Fly() { } }
public class Penguin2 { }   // fly ka promise hi nahi kiya
```

## I — Isp
? Interface Segregation Principle kya hai?
**Interface Segregation Principle**: kisi class ko aise methods implement karne pe **majboor mat karo jo wo use nahi karti**. Ek bada "sab kuch" interface banane ki jagah chhote, focused interfaces banao.

Maano `IRepository` mein `Get`, `Add`, `Update`, `Delete`, `ExportToExcel`, `SendReport` sab hai. Ek read-only reporting class ko bhi `Delete` aur `SendReport` likhna padega — wo `NotImplementedException` throw karegi (jo LSP bhi todta hai). ISP kehta hai: `IReadRepository`, `IWriteRepository` alag karo; jise jo chahiye wo implement kare.

Fayda: classes ko sirf zaroori cheezon pe depend karna padta hai, mocks chhote bante hain, aur ek interface badalne se unrelated classes nahi toot-ti.

```csharp
// Bura
public interface IWorker { void Work(); void Eat(); }
public class Robot : IWorker { public void Work() { } public void Eat() => throw new NotSupportedException(); }

// Achha
public interface IWorkable { void Work(); }
public interface IEatable  { void Eat(); }
public class Human : IWorkable, IEatable { public void Work() { } public void Eat() { } }
public class Robot2 : IWorkable { public void Work() { } }
```

## D — Dip
? Dependency Inversion Principle kya hai aur DI se kaise juda hai?
**Dependency Inversion Principle**: high-level modules (business logic) ko low-level modules (database, email, file system) pe **seedha depend nahi karna chahiye** — dono ko **abstractions (interfaces)** pe depend karna chahiye. Aur abstraction details pe depend na kare, details abstraction pe.

Bina DIP: `OrderService` (business) → `PgOrderRepository` (detail). Postgres badla to business code badla. DIP ke saath: `OrderService` → `IOrderRepository` ← `PgOrderRepository`. Dependency ka "teer" ulta ho gaya — ab detail interface ke hisaab se chalta hai. Clean Architecture isi pe khadi hai: Domain/Application layer interfaces define karti hai, Infrastructure unhe implement karta hai.

Dependency Injection is principle ko practically lagu karne ka tareeka hai.

```csharp
// Application layer — interface yahan define
public interface IOrderRepository { Task SaveAsync(Order o); }
public class OrderService(IOrderRepository repo) { }

// Infrastructure layer — implementation
public class PgOrderRepository : IOrderRepository { public Task SaveAsync(Order o) => Task.CompletedTask; }
```

| Letter | Principle | Ek line |
|---|---|---|
| S | Single Responsibility | Ek class, ek kaam |
| O | Open/Closed | Naya feature = naya code, purana nahi chhedo |
| L | Liskov Substitution | Child parent ki jagah bina tode chale |
| I | Interface Segregation | Chhote, focused interfaces |
| D | Dependency Inversion | Interface pe depend karo, concrete class pe nahi |

## Dispose
? `Dispose()` kya karta hai aur kaun call karta hai?
`Dispose()` resources ko **turant aur deterministic** tareeke se chhodne ka method hai — developer (ya `using`) khud call karta hai, isliye pata hota hai **kab** chalega. File handle band, DB connection wapas pool mein, socket close.

Full **Dispose pattern** (jab class ke paas seedha unmanaged resource ho): `Dispose()` public method, ek `protected virtual Dispose(bool disposing)`, finalizer backup ke liye, aur `GC.SuppressFinalize(this)` taaki dispose ho chuke object ka finalizer na chale. Aaj kal zyada tar classes sirf managed disposable objects (jaise `DbConnection`) wrap karti hain — unke liye simple `Dispose()` jo andar ke objects dispose kare, kaafi hai. Seedhe unmanaged handles ke liye `SafeHandle` use karo, finalizer khud likhne ki zaroorat nahi padti.

```csharp
public class FileLogger : IDisposable
{
    private readonly FileStream _fs = new("log.txt", FileMode.Append);
    private bool _disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);        // finalizer ki zaroorat nahi rahi
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing) _fs.Dispose();     // managed resources
        _disposed = true;
    }
}
```

> Dispose deterministic hai (kab chalega pata hai), Finalize nahi.

## Finalize
? Finalizer kya hai aur isko use karne se kyun bachte hain?
**Finalizer** (C# syntax `~ClassName()`) ek method hai jo **GC** object ko collect karne se pehle call karta hai. Ye **safety net** hai — agar developer `Dispose()` bhool gaya, to finalizer unmanaged resource chhod de.

Problems: (1) **Kab chalega pata nahi** — GC ki marzi, ho sakta hai minutes baad. (2) **Performance cost** — finalizer wale objects ek extra GC cycle tak zinda rehte hain (pehle finalization queue mein, phir agle GC mein collect), aur ek alag finalizer thread pe chalte hain. (3) Finalizer mein doosre managed objects use karna unsafe hai, kyunki wo pehle hi collect ho chuke ho sakte hain. (4) Finalizer mein exception app crash kar sakta hai.

Isliye: finalizer sirf tab likho jab class ke paas **seedha unmanaged handle** ho — aur modern .NET mein uske liye bhi `SafeHandle` better hai. `Dispose` + `GC.SuppressFinalize` ka combination use karo.

| Dispose | Finalize |
|---|---|
| Developer / `using` call karta hai | GC call karta hai |
| Deterministic — turant | Non-deterministic — kabhi bhi |
| Koi extra GC cost nahi | Object ek extra GC cycle zinda |
| Managed + unmanaged cleanup | Sirf unmanaged cleanup |

```csharp
public class NativeBuffer : IDisposable
{
    private IntPtr _ptr = Marshal.AllocHGlobal(1024);

    ~NativeBuffer() => Free();                     // backup agar Dispose bhool gaye
    public void Dispose() { Free(); GC.SuppressFinalize(this); }
    private void Free() { if (_ptr != IntPtr.Zero) { Marshal.FreeHGlobal(_ptr); _ptr = IntPtr.Zero; } }
}
```

> Finalizer object ko ek extra GC cycle tak zinda rakhta hai — performance cost.

## Deadlock
? Deadlock kya hai? C# code mein deadlock kaise ho sakta hai aur kaise bachoge?
**Deadlock** tab hota hai jab do (ya zyada) cheezein ek doosre ka intezaar karti hain aur koi aage nahi badh pata — app atak jaati hai, na error, na result.

**Async wala classic deadlock** (UI apps aur purana ASP.NET): tum async method pe `.Result` ya `.Wait()` karte ho. Wo thread block ho jaata hai. Async method ka `await` complete hone pe continuation ko **usi original thread/context** pe chalana chahta hai — jo `.Result` pe block hai. Thread continuation ka wait kar raha hai, continuation thread ka. Deadlock. ASP.NET Core mein SynchronizationContext nahi hai, isliye ye specific deadlock nahi hota — par blocking se **thread pool starvation** hota hai jo high load pe app ko jam kar deta hai.

**Lock wala deadlock**: Thread A ne `lockA` liya aur `lockB` maang raha hai; Thread B ne `lockB` liya aur `lockA` maang raha hai. Database mein bhi same — do transactions ek doosre ki locked rows ka wait karein; Postgres ek ko kill karke `deadlock detected` error deta hai.

Bachav: **async all the way** (`.Result`/`.Wait()` nahi), locks hamesha **same order** mein lo, lock ke andar `await` mat karo (`SemaphoreSlim` use karo), aur DB transactions chhote rakho aur rows ek hi order mein update karo.

```csharp
// GALAT — deadlock / starvation
var data = GetDataAsync().Result;

// SAHI
var data2 = await GetDataAsync();

// Lock ke andar async chahiye? SemaphoreSlim
private readonly SemaphoreSlim _gate = new(1, 1);
await _gate.WaitAsync();
try { await DoWorkAsync(); } finally { _gate.Release(); }
```

> Async all the way — beech mein sync mat karo.
