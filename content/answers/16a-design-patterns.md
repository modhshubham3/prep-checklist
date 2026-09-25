# Design patterns (C#)

## Design patterns kya hain aur kitne types ke hote hain?
**Design pattern** = baar-baar aane wali design problem ka **tested, naam wala solution**. Code nahi, ek tareeka — "is situation mein classes ko aise arrange karo". Fayda: team mein ek common bhasha ("yahan Strategy laga do"), aur jaani-pehchaani galtiyon se bachav.

Gang of Four (GoF) ke 23 patterns teen groups mein:

| Type | Kya solve karta hai | Common examples |
| --- | --- | --- |
| **Creational** | Object **kaise banein** | Singleton, Factory Method, Abstract Factory, Builder |
| **Structural** | Classes/objects **kaise jude** | Adapter, Decorator, Facade, Proxy, Composite |
| **Behavioral** | Objects **kaise baat karein**, kaam kaise baantein | Strategy, Observer, Command, Template Method, Chain of Responsibility, Mediator |

Enterprise .NET mein aur bhi aam: **Repository**, **Unit of Work**, **Dependency Injection**, **CQRS/Mediator**, **Options pattern**.

Interview mein 3–4 patterns achhe se aane chahiye — **definition + kab use kiya + code**. "Maine Strategy pattern payment types ke liye use kiya" jaisa real example sabse zyada score karta hai.

> Pattern ratne se zyada zaroori: batao kaunsi problem thi jo pattern ne solve ki.

## Singleton pattern — thread-safe kaise banaoge?
**Singleton** — poori app mein class ka **sirf ek object**, aur usko access karne ka ek global point. Use: configuration, logger, cache, connection pool jaisi shared cheezein.

Banane ke steps: **private constructor** (bahar se `new` na ho), **static instance**, aur ek static property jo wahi instance lautaye.

**Thread safety** asli sawaal hai — do threads ek saath pehli baar access karein to do objects ban sakte hain. Tareeke:
- **`Lazy<T>`** — sabse saaf, thread-safe by default. **Yahi bolo.**
- **Static readonly field** — CLR static initialization thread-safe hai (par lazy nahi, type touch hote hi ban jaata hai).
- **Double-checked locking** — `lock` ke saath, purana tareeka; `volatile` bhoolne pe bug.

**Modern .NET mein**: khud Singleton pattern likhne ki jagah **DI container mein `AddSingleton<T>()`** — testable (interface se mock ho sakta hai), aur lifetime container sambhalta hai. Classic Singleton ka nuksaan: global state, hidden dependency, unit test mein mock karna mushkil.

```csharp
public sealed class AppConfig
{
    private static readonly Lazy<AppConfig> _instance = new(() => new AppConfig());
    public static AppConfig Instance => _instance.Value;     // thread-safe, pehli baar pe bane

    private AppConfig() { /* load settings */ }
}

// Modern tareeka — DI
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
```

! Singleton mein **scoped service (DbContext) inject** karna — wo DbContext poori app ki life tak zinda rehta hai aur threads ke beech share hota hai → bugs. ASP.NET Core dev mein isko error se pakadta hai.

## Factory pattern — kya hai aur kab use karoge?
**Factory** — object **banane ka logic ek jagah** chhupa do; calling code ko sirf batana hai "kya chahiye", "kaunsi class `new` karni hai" ye factory decide karti hai.

Kab: jab runtime pe kisi input ke hisaab se **alag class ka object** chahiye — payment type ("upi"/"card"/"netbanking"), notification channel (email/SMS/push), file parser (CSV/Excel/JSON), GPS device protocol ke hisaab se parser.

Fayda: `if/else` / `switch` jo `new` karta hai wo **har jagah bikhra nahi** rehta; naya type jodna = sirf factory mein ek entry (Open/Closed ke kareeb).

Variants: **Simple Factory** (ek method jo switch se object de — sabse common), **Factory Method** (subclass decide kare kaunsa object), **Abstract Factory** (related objects ki poori family — jaise Dark theme ke saare controls).

.NET mein DI ke saath: saare implementations register karo aur `IEnumerable<IPaymentProcessor>` inject karke key se chuno — ya .NET 8 ka **keyed services**.

