# C# — delegates, generics aur naye features

## Delegate kya hai? Func, Action aur Predicate
**Delegate** = **method ka type-safe reference** (function pointer jaisa, par safe). Delegate variable mein koi bhi method daal sakte ho jiska signature (parameters + return type) match kare, aur baad mein use call kar sakte ho. Isse method ko **parameter ki tarah pass** kar paate ho — callbacks, events, LINQ sab isi pe chalte hain.

Khud delegate type banane ki zaroorat kam padti hai — .NET ke **built-in generic delegates**:
- **`Func<T..., TResult>`** — **value lautata** hai. Aakhri type parameter return type: `Func<int, int, int>` = do int lo, int lautao.
- **`Action<T...>`** — **kuch nahi lautata** (void). `Action<string>` = string lo, kuch mat lautao.
- **`Predicate<T>`** — `bool` lautata hai (= `Func<T, bool>`). `List.FindAll` mein.

**Lambda** (`x => x * 2`) delegate ka chhota likhne ka tareeka hai. LINQ `Where(x => x.Age > 18)` asal mein `Func<T, bool>` le raha hai.

**Multicast**: ek delegate mein `+=` se kai methods — call karo to sab order mein chalte hain (events isi pe). Return value sirf aakhri method ki milti hai.

```csharp
Func<int, int, int> add = (a, b) => a + b;
Action<string> log = msg => Console.WriteLine($"[LOG] {msg}");
Predicate<int> isEven = n => n % 2 == 0;

Console.WriteLine(add(2, 3));     // 5
log("hello");
Console.WriteLine(isEven(4));     // True

// Method ko parameter ki tarah
static List<int> Filter(List<int> xs, Func<int, bool> rule) => xs.Where(rule).ToList();
var big = Filter([1, 5, 12, 20], x => x > 10);   // [12, 20]
```

## Delegate aur event mein farak kya hai?
**Event** = delegate ke upar ek **protective wrapper** (`event` keyword). Observer pattern ke liye.

Farak:
- Delegate field **public** ho to bahar wala koi bhi use **invoke** kar sakta hai, ya `=` se **saare subscribers mita** sakta hai. Khatarnak.
- **Event** ke saath bahar se sirf **`+=` (subscribe) aur `-=` (unsubscribe)** allowed. **Invoke sirf wahi class** kar sakti hai jisne event declare kiya. `=` se overwrite nahi.

Convention: `EventHandler` / `EventHandler<TEventArgs>` — signature `(object? sender, TEventArgs e)`. Invoke karte waqt **`?.Invoke`** — koi subscriber na ho to delegate null hota hai.

**Memory leak**: publisher lamba jeeta hai (singleton) aur subscriber (form/component) `-=` nahi karta → publisher uska reference pakde rehta hai, GC saaf nahi kar paati.

```csharp
public class Sensor
{
    public event EventHandler<double>? TemperatureChanged;

    public void Read(double t)
    {
        if (t > 50) TemperatureChanged?.Invoke(this, t);   // sirf Sensor invoke kar sakta hai
    }
}

var s = new Sensor();
void Alert(object? _, double t) => Console.WriteLine($"Garam! {t}");
s.TemperatureChanged += Alert;
// s.TemperatureChanged(this, 60);   // compile error — bahar se invoke nahi
// s.TemperatureChanged = null;      // compile error
s.TemperatureChanged -= Alert;        // cleanup
```

## Generics kya hain aur constraints kyun lagate hain?
**Generics** = type ko **parameter** bana do — ek hi class/method kai types ke saath, **type safety ke saath** aur bina boxing ke. `List<int>`, `Dictionary<string, Order>`, `Task<T>` sab generics hain.

Generics se pehle `ArrayList` (object store karta tha): har int **box** hota tha (slow) aur galat type daal do to **runtime pe** crash. Generics mein galat type = **compile error**, aur value types box nahi hote.

**Constraints (`where`)** — batate hain T kaisa hona chahiye, taaki generic code ke andar T ke members use kar sako:
- `where T : class` — reference type · `where T : struct` — value type
- `where T : new()` — parameterless constructor hona chahiye (`new T()` kar sako)
- `where T : BaseEntity` — is class se derived (to `T.Id` use kar sako)
- `where T : IComparable<T>` — interface implement kare
- `where T : notnull` — null nahi

Generic repository/service, `Result<T>` wrapper, paging response `PagedResult<T>` — real use.

