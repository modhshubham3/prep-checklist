<!--
  Answers + examples — source files. Edit these, then run:
      node tools/build-answers.js
  Files are read in name order; a file without a "# " heading continues the
  previous group. Format is described at the top of tools/build-answers.js.
-->

# C# — fundamentals, OOP aur core concepts

## What is C#?
C# ek **strongly typed, object-oriented** programming language hai jo Microsoft ne .NET platform ke liye banayi. "Strongly typed" matlab har variable ka type compile time pe fix hota hai — `int` mein string daaloge to code compile hi nahi hoga. Isse bahut saari galtiyan runtime se pehle hi pakad mein aa jaati hain.

C# sirf OOP nahi hai — ismein functional features bhi hain (lambda, LINQ, pattern matching, records), async programming ke liye `async/await`, aur generics. Isse Web APIs (ASP.NET Core), desktop apps, background services, games (Unity) aur cloud functions sab bante hain.

C# code seedha machine code mein compile nahi hota. Pehle wo **IL (Intermediate Language)** mein compile hota hai, phir runtime pe CLR ka JIT compiler use machine code banata hai. Isi wajah se C# cross-platform chal pata hai.

- Strongly typed aur type-safe — galat type ka operation compile time pe pakda jaata hai
- Memory management automatic — Garbage Collector sambhalta hai
- Modern features: LINQ, async/await, generics, records, pattern matching

```csharp
string name = "John";      // type fixed: string
int age = 25;
// age = "twenty";         // compile error — strongly typed
var city = "Pune";         // compiler infer karta hai: string
```

> C# → IL → CLR (JIT) → machine code. Yahi chain har interview mein kaam aati hai.

## What is .NET?
.NET ek **development platform** hai — sirf language nahi. Ismein teen cheezein milkar aati hain: ek **runtime** (CLR, jo code chalata hai aur memory sambhalta hai), ek bahut badi **class library** (BCL — collections, file I/O, HTTP, JSON sab ready), aur **tools/SDK** (compiler, `dotnet` CLI, NuGet).

.NET pe C#, F# aur VB.NET teeno chal sakti hain, kyunki sab ek hi IL mein compile hoti hain. Aaj ka .NET (6, 7, 8…) cross-platform hai — Windows, Linux, macOS teeno pe chalta hai, aur Docker containers mein bhi.

Isse bante hain: Web APIs aur websites (ASP.NET Core), desktop apps (WPF, WinForms, MAUI), background workers, microservices, cloud functions.

- Runtime (CLR) + class library (BCL) + SDK/tools = .NET
- Kai languages, ek common runtime
- Modern .NET cross-platform aur open source hai

```bash
dotnet new webapi -n MyApi   # naya Web API project
dotnet run                   # build + run
```

! ".NET ek language hai" — galat. .NET platform hai, C# uski ek language hai.

## .NET Framework vs .NET Core
**.NET Framework** (2002) purana, Windows-only platform hai. Iska aakhri version 4.8.x hai — ab isme naye features nahi aate, sirf security fixes. IIS aur Windows se tightly juda hua hai.

**.NET Core** (2016) scratch se dobara likha gaya — cross-platform, open source, fast aur modular. 2020 mein Microsoft ne "Core" naam hata diya, isliye .NET Core 3.1 ke baad seedha **.NET 5**, phir 6, 7, 8 aaye. Aaj jab koi ".NET" bolta hai to matlab yahi modern wala hota hai.

Naye projects hamesha modern .NET ke LTS version (jaise .NET 8) pe banao. .NET Framework sirf purane legacy projects maintain karne ke liye bacha hai.

| .NET Framework | .NET Core / .NET 5+ |
|---|---|
| Sirf Windows | Windows, Linux, macOS |
| Mostly closed source | Open source |
| IIS pe chalta hai | Kestrel (apna web server); IIS/Nginx ke peeche bhi |
| Naye features band | Har saal naya version, LTS har 2 saal |
| Docker ke liye bhaari | Docker-friendly, chhoti images |
| Performance kam | Kaafi tez |

- LTS (Long Term Support) versions: .NET 6, .NET 8 — production ke liye yahi chuno
- ASP.NET (Framework wala) aur ASP.NET Core alag cheezein hain

