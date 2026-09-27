# C# — chhoote hue topics

## Access modifiers — public, private, protected, internal, protected internal, private protected
? C# ke saare access modifiers batao. internal aur protected internal mein kya farak hai?
**Ek line:** access modifier batata hai **kaun** is class/member ko dekh aur use kar sakta hai.

| Modifier | Kaun access kar sakta hai |
| --- | --- |
| `public` | Sab, kahin se bhi |
| `private` | Sirf **usi class** ke andar (class members ka default) |
| `protected` | Class + uski **child classes** |
| `internal` | **Same project (assembly)** ke andar koi bhi (top-level class ka default) |
| `protected internal` | Same assembly **ya** child class (kahin bhi) — dono mein se koi |
| `private protected` | Same assembly **aur** child class — dono shartein |

**Aise socho:** ghar ki cheezein — `public` = gate ke bahar ka board (sab dekhein). `private` = tumhari diary (sirf tum). `protected` = family ka locker (tum + bachche). `internal` = apartment ki society ka gym (society wale sab, bahar wale nahi). `protected internal` = society wale **ya** tumhare bachche jo kahin aur rehte hain.

Defaults: class ke members `private`; top-level class `internal`; interface members `public`.

```csharp
public class Account
{
    private decimal _balance;               // sirf Account ke andar
    protected string Owner = "";            // Account + SavingsAccount
    internal int BranchCode;                // same project mein koi bhi
    public decimal Balance => _balance;     // sab
}
public class SavingsAccount : Account
{
    void Show() { Console.WriteLine(Owner); /* _balance ❌ — private */ }
}
```

> private = sirf main. protected = main + bachche. internal = mera project. public = sab.

## Assembly, DLL vs EXE, namespace aur GAC
? Assembly kya hai? DLL aur EXE mein farak, namespace aur assembly mein farak, aur GAC kya tha?
**Ek line:** **assembly** = compile hone ke baad bani file (`.dll` ya `.exe`) jisme IL code + metadata + manifest hota hai — .NET mein deploy aur version hone wali unit. **Namespace** = code ke andar **naamon ka folder** (logical grouping) — assembly se alag cheez.

| | DLL | EXE |
| --- | --- | --- |
| Khud chal sakta | ❌ Library — koi aur use karta hai | ✅ Entry point (`Main`) hai |
| Example | `Newtonsoft.Json.dll`, tumhari class library | Console app, (purane) Windows app |

| | Namespace | Assembly |
| --- | --- | --- |
| Kya | Logical naam-group (`System.Collections.Generic`) | Physical file (`.dll`) |
| Ek dusre mein | Ek namespace kai assemblies mein ho sakta hai | Ek assembly mein kai namespaces |

**GAC (Global Assembly Cache)** = purane **.NET Framework** mein machine-wide shared DLLs ki jagah (strong-named assemblies, alag versions saath). **.NET Core/.NET 5+ mein GAC nahi** — har app apni dependencies NuGet se saath le jaati hai (app-local).

**Aise socho:** assembly = **kitaab** (physical), namespace = kitaab ke **chapters ke naam** (logical). GAC = shehar ki **public library** jahan sab apps ek hi kitaab padhte the — ab har app apni kitaab saath rakhta hai.

> Assembly = file (dll/exe). Namespace = naam ka folder. GAC = purana Framework, naye .NET mein nahi.

## Enum aur uska underlying type
? Enum kya hai, uska default type kya hota hai, aur [Flags] enum kab use karte ho?
**Ek line:** **enum** = naam wale constants ka set — magic numbers ki jagah padhne layak naam. Andar se har value ek **integer** hai (default `int`, 0 se shuru).