```csharp
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Total { get; init; }
}

public static T Max<T>(T a, T b) where T : IComparable<T> =>
    a.CompareTo(b) >= 0 ? a : b;

public class Repository<T> where T : BaseEntity        // T.Id use kar sakte hain
{
    public T? Find(IEnumerable<T> items, int id) => items.FirstOrDefault(x => x.Id == id);
}

Console.WriteLine(Max(3, 9));          // 9
Console.WriteLine(Max("apple", "kiwi")); // kiwi
```

## Covariance aur contravariance (out / in) kya hai?
Generic interfaces/delegates mein **inheritance ko kaise follow karein**:

- **Covariance (`out T`)** — "chhote type ki list ko bade type ki jagah use karo". `IEnumerable<string>` ko `IEnumerable<object>` variable mein daal sakte ho, kyunki `IEnumerable<out T>` sirf T **lautata** hai (read-only). String bhi object hai, to padhne wala safe hai.
- **Contravariance (`in T`)** — ulta: `Action<object>` ko `Action<string>` ki jagah use kar sakte ho, kyunki `Action<in T>` T sirf **leta** hai. Jo method har object handle kar sakta hai, wo string bhi handle kar lega.

**`List<T>` invariant hai** — `List<string>` ko `List<object>` mein nahi daal sakte, kyunki List mein **add** bhi hota hai: warna tum object list mein `int` daal dete jo asal mein string list thi.

Yaad rakhne ka tareeka: **out = output (return) = covariant**, **in = input (parameter) = contravariant**.

```csharp
IEnumerable<string> names = ["a", "b"];
IEnumerable<object> objs = names;          // OK — covariance (out T)

Action<object> printAny = o => Console.WriteLine(o);
Action<string> printStr = printAny;        // OK — contravariance (in T)

List<string> ls = new();
// List<object> lo = ls;                   // compile error — List<T> invariant
```

## Extension methods kya hain?
**Extension method** — kisi existing type mein (jiska code tumhare paas nahi, jaise `string`, `DateTime`, third-party class) **naya method jodna**, bina us class ko badle ya inherit kiye. Call aise lagta hai jaise class ka apna method ho.

Rules: **static class** ke andar **static method**, aur pehle parameter pe **`this`** keyword (jis type ko extend karna hai).

Sabse bada example: **LINQ** — `Where`, `Select`, `OrderBy` sab `IEnumerable<T>` pe extension methods hain (`System.Linq` namespace import karte hi dikhne lagte hain). ASP.NET Core ka `builder.Services.AddXyz()` bhi extension methods hain — apni service registration ko saaf rakhne ka standard tareeka.

Dhyan: extension method **private members access nahi** kar sakta; agar class mein same naam ka method hai to class wala jeet-ta hai; bahut zyada extensions se code confusing hota hai.

```csharp
public static class StringExtensions
{
    public static bool IsValidEmail(this string s) =>
        !string.IsNullOrWhiteSpace(s) && s.Contains('@') && s.IndexOf('@') < s.LastIndexOf('.');

    public static string Truncate(this string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}

"a@b.com".IsValidEmail();            // true
"Hello world".Truncate(5);           // "Hello…"

// Service registration saaf rakhna
public static class ServiceSetup
{
    public static IServiceCollection AddOrderModule(this IServiceCollection s) =>
        s.AddScoped<IOrderService, OrderService>().AddScoped<IOrderRepo, OrderRepo>();
}
```

## yield return kya karta hai?
**`yield return`** se method ek-ek karke values **lazily** deta hai — poori list memory mein banaye bina. Method `IEnumerable<T>` lautata hai, aur har baar jab caller agla item maangta hai (foreach ka agla step), method wahin se aage chalta hai jahan ruka tha. Compiler andar ek **state machine** banata hai.

Fayde:
- **Memory kam** — 10 lakh rows ki file line-by-line padho, sab ek saath RAM mein nahi.
- **Deferred execution** — jab tak koi loop na kare, kuch nahi chalta; `Take(5)` lagao to sirf 5 items banenge.
- Infinite sequences possible.

`yield break` — sequence wahin khatam. Async version: **`IAsyncEnumerable<T>` + `await foreach`** (DB/API se stream).

Dhyan: har baar enumerate karne pe method **dobara chalta** hai (do baar loop = do baar file padhi); aur exceptions tab aati hain jab enumerate karo, method call karne pe nahi.