> Framework = purana Windows ghar. Core/.NET = naya, har jagah chalne wala ghar.

## CLR
? CLR kya hai, aur C# code run hone mein iska kya role hai?
**CLR (Common Language Runtime)** .NET ka engine hai — tumhara compiled IL code isi ke andar chalta hai. Java ke JVM ka .NET wala version samjho.

CLR ke main kaam:

- **JIT compilation** — IL ko runtime pe native machine code mein badalna
- **Garbage Collection** — heap ki memory automatic free karna
- **Type safety** — galat type casting ya invalid memory access rokna
- **Exception handling** — ek standard tareeka jo saari .NET languages share karti hain
- Thread management aur security checks

Jo code CLR ke control mein chalta hai use **managed code** kehte hain. Isi wajah se C# mein `free()` ya `delete` nahi likhna padta jaise C/C++ mein.

```text
Program.cs  --(C# compiler)-->  MyApp.dll (IL)
MyApp.dll   --(CLR + JIT)--->   native machine code  --> CPU
```

> CLR = .NET ka engine. JIT + GC + type safety + exceptions.

## CTS
? CTS kya hai — alag .NET languages ek doosre ke types kaise samajh paati hain?
**CTS (Common Type System)** ek standard hai jo batata hai ki .NET mein types kaise define hote hain, memory mein kaise rehte hain aur kaise behave karte hain. Isi ki wajah se alag-alag .NET languages ek doosre ke types samajh paati hain.

Example: C# ka `int` aur VB.NET ka `Integer` — dono asal mein ek hi CTS type `System.Int32` hain. Isliye ek C# library ko VB.NET project bina kisi conversion ke use kar sakta hai.

CTS types ko do family mein baantta hai — **value types** (struct, enum, int, bool) aur **reference types** (class, interface, delegate, string, array).

| C# keyword | CTS type |
|---|---|
| `int` | `System.Int32` |
| `long` | `System.Int64` |
| `string` | `System.String` |
| `bool` | `System.Boolean` |
| `object` | `System.Object` |

> C# ka `int` sirf ek alias (nickname) hai — asli naam `System.Int32` hai.

## CLS
? CLS kya hai aur CTS se kaise alag hai?
**CLS (Common Language Specification)** CTS ka ek subset hai — rules ki ek list jo batati hai ki library kaisi likho taaki **har** .NET language use use kar sake.

Kuch features har language support nahi karti. Example: C# case-sensitive hai (`Name` aur `name` alag), par VB.NET nahi. Agar tumhari public class mein `Name` aur `name` dono public members hain, to VB.NET unhe alag nahi kar payega — ye CLS-compliant nahi hai. Isi tarah unsigned types (`uint`) bhi public API mein CLS-compliant nahi maane jaate.

Normal application code ke liye iski fikar kam hoti hai; ye tab zaroori hai jab tum NuGet library bana rahe ho jo doosri languages bhi use karengi.

```csharp
[assembly: CLSCompliant(true)]   // compiler warn karega agar rules tootein

public class Account
{
    public uint Balance { get; set; }   // warning: uint is not CLS-compliant
}
```

> CTS = saare possible types. CLS = unka wo hissa jo har language samajhti hai.

## Managed Code
? Managed code kya hota hai? Iske fayde batao.
**Managed code** wo code hai jo CLR ke control mein chalta hai. C#, F#, VB.NET mein likha har normal code managed hota hai.

"Managed" ka matlab: memory allocate aur free karna CLR (Garbage Collector) ka kaam hai, tumhara nahi. Array ke bahar access karoge to crash ki jagah `IndexOutOfRangeException` milega; galat type cast pe `InvalidCastException`. Yani runtime tumhe bahut saari khatarnak galtiyon se bachata hai.

Iski keemat thodi performance aur control hai — tum exact decide nahi kar sakte ki memory kab free hogi.

- Automatic memory management (GC)
- Type safety aur array bounds checking
- Standard exception handling

```csharp
var list = new List<int> { 1, 2, 3 };
// list free karne ki zaroorat nahi — GC khud karega
```