- Underlying type badal sakte ho: `enum Status : byte { ... }`.
- Cast: `(int)Status.Paid`, `(Status)2`. **Galat number cast** bhi chal jaata hai (`(Status)99` — error nahi!) — `Enum.IsDefined` se check karo.
- String se: `Enum.Parse<Status>("Paid")` / `Enum.TryParse`.
- **`[Flags]`** — values 1, 2, 4, 8… taaki kai options ek saath (`Read | Write`); `HasFlag` se check.
- EF Core mein enum by default int store hota hai; string chahiye to `.HasConversion<string>()`. API JSON mein string ke liye `JsonStringEnumConverter`.

```csharp
public enum OrderStatus { Pending = 1, Paid = 2, Shipped = 3, Cancelled = 9 }

var s = OrderStatus.Paid;
int n = (int)s;                                   // 2
var bad = (OrderStatus)99;                        // chal gaya! value 99
bool ok = Enum.IsDefined(typeof(OrderStatus), 99); // false

[Flags] public enum Permission { None = 0, Read = 1, Write = 2, Delete = 4 }
var p = Permission.Read | Permission.Write;
Console.WriteLine(p.HasFlag(Permission.Write));   // True
Console.WriteLine(p);                              // Read, Write
```

> Enum = naam wale numbers (default int). Galat number bhi cast ho jaata hai — IsDefined se check. Kai options saath → [Flags].

## Anonymous type, Tuple aur ValueTuple
? Method se do values lautani hain bina class banaye — Tuple, ValueTuple ya anonymous type? Farak kya hai?
**Ek line:** teeno "bina class banaye kuch values saath rakhna" ke tareeke hain. **Anonymous type** = method ke **andar** hi (LINQ projection); **ValueTuple** `(int, string)` = method se **kai values lautane** ke liye (modern); purana **`Tuple<T1,T2>`** = `Item1`, `Item2` wala, ab kam use.

| | Anonymous type | `Tuple<>` (purana) | ValueTuple `( , )` |
| --- | --- | --- | --- |
| Syntax | `new { Name = "A", Age = 3 }` | `Tuple.Create("A", 3)` | `("A", 3)` / `(string Name, int Age)` |
| Type | Class (reference) | Class | **Struct** (value) |
| Naam wale fields | ✅ | ❌ `Item1, Item2` | ✅ `Name, Age` |
| Method se return | ❌ (bas `object`/`dynamic`) | ✅ | ✅ **best** |
| Badal sakte | ❌ Read-only | ❌ | ✅ |

```csharp
// Anonymous — LINQ projection
var list = employees.Select(e => new { e.Name, Yearly = e.Salary * 12 });

// ValueTuple — kai values lautao
static (int Min, int Max) MinMax(int[] a) => (a.Min(), a.Max());
var (min, max) = MinMax([3, 9, 1]);                  // deconstruction
Console.WriteLine($"{min} {max}");

// Purana Tuple
var t = Tuple.Create("Asha", 30);
Console.WriteLine(t.Item1);
```

> Method ke andar → anonymous. Method se kai values → ValueTuple (naam ke saath). Zyada fields ya public API → record/class.

## String interpolation vs concatenation vs String.Format
? `$"..."`, `+` aur String.Format mein kya farak hai, aur logging mein interpolation kyun nahi karte?
**Ek line:** teeno string jodte hain; **interpolation `$"Hi {name}"`** sabse saaf aur modern hai. Loop mein bahut jodna ho to `StringBuilder`. **Logging mein message template** (`"User {UserId}"`, bina `$`) use karo — interpolation nahi.

| | Example | Kab |
| --- | --- | --- |
| `+` | `"Hi " + name` | 2–3 chhoti strings |
| `String.Format` | `string.Format("Hi {0}", name)` | Purana code, resource files (translation) |
| Interpolation | `$"Hi {name}, total {amt:N2}"` | **Default choice** |
| `StringBuilder` | `sb.Append(...)` in loop | Loop mein bahut saara |
| Raw string | `$"""{ "id": {id} }"""` | JSON/SQL jaisa multi-line |