```csharp
public interface INotifier { Task SendAsync(string to, string msg); }
public class EmailNotifier : INotifier { /* ... */ }
public class SmsNotifier : INotifier { /* ... */ }

public class NotifierFactory(IServiceProvider sp)
{
    public INotifier Create(string channel) => channel switch
    {
        "email" => sp.GetRequiredService<EmailNotifier>(),
        "sms"   => sp.GetRequiredService<SmsNotifier>(),
        _ => throw new ArgumentException($"Unknown channel {channel}")
    };
}

// .NET 8 keyed services
builder.Services.AddKeyedScoped<INotifier, SmsNotifier>("sms");
public class AlertService([FromKeyedServices("sms")] INotifier sms) { }
```

## Strategy pattern — if/else ki jagah kaise use karte ho?
**Strategy** — ek kaam ke **kai algorithms/tareeke**, har ek alag class mein, ek common interface ke peeche. Runtime pe jo chahiye wo strategy lagao. Calling code ko pata nahi andar kaunsa algorithm hai.

Pehchaan: lambi `if/else` ya `switch` jo **behaviour** badalti hai — discount calculation (Gold/Silver/Festival), shipping cost (Standard/Express), fare calculation, sorting method, export format.

Fayde: naya rule = nayi class (purana code nahi chhedna — **Open/Closed**), har strategy alag se **unit test**, code saaf.

**Factory vs Strategy**: Factory **object banati** hai (creational); Strategy **behaviour badalti** hai (behavioral). Aksar saath aate hain — factory batati hai kaunsi strategy lagani hai.

```csharp
public interface IDiscountStrategy { decimal Apply(decimal amount); }
public class NoDiscount : IDiscountStrategy { public decimal Apply(decimal a) => a; }
public class GoldDiscount : IDiscountStrategy { public decimal Apply(decimal a) => a * 0.90m; }
public class FestivalDiscount : IDiscountStrategy { public decimal Apply(decimal a) => a - Math.Min(500, a * 0.2m); }

public class Checkout(IDiscountStrategy discount)
{
    public decimal Total(decimal amount) => discount.Apply(amount);
}

var price = new Checkout(new GoldDiscount()).Total(2000);   // 1800
```

> "Pehle yahan 6 case ka switch tha, har naye offer pe file badalti thi — Strategy se har offer alag class ban gaya." Aisa example do.

## Observer pattern — C# events se kaise juda hai?
**Observer** — ek object (**subject/publisher**) ki state badle to uske saare **subscribers (observers)** ko **apne aap khabar** mile, bina subject ko unki classes jaane. One-to-many notification.

Real examples: order place hua → email, inventory, analytics ko batao; stock price badla → sab screens update; GPS location aayi → map, geofence checker, alert service.

C# mein ye **built-in** hai:
- **`event` + delegate** — sabse seedha Observer. `OrderPlaced += handler`.
- **`IObservable<T>` / `IObserver<T>`** — .NET ka formal interface; **RxJS / Rx.NET** isi pe bane hain (Angular ke Observables bhi Observer pattern hi hain).
- Bade scale pe (alag services) — **message broker / pub-sub** (Kafka, Redis Pub/Sub) = distributed Observer.

Dhyan: subscriber **unsubscribe (`-=`) na kare** to publisher uska reference pakde rakhta hai → **memory leak**. Isliye Angular mein `ngOnDestroy` pe unsubscribe.

```csharp
public class OrderService
{
    public event EventHandler<Order>? OrderPlaced;        // subject

    public void Place(Order o)
    {
        // ... save ...
        OrderPlaced?.Invoke(this, o);                      // sab subscribers ko khabar
    }
}

var svc = new OrderService();
svc.OrderPlaced += (s, o) => Console.WriteLine($"Email to {o.Email}");
svc.OrderPlaced += (s, o) => Console.WriteLine($"Reduce stock {o.ProductId}");
```

## Decorator pattern — bina class badle feature kaise jodoge?
**Decorator** — ek object ko **wrap** karke usme naya behaviour jodo, **same interface** rakhte hue — original class ko chhue bina, aur inheritance ke bina. Kai decorators ek ke upar ek laga sakte ho.

Real use: existing repository/service pe **caching, logging, retry, timing** jodna. `CachedProductRepository` andar asli `ProductRepository` ko wrap karta hai — pehle cache dekho, nahi mila to andar wale ko bulao.

.NET mein khud dekho: `Stream` ke upar `BufferedStream`, `GZipStream` — sab decorators hain. ASP.NET Core **middleware** aur `HttpClient` ke **DelegatingHandler** bhi isi soch ke hain.

