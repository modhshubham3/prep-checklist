## var
`var` se tum compiler ko bolte ho "type tum khud samajh lo". Compiler right side ki value dekh ke **compile time pe** type decide kar deta hai, aur uske baad variable ka type hamesha ke liye fix ho jaata hai. Yani `var` se code **dynamically typed nahi** hota — wo utna hi strongly typed hai jitna explicit type likhne pe.

Rules: `var` sirf local variables ke liye hai (fields ya method parameters mein nahi), aur declaration ke saath hi value deni padti hai. `var x = null;` nahi chalega kyunki null se type pata nahi chalta.

Kab use karein? Jab type right side se saaf dikh raha ho (`var list = new List<Order>();`) ya type bahut lamba ho. LINQ mein **anonymous types** ke liye `var` zaroori hai kyunki unka koi naam hi nahi hota. Jahan type samajh na aaye (`var result = Process();`), wahan explicit type likhna code padhne walon ke liye better hai.

```csharp
var name = "John";           // string
var count = 10;              // int
// count = "ten";            // compile error — type ab int hai

var orders = new List<Order>();
var summary = orders.Select(o => new { o.Id, o.Total });   // anonymous type — var zaroori
```

! "`var` JavaScript ke `var` jaisa hai / dynamic hai" — galat. C# ka `var` compile time pe fix hota hai.

> `var` = compiler type guess karta hai **ek baar**, phir type pakka.

## dynamic
`dynamic` ke saath **type checking compile time pe nahi, runtime pe** hoti hai. Compiler `dynamic` variable pe kuch bhi likhne deta hai — method call, property, operator — aur check runtime pe DLR (Dynamic Language Runtime) karta hai. Galat member hua to runtime pe `RuntimeBinderException` aayega.

Isliye `dynamic` mein IntelliSense aur compile-time safety dono chale jaate hain. Performance bhi thodi kam hoti hai kyunki har call pe runtime binding hoti hai.

Kab kaam aata hai? COM interop (Excel automation), dynamic languages (IronPython) ke saath, ya jab kisi JSON ka shape pehle se pata na ho. Normal business code mein `dynamic` se bacho — strongly typed classes ya `JsonElement` better hain.

| var | dynamic |
|---|---|
| Type compile time pe fix | Type runtime pe check |
| IntelliSense milta hai | IntelliSense nahi |
| Galti compile time pe pakdi | Galti runtime pe crash |
| Koi performance cost nahi | Runtime binding ki cost |

```csharp
dynamic x = 10;
x = "hello";            // chalta hai — type badal sakta hai
Console.WriteLine(x.Length);   // 5
x.DoMagic();            // compile ho jaayega, runtime pe RuntimeBinderException
```

> `var` = compile time pe type fix. `dynamic` = runtime tak "dekhte hain".

## const
`const` ek **compile-time constant** hai — uski value code compile hote waqt hi fix ho jaati hai aur baad mein kabhi nahi badal sakti. Declaration ke saath hi value deni padti hai.

`const` implicitly **static** hota hai — isliye `ClassName.Constant` se access karte ho, object ki zaroorat nahi. Sirf primitive types (`int`, `double`, `bool`, `char`…), `string`, `enum` aur `null` hi `const` ho sakte hain — koi object ya `DateTime.Now` jaisi runtime value nahi.

**Hidden trap**: compiler `const` ki value ko har us jagah **copy (bake)** kar deta hai jahan wo use hui. Agar Library A mein `const int MaxRetry = 3` hai aur App B use karta hai, to B ke compiled code mein seedha `3` likha jaata hai. Ab A mein 5 kar do aur sirf A ki DLL badlo — B abhi bhi 3 hi use karega jab tak B rebuild na ho. Isliye jo value kabhi badal sakti hai, use public `const` mat banao — `static readonly` use karo.

