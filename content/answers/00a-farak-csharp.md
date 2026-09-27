# Farak samjho — C# (sabse pehle yahan se)

## var vs dynamic vs object — type kab decide hota hai?
? Ek variable ko pehle int aur baad mein string rakhna hai, aur galti compile pe nahi, chalne pe pata chale to bhi chalega — var, dynamic ya object?
**Ek line:** `var` mein type **code likhte waqt** fix ho jaata hai; `dynamic` mein type **program chalte waqt** dekha jaata hai; `object` mein kuch bhi rakh sakte ho, par use karne se pehle **cast** karna padta hai.

| | Type kab tay | Baad mein doosra type daal sakte? | Galti kab pakdi jaati |
| --- | --- | --- | --- |
| `var` | Likhte waqt (compile time) | ❌ Nahi | Turant (laal line) |
| `dynamic` | Chalte waqt (runtime) | ✅ Haan | Chalne pe — **crash** |
| `object` | Likhte waqt (type = object) | ✅ Haan | Cast karte waqt |

**Aise socho:** `var` = dabba jispe machine ne label chhaap diya ("int") — label kabhi nahi badlega. `var` bas tumhe type likhne ki mehnat se bachata hai. `dynamic` = bina label ka dabba — andar kya hai, kholne pe hi pata chalega. `object` = "kuch bhi" likha dabba — kuch bhi daal do, par nikaalte waqt batana padega ki kya nikaal rahe ho.

```csharp
var a = 5;          // a hamesha int
a = "hello";        // ❌ compile error — int mein string nahi

dynamic d = 5;
d = "hello";        // ✅ chalega
d.Udd();            // ✅ compile ho gaya... chalne pe CRASH (RuntimeBinderException)

object o = 5;
o = "hello";        // ✅ chalega
int n = (int)o;     // ❌ chalne pe InvalidCastException — andar string hai
```

> var = "tum khud type samajh lo" (phir fix). dynamic = "type check hi mat karo". object = "kuch bhi rakho, nikaalte waqt cast karo".

## const vs readonly vs static — value kab fix hoti hai?
? Tumhe ek value chahiye jo har object ki alag ho, par object banne ke baad kabhi na badle — const, readonly ya static?
**Ek line:** `const` = code mein hi fix, sabke liye same. `readonly` = object **bante waqt** fix, har object ka alag ho sakta hai. `static` = poori class ki **ek hi copy**, sab share karte hain.

| | Value kab set | Har object ki alag? | Baad mein badal sakte? |
| --- | --- | --- | --- |
| `const` | Code mein likhte waqt | ❌ Sabki same | ❌ Kabhi nahi |
| `readonly` | Declare pe ya **constructor** mein | ✅ Ho sakti hai | ❌ Constructor ke baad nahi |
| `static` | Kabhi bhi | ❌ Class ki ek copy | ✅ Haan |
| `static readonly` | Declare pe ya static constructor | ❌ Ek copy | ❌ Nahi |

**Aise socho:**
- `const` = factory mein product pe chhapa MRP — har piece pe same, kabhi nahi badlega. (Hafte ke 7 din, π)
- `readonly` = ghadi kharidte waqt uspe khudwaya naam — har ghadi pe alag, par khudne ke baad mit nahi sakta. (Order ka `Id`, `CreatedAt`)
- `static` = office ka ek notice board — sab ek hi board dekhte hain, koi bhi likh sakta hai. (Total orders ka counter)
- `static readonly` = office ke gate pe laga pathar ka board — ek hi hai, aur lagne ke baad badlega nahi. (App start pe load hui setting)

```csharp
class Order
{
    const int MaxItems = 10;                  // sab orders ke liye 10, hamesha
    readonly DateTime createdAt;              // har order ka alag, par fix
    static int totalOrders = 0;               // saare orders milke ek counter
    static readonly DateTime appStart = DateTime.Now;   // ek hi, fix

    public Order()
    {
        createdAt = DateTime.Now;             // ✅ constructor mein set kar sakte ho
        totalOrders++;                        // ✅ static badal sakta hai
    }
    void Change()
    {
        createdAt = DateTime.Now;             // ❌ error — readonly, constructor ke bahar nahi
        // MaxItems = 20;                     // ❌ error — const kabhi nahi
    }
}
```