**Logging trap:** `_log.LogInformation($"Order {id} failed")` — string **pehle hi ban jaati hai** (chahe log level off ho), aur structured logging (Serilog/Seq/ELK) ko `id` alag field nahi milta. Sahi: `_log.LogInformation("Order {OrderId} failed", id)`.

```csharp
string name = "Asha"; decimal amt = 1234.5m;
var a = "Hi " + name + ", total " + amt;
var b = string.Format("Hi {0}, total {1:N2}", name, amt);
var c = $"Hi {name}, total {amt:N2}";           // Hi Asha, total 1,234.50

_log.LogInformation("Order {OrderId} placed by {User}", 42, name);   // ✅ structured
```

> Code mein → `$"..."`. Loop → StringBuilder. Logging → template, `$` nahi.

## Dictionary andar se kaise kaam karta hai — hashing aur O(1)
? Dictionary mein lookup O(1) kaise hota hai? Apni class ko key banana ho to kya dhyan rakhoge?
**Ek line:** Dictionary key ka **`GetHashCode()`** nikaal ke usse ek **bucket number** banata hai aur value wahin rakhta hai. Dhoondhte waqt wahi hash → seedha us bucket pe → **O(1)** (average). Bucket mein ek se zyada keys (collision) hon to `Equals()` se sahi wali chuni jaati hai.

**Aise socho:** post office — har chitthi ka **pincode** (hash) dekh ke seedha us **khaane (bucket)** mein. Dhoondhna ho to poore dher ki jagah seedha us khaane mein dekho. Ek khaane mein kai chitthiyan hon to naam (Equals) se pehchano.

Rules jo bolne chahiye:
- Do barabar objects (`Equals` true) ka **`GetHashCode` same** hona chahiye — isliye dono **saath override** karo (ya `record` use karo, wo khud karta hai).
- Key ko dictionary mein daalne ke baad **badlo mat** — hash badal jaayega aur item "kho" jaayega.
- Bura hash (sab ka same) → sab ek bucket mein → O(n).
- Bharne pe resize (bucket double + rehash) — size pata ho to `new Dictionary<K,V>(capacity)`.

```csharp
public class GeoKey                                 // key banane ke liye dono override
{
    public int X, Y;
    public override bool Equals(object? o) => o is GeoKey k && k.X == X && k.Y == Y;
    public override int GetHashCode() => HashCode.Combine(X, Y);
}
public record GeoKey2(int X, int Y);                // record: dono apne aap

var d = new Dictionary<GeoKey2, string> { [new(1, 2)] = "Depot" };
Console.WriteLine(d[new GeoKey2(1, 2)]);            // Depot — naya object, par same key
```

> Hash = pincode, bucket = khaana. Equals aur GetHashCode saath override. Key ko baad mein mat badlo.

## Array vs ArrayList vs List, aur IEnumerable vs ICollection vs IList
? Array, ArrayList aur List<T> mein kya farak hai? Aur IEnumerable, ICollection, IList interfaces mein?
**Ek line:** **Array** = fixed size. **ArrayList** = purana, `object` store karta hai (boxing, type-safe nahi) — **mat use karo**. **List<T>** = badhne wala, type-safe — default choice. Interfaces ek ke upar ek zyada features dete hain.

| | Array `int[]` | ArrayList | `List<T>` |
| --- | --- | --- | --- |
| Size | Fixed | Badhta hai | Badhta hai |
| Type safe | ✅ | ❌ (`object`) | ✅ |
| Boxing value types | ❌ | ✅ (slow) | ❌ |
| Kab | Size pata, performance-critical | Kabhi nahi (legacy) | **Almost hamesha** |

Interfaces — har agla pichhle se zyada deta hai:
- **`IEnumerable<T>`** — sirf `foreach` (aage-aage padhna). Sirf padhna hai, lazy/LINQ.
- **`ICollection<T>`** — + `Count`, `Add`, `Remove`, `Contains`.
- **`IList<T>`** — + index `[i]`, `Insert`, `IndexOf`.
- **`IReadOnlyList<T>`** — index + Count, par badal nahi sakte. API se list lautane ke liye safe.