## Unmanaged Code
? Unmanaged code kya hai, aur C# se usko kaise call karte ho / uski memory kaun saaf karta hai?
**Unmanaged code** CLR ke bahar chalta hai — seedha OS aur CPU pe. C/C++ ki native DLLs, Windows API (`kernel32.dll`, `user32.dll`), COM components — ye sab unmanaged hain.

Yahan memory ka zimma programmer ka hai. Allocate kiya aur free nahi kiya to **memory leak**; galat pointer use kiya to crash. CLR inki memory track nahi karta.

C# se unmanaged code call karne ke do common tareeke hain: **P/Invoke** (`DllImport`) aur COM Interop. Jab koi .NET class unmanaged resource (file handle, DB connection, socket) pakadti hai, to use `IDisposable` implement karna chahiye taaki resource turant chhoda ja sake.

```csharp
using System.Runtime.InteropServices;

class Native
{
    [DllImport("user32.dll")]
    public static extern int MessageBox(IntPtr h, string text, string caption, uint type);
}
```

! "Unmanaged code .NET se chal hi nahi sakta" — galat. P/Invoke se call kar sakte ho, bas uski memory GC nahi sambhalta.

## JIT
? JIT compilation kya hai? C# code IL se machine code tak kaise pahunchta hai?
**JIT (Just-In-Time) compiler** CLR ka wo hissa hai jo IL ko **runtime pe** native machine code mein badalta hai — aur wo bhi tab, jab koi method pehli baar call hota hai. Ek baar compile hone ke baad wo machine code memory mein cache rehta hai, agli call seedha chalti hai.

Fayda: JIT us exact machine ke CPU ke hisaab se optimize kar sakta hai jispe code chal raha hai. Nuksaan: pehli call thodi slow hoti hai — isi ko "warm-up" ya startup cost kehte hain.

Modern .NET mein **Tiered Compilation** hai — pehle method jaldi se kam-optimize karke compile hota hai (Tier 0), aur agar wo baar-baar call ho raha hai to background mein zyada optimize karke dobara compile hota hai (Tier 1). Startup cost kam karne ke liye **ReadyToRun** aur **Native AOT** bhi hain, jo code pehle se compile kar dete hain.

| JIT | AOT (Ahead-of-Time) |
|---|---|
| Runtime pe compile | Build ke waqt compile |
| Pehli call slow (warm-up) | Startup bahut tez |
| Current CPU ke liye optimize | Generic, phir bhi tez |
| Reflection sab chalta hai | Kuch dynamic features limited |

```text
First call:  IL --JIT--> native code (cache)  --> run
Next calls:               native code (cache) --> run
```

> JIT = "zaroorat padne pe" compile. Pehli call ki keemat, baad mein free.

## OOP
? OOP ke 4 pillars kya hain? Har ek ka ek real example do.
**OOP (Object-Oriented Programming)** code ko **objects** ke around organize karne ka tareeka hai. Object mein data (fields/properties) aur us data pe kaam karne wala behaviour (methods) dono ek saath rehte hain — jaise asli duniya mein ek `Employee` ka naam bhi hota hai aur uski salary bhi calculate hoti hai.

OOP ke **4 pillars**: **Encapsulation** (data chhupao, control se access do), **Abstraction** (kya karta hai dikhao, kaise chhupao), **Inheritance** (parent ka code child mein reuse), **Polymorphism** (ek naam, alag behaviour).

Fayda: code real-world ke jaisa organize hota hai, reuse hota hai, aur ek jagah badlaav se poora system nahi toot-ta. Interview mein sirf definitions mat bolo — har pillar ka apne project se ek example do.

| Pillar | Ek line mein | C# mein kaise |
|---|---|---|
| Encapsulation | Data ki suraksha | `private` field + `public` property |
| Abstraction | Detail chhupao | `interface`, `abstract class` |
| Inheritance | Code reuse (is-a) | `class Dog : Animal` |
| Polymorphism | Ek naam, kai roop | overloading, `virtual`/`override` |

```csharp
public class Employee
{
    private decimal _salary;                                     // encapsulated data
    public string Name { get; set; } = "";
    public virtual decimal CalculateBonus() => _salary * 0.1m;   // polymorphism ke liye ready
}
```

