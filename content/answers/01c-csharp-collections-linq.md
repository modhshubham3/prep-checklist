## Collections
Collections data ke group ko store aur manage karne ke liye hain. Sahi collection chunna performance ka sabse aasaan jeet hai — galat chuna to 10 items pe farak nahi dikhega, 10 lakh pe app ruk jaayegi. Hamesha generic collections (`System.Collections.Generic`) use karo; purane `ArrayList`/`Hashtable` mein boxing aur type-safety ki problem hai.

**Array** fixed size hai — ek baar bana to size nahi badalta. **List<T>** andar se array hi hai jo bharne pe double size ka naya array bana ke copy kar leta hai; index se access O(1), beech mein insert/remove O(n). **Dictionary<TKey,TValue>** hash table hai — key se lookup O(1), isliye "id se dhoondhna" ho to List pe loop ki jagah Dictionary. **HashSet<T>** sirf unique values rakhta hai aur `Contains` O(1) hai. **Queue<T>** FIFO, **Stack<T>** LIFO.

Thread-safe chahiye (kai threads ek saath likh rahe hain) to `ConcurrentDictionary`, `ConcurrentQueue` use karo. API se collection return karni ho aur caller badal na sake, to `IReadOnlyList<T>`/`IReadOnlyCollection<T>` return karo.

| Collection | Kya hai | Lookup | Kab use karein |
|---|---|---|---|
| `T[]` array | Fixed size | Index O(1) | Size pehle se pata ho |
| `List<T>` | Resizable array | Index O(1), search O(n) | Default choice, order matter kare |
| `Dictionary<K,V>` | Key-value hash table | Key O(1) | Id/key se baar-baar dhoondhna |
| `HashSet<T>` | Unique values | Contains O(1) | Duplicates hatao, "exists?" check |
| `Queue<T>` | FIFO | — | Jobs/messages order mein process |
| `Stack<T>` | LIFO | — | Undo, backtracking, parsing |
| `LinkedList<T>` | Doubly linked | O(n) | Beech mein bahut insert/remove |

```csharp
var ids = new List<int> { 3, 1, 2 };
var byId = orders.ToDictionary(o => o.Id);          // ek baar banao
var order = byId[42];                                // O(1) — list pe loop nahi
var unique = new HashSet<string>(emails);            // duplicates gayab
bool seen = unique.Contains("a@b.com");              // O(1)
```

! Loop ke andar `list.Contains()` ya `list.FirstOrDefault(x => x.Id == id)` — ye O(n²) ban jaata hai. Pehle `HashSet`/`Dictionary` bana lo.

## IEnumerable vs IQueryable vs List
Ye .NET interviews ka sabse famous sawaal hai, aur isme performance ka asli farak chhupa hai.

**IEnumerable<T>** in-memory data pe kaam karta hai. Iske LINQ methods (`Where`, `Select`) **C# delegates** lete hain aur C# code ki tarah memory mein chalte hain. Agar EF Core ka data IEnumerable ban gaya, to baaki filtering **database pe nahi, tumhari app ki memory mein** hogi — yani poori table pehle aa jaayegi.

**IQueryable<T>** ek query **banata** hai jo abhi chali nahi hai. Iske LINQ methods **expression trees** lete hain, jise EF Core jaisa provider **SQL mein translate** kar deta hai. `Where` lagaoge to wo SQL ke `WHERE` mein jaata hai — database sirf zaroori rows bhejta hai.

**List<T>** asli, **materialized** collection hai — data memory mein aa chuka hai. `ToList()` call karte hi query execute hoti hai.

Rule: DB query mein jitni filtering/paging/projection hai, wo sab `ToList()` se **pehle**, IQueryable pe karo. Aur repository se `IEnumerable` return karke baad mein filter mat karo.

| | IEnumerable | IQueryable | List |
|---|---|---|---|
| Purpose | Iterate karna | Query banana | Asli collection |
| Kahan chalta hai | App memory mein | Data source pe (DB) | Memory mein (already loaded) |
| LINQ argument | Delegate (`Func`) | Expression tree | — |
| SQL translation | Nahi | Haan | Nahi |
| Deferred execution | Haan | Haan | Nahi |
| Namespace | System.Collections.Generic | System.Linq | System.Collections.Generic |