```csharp
int[] arr = new int[3];                 // fixed
var old = new ArrayList { 1, "two" };   // koi bhi type — runtime bugs
int x = (int)old[0]!;                   // cast + unboxing
var list = new List<int> { 1, 2, 3 };   // type-safe, badhta hai
list.Add(4);

IReadOnlyList<Order> GetRecent() => _orders.Take(10).ToList();   // caller badal nahi sakta
```

> ArrayList kabhi nahi. Default List<T>. Parameter mein sabse chhota interface lo jo kaam kare (IEnumerable).

## IEnumerable vs IEnumerator — foreach andar se kaise chalta hai
? foreach loop andar se kaise kaam karta hai? IEnumerable aur IEnumerator mein kya farak hai?
**Ek line:** **`IEnumerable`** = "mujhpe loop chal sakta hai" — ek method `GetEnumerator()`. **`IEnumerator`** = loop ka **cursor** — `MoveNext()` (agla hai?), `Current` (abhi wala), `Reset()`. `foreach` compiler ke andar yahi teen cheezein bulata hai.

**Aise socho:** IEnumerable = **playlist**; IEnumerator = playlist ka **player** jo "next song" dabata hai aur batata hai abhi kaunsa chal raha. Ek playlist pe kai log alag-alag player se chala sakte hain.

`yield return` likhne pe compiler khud IEnumerator wali class bana deta hai.

```csharp
foreach (var x in list) Console.WriteLine(x);

// Compiler ise aise badalta hai (roughly):
using (var e = list.GetEnumerator())
{
    while (e.MoveNext())
    {
        var x = e.Current;
        Console.WriteLine(x);
    }
}
```

! `foreach` ke andar list mein add/remove — enumerator ko pata chal jaata hai, `InvalidOperationException: Collection was modified`.

> IEnumerable = playlist. IEnumerator = player (MoveNext + Current). foreach = dono ka shortcut.

## Stack vs Queue — LIFO aur FIFO
? Stack aur Queue mein farak kya hai? Real use cases batao.
**Ek line:** **Stack** = **LIFO** (Last In First Out) — jo aakhri mein daala wo pehle nikle. **Queue** = **FIFO** (First In First Out) — jo pehle aaya wo pehle nikle. Dono ke main operations O(1).

| | Stack | Queue |
| --- | --- | --- |
| Order | LIFO | FIFO |
| Daalna / nikaalna | `Push` / `Pop` | `Enqueue` / `Dequeue` |
| Dekhna (bina nikaale) | `Peek` | `Peek` |
| Real use | Undo, browser back, brackets check, call stack, DFS | Print jobs, message processing, BFS, request line |

**Aise socho:** Stack = **plates ka dher** — upar wali pehle uthti hai. Queue = **ticket ki line** — pehle aaya, pehle gaya.

Aur: `PriorityQueue<TElement, TPriority>` (.NET 6+) — jiski priority sabse zyada wo pehle; `ConcurrentQueue` — threads ke beech.

```csharp
var undo = new Stack<string>();
undo.Push("type A"); undo.Push("type B");
Console.WriteLine(undo.Pop());       // type B — aakhri wala pehle

var jobs = new Queue<string>();
jobs.Enqueue("print 1"); jobs.Enqueue("print 2");
Console.WriteLine(jobs.Dequeue());   // print 1 — pehla wala pehle

// Brackets sahi hain? — Stack ka classic sawaal
static bool Balanced(string s)
{
    var st = new Stack<char>();
    foreach (var c in s)
    {
        if ("([{".Contains(c)) st.Push(c);
        else if (")]}".Contains(c))
        {
            if (st.Count == 0) return false;
            var open = st.Pop();
            if ("([{".IndexOf(open) != ")]}".IndexOf(c)) return false;
        }
    }
    return st.Count == 0;
}
```

> Stack = plates (LIFO). Queue = ticket line (FIFO).