> 4 pillars: **A PIE** — Abstraction, Polymorphism, Inheritance, Encapsulation.

## Encapsulation
? Encapsulation kya hai? Apne project ki kisi class se example do.
**Encapsulation** matlab data ko class ke andar band rakhna aur bahar walon ko sirf controlled tareeke se access dena. Field `private` rakhte hain aur access ke liye `public` property ya method dete hain, jisme validation likh sakte hain.

Kyun zaroori hai? Agar balance public field hota, to koi bhi `account.Balance = -5000` kar deta aur object galat state mein chala jaata. Method mein check laga do, to object hamesha valid rahega. Saath hi, andar ka implementation baad mein badal sakte ho (jaise balance DB se lana) bina bahar ka code tode.

Access modifiers encapsulation ke tools hain: `private` (sirf class ke andar), `protected` (class + child classes), `internal` (same assembly/project), `public` (sab), aur combinations `protected internal` / `private protected`.

```csharp
public class BankAccount
{
    private decimal _balance;                 // bahar se seedha access nahi

    public decimal Balance => _balance;       // sirf padh sakte ho

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Amount positive hona chahiye");
        _balance += amount;                   // rule ke saath hi change
    }
}
```

! "Encapsulation = sirf getter/setter" — adhoora jawab. Asli point hai **object ko invalid state mein jaane se rokna** aur implementation chhupana.

> Bank ka locker: paisa andar, chaabi (method) se hi nikalta hai, aur chaabi rules follow karti hai.

## Inheritance
? Inheritance kya hai, C# mein kaunse types support hote hain, aur kab inheritance avoid karoge?
**Inheritance** mein ek class (child/derived) doosri class (parent/base) ki properties aur methods le leti hai, aur apni nayi cheezein jod sakti hai. Ye **is-a** relationship dikhata hai — `Dog` IS-A `Animal`.

C# mein class sirf **ek** base class se inherit kar sakti hai (single inheritance), par kitne bhi interfaces implement kar sakti hai. Har class ultimately `System.Object` se inherit karti hai. `sealed` class se aage inherit nahi kar sakte. Child ka constructor pehle base constructor chalata hai (`: base(...)`).

Inheritance tabhi use karo jab "is-a" sach mein ho. Sirf code reuse ke liye inheritance lagana galat design hai — wahan **composition** (class ke andar doosri class ka object rakhna, "has-a") better hai. Gehri inheritance chains (5–6 level) samajhna aur badalna mushkil ho jaata hai.

```csharp
public class Animal
{
    public string Name { get; set; } = "";
    public virtual void Speak() => Console.WriteLine("...");
}

public class Dog : Animal                          // Dog IS-A Animal
{
    public override void Speak() => Console.WriteLine("Woof");
}

// Composition (has-a) — aksar better
public class Car
{
    private readonly Engine _engine = new Engine(); // Car HAS-A Engine
}
```

! "C# mein multiple inheritance hota hai" — classes ke liye nahi. Multiple **interfaces** implement kar sakte ho.

> "is-a" bol sakte ho to inheritance, "has-a" bolna pade to composition.

## Polymorphism
? Polymorphism kya hai? Compile-time aur runtime polymorphism ka farak example ke saath batao.
**Polymorphism** ka matlab "ek naam, kai roop" — ek hi method call alag situation mein alag kaam karta hai. C# mein ye do tarah ka hota hai.

**Compile-time (static) polymorphism** — method **overloading**: same naam, alag parameters. Compiler call dekh ke decide kar leta hai kaunsa method chalega.

**Runtime (dynamic) polymorphism** — method **overriding**: parent mein `virtual`/`abstract` method, child mein `override`. Kaunsa version chalega ye object ke **asli type** se runtime pe decide hota hai, variable ke type se nahi. Yahi OOP ka asli power hai — `List<Shape>` pe loop chala ke `Area()` bulao, aur har shape apna formula use karega. Naya shape jodne ke liye loop wala code chhedna nahi padta (Open/Closed principle).

| Compile-time | Runtime |
|---|---|
| Overloading | Overriding |
| Same class mein | Parent-child ke beech |
| Parameters se decide | Object ke asli type se decide |
| `virtual` ki zaroorat nahi | `virtual`/`abstract` + `override` zaroori |