```csharp
// SAHI — filter + paging DB pe, sirf 20 rows aayengi
var page = await db.Orders
    .Where(o => o.Status == "Paid")
    .OrderByDescending(o => o.CreatedAt)
    .Skip(0).Take(20)
    .ToListAsync();

// GALAT — AsEnumerable ke baad sab memory mein; poori table load hogi
var bad = db.Orders.AsEnumerable()
    .Where(o => o.Status == "Paid")
    .Take(20)
    .ToList();
```

! "IQueryable hamesha IEnumerable se fast hai" — nahi. In-memory data pe IQueryable ka koi fayda nahi. Farak tab hai jab data source database ho.

> IQueryable = DB pe kaam, IEnumerable = memory mein kaam, List = kaam ho chuka.

## Where()
`Where()` collection ko **filter** karta hai — sirf wo items rakhta hai jinpe condition (predicate) `true` ho. SQL ke `WHERE` jaisa.

Ye **deferred** hai — `Where()` likhne se filtering nahi hoti, sirf "filter karna hai" ka plan banta hai; asli kaam tab hota hai jab result pe loop chale ya `ToList()` ho. IQueryable pe `Where` SQL `WHERE` mein translate hota hai. Kai `Where` chain kar sakte ho — EF Core unhe `AND` mein jod deta hai. Isse conditional filters (search screen) likhna aasaan hai.

```csharp
var adults = users.Where(u => u.Age >= 18);

// Dynamic filters — sirf jo diya ho wahi lagao
IQueryable<Order> q = db.Orders;
if (status != null)  q = q.Where(o => o.Status == status);
if (from != null)    q = q.Where(o => o.CreatedAt >= from);
var result = await q.ToListAsync();     // ek hi SQL, saare filters ke saath
```

! IQueryable ke `Where` mein apna C# method (jaise `IsValid(o)`) call karoge to EF use SQL mein translate nahi kar payega — exception aayega.

## Select()
`Select()` har item ko **transform (project)** karta hai — ek shape se doosre shape mein. Input mein 10 items, output mein bhi 10 items, bas har item badla hua. SQL ke `SELECT columns` jaisa.

EF Core mein `Select` performance ke liye bahut important hai: poori entity load karne ki jagah sirf zaroori columns select karo. Isse kam data aata hai, change tracking nahi hoti, aur related tables ka data bhi ek hi query mein DTO mein aa sakta hai (bina `Include` ke).

```csharp
var names = users.Select(u => u.Name);                 // List<User> → IEnumerable<string>

var dtos = await db.Orders
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderDto(o.Id, o.Total, o.Customer.Name))   // sirf 3 columns, ek JOIN
    .ToListAsync();

var withIndex = items.Select((item, i) => $"{i + 1}. {item}");   // index bhi milta hai
```

> Where = kaunse items (rows kam). Select = har item ka kaunsa hissa (shape badlo).

## SelectMany()
`SelectMany()` **nested collections ko flatten** karta hai — "list of lists" ko ek seedhi list bana deta hai. Har item se ek collection nikalta hai, phir saari collections ko jod deta hai.

`Select` aur `SelectMany` ka farak: agar har order mein items ki list hai, to `orders.Select(o => o.Items)` tumhe `IEnumerable<List<Item>>` dega (list of lists), jabki `orders.SelectMany(o => o.Items)` seedha `IEnumerable<Item>` (saare items ek list mein). SQL mein ye ek `JOIN` jaisa kaam karta hai.

```csharp
var orders = new[]
{
    new { Id = 1, Items = new[] { "Pen", "Book" } },
    new { Id = 2, Items = new[] { "Bag" } },
};

var nested = orders.Select(o => o.Items);        // [ ["Pen","Book"], ["Bag"] ]
var flat   = orders.SelectMany(o => o.Items);    // [ "Pen", "Book", "Bag" ]

var pairs = orders.SelectMany(o => o.Items, (o, item) => $"{o.Id}:{item}");  // parent bhi chahiye
```

> Select = har item ek result. SelectMany = har item se kai results, sab ek list mein.

## First()
`First()` sequence ka **pehla item** return karta hai (ya condition wala pehla item). Agar sequence **khaali** hai ya koi item match nahi karta, to `InvalidOperationException` throw karta hai.