**Inheritance se better kyun**: har combination (logging + caching, sirf caching…) ke liye subclass banani padti. Decorator mein runtime pe jaise chaho jodo. DI mein **Scrutor** library ka `Decorate<>()` isko aasaan banata hai.

```csharp
public interface IProductRepo { Task<Product?> GetAsync(int id); }

public class CachedProductRepo(IProductRepo inner, IMemoryCache cache) : IProductRepo
{
    public Task<Product?> GetAsync(int id) =>
        cache.GetOrCreateAsync($"product:{id}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return inner.GetAsync(id);                     // asli repo sirf cache miss pe
        });
}

// Registration (Scrutor)
builder.Services.AddScoped<IProductRepo, ProductRepo>();
builder.Services.Decorate<IProductRepo, CachedProductRepo>();
```

## Adapter aur Facade pattern
Dono "wrapper" hain par maqsad alag:

**Adapter** — do **incompatible interfaces ko jodta** hai. Tumhara code `ISmsSender.Send(to, msg)` expect karta hai, par third-party SMS library ka method `Dispatch(SmsPayload)` hai — beech mein adapter class jo translate kare. Mobile charger ka adapter jaisa. Use: third-party SDK, legacy system, alag GPS device protocols ko ek common format mein laana.

**Facade** — ek **complex subsystem ke aage ek simple interface**. `OrderFacade.PlaceOrder()` andar inventory check, payment, invoice, email — sab bulata hai; caller ko ek hi method dikhta hai. Use: complicated libraries/modules ko aasan banana, controller patla rakhna.

| | Adapter | Facade |
| --- | --- | --- |
| Maqsad | Interface **match** karana | Complexity **chhupana** |
| Kitni classes wrap | Aam taur pe ek | Kai (poora subsystem) |
| Interface | Jo client expect karta hai | Naya, simple |

```csharp
// Adapter — third-party ko apne interface mein
public class VendorSmsAdapter(VendorSmsClient vendor) : ISmsSender
{
    public Task SendAsync(string to, string msg) =>
        vendor.DispatchAsync(new SmsPayload { Msisdn = to, Body = msg, Route = "TXN" });
}
```

## Builder pattern — kab use karte ho?
**Builder** — complex object ko **step by step** banana, jab constructor mein bahut saare (aur optional) parameters ho jaayein. "Telescoping constructor" (10 parameters, aadhe null) se bachata hai aur code padhne layak banata hai.

.NET mein roz dekhte ho: **`WebApplication.CreateBuilder()`**, **`StringBuilder`**, `UriBuilder`, EF Core ka **`ModelBuilder`** (`entity.HasKey().HasIndex()`), `HostBuilder`, test data builders. **Fluent interface** — har method `this` lautata hai taaki chain ho sake.

Kab: report/query/email object jisme bahut optional parts hon; test mein readable test data (`new OrderBuilder().WithItems(3).Paid().Build()`).

C# mein chhote cases ke liye **object initializer** (`new X { A = 1, B = 2 }`) ya **records with `with`** kaafi hote hain — builder tab jab validation ya step-order matter kare.

```csharp
public class EmailBuilder
{
    private readonly MailMessage _m = new();
    public EmailBuilder To(string addr) { _m.To.Add(addr); return this; }
    public EmailBuilder Subject(string s) { _m.Subject = s; return this; }
    public EmailBuilder Body(string html) { _m.Body = html; _m.IsBodyHtml = true; return this; }
    public MailMessage Build()
    {
        if (_m.To.Count == 0) throw new InvalidOperationException("Recipient chahiye");
        return _m;
    }
}

var mail = new EmailBuilder().To("a@x.com").Subject("Invoice").Body("<b>Paid</b>").Build();
```

## Repository aur Unit of Work pattern — EF Core ke saath zaroori hai?
**Repository** — data access ko ek interface ke peeche rakho (`IOrderRepository.GetByIdAsync`, `Add`), taaki business logic ko pata na ho data SQL se aaya, API se ya memory se. **Unit of Work** — kai repositories ke changes ko **ek transaction** mein ek saath save karna (`uow.SaveChangesAsync()`).