```csharp
abstract class Shape { public abstract double Area(); }
class Circle : Shape { public double R; public override double Area() => Math.PI * R * R; }
class Square : Shape { public double S; public override double Area() => S * S; }

List<Shape> shapes = new() { new Circle { R = 2 }, new Square { S = 3 } };
foreach (var s in shapes)
    Console.WriteLine(s.Area());   // har object apna Area() chalata hai — runtime polymorphism
```

> Poly = bahut, morph = roop. Variable ka type nahi, **object ka asli type** decide karta hai.

## Abstraction
? Abstraction kya hai aur encapsulation se kaise alag hai?
**Abstraction** matlab user ko sirf **kya** karna hai wo dikhao, **kaise** hota hai wo chhupao. Tum car chalate ho steering aur brake se — engine ke andar kya ho raha hai jaanna zaroori nahi.

C# mein abstraction ke do tools hain: **interface** aur **abstract class**. Code interface pe depend karta hai (`IPaymentGateway`), concrete class pe nahi (`RazorpayGateway`). Kal Razorpay ki jagah Stripe lagana ho, to sirf nayi class likho — baaki code nahi badlega. Testing mein fake implementation daal sakte ho.

**Encapsulation vs Abstraction** aksar confuse hota hai. Encapsulation **data chhupata** hai (implementation level, access modifiers se). Abstraction **complexity chhupata** hai (design level, interface se). Dono saath kaam karte hain.

| Encapsulation | Abstraction |
|---|---|
| Data chhupata hai | Complexity chhupata hai |
| Implementation level | Design level |
| `private`, properties | `interface`, `abstract class` |

```csharp
public interface IPaymentGateway
{
    Task<bool> PayAsync(decimal amount);      // KYA karna hai
}

public class RazorpayGateway : IPaymentGateway
{
    public async Task<bool> PayAsync(decimal amount)
    {
        // KAISE — API keys, HTTP call, signature… sab yahan chhupa hai
        await Task.Delay(10);
        return true;
    }
}

// Caller ko sirf interface pata hai
public class CheckoutService(IPaymentGateway gateway)
{
    public Task<bool> Checkout(decimal total) => gateway.PayAsync(total);
}
```

> Car ka steering: ghumao, gaadi mudti hai. Andar ka mechanism chhupa hai.

## Class
? Class kya hai? Class aur struct mein kya farak hai?
**Class** ek blueprint ya template hai — ye batati hai ki object mein kaunsa data (fields, properties) hoga aur wo kya kar sakta hai (methods). Class khud memory mein data nahi rakhti; jab `new` se object banta hai tab memory milti hai.

Class ek **reference type** hai — object heap pe banta hai aur variable mein sirf uska reference (address) hota hai. Class mein ye sab ho sakta hai: fields, properties, methods, constructors, events, nested types, static members.

Modern C# mein `record` bhi hai — ek class jiski equality **value-based** hoti hai (do records barabar hain agar unki saari properties barabar hain), aur jo immutable data jaise DTOs ke liye perfect hai.

```csharp
public class Employee                              // blueprint
{
    public int Id { get; init; }
    public string Name { get; set; } = "";

    public Employee(int id, string name) { Id = id; Name = name; }

    public string Greet() => $"Hello, {Name}";
}

public record EmployeeDto(int Id, string Name);    // value equality, immutable
```

> Class = naksha (blueprint). Object = us nakshe se bana asli ghar.

## Object
? Object kya hai aur `new` karne pe memory mein kya hota hai?
**Object** class ka ek asli, runtime **instance** hai. `new Employee()` likhte hi CLR heap pe memory allocate karta hai, constructor chalata hai, aur variable ko us memory ka reference deta hai.

Ek class se kitne bhi objects ban sakte hain, aur har object ka apna alag data hota hai — `emp1.Name` badalne se `emp2.Name` pe asar nahi padta (jab tak dono alag objects hain). Static members object ke nahi, class ke hote hain, isliye saare objects mein shared hote hain.

Jab kisi object ka koi reference nahi bachta, to wo "unreachable" ho jaata hai aur Garbage Collector baad mein uski memory free kar deta hai.