```csharp
public class Config
{
    public const double Pi = 3.14159;
    public const string AppName = "Prep";
    // public const DateTime Start = DateTime.Now;   // error — runtime value
}

double area = Config.Pi * r * r;    // compiler yahan seedha 3.14159 likh deta hai
```

> const ki value DLL mein bake ho jaati hai — library update pe consumer ko rebuild karna padta hai.

## readonly
`readonly` field ki value **sirf do jagah** set ho sakti hai: declaration pe, ya class ke **constructor** mein. Uske baad wo change nahi ho sakti. Isliye ise "runtime constant" kehte hain — value runtime pe calculate ho sakti hai (jaise `DateTime.Now` ya constructor parameter), par set hone ke baad locked.

`const` se farak: har object ki `readonly` value alag ho sakti hai (constructor se aati hai), aur ye kisi bhi type ki ho sakti hai. `static readonly` class-level constant ke liye use hota hai jiski value runtime pe aati hai — aur ye const ki tarah consumer mein bake nahi hota.

**Dhyaan do**: `readonly` sirf reference ko lock karta hai, object ko nahi. `readonly List<int>` mein naya list assign nahi kar sakte, par `.Add()` kar sakte ho. Poora immutable chahiye to `IReadOnlyList` ya `ImmutableList` use karo.

| const | readonly |
|---|---|
| Compile time pe value | Runtime pe value (constructor tak) |
| Implicitly static | Instance ya static — dono |
| Sirf primitive/string/enum | Koi bhi type |
| Consumer mein bake hota hai | Bake nahi hota |

```csharp
public class Order
{
    public readonly DateTime CreatedAt;          // har order ka alag
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
    private readonly List<string> _items = new();

    public Order() { CreatedAt = DateTime.Now; }  // constructor mein set — allowed

    public void Add(string item) => _items.Add(item);   // chalega — list ka content badal raha hai
    // public void Reset() => _items = new();            // error — reference readonly hai
}
```

> const = compile time, readonly = run time. Har object ki readonly value alag ho sakti hai.

## static
`static` member **class ka hota hai, object ka nahi**. Poori application mein uski ek hi copy hoti hai jo saare objects share karte hain, aur use access karne ke liye object banana nahi padta — `ClassName.Member`.

**Static class** (`static class`) ka object ban hi nahi sakta, sirf static members ho sakte hain, aur wo inherit nahi hoti. Utility/helper methods (`Math.Max`, `string.IsNullOrEmpty`) aur **extension methods** static class mein hi likhe jaate hain. **Static constructor** class ke pehle use se theek pehle ek hi baar chalta hai.

Dhyaan rakhne wali baatein: static fields poori app mein shared hain — web app mein ek saath kai requests unhe badal sakti hain, to thread-safety ka dhyan rakhna padta hai. Static state ko test karna bhi mushkil hota hai. Isliye ASP.NET Core mein shared state ke liye static fields ki jagah **Singleton DI service** better hai. Static method `this` use nahi kar sakta aur instance members seedha access nahi kar sakta.

```csharp
public class Counter
{
    public static int Total;              // saare objects mein shared
    public int Mine;                      // har object ka apna

    public Counter() { Total++; Mine++; }
}

new Counter(); new Counter();
Console.WriteLine(Counter.Total);         // 2 — object ke bina access

public static class StringExtensions      // extension methods yahin
{
    public static bool IsBlank(this string s) => string.IsNullOrWhiteSpace(s);
}
```

! Web app mein mutable `static` field (jaise `static List<User>`) race conditions aur memory leaks ka common kaaran hai.

> static = class ka, object ka nahi. Isliye `new` ki zaroorat nahi.

## sealed
`sealed` class se **aage inherit nahi kiya ja sakta**. Aur `sealed override` method ko child class dobara override nahi kar sakti.