Isliye `First()` tab use karo jab tumhe **pakka** pata ho ki kam se kam ek item hoga — aur agar na ho to wo bug hai jise exception se pakadna chahiye. Warna `FirstOrDefault()`. EF Core mein ye SQL mein `TOP 1`/`LIMIT 1` ban jaata hai — sirf ek row aati hai. Order matter karta ho to pehle `OrderBy` lagao, warna "pehla" kaunsa hoga ye guarantee nahi (database koi bhi order de sakta hai).

```csharp
var latest = orders.OrderByDescending(o => o.CreatedAt).First();
var admin  = users.First(u => u.Role == "Admin");   // koi admin nahi to exception

var empty = new List<int>();
// empty.First();   // InvalidOperationException: Sequence contains no elements
```

## FirstOrDefault()
`FirstOrDefault()` bhi pehla item deta hai, par sequence khaali ho ya match na mile to exception ki jagah **default value** deta hai — reference types ke liye `null`, `int` ke liye `0`, `bool` ke liye `false`.

Ye "shayad mile, shayad na mile" wale case ke liye hai — jaise id se user dhoondhna. Result ka **null check zaroor karo**, warna aage `NullReferenceException`. .NET 6+ mein apna default bhi de sakte ho: `FirstOrDefault(defaultValue)`.

**Value types ke saath trap**: `int[] { }.FirstOrDefault()` 0 deta hai — par agar list mein asli mein 0 bhi ho sakta hai, to tum pata nahi laga paoge ki 0 mila ya kuch nahi mila.

```csharp
var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
if (user is null) return NotFound();          // null check zaroori

int first = new List<int>().FirstOrDefault();          // 0
int safe  = new List<int>().FirstOrDefault(-1);        // .NET 6+: -1
```

| First() | FirstOrDefault() |
|---|---|
| Khaali pe exception | Khaali pe default/null |
| Jab item hona hi chahiye | Jab item optional ho |

## Single()
`Single()` kehta hai: "**exactly ek** item hona chahiye". Zero item ho to exception, **ek se zyada** item ho to bhi exception.

Kab use karein? Jab business rule hai ki match unique hona chahiye — jaise primary key ya unique email se dhoondhna. Agar do records mil gaye to wo data corruption hai, aur `Single()` use chupke se nigalne ki jagah turant pakad leta hai. `First()` wahan pehla le lega aur galti chhup jaayegi.

Performance note: `Single()` ko ye check karna padta hai ki doosra item to nahi hai, isliye EF Core `TOP 2` / `LIMIT 2` bhejta hai. `First()` sirf `TOP 1`. Zyada farak nahi, par pata hona chahiye.

```csharp
var user = db.Users.Single(u => u.Id == 42);     // 0 ya 2+ mile to exception

var list = new[] { 5, 5 };
// list.Single(x => x == 5);   // InvalidOperationException: more than one element
```

## SingleOrDefault()
`SingleOrDefault()`: **zero ya ek** item allowed hai. Zero mile to default (`null`), ek mile to wo item, aur **ek se zyada** mile to phir bhi **exception**.

Ye unique lookup ke liye sabse sahi hai jahan record ho bhi sakta hai aur nahi bhi — jaise "is email ka user hai kya?" Duplicate mile to exception milna chahiye kyunki wo data bug hai.

**Common galatfehmi**: log sochte hain `SingleOrDefault` kabhi exception nahi deta. Deta hai — jab ek se zyada match ho.

| Method | 0 items | 1 item | 2+ items |
|---|---|---|---|
| `First()` | Exception | Pehla | Pehla |
| `FirstOrDefault()` | default | Pehla | Pehla |
| `Single()` | Exception | Wahi | Exception |
| `SingleOrDefault()` | default | Wahi | Exception |

```csharp
var existing = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
if (existing != null) return Conflict("Email already registered");
```

! "SingleOrDefault kabhi throw nahi karta" — galat. 2+ matches pe throw karta hai.

## Any()
`Any()` check karta hai ki **kam se kam ek** item hai (ya condition match karta hai) — aur `bool` return karta hai. Pehla match milte hi ruk jaata hai, poori list nahi dekhta.