```csharp
var e1 = new Employee(1, "Asha");    // object 1 — heap pe
var e2 = new Employee(2, "Ravi");    // object 2 — alag memory
var e3 = e1;                         // naya object NAHI — e1 ka hi reference

e3.Name = "Asha K";
Console.WriteLine(e1.Name);          // "Asha K" — e1 aur e3 ek hi object hain
```

! `var e3 = e1;` naya object banata hai — galat. Sirf reference copy hota hai, object ek hi rehta hai.

## Value Type
? Value type kya hai? Examples do, aur ye memory mein kahan rehte hain?
**Value type** mein variable ke andar **seedha value** rehti hai. Copy karoge to poori value ki alag copy banti hai — ek badalne se doosra nahi badalta.

Value types: saare numeric types (`int`, `double`, `decimal`), `bool`, `char`, `struct`, `enum`, `DateTime`, `Guid`. Ye `System.ValueType` se derive hote hain.

"Value type hamesha stack pe" — ye aadha sach hai. Local variable ho to stack pe hota hai. Par agar value type kisi class ka field hai, to wo us object ke saath **heap** pe rehta hai. Asli farak memory location nahi, **copy semantics** hai. Value types null nahi ho sakte (jab tak `int?` jaisa nullable na banao).

```csharp
int a = 5;
int b = a;       // value copy
b = 10;
Console.WriteLine(a);    // 5 — a pe koi asar nahi

struct Point { public int X; }
var p1 = new Point { X = 1 };
var p2 = p1;     // poora struct copy
p2.X = 99;
Console.WriteLine(p1.X); // 1
```

! "Value types hamesha stack pe hote hain" — galat. Class ke field ho to heap pe hote hain. Asli farak copy behaviour ka hai.

> int, float, bool, char, struct, enum, DateTime — copy karo to alag copy.

## Reference Type
? Reference type kya hai? Ek reference type variable doosre mein assign karo to kya hota hai?
**Reference type** mein object **heap** pe banta hai, aur variable ke andar sirf us object ka **reference (address)** hota hai. Ek variable ko doosre mein assign karo to sirf reference copy hota hai — dono ek hi object ko point karte hain. Ek se badlo, doosre mein bhi dikhega.

Reference types: `class`, `interface`, `delegate`, `record` (class wala), `string`, arrays, `object`. Ye null ho sakte hain — isi se famous `NullReferenceException` aata hai.

**`string` special case hai**: reference type hai, par **immutable** hai — har "change" asal mein naya string banata hai. Isliye wo value type jaisa behave karta hai. Loop mein bahut saare string jodne ho to `StringBuilder` use karo.

| Value type | Reference type |
|---|---|
| Variable mein value | Variable mein address |
| Copy = nayi value | Copy = same object |
| Null nahi (bina `?`) | Null ho sakta hai |
| struct, enum, int | class, string, array, interface |

```csharp
var a = new List<int> { 1 };
var b = a;          // reference copy
b.Add(2);
Console.WriteLine(a.Count);   // 2 — a aur b ek hi list

string s1 = "hi";
string s2 = s1;
s2 += "!";          // naya string bana
Console.WriteLine(s1);        // "hi" — string immutable hai
```

> class, interface, delegate, string, array, object — sab reference types.

## Struct
? Struct kya hai aur class ki jagah struct kab use karoge?
**Struct** ek user-defined **value type** hai. Class jaisa hi dikhta hai (fields, properties, methods, constructors), par copy hone pe poora data copy hota hai, aur ye inheritance support nahi karta (sirf interfaces implement kar sakta hai).

Struct kab use karein? Jab data **chhota** ho (roughly 16 bytes ke aas-paas), **immutable** ho, aur logically ek "value" ho — jaise `Point`, `Money`, `Coordinate`, `DateRange`. Framework ke `DateTime`, `TimeSpan`, `Guid` sab structs hain. Fayda: local ho to heap allocation nahi, GC pe load kam.

Bade structs ko baar-baar method mein pass karoge to har baar poora copy hoga — performance girti hai. Aur struct ko `object` ya interface variable mein daaloge to **boxing** hogi.