Kyun use karte hain? (1) **Design lock** — tum nahi chahte ki koi tumhari class extend karke uska behaviour tod de (jaise security-sensitive ya carefully tuned class). (2) **Intent saaf** — class inheritance ke liye design nahi ki gayi. (3) Thodi **performance** — JIT sealed class ke virtual calls ko direct calls mein badal sakta hai (devirtualization).

.NET ka `string` class sealed hai — isliye koi `string` se inherit karke uski immutability nahi tod sakta. Records bhi `sealed` banaye ja sakte hain. Static class implicitly sealed hoti hai.

```csharp
public sealed class JwtTokenService { }
// public class MyTokenService : JwtTokenService { }   // compile error

public class Base   { public virtual void Run() { } }
public class Middle : Base { public sealed override void Run() { } }
public class Leaf   : Middle
{
    // public override void Run() { }   // error — Middle ne seal kar diya
}
```

> string sealed hai. Security ya design lock ke liye sealed lagao.

## partial
`partial` keyword se ek class (ya struct, interface, method) ka code **kai files mein baant** sakte ho. Compile hone pe compiler saare hisse jod ke ek hi class bana deta hai — runtime pe koi farak nahi.

Sabse bada use case: **generated code aur apna code alag rakhna**. WinForms/WPF designer, EF Core scaffolding, gRPC, source generators — ye sab code generate karte hain. Agar tum generated file mein apna code likh do, to agli baar regenerate hone pe wo mit jaayega. `partial` se generated code ek file mein, tumhara code doosri file mein — dono safe.

Rules: saare hisse same namespace aur same assembly mein hone chahiye, aur sabpe `partial` likhna zaroori hai. **Partial methods** mein declaration ek file mein aur implementation doosri mein ho sakti hai.

```csharp
// Order.Generated.cs  — tool ne banaya, haath mat lagao
public partial class Order
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
}

// Order.cs  — tumhara code, regenerate pe safe
public partial class Order
{
    public bool IsLarge => Amount > 10_000;
}
```

> Designer-generated code aur apna code alag rakhne ke liye partial.

## Method Overloading
**Method overloading** matlab ek hi class mein **same naam ke kai methods, alag parameter list** ke saath. Parameters ka number, type ya order alag hona chahiye. Kaunsa method chalega ye compiler **compile time pe** arguments dekh ke decide karta hai — isliye ise compile-time polymorphism kehte hain.

Fayda: caller ke liye API saaf rehti hai — `Log(string)`, `Log(Exception)`, `Log(string, Exception)`; har baar naya naam yaad nahi rakhna padta. `Console.WriteLine` ke 18 overloads hain.

**Sirf return type badalne se overload nahi hota** — `int Get()` aur `string Get()` compile error dega, kyunki call site pe compiler ko pata nahi chalega kaunsa chahiye. Optional parameters aur overloads ko mix karne se ambiguity aa sakti hai, dhyan rakho.

```csharp
public class PaymentService
{
    public void Pay(int amount) { }
    public void Pay(decimal amount, string currency) { }
    public void Pay(string upiId, decimal amount) { }     // order alag — valid overload
    // public int Pay(int amount) { }                      // error — sirf return type alag
}

var svc = new PaymentService();
svc.Pay(500);              // pehla
svc.Pay(99.5m, "USD");     // doosra
```

! "Return type alag karke overload kar sakte hain" — galat. Parameters alag hone chahiye.

## Method Overriding
**Method overriding** mein child class, parent class ke method ko **apne tareeke se dobara likhti** hai — same naam, same parameters, same return type. Ye **runtime polymorphism** hai: kaunsa version chalega ye variable ke type se nahi, **object ke asli type** se runtime pe decide hota hai.

Override karne ke liye parent method `virtual`, `abstract` ya `override` hona chahiye, aur child mein `override` keyword lagana padta hai. Child mein `base.Method()` call karke parent ka logic bhi chala sakte ho aur uske upar kuch jod sakte ho.