**Seedhi baat jo interviewer sunna chahta hai**: EF Core ka **`DbSet` already repository** jaisa hai aur **`DbContext` already Unit of Work** hai (SaveChanges saare changes ek transaction mein). Isliye har entity ke liye generic repository (`IRepository<T>` with Add/Update/Delete/GetAll) banana aksar **bekaar layer** hai — aur `IQueryable` lautane wala repository abstraction ko waise bhi leak karta hai.

Repository **kab faydemand**:
- Domain-specific queries ek jagah (`GetOverdueInvoicesAsync`) — controller/service mein LINQ na bikhre.
- Kai data sources (DB + external API).
- Clean Architecture / DDD mein domain ko EF se alag rakhna.
- Dapper/raw SQL wale projects — wahan repository sach mein kaam ki hai.

Testing: EF ke saath repository mock karne ki jagah aksar **SQLite in-memory / Testcontainers** se integration test better hota hai.

> Balanced jawab: "Specific repositories rakhte hain complex queries ke liye, par generic repository over DbContext nahi banate — DbContext khud Unit of Work hai."

## Mediator pattern aur MediatR
**Mediator** — objects ek doosre ko **seedha call nahi** karte; sab ek beech wale (mediator) ke through baat karte hain. Isse objects ke beech ki uljhi hui dependencies (sab sab ko jaanein) khatam — sirf mediator ko jaanna hai. Real life: airport control tower — planes aapas mein nahi, tower se baat karte hain.

.NET mein **MediatR** library popular hai, khaas kar **CQRS** ke saath:
- Controller sirf `await mediator.Send(new CreateOrderCommand(...))` karta hai.
- Ek **handler** class (`CreateOrderHandler`) asli kaam karti hai. Har use-case = ek request + ek handler — chhoti, focused classes.
- **Pipeline behaviors** — har request ke aas-paas common kaam (validation with FluentValidation, logging, transaction) ek jagah — middleware jaisa, par application level pe.
- **Notifications** — ek event, kai handlers (in-process Observer).

Nuksaan jo bolna achha hai: extra indirection (code "kahan chalta hai" dhoondhna mushkil), chhote projects mein overkill. (MediatR ka naya version commercial license pe gaya hai — isliye kuch teams khud ka chhota dispatcher ya seedhe services use karti hain.)

```csharp
public record CreateOrderCommand(int CustomerId, List<int> ProductIds) : IRequest<int>;

public class CreateOrderHandler(AppDbContext db) : IRequestHandler<CreateOrderCommand, int>
{
    public async Task<int> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order { CustomerId = cmd.CustomerId };
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order.Id;
    }
}

// Controller
[HttpPost] public async Task<int> Create(CreateOrderCommand cmd) => await _mediator.Send(cmd);
```

## Chain of Responsibility aur Template Method
**Chain of Responsibility** — request ko handlers ki **chain** se guzaaro; har handler ya to request handle kare, ya kuch kaam karke **aage bhej de**. Sender ko pata nahi kaun handle karega.
- **ASP.NET Core middleware pipeline isi ka example hai** — har middleware `next()` bulata hai ya short-circuit karta hai. `HttpClient` ke `DelegatingHandler` bhi.
- Use: approval flow (amount < 10k → manager, < 1L → director, warna CFO), validation steps, GPS packet processing steps.

**Template Method** — base class ek algorithm ka **dhaancha (steps ka order)** fix karti hai, aur kuch steps subclasses **override** karti hain. `ReportGenerator.Generate()` → `FetchData()` (abstract) → `Format()` (abstract) → `Save()` (common). Har report type sirf apne steps likhta hai; order sabka same.
- .NET mein: `BackgroundService` (tum sirf `ExecuteAsync` override karte ho, baaki lifecycle base class sambhalti hai), ASP.NET ka `ControllerBase`.

**Template Method vs Strategy**: Template Method **inheritance** se behaviour badalta hai (compile time); Strategy **composition** se (runtime pe badal sakte ho). Aaj kal composition (Strategy) zyada pasand kiya jaata hai.

```csharp
public abstract class ReportGenerator
{
    public async Task<byte[]> GenerateAsync()          // template — order fixed
    {
        var data = await FetchDataAsync();
        var file = Format(data);
        await AuditAsync();
        return file;
    }
    protected abstract Task<IReadOnlyList<Row>> FetchDataAsync();
    protected abstract byte[] Format(IReadOnlyList<Row> rows);
    private Task AuditAsync() => Task.CompletedTask;    // common step
}
```