## Memory leak C# mein kaise hota hai — GC hone ke bawajood
? Garbage collector hai phir bhi .NET app mein memory leak kaise ho sakta hai? Examples do.
**Ek line:** GC sirf un objects ko hatata hai jinka **koi reference nahi bacha**. Leak tab hota hai jab koi bekaar object ka **reference galti se pakda reh jaata hai** — GC use "kaam ka" samajh ke kabhi nahi hatati.

Common wajah:
- **Event handler** — `publisher.Event += handler` kiya, `-=` nahi. Lamba jeene wala publisher (singleton, static) chhote object ko zinda rakhta hai.
- **Static collections / cache bina limit** — `static List<>` / `Dictionary` mein daalte gaye, kabhi nikaala nahi. (`MemoryCache` mein size limit / expiry lagao.)
- **Captive dependency** — singleton ne scoped/transient pakad liya.
- **IDisposable na karna** — streams, timers, `HttpClient` baar-baar `new`, DB connections.
- **Timers** — `System.Timers.Timer` jo band nahi kiya, uska callback object zinda rakhta hai.
- **Closures** — lambda ne bada object capture kar liya aur lambda kahin store ho gaya.
- Angular mein: `subscribe` bina unsubscribe.

Kaise pakdein: memory graph lagatar badh raha hai (restart pe gir jaata hai); `dotnet-counters` (GC heap size), `dotnet-dump` / `dotnet-gcdump` + Visual Studio / PerfView se dekho **kaunse objects** sabse zyada aur **kaun unhe pakde** hai.

```csharp
public class Dashboard : IDisposable
{
    private readonly PriceFeed _feed;               // singleton, hamesha zinda
    public Dashboard(PriceFeed feed) { _feed = feed; _feed.PriceChanged += OnPrice; }
    private void OnPrice(object? s, decimal p) { /* UI update */ }
    public void Dispose() => _feed.PriceChanged -= OnPrice;   // bina iske har Dashboard zinda rahega
}
```

> GC reference dekhti hai. Leak = galti se pakda reference: event, static list, singleton, timer.

## Attributes — built-in aur custom
? Attributes kya hote hain? Apna custom attribute kaise banaoge aur use kaise padhoge?
**Ek line:** **attribute** = code (class, method, property) pe lagaya **metadata label** `[...]`. Khud kuch nahi karta — koi framework ya tumhara code **reflection se padh ke** uske hisaab se kaam karta hai.

Built-in jo roz dikhte hain: `[HttpGet]`, `[Route]`, `[Authorize]`, `[ApiController]`, `[Required]`, `[StringLength]`, `[JsonIgnore]`, `[Key]`, `[Obsolete]`, `[Flags]`, `[Serializable]`, `[Fact]`.

Custom: `Attribute` se inherit karo, `[AttributeUsage]` se batao kahan lag sakta hai; phir reflection (`GetCustomAttribute`) se padho, ya ASP.NET filter/middleware mein endpoint metadata se.

**Aise socho:** attribute = saamaan pe laga **sticker** ("Fragile", "This side up"). Sticker khud kuch nahi karta — courier wala sticker padh ke dhyan se uthata hai.

```csharp
[AttributeUsage(AttributeTargets.Method)]
public class AuditAttribute(string action) : Attribute
{
    public string Action { get; } = action;
}

public class OrdersController : ControllerBase
{
    [HttpDelete("{id}"), Audit("OrderDeleted")]
    public IActionResult Delete(int id) => NoContent();
}

// Filter mein padho
public class AuditFilter : IActionFilter
{
    public void OnActionExecuted(ActionExecutedContext c)
    {
        var audit = c.ActionDescriptor.EndpointMetadata.OfType<AuditAttribute>().FirstOrDefault();
        if (audit != null) Console.WriteLine($"AUDIT: {audit.Action}");
    }
    public void OnActionExecuting(ActionExecutingContext c) { }
}
```