**`new` keyword (method hiding) se farak**: agar child mein `override` ki jagah `new` likha, to parent ka method chhup jaata hai par polymorphism nahi hota — `Animal a = new Dog(); a.Speak();` parent wala chalega. Ye aksar bug ka kaaran banta hai.

```csharp
public class Animal
{
    public virtual string Speak() => "...";
}
public class Dog : Animal
{
    public override string Speak() => "Woof";
}
public class Cat : Animal
{
    public new string Speak() => "Meow";          // hiding, overriding nahi
}

Animal a = new Dog();  Console.WriteLine(a.Speak());   // "Woof" — override
Animal b = new Cat();  Console.WriteLine(b.Speak());   // "..." — new ne override nahi kiya
```

> Parent mein `virtual`/`abstract` hona zaroori hai, warna override nahi kar sakte.

## Virtual
`virtual` keyword method (ya property) ko **override hone ki permission** deta hai, par saath mein ek **default implementation** bhi deta hai. Child class chahe to override kare, chahe to parent wala hi use kare.

C# mein methods **by default non-virtual** hote hain (Java mein ulta hai). Yani jab tak tum `virtual` na likho, child override nahi kar sakti. Ye jaan-boojh ke design hai — class ke author ko decide karna padta hai ki kaunse hisse extend ho sakte hain.

Virtual call thodi si mehngi hoti hai kyunki runtime ko vtable se sahi method dhoondhna padta hai — par normal code mein ye negligible hai. EF Core lazy loading ke liye navigation properties ko `virtual` banana padta hai, taaki EF proxy class unhe override kar sake.

| virtual | abstract |
|---|---|
| Body hoti hai (default logic) | Body nahi hoti |
| Override optional | Override compulsory |
| Normal class mein bhi | Sirf abstract class mein |

```csharp
public class Customer
{
    public virtual decimal GetDiscount() => 0;         // default: koi discount nahi
}
public class PremiumCustomer : Customer
{
    public override decimal GetDiscount() => 0.10m;    // apna logic
}
public class RegularCustomer : Customer { }            // override nahi kiya — 0 milega
```

> virtual = optional override. abstract = compulsory override.

## Abstract Method
**Abstract method** mein sirf **declaration hota hai, body nahi**. Wo kehta hai "har child class ko ye method likhna hi padega". Agar child class use implement nahi karti, to wo child bhi abstract banni chahiye, warna compile error.

Abstract method sirf **abstract class** ke andar ho sakta hai, aur wo implicitly virtual hota hai (isliye `virtual` likhne ki zaroorat nahi). Ye `private` nahi ho sakta, kyunki child ko use dekhna aur override karna hai.

Kab use karein? Jab parent ko pata hai ki "ye step hoga", par "kaise hoga" har child ka alag hai. Classic example **Template Method pattern**: parent mein poora flow likha hai (validate → calculate → save), aur sirf `Calculate()` abstract hai jo har child apne tareeke se karta hai.

```csharp
public abstract class ReportGenerator
{
    public string Generate()                       // flow fixed (template method)
    {
        var data = LoadData();
        return Format(data);
    }
    protected abstract List<string> LoadData();    // har report ka alag
    protected virtual string Format(List<string> d) => string.Join(",", d);
}

public class SalesReport : ReportGenerator
{
    protected override List<string> LoadData() => new() { "Jan:100", "Feb:120" };
}
```

> Abstract method sirf abstract class mein ho sakta hai, aur child ko override karna hi padta hai.

## Interface
**Interface** ek **contract** hai — ye batata hai ki class ko **kya** karna padega (method, property, event ke signatures), **kaise** karna hai ye nahi. Jo class interface implement karti hai, use uske saare members likhne padte hain.

Ek class **kai interfaces** implement kar sakti hai — C# mein multiple inheritance ka yahi tareeka hai. Interface ka object nahi banta, aur usme instance fields (state) nahi ho sakte. C# 8 se interface mein **default method implementation** aur static members bhi ho sakte hain, par iska asli kaam contract define karna hi hai.