```csharp
static IEnumerable<string> ReadLines(string path)
{
    using var r = new StreamReader(path);
    string? line;
    while ((line = r.ReadLine()) != null)
        yield return line;                 // ek line do, phir ruko
}

// Sirf pehli 10 error lines — poori file memory mein nahi aati
var errors = ReadLines("app.log").Where(l => l.Contains("ERROR")).Take(10).ToList();
```

## Records kya hain aur class se kaise alag hain?
**`record`** (C# 9) — **data rakhne ke liye** bani type, jisme compiler bahut kuch khud likh deta hai:
- **Value-based equality** — do records barabar hain agar unki **saari properties barabar** hon (class mein `==` reference compare karta hai).
- **Immutable by default** (positional record ki properties `init`-only).
- **`with` expression** — copy banao, kuch properties badal ke: `var b = a with { City = "Pune" };`
- Readable **`ToString()`** — `Person { Name = Asha, Age = 30 }`.
- Deconstruction: `var (name, age) = person;`

`record` = reference type (class), **`record struct`** = value type.

Kab: **DTOs, API request/response, commands/events (CQRS), value objects** (Money, Address). Kab nahi: EF Core entities jinki identity Id se hoti hai aur jo change hoti rehti hain — wahan class.

```csharp
public record Person(string Name, int Age);

var a = new Person("Asha", 30);
var b = new Person("Asha", 30);
Console.WriteLine(a == b);                 // True  — value equality
Console.WriteLine(ReferenceEquals(a, b));  // False — alag objects

var older = a with { Age = 31 };           // copy + change
// a.Age = 31;                             // compile error — init-only
Console.WriteLine(older);                  // Person { Name = Asha, Age = 31 }
```

## Pattern matching — switch expression aur is
C# mein **pattern matching** se type aur shape check karke ek saath value nikaal sakte ho — lambi `if/else` aur casting kam.

- **Type pattern**: `if (obj is Order o)` — check bhi, cast bhi.
- **Property pattern**: `if (order is { Status: "Paid", Amount: > 1000 })`
- **Relational**: `> 100`, `<= 0` · **Logical**: `and`, `or`, `not` — `if (x is not null)`
- **switch expression** (C# 8): chhota, value lautata hai, aur saare cases cover na ho to compiler warning.
- **List patterns** (C# 11): `if (arr is [1, 2, ..])` — shuru ke elements check.

`is null` / `is not null` — `== null` se better kyunki overloaded `==` operator bypass hota hai.

```csharp
static decimal Shipping(Order o) => o switch
{
    { Country: not "IN" }             => 1500,
    { Amount: >= 999 }                => 0,
    { Express: true, Amount: < 999 }  => 149,
    _                                 => 49
};

static string Classify(object x) => x switch
{
    null            => "khaali",
    int n when n < 0 => "negative int",
    int n           => $"int {n}",
    string { Length: 0 } => "empty string",
    string s        => $"string of {s.Length}",
    _               => x.GetType().Name
};
```

## C# ke naye features — 8 se 12 tak kya aaya?
"Latest C# mein kya naya hai" — kuch naam aur use bolna aana chahiye:

| Version | Kaam ke features |
| --- | --- |
| **C# 8** (.NET Core 3) | Nullable reference types, switch expressions, `using` declaration (bina braces), default interface methods, async streams (`IAsyncEnumerable`), ranges `^1`, `..` |
| **C# 9** (.NET 5) | **Records**, `init` setters, top-level statements, target-typed `new()`, pattern matching mein `and/or/not` |
| **C# 10** (.NET 6) | **Global usings**, file-scoped namespace (`namespace X;`), record struct |
| **C# 11** (.NET 7) | **`required`** members, raw string literals (`"""..."""`), list patterns, generic math |
| **C# 12** (.NET 8) | **Primary constructors** for classes (`class Svc(IRepo repo)`), **collection expressions** (`int[] a = [1, 2, 3];`), default lambda parameters |
| **C# 13** (.NET 9) | `params` collections, naya `Lock` type, `\e` escape |

Interview tip: jo tumne **sach mein use kiye** wo bolo — "primary constructors se DI wale constructors chhote ho gaye", "records DTOs ke liye", "nullable reference types on kiye to NullReference bugs compile pe pakde gaye".

```csharp
// C# 12 — primary constructor + collection expression
public class OrderService(IOrderRepo repo, ILogger<OrderService> log)
{
    public async Task<Order?> Get(int id)
    {
        log.LogInformation("Fetching {Id}", id);
        return await repo.GetAsync(id);
    }
}
int[] primes = [2, 3, 5, 7];

// C# 11 — required + raw string
public class Settings { public required string ApiUrl { get; init; } }
var json = """{ "name": "Asha", "age": 30 }""";
```

## Nullable reference types kya hain?
C# 8 se project mein **`<Nullable>enable</Nullable>`** karke compiler **null ke bugs compile time pe** pakadta hai. (Naye .NET projects mein default on.)

- `string name` — compiler maanta hai ye **kabhi null nahi**; null assign karo to **warning**.
- `string? name` — null ho sakta hai; bina check kiye `.Length` use karo to **warning** ("possible null reference").
- **`!` (null-forgiving)** — "mujhe pata hai ye null nahi hai" — warning chup. Kam use karo, ye jhooth bhi ho sakta hai.

Ye **runtime pe kuch nahi badalta** — sirf compiler warnings hain (koi check nahi lagta). Isliye API input validation phir bhi chahiye.

Fayda: `NullReferenceException` — sabse common production crash — ka bada hissa compile pe hi dikh jaata hai. Warnings ko **errors bana do** (`<WarningsAsErrors>nullable</WarningsAsErrors>`) to team ignore nahi kar paati.

```csharp
#nullable enable
public class User
{
    public string Name { get; set; } = "";     // non-null — default dena padega
    public string? MiddleName { get; set; }    // optional
}

int Len(User u) => u.MiddleName.Length;        // warning: possible null
int Len2(User u) => u.MiddleName?.Length ?? 0; // theek
```

## Reflection kya hai aur kab use hoti hai?
**Reflection** — runtime pe kisi type ke **baare mein jaankari nikaalna aur use karna**: uski properties, methods, attributes padhna, private members tak pahunchna, ya naam se object banana/method chalana. `System.Reflection`, `typeof(T)`, `obj.GetType()`.

Kahan use hoti hai (aksar framework khud karta hai):
- **DI container**, ASP.NET **model binding**, **routing** (controllers dhoondhna), attributes padhna (`[Required]`, `[Authorize]`).
- Serializers (`System.Text.Json`), ORMs (EF, Dapper — properties ko columns se map karna), AutoMapper.
- Plugin systems — DLL load karke types dhoondhna.

Nuksaan: **slow** (normal call se kaafi slow), compile-time safety nahi (naam galat to runtime error), private access se encapsulation tootta hai, aur trimming/Native AOT ke saath problem. Isliye modern .NET **source generators** use karta hai (compile time pe code bana deta hai — `System.Text.Json` source gen, Regex source gen).

```csharp
var t = typeof(Order);
foreach (var p in t.GetProperties())
    Console.WriteLine($"{p.Name}: {p.PropertyType.Name}");

var required = t.GetProperties()
    .Where(p => p.GetCustomAttribute<RequiredAttribute>() != null)
    .Select(p => p.Name);

object o = Activator.CreateInstance(t)!;        // naam/type se object
t.GetProperty("Status")!.SetValue(o, "Paid");
```

## String vs StringBuilder — aur string interning
**`string` immutable** hai — har "badlav" (`+=`, `Replace`, `ToUpper`) **naya string object** banata hai. Loop mein 10,000 baar `+=` = 10,000 objects + har baar poora copy → **O(n²)** aur GC pe load.

**`StringBuilder`** — andar ek badhne wala buffer; append same buffer mein hota hai. Loop mein ya bahut saare jodne mein **StringBuilder**. 2–4 strings jodne ho to `+` ya **interpolation** (`$"..."`) theek hai — compiler khud optimize kar leta hai.

String immutable kyun: **thread-safe** (koi badal nahi sakta), **hash stable** (Dictionary key safe), aur **interning** possible.

**String interning** — same literal (`"hello"`) ke liye memory mein ek hi object; `ReferenceEquals("hi", "hi")` true. Runtime pe bane strings intern nahi hote (`string.Intern()` se manually).

Comparison: `==` string ke liye **value** compare karta hai (overloaded). Case-insensitive ke liye `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)` — `a.ToLower() == b.ToLower()` nahi (extra strings + culture bugs).

```csharp
// Galat — O(n²)
string s = "";
for (int i = 0; i < 10000; i++) s += i;

// Sahi
var sb = new StringBuilder();
for (int i = 0; i < 10000; i++) sb.Append(i).Append(',');
string result = sb.ToString();

bool same = string.Equals("Pune", "PUNE", StringComparison.OrdinalIgnoreCase);  // true
```