> Attribute = sticker (metadata). Framework/reflection padh ke kaam karta hai.

## Custom exception class aur exception handling best practices
? Apni custom exception class kab aur kaise banaoge? try-catch-finally ke best practices kya hain?
**Ek line:** **custom exception** tab banao jab ek **business error** ko alag pehchaan ke alag handle karna ho (jaise `OutOfStockException` → 409). `Exception` se inherit karo, naam `...Exception` pe khatam, aur zaroori data property mein rakho.

Best practices:
- **Specific exception** pakdo (`SqlException`, `HttpRequestException`), `catch (Exception)` sirf top level (global handler) pe.
- **`throw;`** — `throw ex;` nahi (stack trace).
- Exceptions **control flow ke liye nahi** — "user nahi mila" normal hai to `null` / `TryGet` / Result lautao; exception mehengi hai.
- **finally** / `using` — cleanup hamesha.
- Wrap karte waqt asli exception **InnerException** mein do.
- Exception message mein password/PII mat daalo.
- API mein global handler exception → **ProblemDetails** (status code + message) mein badle.

```csharp
public class OutOfStockException : Exception
{
    public int ProductId { get; }
    public OutOfStockException(int productId)
        : base($"Product {productId} stock mein nahi hai") => ProductId = productId;
    public OutOfStockException(string msg, Exception inner) : base(msg, inner) { }
}

try { await _orders.PlaceAsync(cmd); }
catch (OutOfStockException ex) { return Conflict(new { ex.ProductId, ex.Message }); }   // 409
catch (DbUpdateException ex) { throw new OrderSaveException("Order save nahi hua", ex); }  // inner ke saath
finally { _metrics.Record("place_order"); }
```

> Custom exception = business error ka apna naam. Specific pakdo, `throw;` karo, control flow ke liye mat use karo.

## Indexer kya hota hai
? C# mein indexer kya hota hai? Apni class ko `obj[key]` jaisa kaise bana sakte ho?
**Ek line:** **indexer** = class ko **array jaisa** `obj[...]` syntax dena — `this[...]` naam ki property jo index/key leti hai. `List` ka `list[0]` aur `Dictionary` ka `dict["a"]` indexers hi hain.

- Parameter kuch bhi ho sakta hai — `int`, `string`, kai parameters (`matrix[i, j]`).
- `get` aur/ya `set`.
- Overload ho sakta hai (int wala aur string wala dono).

```csharp
public class Timetable
{
    private readonly Dictionary<string, string> _slots = new();
    public string this[string day]                       // indexer
    {
        get => _slots.TryGetValue(day, out var s) ? s : "Free";
        set => _slots[day] = value;
    }
}

var t = new Timetable();
t["Mon"] = "Interview @ 11";
Console.WriteLine(t["Mon"]);      // Interview @ 11
Console.WriteLine(t["Tue"]);      // Free

public class Matrix(int r, int c)
{
    private readonly double[,] _d = new double[r, c];
    public double this[int i, int j] { get => _d[i, j]; set => _d[i, j] = value; }
}
```

> Indexer = `this[...]` property — class ko `obj[key]` bana deta hai.

## Shallow copy vs deep copy
? Object ki copy banayi aur copy mein list badli to original bhi badal gaya — kyun? Shallow aur deep copy mein farak batao.
**Ek line:** **shallow copy** = naya object, par andar ke **reference fields same objects** ko point karte hain (list, child object share). **Deep copy** = andar tak **sab kuch naya** — koi share nahi.

**Aise socho:** shallow = ghar ka naya **address card** banaya par usme likha **same ghar** — ek mein furniture badla to "dono" mein badla. Deep = **naya ghar** banaya, sab furniture bhi naya.

Tareeke:
- Shallow: `MemberwiseClone()`, record ka `with`, object initializer se fields copy, spread (JS).
- Deep: har nested object khud copy karo (copy constructor), ya serialize → deserialize (`JsonSerializer` — aasaan par slow), ya libraries.
- Immutable objects (records with immutable collections) mein ye problem kam hoti hai — koi badal hi nahi sakta.