Interface **loose coupling** ki buniyaad hai. `OrderService` agar `IOrderRepository` pe depend kare (concrete `SqlOrderRepository` pe nahi), to kal database badalna ho ya unit test mein fake repository daalni ho — `OrderService` nahi chhedna padta. ASP.NET Core ka poora Dependency Injection isi pe chalta hai. Naming convention: naam `I` se shuru (`IRepository`, `ILogger`).

```csharp
public interface IOrderRepository
{
    Task<Order?> GetAsync(int id);
    Task SaveAsync(Order order);
}

public class PgOrderRepository : IOrderRepository
{
    public Task<Order?> GetAsync(int id) => /* Npgsql query */ Task.FromResult<Order?>(null);
    public Task SaveAsync(Order order) => Task.CompletedTask;
}

builder.Services.AddScoped<IOrderRepository, PgOrderRepository>();   // DI mein interface → class
```

> Interface = "kya karna hai" ka contract. Ek class kai contracts sign kar sakti hai.

## Abstract Class
**Abstract class** ek aisi class hai jiska **object nahi ban sakta** — ye sirf base class ki tarah use hoti hai. Ismein **dono** ho sakte hain: abstract members (sirf declaration, child ko likhna padega) aur normal members (poori implementation, jo saare children share karenge).

Interface se bada farak: abstract class ke paas **state** (fields), **constructors**, aur access modifiers (`protected`, `private`) ho sakte hain. Isliye jab kai related classes mein common data aur common logic ho, to abstract class us common hisse ko ek jagah rakh deti hai.

Limitation: class sirf **ek** abstract class se inherit kar sakti hai. Isliye agar tumhe sirf "capability" batani hai (jaise `IComparable`, `IDisposable`), to interface better hai; agar "family" banani hai jisme common code ho, to abstract class.

```csharp
public abstract class Vehicle
{
    protected string RegNo;                          // state
    protected Vehicle(string regNo) { RegNo = regNo; }   // constructor

    public string Describe() => $"{GetType().Name} {RegNo}";   // common logic
    public abstract decimal TollCharge();            // har vehicle ka alag
}

public class Bus : Vehicle
{
    public Bus(string reg) : base(reg) { }
    public override decimal TollCharge() => 250;
}
// var v = new Vehicle("X");   // error — abstract class ka object nahi banta
```

> Abstract class = adhoora blueprint: kuch kaam ho chuka hai, kuch child ko karna hai.

## Abstract Class vs Interface
Ye top-5 interview sawaal hai. Seedha jawab: **abstract class tab, jab related classes ke beech common state ya common code share karna ho ("is-a" family). Interface tab, jab sirf ek capability ya contract batana ho ("can-do"), khaas kar unrelated classes ke liye.**

Example: `Bus`, `Truck`, `Car` sab `Vehicle` hain aur sabke paas `RegNo`, `Describe()` common hai → abstract class `Vehicle`. Par `Bus`, `Printer`, `Invoice` — teeno bilkul alag cheezein hain, phir bhi teeno "print ho sakti hain" → interface `IPrintable`.

Practical design mein aksar dono saath use hote hain: interface contract ke liye (DI aur testing ke liye), aur ek abstract base class jo interface implement karke common code de de (jaise `ControllerBase`).