Existence check ke liye hamesha `Any()` use karo, `Count() > 0` nahi. `Count()` ko sab items ginne padte hain (DB pe `COUNT(*)` poori table scan kar sakta hai), jabki `Any()` SQL mein `EXISTS` ban jaata hai jo pehli row milte hi ruk jaata hai. Ulta, `All()` check karta hai ki **saare** items condition match karte hain.

```csharp
bool hasOrders = await db.Orders.AnyAsync(o => o.CustomerId == id);   // SQL: EXISTS(...)
if (!users.Any()) Console.WriteLine("Koi user nahi");

// Bura:
// if (db.Orders.Count(o => o.CustomerId == id) > 0) ...

bool allPaid = invoices.All(i => i.IsPaid);   // empty list pe All() true deta hai!
```

! `All()` khaali collection pe `true` deta hai — "saare paid hain?" ka jawab "haan" jab koi invoice hi nahi.

> Existence check = `Any()`. `Count() > 0` = bekaar ki ginti.

## Count()
`Count()` sequence mein items ki **ginti** deta hai. Condition bhi de sakte ho: `Count(x => x.IsActive)`. EF Core pe ye SQL `COUNT(*)` ban jaata hai.

**`Count` property vs `Count()` method**: `List<T>`, arrays (`Length`), `Dictionary` ke paas `Count` **property** hai jo seedha stored number deti hai — O(1). `Count()` LINQ **method** hai; agar source collection hai to wo andar se property hi use kar leta hai, par pure `IEnumerable` (jaise `Where` ka result) pe use **saare items pe iterate** karna padta hai — O(n). Isliye loop mein baar-baar `.Count()` mat bulao.

Paging mein total count aur data dono chahiye to do queries lagti hain (ek `Count`, ek `Skip/Take`) — ye normal hai.

```csharp
int total = list.Count;                           // property, O(1)
int active = users.Count(u => u.IsActive);        // LINQ, iterate karega
int dbCount = await db.Orders.CountAsync(o => o.Status == "Paid");   // SQL COUNT(*)

long big = await db.Logs.LongCountAsync();        // int limit (2.1 arab) se bade tables ke liye
```

## OrderBy()
`OrderBy()` items ko kisi key ke hisaab se **ascending** (chhote se bada, A se Z) sort karta hai. Second level sort ke liye `ThenBy()` / `ThenByDescending()` use karte hain.

**Trap**: do baar `OrderBy` likhoge to doosra pehle wale ko **replace** kar deta hai, jodta nahi. "Pehle city se, phir naam se" ke liye `OrderBy(City).ThenBy(Name)` chahiye, `OrderBy(City).OrderBy(Name)` nahi.

LINQ to Objects mein `OrderBy` **stable** sort hai (equal keys wale items apna original order rakhte hain). EF Core pe ye SQL `ORDER BY` ban jaata hai. Paging (`Skip`/`Take`) hamesha kisi deterministic `OrderBy` ke saath karo, warna pages mein items repeat ya miss ho sakte hain.

```csharp
var sorted = employees
    .OrderBy(e => e.Department)
    .ThenBy(e => e.Name);                 // sahi: dept, phir naam

var wrong = employees
    .OrderBy(e => e.Department)
    .OrderBy(e => e.Name);                // sirf naam se sort — dept wala sort gaya
```

## OrderByDescending()
`OrderByDescending()` **descending** (bade se chhota, Z se A, naye se purane) order mein sort karta hai. "Latest pehle" wali har list mein ye lagta hai — recent orders, top salaries, newest posts.

Secondary sort ke liye `ThenByDescending()` ya `ThenBy()`. SQL mein `ORDER BY column DESC`. Agar column pe index hai to database sorted data jaldi de sakta hai; bade tables pe `ORDER BY` + `LIMIT` ke liye index zaroori hai, warna poori table sort hoti hai.

```csharp
var top5 = await db.Employees
    .OrderByDescending(e => e.Salary)
    .ThenBy(e => e.Name)
    .Take(5)
    .ToListAsync();                        // SQL: ORDER BY salary DESC, name LIMIT 5

var latest = posts.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
```