```csharp
public class Order
{
    public int Id;
    public List<string> Items = new();
    public Order ShallowCopy() => (Order)MemberwiseClone();
    public Order DeepCopy() => new Order { Id = Id, Items = new List<string>(Items) };
}

var a = new Order { Id = 1, Items = { "Pen" } };
var s = a.ShallowCopy();
s.Items.Add("Book");
Console.WriteLine(a.Items.Count);    // 2 — original bhi badla! (list shared)

var d = a.DeepCopy();
d.Items.Add("Bag");
Console.WriteLine(a.Items.Count);    // 2 — original safe
```

! Record ka `with` bhi **shallow** hai — `order with { Id = 2 }` ki `Items` list wahi purani list hai.

> Shallow = andar ki cheezein share. Deep = sab naya. `with` aur MemberwiseClone = shallow.

## Operator overloading
? C# mein operator overloading kya hai? Kab karni chahiye aur kya rules hain?
**Ek line:** **operator overloading** = apni class/struct ke liye `+`, `-`, `==`, `<` jaise operators ka **matlab khud define** karna — `public static T operator +(T a, T b)`.

Kab: jab type **number/value jaisa** ho — `Money`, `Vector`, `Point`, `Matrix`, `Duration`. `a + b` padhne mein natural lage. Business entities (`Order + Order`?) pe nahi — confusing.

Rules:
- `static` aur `public` hona chahiye.
- `==` overload kiya to **`!=` bhi**, aur saath mein `Equals` + `GetHashCode` override.
- `<` ke saath `>`, `<=` ke saath `>=` jodi mein.
- `&&`, `||`, `=` overload nahi hote.
- `implicit` / `explicit` conversion operators bhi bana sakte ho.

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency) throw new InvalidOperationException("Currency alag hai");
        return new Money(a.Amount + b.Amount, a.Currency);
    }
    public static Money operator *(Money a, int qty) => a with { Amount = a.Amount * qty };
    public static bool operator >(Money a, Money b) => a.Amount > b.Amount;
    public static bool operator <(Money a, Money b) => a.Amount < b.Amount;
}

var total = new Money(100, "INR") + new Money(50, "INR") * 2;   // 200 INR
```

> Value jaise types (Money, Vector) ke liye. Jodi mein overload karo (== ke saath !=).

## .NET Standard, JIT vs AOT compilation
? .NET Standard kya tha aur ab kyun zaroori nahi? JIT aur AOT (Native AOT) compilation mein farak?
**Ek line:** **.NET Standard** = ek **common API ki specification** jisse ek library .NET Framework, .NET Core aur Xamarin — sab pe chal sake. .NET 5+ ne sab platforms ko **ek .NET** mein mila diya, isliye naye code ke liye seedha `net8.0` target karo; .NET Standard sirf tab jab library ko **purane .NET Framework** pe bhi chalna ho (`netstandard2.0`).

**JIT vs AOT:**

| | JIT (default) | Native AOT |
| --- | --- | --- |
| Machine code kab bane | **Chalte waqt** (pehli call pe) | **Build ke waqt** |
| Startup | Thoda slow (warm-up) | **Bahut tez** |
| Size / memory | Runtime chahiye | Chhota, self-contained, kam memory |
| Optimization | Runtime pe profile dekh ke (tiered, PGO) | Build time pe |
| Limitations | Koi nahi | Reflection / dynamic code seemit, sab libraries support nahi |
| Kab | Normal apps | Serverless/cold start, containers, CLI tools, microservices |

Angular ka AOT alag cheez hai — wahan **templates** build time pe compile hote hain.

> .NET Standard = purane zamane ka "sab jagah chale" contract; ab seedha net8.0. JIT = chalte waqt compile, AOT = pehle se compile (tez startup, kuch limitations).