! `const` mein sirf simple values (number, string, bool) — `const DateTime x = DateTime.Now;` nahi chalega, kyunki `DateTime.Now` chalte waqt pata chalta hai. Uske liye `static readonly`.

> const = **factory mein fix**. readonly = **janam pe fix**. static = **sab ka ek**.

## Normal vs abstract vs sealed vs static class — sirf 2 sawaal poochho
? Tumhe ek class chahiye jiska object ban sake par koi usse inherit na kar sake — kaunsa keyword?
**Ek line:** har class ke liye bas do sawaal — **iska object banega?** aur **isse child class banegi?** Chaaron ka jawab alag hai.

| Class | Object bana sakte? | Child class bana sakte? | Example |
| --- | --- | --- | --- |
| Normal | ✅ | ✅ | `Customer` |
| `abstract` | ❌ | ✅ (isi liye bani hai) | `PaymentBase` |
| `sealed` | ✅ | ❌ | `string` |
| `static` | ❌ | ❌ | `Math`, `File` |

**Aise socho:**
- `abstract` = ghar ka **naksha** — naksha mein reh nahi sakte, uspe ghar banta hai.
- `sealed` = **aakhri peedhi** — iske baad koi bachcha nahi.
- `static` = **toolbox** — koi object nahi, seedha tools use karo: `Math.Max(3, 5)`.

```csharp
abstract class Shape { public abstract double Area(); }
class Circle : Shape { public override double Area() => 3.14 * 2 * 2; }   // ✅
// var s = new Shape();          // ❌ abstract ka object nahi

sealed class Pan { }
// class MyPan : Pan { }          // ❌ sealed se inherit nahi

static class Helper { public static int Double(int x) => x * 2; }
// var h = new Helper();          // ❌ static ka object nahi
int y = Helper.Double(4);         // ✅ seedha class ke naam se
```

> abstract = sirf parent banne ke liye. sealed = parent kabhi nahi banegi. static = na object, na child — bas tools.

## Abstract class vs interface — ek line mein farak
? Payment ke saare types mein 70% code same hai aur kuch alag — abstract class loge ya interface?
**Ek line:** interface batata hai **"kya karna hai"** (contract); abstract class batati hai **"kya karna hai + thoda kaise karna hai"** (common code bhi deti hai).