## GroupBy()
`GroupBy()` items ko ek key ke hisaab se **groups** mein baantta hai. Har group ek `IGrouping<TKey, TElement>` hota hai — uske paas `Key` hoti hai aur wo khud us group ke items ki list hai. Aksar iske baad `Select` se har group ka summary (count, sum, max) nikalte hain — SQL ke `GROUP BY` jaisa.

EF Core mein `GroupBy` ke baad aggregate (`Count`, `Sum`, `Max`, `Average`) lagaoge to wo SQL `GROUP BY` mein translate hota hai. Par agar group ke saare items as-is maangoge, to kai cases mein EF translate nahi kar pata aur error deta hai (ya purane versions mein data memory mein laata tha).

```csharp
var byDept = employees
    .GroupBy(e => e.Department)
    .Select(g => new
    {
        Department = g.Key,
        Count = g.Count(),
        TotalSalary = g.Sum(e => e.Salary),
        MaxSalary = g.Max(e => e.Salary)
    });
// SQL: SELECT department, COUNT(*), SUM(salary), MAX(salary) FROM employees GROUP BY department
```

> GroupBy ke baad lagbhag hamesha Select + aggregate aata hai.

## ToList()
`ToList()` query ko **turant execute** karke result ko ek `List<T>` mein memory mein le aata hai — ise **materialization** kehte hain. EF Core mein isi pal SQL database pe jaata hai.

Kab zaroori hai? (1) Jab tumhe result pe **kai baar** iterate karna ho — bina `ToList()` ke har `foreach` query **dobara chalayega**. (2) Jab DbContext band hone se pehle data chahiye. (3) Jab list ko modify karna ho.

Kab nuksaan hai? Filtering ya paging se **pehle** `ToList()` lagaya to poora data memory mein aa jaayega. Aur har LINQ step ke baad `ToList()` lagana bekaar ki allocations hai. Async code mein `ToListAsync()` use karo taaki DB ka wait karte waqt thread block na ho.

```csharp
var query = db.Orders.Where(o => o.Total > 1000);   // abhi kuch nahi chala
var list  = await query.ToListAsync();               // ab SQL chala

var ev = numbers.Where(n => n % 2 == 0);             // deferred
foreach (var n in ev) { }   // iteration 1
foreach (var n in ev) { }   // iteration 2 — filter dobara chala
var cached = ev.ToList();   // ek baar, phir reuse
```

> ToList = "abhi chalao aur memory mein rakh lo".

## Deferred execution kya hai?
**Deferred execution** matlab LINQ query **likhne pe nahi chalti, jab result maanga jaaye tab chalti hai**. `Where`, `Select`, `OrderBy`, `Skip`, `Take` — ye sab sirf ek "plan" banate hain. Query asal mein tab execute hoti hai jab: `foreach` loop chale, ya materializing method call ho (`ToList`, `ToArray`, `ToDictionary`, `First`, `Single`, `Count`, `Any`, `Sum`, `Max`).

**Fayde**: query ko tukdon mein bana sakte ho (conditional filters), aur EF Core poori chain ko ek optimized SQL mein badal deta hai. Kuch operations lazy chalte hain — `Take(5)` ke saath sirf zaroori items process hote hain.

**Trap 1 — multiple enumeration**: deferred query pe do baar loop chalaya to wo do baar execute hogi (DB pe do queries!). **Trap 2 — captured variables**: query mein use kiya variable execution ke waqt ki value leta hai, likhne ke waqt ki nahi. **Trap 3**: DbContext dispose hone ke baad query chalaoge to exception.

```csharp
int min = 10;
var q = numbers.Where(n => n > min);   // kuch nahi chala
min = 50;                               // badal diya
var r = q.ToList();                     // AB chala — min = 50 use hua!

var users = db.Users.Where(u => u.IsActive);   // IQueryable
var c = users.Count();     // SQL #1
var l = users.ToList();    // SQL #2 — alag query
```

| Deferred (plan banata hai) | Immediate (turant chalata hai) |
|---|---|
| Where, Select, OrderBy, GroupBy | ToList, ToArray, ToDictionary |
| Skip, Take, Join, Distinct | First, Single, Last (+ OrDefault) |
| SelectMany, Concat | Count, Any, All, Sum, Max, Min, Average |

> LINQ query ek recipe hai. Khana tab banta hai jab `ToList()` bolo.