| Abstract Class | Interface |
|---|---|
| Common implementation + state rakh sakti hai | Mainly contract (C# 8+ mein default methods bhi) |
| Fields, constructors ho sakte hain | Instance fields nahi, constructor nahi |
| Sirf ek base class | Kai interfaces implement kar sakte ho |
| Access modifiers: protected, private… | Members by default public |
| "is-a" — family | "can-do" — capability |
| Naya method jodo, children ko default mil jaata hai | Naya member jodna implementers ko tod sakta hai (default impl na ho to) |

```csharp
public interface IPrintable { void Print(); }          // capability

public abstract class Vehicle                           // family
{
    public string RegNo { get; init; } = "";
    public abstract decimal TollCharge();
}

public class Bus : Vehicle, IPrintable                  // ek base class + kai interfaces
{
    public override decimal TollCharge() => 250;
    public void Print() => Console.WriteLine($"Bus {RegNo}");
}
```

! "Interface mein koi implementation nahi ho sakti" — C# 8 ke baad ye poora sach nahi, default interface methods hote hain. Par state (fields) ab bhi nahi ho sakti.

> Family (is-a) → abstract class. Capability (can-do) → interface.

## ref
`ref` se argument **reference se pass** hota hai — method ko variable ki copy nahi, **wahi variable** milta hai. Method ke andar jo change hoga, wo caller ke variable mein bhi dikhega.

Rules: caller ko variable **pehle se initialize** karna padta hai (kyunki method use padh bhi sakta hai), aur call karte waqt bhi `ref` likhna padta hai — isse call site pe saaf dikhta hai ki variable badal sakta hai.

Reference type ke saath bhi `ref` ka matlab hai: method variable ko **naye object** pe point karwa sakta hai. Bina `ref` ke method object ka content badal sakta hai, par caller ke variable ko naya object nahi de sakta.

```csharp
void Double(ref int x) { x = x * 2; }

int n = 5;
Double(ref n);
Console.WriteLine(n);   // 10 — original badal gaya

void Reset(ref List<int> list) { list = new List<int>(); }   // naya object caller tak jaata hai
var items = new List<int> { 1, 2 };
Reset(ref items);
Console.WriteLine(items.Count);   // 0
```

> ref = Read + Write. Pehle initialize karo, phir bhejo.

## out
`out` bhi reference se pass karta hai, par iska matlab hai **"ye method is variable mein value daal ke dega"**. Isliye method ko `out` parameter ko **return se pehle value assign karni hi padti hai**, aur caller ko variable initialize karne ki zaroorat nahi.

Sabse common use: **ek se zyada value return karna**, khaas kar `TryXxx` pattern — method `bool` return karta hai ki kaam hua ya nahi, aur asli result `out` mein. Isse exception ki jagah saaf success/failure milta hai, jo performance mein bhi better hai (exceptions mehnge hote hain).

Modern C# mein `out var` se variable call ke andar hi declare kar sakte ho. Kai values return karni ho to **tuples** (`(int, string)`) bhi ek achha option hai.

```csharp
if (int.TryParse("123", out int number))
    Console.WriteLine(number);        // 123
else
    Console.WriteLine("Invalid");

bool TryGetUser(int id, out User? user)
{
    user = id == 1 ? new User() : null;   // assign karna compulsory
    return user != null;
}

(int min, int max) Range(int[] a) => (a.Min(), a.Max());   // tuple — out ka alternative
```

> out = Must Output. `TryParse` ka dost.

## in
`in` parameter **reference se pass hota hai, par read-only** — method use padh sakta hai, badal nahi sakta. Compiler koi bhi assignment rok deta hai.

Kyun chahiye? **Bade structs** ke liye. Struct value type hai, to normally har method call pe poora struct copy hota hai. 100 bytes ka struct loop mein lakhon baar pass karo to bahut copying. `in` se sirf reference jaata hai (copy nahi), aur read-only hone se original ke badalne ka darr bhi nahi.

Chhote types (`int`, `double`) ya classes ke liye `in` ka koi fayda nahi — ulta nuksaan ho sakta hai. Aur agar struct `readonly struct` nahi hai, to uska method call karne pe compiler "defensive copy" bana sakta hai, jisse fayda khatam. Isliye `in` ko `readonly struct` ke saath use karo.

```csharp
public readonly struct Matrix4x4Big { /* 16 doubles = 128 bytes */ }

double Determinant(in Matrix4x4Big m)
{
    // m = new Matrix4x4Big();   // compile error — in parameter read-only hai
    return 0;
}
```

> in = Read Only reference. Bade struct ki copying bachane ke liye.

## ref vs out vs in — kab kaunsa?
Teeno argument ko **reference se** pass karte hain (copy nahi banti). Farak sirf ye hai ki kaun kya kar sakta hai aur initialization kiski zimmedari hai.

**`ref`** — method padh bhi sakta hai aur badal bhi sakta hai. Caller initialize karta hai. Use: jab method ko existing value ke upar kaam karna ho (swap, increment).

**`out`** — method ko value **deni hi padti** hai. Caller initialize nahi karta. Use: extra return values, `TryParse` pattern.

**`in`** — method sirf padh sakta hai. Caller initialize karta hai. Use: bade `readonly struct` ko bina copy ke pass karna.

| | ref | out | in |
|---|---|---|---|
| Caller initialize kare? | Haan | Nahi | Haan |
| Method padh sakta hai? | Haan | Assign ke baad | Haan |
| Method badal sakta hai? | Haan | Haan, compulsory | Nahi |
| Call site pe keyword | `ref x` | `out x` | `in x` ya kuch nahi |
| Typical use | Swap, in-place update | TryParse, multiple returns | Bade struct, performance |

```csharp
void Swap(ref int a, ref int b) => (a, b) = (b, a);
bool TryDivide(int x, int y, out int result) { result = y == 0 ? 0 : x / y; return y != 0; }
double Length(in Vector3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);
```

! Async methods aur iterators (`yield`) mein `ref`/`out`/`in` parameters allowed nahi hain.

> ref = Read + Write, out = Must Output, in = Read Only.

## ==
`==` ek **operator** hai, aur iska behaviour type pe depend karta hai.

**Value types** (`int`, `double`, `DateTime`) ke liye `==` **values compare** karta hai. **Reference types** (classes) ke liye by default `==` **reference compare** karta hai — dono variables ek hi object ko point kar rahe hain ya nahi. Do alag objects jinke saare properties same hain, `==` phir bhi `false` dega.

Par koi bhi type `==` ko **overload** kar sakta hai. `string` ne kiya hai — isliye `"abc" == "abc"` content compare karta hai aur `true` deta hai. `record` types bhi `==` ko value comparison mein badal dete hain.

Ek important baat: `==` **compile time** ke type ke hisaab se chalta hai. Agar do strings ko `object` variable mein rakh ke `==` karo, to string wala overload nahi chalega — reference comparison hoga.

```csharp
int a = 5, b = 5;
Console.WriteLine(a == b);            // true — value

var p1 = new Person { Name = "A" };
var p2 = new Person { Name = "A" };
Console.WriteLine(p1 == p2);          // false — alag objects

string s1 = "hi", s2 = new string("hi".ToCharArray());
Console.WriteLine(s1 == s2);          // true — string ne == overload kiya
object o1 = s1, o2 = s2;
Console.WriteLine(o1 == o2);          // false — object ka ==, reference comparison
```

> == ka matlab type decide karta hai — aur wo bhi compile-time type.

## Equals()
`Equals()` ek **virtual method** hai jo `System.Object` mein define hai, isliye har type ke paas hota hai. Default implementation reference types ke liye **reference equality** hai (same object?), aur structs ke liye field-by-field value comparison (jo reflection se hota hai, isliye slow).

Iska asli kaam: tum ise **override** karke apni class ke liye "logically barabar" ka matlab define kar sakte ho — jaise do `Employee` barabar hain agar unka `Id` same hai. Kyunki ye virtual hai, ye **runtime type** ke hisaab se chalta hai (`==` ki tarah compile-time pe nahi).

**Golden rule**: `Equals()` override karo to **`GetHashCode()` bhi override karna zaroori hai**, aur do equal objects ka hash code same hona chahiye. Warna `Dictionary`, `HashSet` aur LINQ ka `Distinct()` galat kaam karenge — object add karoge par dhoondhoge to milega nahi. Modern C# mein `record` ye sab automatically generate kar deta hai.

```csharp
public class Employee
{
    public int Id { get; init; }
    public string Name { get; init; } = "";

    public override bool Equals(object? obj) => obj is Employee e && e.Id == Id;
    public override int GetHashCode() => Id.GetHashCode();     // saath mein zaroori
}

var a = new Employee { Id = 1, Name = "Asha" };
var b = new Employee { Id = 1, Name = "Asha K" };
Console.WriteLine(a.Equals(b));   // true — Id same
Console.WriteLine(a == b);        // false — == overload nahi kiya

public record EmpDto(int Id, string Name);   // Equals + GetHashCode + == sab ready
```

! `Equals` override kiya aur `GetHashCode` bhool gaye — `HashSet`/`Dictionary` mein bug. Interviewer yahi follow-up poochta hai.

## ReferenceEquals()
`Object.ReferenceEquals(a, b)` sirf ek cheez check karta hai: **kya dono references exactly ek hi object ko point kar rahe hain?** Ye static method hai, aur ise override ya overload nahi kiya ja sakta — isliye iska jawab hamesha bharosemand hai, chahe class ne `==` ya `Equals` kuch bhi kar rakha ho.

Kab kaam aata hai? Jab tum khud `==` ya `Equals` override kar rahe ho, aur uske andar null check ya "same object" shortcut chahiye — wahan `==` use karoge to infinite recursion ho sakta hai. Value types ke liye ye hamesha `false` deta hai, kyunki dono taraf alag-alag boxed copies banti hain.

Modern C# mein `x is null` bhi overload ko bypass karta hai aur null check ke liye zyada padhne mein aasaan hai.

```csharp
var a = new Employee { Id = 1 };
var b = new Employee { Id = 1 };
var c = a;

Console.WriteLine(ReferenceEquals(a, b));   // false — alag objects (bhale Equals true ho)
Console.WriteLine(ReferenceEquals(a, c));   // true — same object

public static bool operator ==(Employee? x, Employee? y)
{
    if (ReferenceEquals(x, y)) return true;            // same object ya dono null
    if (x is null || y is null) return false;
    return x.Id == y.Id;
}
```

## == vs Equals() vs ReferenceEquals() — farak kya hai?
Teeno "barabar hai?" poochhte hain, par alag sawaal:

**`ReferenceEquals`** — "kya ye **wahi object** hai?" Hamesha reference comparison, koi override nahi kar sakta.

**`Equals()`** — "kya ye **logically barabar** hai?" Virtual method, class override karke apna matlab deti hai. Runtime type ke hisaab se chalta hai.

**`==`** — operator. Value types ke liye value, reference types ke liye default reference comparison — par class overload kar sakti hai (string, record karte hain). **Compile-time** type ke hisaab se decide hota hai.

Isliye `==` aur `Equals()` **hamesha same jawab nahi dete**. Class ne sirf `Equals` override kiya ho to `a.Equals(b)` true aur `a == b` false ho sakta hai. Achhi class dono ko consistent rakhti hai — ya seedha `record` use karo.

| | == | Equals() | ReferenceEquals() |
|---|---|---|---|
| Kya hai | Operator | Virtual method | Static method |
| Override/overload | Overload ho sakta hai | Override ho sakta hai | Nahi |
| Kab decide | Compile time | Runtime | — |
| Default (class) | Reference | Reference | Reference |
| string pe | Content | Content | Reference |

```csharp
string x = "hello";
string y = string.Concat("hel", "lo");     // alag object, same content
Console.WriteLine(x == y);                 // true
Console.WriteLine(x.Equals(y));            // true
Console.WriteLine(ReferenceEquals(x, y));  // false
```

> ReferenceEquals = same object? Equals = same meaning? == = type jo bole.