| | Interface | Abstract class |
| --- | --- | --- |
| Common code (method body) | Mostly nahi (C# 8+ default methods ho sakte hain) | ✅ Haan |
| Fields / constructor | ❌ | ✅ |
| Ek class kitne le sakti hai | **Kai** | **Sirf ek** |
| Rishta | "**kar sakta hai**" (can-do) | "**hai**" (is-a) |

**Aise socho:** interface = **job description** — "driver ko gaadi chalani aani chahiye" — kaise seekha, tumhara kaam. Abstract class = **aadha bana ghar** — deewarein (common code) bani hui hain, kamre tum apne hisaab se sajao. Ek insaan kai job descriptions poori kar sakta hai (kai interfaces), par uske **ek hi** asli maa-baap hote hain (ek hi base class).

```csharp
interface IPrintable { void Print(); }                   // bas "kya"
interface IExportable { void Export(); }

abstract class Report                                    // "kya" + common "kaise"
{
    public string Title { get; set; } = "";
    public void AddHeader() => Console.WriteLine(Title); // common code
    public abstract void Generate();                     // har report khud likhe
}

class SalesReport : Report, IPrintable, IExportable      // 1 class + kai interfaces
{
    public override void Generate() { /* ... */ }
    public void Print() { }
    public void Export() { }
}
```

> Common code share karna hai → abstract class. Sirf "ye kaam kar sakta hai" batana hai, ya kai cheezein jodni hain → interface.

## ref vs out vs in — parameter mein kya jaata hai?
? Method ko ek value calculate karke bahar deni hai, aur pehle se variable mein kuch nahi hai — ref, out ya in?
**Ek line:** normal parameter mein **copy** jaati hai. `ref`, `out`, `in` mein **asli variable** jaata hai — farak bas ye hai ki kaun likh sakta hai aur pehle value chahiye ya nahi.

| | Bhejne se pehle value zaroori? | Method badal sakta hai? | Method ko set karna zaroori? |
| --- | --- | --- | --- |
| Normal | ✅ | Sirf apni copy | ❌ |
| `ref` | ✅ | ✅ asli variable | ❌ |
| `out` | ❌ | ✅ | ✅ **zaroor** |
| `in` | ✅ | ❌ sirf padh sakta hai | ❌ |

**Aise socho:**
- Normal = kisi ko apne notes ki **photocopy** do — wo usme kuch bhi likhe, tumhare notes nahi badlenge.
- `ref` = **asli copy** de di — jo wo likhega, tumhari copy mein dikhega.
- `out` = **khaali register** diya aur kaha "isme bhar ke lautana" — bharna zaroori hai.
- `in` = asli copy di par **sirf padhne ke liye** — likh nahi sakta. (Bade struct ki copy bachane ke liye)

```csharp
void AddTen(ref int x) => x += 10;
void GetSize(out int w, out int h) { w = 1920; h = 1080; }   // dono set karne zaroori
void Show(in int x) { /* x = 5; ❌ error — in readonly hai */ Console.WriteLine(x); }

int a = 5;
AddTen(ref a);                        // a ab 15
GetSize(out int width, out int height);   // pehle se value nahi chahiye
int.TryParse("42", out int num);      // out ka sabse common use
```

> ref = "le jao, badal ke lao". out = "khaali le jao, bhar ke lao". in = "le jao, par haath mat lagana".

## Value type vs reference type — copy jaati hai ya address?
? Ek object doosre variable mein assign kiya aur doosre mein badlav kiya — pehle wala bhi badlega ya nahi? int aur class dono ke liye batao.
@viz value-ref
**Ek line:** value type assign karo to **poori value ki copy** banti hai; reference type assign karo to sirf **address (pata) copy** hota hai — dono variable same object ko dekhte hain.

| | Value type | Reference type |
| --- | --- | --- |
| Examples | `int`, `double`, `bool`, `DateTime`, `struct`, `enum` | `class`, `string`, array, `List`, `object` |
| Assign karne pe | Nayi copy | Same object ka address |
| Ek badla to doosra? | ❌ Nahi badlega | ✅ Badlega |
| Null ho sakta? | ❌ (jab tak `int?` na ho) | ✅ |

**Aise socho:** value type = **photocopy** — tumhari copy pe likho, meri pe kuch nahi. Reference type = **Google Doc ka link** — main link bhejta hoon, tum edit karo, mujhe bhi dikhega, kyunki document ek hi hai.

```csharp
int a = 10;
int b = a;       // copy
b = 20;
Console.WriteLine(a);   // 10 — a nahi badla

class Person { public string Name = ""; }
var p1 = new Person { Name = "Asha" };
var p2 = p1;     // address copy — dono same object
p2.Name = "Ravi";
Console.WriteLine(p1.Name);   // Ravi — p1 bhi badal gaya!
```

! `string` reference type hai par value jaisa behave karta hai — kyunki string **immutable** hai. `s2 = s1; s2 += "x";` karne pe naya string banta hai, s1 nahi badalta.

> Value = photocopy. Reference = Google Doc ka link.

## == vs Equals() vs ReferenceEquals() — kya compare ho raha hai?
? Do alag Customer objects hain jinki saari values same hain — == true dega ya false?
**Ek line:** `ReferenceEquals` hamesha poochhta hai **"kya ye ek hi object hai?"**. `==` aur `Equals` bhi class ke liye default mein yahi poochhte hain — jab tak class ne unhe **override** karke "values same hain?" na bana diya ho (jaise `string` aur `record` ne kiya hai).

| | `int` | `string` | Normal `class` | `record` |
| --- | --- | --- | --- | --- |
| `==` | Value | **Value** (overloaded) | Address | **Value** |
| `Equals()` | Value | Value | Address (override na kiya ho to) | Value |
| `ReferenceEquals()` | — | Address | Address | Address |

**Aise socho:** do bilkul same iPhone — same model, same colour. "Kya dono same **model** ke hain?" = value equality. "Kya ye **wahi ek** phone hai?" = reference equality. Normal class sirf doosra sawaal poochhti hai.

```csharp
var c1 = new Customer { Id = 1 };
var c2 = new Customer { Id = 1 };
Console.WriteLine(c1 == c2);                  // False — alag objects

string s1 = "hi", s2 = new string("hi");
Console.WriteLine(s1 == s2);                  // True — string value compare karta hai
Console.WriteLine(ReferenceEquals(s1, s2));   // False — alag objects

record Point(int X, int Y);
Console.WriteLine(new Point(1, 2) == new Point(1, 2));   // True — record value compare
```

> Class = "wahi object hai?". string / record = "values same hain?". ReferenceEquals = hamesha "wahi object hai?".

## Method overloading vs overriding — naam same, kaam kab alag?
? Parent class ka method child mein apne tareeke se chalana hai — overloading ya overriding? Kaunse keywords lagenge?
**Ek line:** **overloading** = ek hi class mein same naam, **alag parameters**. **Overriding** = child class parent ke method ko **apne tareeke se dobara** likhti hai (same naam, same parameters).

| | Overloading | Overriding |
| --- | --- | --- |
| Kahan | Ek hi class mein | Parent–child classes mein |
| Parameters | **Alag** hone chahiye | **Same** |
| Keywords | Kuch nahi | Parent: `virtual`/`abstract`, child: `override` |
| Kab decide hota hai kaunsa chalega | Compile time | Runtime (object ka asli type dekh ke) |

**Aise socho:** overloading = ek hi dukaan mein "chai" — **chhoti, badi, adrak wali** — naam same, order (parameters) alag. Overriding = papa ki chai ki recipe, beta **apne tareeke se** banata hai — naam aur cup same, banane ka tareeka naya.

```csharp
class Calc
{
    public int Add(int a, int b) => a + b;              // overloading
    public double Add(double a, double b) => a + b;
    public int Add(int a, int b, int c) => a + b + c;
}

class Animal { public virtual string Sound() => "..."; }
class Dog : Animal { public override string Sound() => "Bhow"; }   // overriding

Animal x = new Dog();
Console.WriteLine(x.Sound());   // "Bhow" — variable Animal hai, par object Dog hai
```

! Sirf **return type** badal ke overload nahi hota — `int Get()` aur `string Get()` ek class mein nahi ho sakte.

> Overloading = same naam, alag parameters, ek class. Overriding = same naam, same parameters, child mein naya tareeka.

## IEnumerable vs IQueryable vs List — filter kahan chalta hai?
? 10 lakh rows ki table se sirf 10 active users chahiye — EF query ko IEnumerable mein loge ya IQueryable mein, aur kyun?
@viz iqueryable
**Ek line:** `IQueryable` filter ko **SQL mein badal ke DB pe** chalata hai; `IEnumerable` pehle data **memory mein laata hai, phir C# mein** filter karta hai; `List` data **already memory mein** hai.

| | Filter kahan chalta hai | Kab use | Extra |
| --- | --- | --- | --- |
| `IQueryable` | **Database mein** (SQL) | EF queries banate waqt | Query tab chalti hai jab `ToList()` / loop karo |
| `IEnumerable` | **App ki memory mein** (C#) | Memory wali collections | Sirf aage-aage padh sakte ho |
| `List` | Memory mein | Data aa chuka, index/add/remove chahiye | `list[0]`, `Add`, `Count` |

**Aise socho:** IQueryable = restaurant mein **order dena** — "sirf paneer, kam mirchi" — kitchen (DB) wahi banake bhejti hai. IEnumerable = **poora buffet plate mein bhar ke** laao, phir table pe baith ke paneer chhaanto — kaam hua par bahut saara bekaar khana uthaya.

```csharp
// IQueryable — SQL: SELECT ... WHERE IsActive = 1 LIMIT 10  (DB se sirf 10 rows)
IQueryable<User> q = db.Users.Where(u => u.IsActive).Take(10);
var fast = q.ToList();

// IEnumerable — SQL: SELECT * FROM Users (10 lakh rows memory mein!), phir C# filter
IEnumerable<User> e = db.Users;
var slow = e.Where(u => u.IsActive).Take(10).ToList();
```

! Repository se `IEnumerable<User>` lautaya aur bahar `.Where()` lagaya — filter DB pe nahi, memory mein chala. Silent performance killer.

> IQueryable = DB ko bolo kya chahiye. IEnumerable = sab le aao, phir chhaanto.

## First vs FirstOrDefault vs Single vs SingleOrDefault — kab exception aayegi?
? Email se user dhoondhna hai, email unique honi chahiye aur user na mile to null chahiye — kaunsa method?
**Ek line:** `First` = "pehla de do"; `Single` = "sirf **ek** hi hona chahiye". `OrDefault` wale **na milne pe** exception ki jagah `null` dete hain.

| | 0 mile | 1 mila | 2+ mile |
| --- | --- | --- | --- |
| `First()` | ❌ Exception | ✅ | ✅ pehla |
| `FirstOrDefault()` | `null` | ✅ | ✅ pehla |
| `Single()` | ❌ Exception | ✅ | ❌ Exception |
| `SingleOrDefault()` | `null` | ✅ | ❌ Exception |

**Aise socho:** First = lift ke bahar khade logon mein se "**pehla** wala andar aao". Single = "**Aadhaar number 1234 wala** insaan" — ek hi hona chahiye; do mil gaye to kuch bahut galat hai, turant chillao (exception).

```csharp
var u1 = users.First(u => u.City == "Pune");              // koi nahi mila to crash
var u2 = users.FirstOrDefault(u => u.City == "Pune");     // koi nahi → null
var u3 = users.SingleOrDefault(u => u.Email == email);    // 0 → null, 2 → exception (duplicate data!)
if (u2 is null) return NotFound();
```

> Pehla chahiye → First. Sirf ek hi hona chahiye (ID, email) → Single. Na milna normal hai → OrDefault wala lo.

## throw vs throw ex — stack trace kyun kho jaata hai?
? Catch block mein error log karke aage bhejna hai — throw likhoge ya throw ex? Farak kya padega?
**Ek line:** `throw;` exception ko **waise hi** aage bhejta hai (poori history ke saath); `throw ex;` exception ko **yahin se naya** jaisa phenkta hai — asli jagah jahan error hua tha, wo stack trace se **mit jaati** hai.

| | Stack trace (error kahan hua) | Kab use |
| --- | --- | --- |
| `throw;` | ✅ Asli jagah bachi rehti hai | Hamesha, jab log karke aage bhejna ho |
| `throw ex;` | ❌ Yahin se shuru — asli line kho gayi | Kabhi nahi |
| `throw new XException("...", ex)` | ✅ `InnerException` mein asli | Apna message jodna ho |

**Aise socho:** chori ki FIR — `throw;` = poori FIR aage bhejo, "chori Pune station pe hui". `throw ex;` = FIR phaad ke nayi likho "chori yahan police chowki mein hui" — ab asli jagah kisi ko pata nahi.

```csharp
try { ProcessOrder(); }
catch (Exception ex)
{
    _log.LogError(ex, "Order fail");
    throw;            // ✅ asli line number bachi
    // throw ex;      // ❌ stack trace yahin se shuru — debugging mushkil
}
```

> Catch mein aage bhejna hai → sirf `throw;`.

## Dispose vs Finalize vs using — cleanup kaun karta hai?
? File ya DB connection kholi hai — usko band karne ki guarantee kaise doge?
**Ek line:** `Dispose()` = **tum khud** abhi cleanup karte ho. `Finalize` (destructor) = **GC** kabhi baad mein karega — pata nahi kab. `using` = compiler khud `Dispose()` bula deta hai, error aaye tab bhi.

| | Kaun bulata hai | Kab chalta hai | Use |
| --- | --- | --- | --- |
| `Dispose()` | Tum (ya `using`) | Turant, jab tum bolo | Files, DB connections, streams |
| `Finalize` / `~Class()` | Garbage Collector | Pata nahi kab | Last backup, rarely likhte hain |
| `using` | Compiler (andar `Dispose`) | Block khatam hote hi | Har `IDisposable` ke saath |

**Aise socho:** hotel room — `Dispose` = **khud checkout** karke chaabi counter pe do, room turant free. `Finalize` = chaabi le ke chale gaye, hotel wala **kabhi** check karke room free karega — tab tak room bekaar pada hai. `using` = hotel ka rule ki nikalte hi chaabi **apne aap** jama ho jaaye.

```csharp
using (var conn = new NpgsqlConnection(cs))    // block khatam → conn.Dispose()
{
    conn.Open();
    // error aaye tab bhi connection band hoga
}

using var file = File.OpenRead("data.csv");    // C# 8 — method khatam hote hi Dispose
```

> Jo cheez `IDisposable` hai (file, connection, stream) — hamesha `using` ke saath.

## async/await vs Task vs Thread — kaun kya hai?
? Ek API call hai jo DB se data laati hai — isko naye Thread pe chalaoge ya async/await? Kyun?
@viz async-waiter
**Ek line:** `Thread` = asli **worker (mazdoor)**. `Task` = ek **kaam ka parcha** — "ye kaam hoga, result milega". `async/await` = parcha dekar **intezaar mein khade na rehna**, worker ko doosra kaam karne dena.

| | Kya hai | Kab use |
| --- | --- | --- |
| `Thread` | OS ka worker — banana mehenga | Aaj kal seedha kam hi |
| `Task` | Kaam + uska aane wala result | Har async kaam |
| `async/await` | Wait ke dauraan thread **free** | DB, API, file — har I/O |
| `Task.Run` | Kaam ko background thread pe bhejna | Bhaari CPU calculation |

**Aise socho:** restaurant mein waiter (thread). **Bina async**: waiter order leke kitchen ke bahar **khada rehta hai** jab tak khana na bane — baaki tables wait karti hain. **async/await**: waiter order kitchen mein deta hai (**await**), **doosri tables** ka order leta hai, khana bante hi wapas aata hai. Waiter wahi hain, kaam zyada ho gaya.

```csharp
// ❌ thread blocked — DB ka jawab aane tak kuch nahi kar sakta
var users = db.Users.ToList();

// ✅ await ke dauraan thread doosri requests sambhalta hai
var users2 = await db.Users.ToListAsync();

// CPU wala bhaari kaam — background thread pe
var report = await Task.Run(() => BuildHugeReport());
```

! `async` likhne se naya thread nahi banta. Aur `.Result` / `.Wait()` lagaya to waiter phir se bahar khada ho gaya — async ka fayda khatam.

> Thread = waiter. Task = order ki parchi. await = parchi dekar doosri table pe chale jaana.

## class vs struct vs record — kab kaunsa?
? Ek chhota Money type chahiye (amount + currency) jo value ki tarah compare ho — class, struct ya record?
**Ek line:** `class` = normal object (reference); `struct` = chhoti value (copy hoti hai); `record` = **data rakhne** wali class jo **values se compare** hoti hai aur badalti nahi.

| | class | struct | record |
| --- | --- | --- | --- |
| Type | Reference | Value | Reference (`record struct` = value) |
| Assign pe | Address copy | Poori copy | Address copy |
| `==` | Same object? | (define karna padta) | **Values same?** |
| Badal sakte? | ✅ | ✅ | Default mein nahi (`with` se copy) |
| Use | Services, entities, logic | Chhoti values: Point, Color | DTOs, API request/response, events |

**Aise socho:** class = **ghar** (address se pehchana jaata hai). struct = **note (₹100)** — do ₹100 ke note same hain, kaunsa wala koi farak nahi, aur dene pe haath badal jaata hai (copy). record = **printed bill** — likha hua badal nahi sakte, galti ho to naya bill (`with`), aur do bill same tab jab likha hua same ho.

```csharp
public class Customer { public int Id; public string Name = ""; }     // entity
public struct Point { public int X, Y; }                              // chhoti value
public record OrderDto(int Id, decimal Total);                        // data

var a = new OrderDto(1, 500);
var b = a with { Total = 600 };        // copy + badlav, a waisa hi
Console.WriteLine(a == new OrderDto(1, 500));   // True
```

> Logic/entity → class. Chhoti value (16 bytes tak) → struct. Sirf data le jaana hai → record.