| Struct | Class |
|---|---|
| Value type | Reference type |
| Inheritance nahi | Inheritance hai |
| Chhote, immutable data ke liye | Behaviour + identity wale objects |
| Null nahi ho sakta | Null ho sakta hai |

```csharp
public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }
}

var price = new Money(499, "INR");
```

! "Struct hamesha class se fast hota hai" — galat. Bade struct ki copying slow hai, aur boxing ki alag cost hai.

## Boxing
? Boxing kya hai aur ye performance ko kaise affect karti hai?
**Boxing** matlab value type ko `object` (ya kisi interface type) mein convert karna. Isme CLR **heap pe naya object** banata hai aur value ko us box mein copy karta hai.

Ye implicitly (chupke se) hota hai, isliye khatarnak hai. Jaise purane non-generic collections (`ArrayList`) mein har `int` add karne pe boxing hoti thi. Loop mein lakhon baar ho to bahut saari heap allocations aur GC pressure — performance kha jaata hai. Generics (`List<int>`) isi problem ka ilaaj hain, kyunki wo value ko bina box kiye store karte hain.

Boxing ke baad box mein copy hai — original variable badalne se box ki value nahi badalti.

```csharp
int i = 10;
object o = i;          // BOXING — heap allocation
i = 20;
Console.WriteLine(o);  // 10 — box mein purani copy

var bad = new ArrayList();  bad.Add(5);    // boxing
var good = new List<int>(); good.Add(5);   // koi boxing nahi
```

! Value type ko interface variable mein daalna bhi boxing hai — `IComparable c = 5;` heap pe box banata hai.

> Box mein saman daalna = heap pe jagah leni. Loop mein boxing performance kha jaati hai.

## Unboxing
? Unboxing kya hai? Galat type mein unbox karo to kya hoga?
**Unboxing** boxing ka ulta hai — boxed `object` se wapas value type nikalna. Ye hamesha **explicit cast** se hota hai, aur CLR check karta hai ki box ke andar exactly wahi type hai jisme tum cast kar rahe ho.

Type match nahi hua to `InvalidCastException`. Dhyaan do: `int` ko box karke `long` mein unbox **nahi** kar sakte, bhale hi normally `int` → `long` conversion chal jaata hai. Pehle exact type mein unbox karo, phir convert karo.

Safe tareeka: pattern matching (`is`) — type galat ho to exception ki jagah `false` milta hai.

```csharp
object o = 10;           // boxed int
int i = (int)o;          // unboxing — theek
// long l = (long)o;     // InvalidCastException! box mein int hai
long l = (int)o;         // pehle int, phir implicit long — theek

if (o is int n)          // safe pattern matching
    Console.WriteLine(n);
```

> Unboxing mein type **exact** match hona chahiye, warna InvalidCastException.

## Nullable Type
? Nullable type kya hai? `int?`, `??` aur `?.` kaise kaam karte hain?
Value types normally null nahi ho sakte. **Nullable value type** (`int?`, jo asal mein `Nullable<int>` hai) ek value type ko null bhi rakhne deta hai. Ye database ke `NULL` columns ke liye bahut kaam aata hai — jaise `DateTime? DeletedAt`.

`Nullable<T>` ke paas `HasValue` aur `Value` properties hoti hain. Null hone pe `.Value` padhoge to `InvalidOperationException`. Isliye null-safe operators use karo: `??` (default value), `?.` (null-conditional), `??=` (null ho to assign).

Iske alawa C# 8 se **nullable reference types** bhi hain (`string?`). Ye compile-time warnings ka system hai jo batata hai ki kaunsa reference null ho sakta hai. Runtime behaviour nahi badalta — bas warnings `NullReferenceException` pehle hi pakad leti hain.

- `int?` = `Nullable<int>` — value type ko null allow
- `string?` — sirf compiler warnings ka system, runtime pe koi farak nahi
- `??` default value, `?.` safe access, `??=` null ho to assign

```csharp
int? age = null;
Console.WriteLine(age.HasValue);         // false
int years = age ?? 18;                   // null ho to 18

DateTime? deletedAt = null;
string label = deletedAt?.ToString("d") ?? "Active";

string? middleName = null;               // nullable reference type (C# 8+)
Console.WriteLine(middleName?.Length);   // null, crash nahi
```
