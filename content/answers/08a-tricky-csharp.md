# Tricky — C# predict the output

## dynamic aur object mein 1 jodo — kya hoga?
```csharp q
dynamic d = 1;
object  o = 1;
var a = d + 1;
var b = o + 1;
```
`d + 1` **chalega aur 2 dega**. `dynamic` ka matlab hai "type check runtime pe karna". Runtime pe `d` ke andar asal mein `int` hai, to `int + int = 2`. `a` ka compile-time type bhi `dynamic` hi hoga.

`o + 1` **compile hi nahi hoga** — error: *Operator '+' cannot be applied to operands of type 'object' and 'int'*. Compiler sirf variable ka **declared type** dekhta hai, aur `object` ke paas `+` operator hai hi nahi. Andar `int` pada hai, par compiler ko ye nahi pata. Chalana hai to pehle unbox karo: `(int)o + 1`.

Isi se ek follow-up: `dynamic d = "5"; d + 1` → `"51"` (runtime pe string + int = concatenation). Aur `d.Foo()` compile ho jaayega par runtime pe `RuntimeBinderException`.

```csharp
var c = (int)o + 1;     // 2 — unboxing ke baad
dynamic s = "5";
Console.WriteLine(s + 1);   // "51"
```

> `object` ke saath compiler declared type dekhta hai (compile time). `dynamic` ke saath runtime asli type dekhta hai.

## String badla ya nahi?
```csharp q
string s = "hello";
s.ToUpper();
s.Replace("h", "j");
Console.WriteLine(s);
```
Output: **`hello`**. String **immutable** hai — `ToUpper()`, `Replace()`, `Trim()`, `Substring()` original string ko kabhi nahi badalte; wo **naya string return** karte hain. Yahan return value kahin assign nahi hui, to wo phenk di gayi.

Sahi tareeka: `s = s.ToUpper();`. Yahi galti `DateTime.AddDays()` ke saath bhi hoti hai — `DateTime` bhi immutable struct hai: `date.AddDays(1);` akele se kuch nahi badalta.

```csharp
s = s.ToUpper();                 // "HELLO"
var d = DateTime.Today;
d.AddDays(1);                    // d wahi raha
d = d.AddDays(1);                // ab badla
```

> immutable type pe "change" method hamesha naya object lautata hai.

## Loop mein lambda ne i capture kiya — kya print hoga?
```csharp q
var actions = new List<Action>();
for (int i = 0; i < 3; i++)
    actions.Add(() => Console.Write(i));
foreach (var a in actions) a();
```
Output: **`333`**, `012` nahi.

Lambda variable ki **value copy nahi karta, variable ko hi capture** karta hai (closure). `for` loop mein `i` **ek hi variable** hai jo poore loop mein share hota hai. Lambdas baad mein chalte hain, tab tak loop khatam ho chuka hai aur `i` ki value 3 hai — teeno wahi padhte hain.

Fix: loop ke andar ek local copy banao. Aur dhyan do — `foreach` ke saath (C# 5 se) har iteration ka variable alag hota hai, isliye `foreach (var x in new[]{0,1,2})` wala version `012` print karta hai.

```csharp
for (int i = 0; i < 3; i++)
{
    int copy = i;                           // har iteration ka alag variable
    actions.Add(() => Console.Write(copy)); // 012
}
```

> closure variable ko capture karta hai, uski us waqt ki value ko nahi.

## List ke andar struct ki property badli
```csharp q
struct Point { public int X; }

var list = new List<Point> { new Point { X = 1 } };
list[0].X = 5;
```
**Compile error** (CS1612): *Cannot modify the return value of 'List<Point>.this[int]' because it is not a variable.*

`list[0]` ek indexer (method) hai jo struct ki **copy** return karta hai. Us copy ki `X` badalna bekaar hoga (copy turant phenk di jaayegi), isliye compiler rok deta hai. Array ke saath `arr[0].X = 5` **chalta hai**, kyunki array element seedha memory location hai, copy nahi.

Aur agar `var p = list[0]; p.X = 5;` likho — compile ho jaayega, par list ke andar ka struct **nahi badlega**, sirf `p` badlega. Sahi tareeka: copy lo, badlo, wapas daalo — ya structs ko immutable rakho (`readonly struct`).

```csharp
var p = list[0]; p.X = 5; list[0] = p;   // ab list badli

var arr = new[] { new Point { X = 1 } };
arr[0].X = 5;                            // chalta hai — array element variable hai
```

> value type har jagah copy hota hai; indexer copy lautata hai.

## Struct method mein bheja aur badla
```csharp q
struct Counter { public int N; }
void Inc(Counter c) => c.N++;

var c = new Counter();
Inc(c);
Inc(c);
Console.WriteLine(c.N);
```
Output: **`0`**. Struct value type hai — method ko **copy** milti hai. Method ne copy ka `N` badhaya, original `c` ko pata bhi nahi chala.

Agar `Counter` **class** hota to output `2` hota (reference copy hua, object same). Struct ko method se badalna ho to `ref` se bhejo: `void Inc(ref Counter c) => c.N++;` aur `Inc(ref c);` → 2.

> struct = copy semantics. `ref` ke bina method copy pe kaam karta hai.

## Class object method mein bheja, phir naya assign kiya
```csharp q
class Person { public string Name = ""; }

void Change(Person p)
{
    p.Name = "B";
    p = new Person { Name = "C" };
}

var x = new Person { Name = "A" };
Change(x);
Console.WriteLine(x.Name);
```
Output: **`B`**.

C# mein by default sab kuch **by value** pass hota hai — reference type ke liye "value" hai **reference (address)**. Method ko address ki copy milti hai, jo **same object** ko point karti hai. Isliye `p.Name = "B"` original object badalta hai.

Par `p = new Person()` sirf method ki **local copy** ko naye object pe point karta hai — caller ka `x` abhi bhi purane object pe hai. Agar `ref Person p` hota, to `x` bhi naye object pe chala jaata aur output `C` hota.

> reference types ka reference by value jaata hai — object badal sakte ho, caller ka variable nahi (bina `ref` ke).

## int.MaxValue mein 1 jodo
```csharp q
int x = int.MaxValue;
x = x + 1;
Console.WriteLine(x);
```
Output: **`-2147483648`** (`int.MinValue`). C# by default **unchecked** arithmetic karta hai — overflow pe exception nahi, value wrap ho jaati hai (binary mein sabse bada positive + 1 = sabse chhota negative).

`checked` context mein `OverflowException` aata hai. Aur agar seedha constant likho `int y = int.MaxValue + 1;` to **compile error** — constant expressions compile time pe check hote hain. Paisa, counters, IDs jahan overflow khatarnak hai wahan `checked`, `long` ya `decimal` use karo.

```csharp
checked { x = int.MaxValue; x = x + 1; }   // OverflowException
// int y = int.MaxValue + 1;              // compile error
```

> runtime arithmetic unchecked (wrap), constant arithmetic checked.

## 0.1 + 0.2 == 0.3 ?
```csharp q
Console.WriteLine(0.1 + 0.2 == 0.3);
Console.WriteLine(0.1m + 0.2m == 0.3m);
```
Output: **`False`**, phir **`True`**.

`double` (aur `float`) **binary floating point** hai. 0.1 aur 0.2 binary mein exactly represent nahi ho sakte (jaise 1/3 decimal mein 0.333… hota hai), to jodne pe `0.30000000000000004` aata hai. `decimal` **base-10** mein store karta hai, isliye 0.1, 0.2, 0.3 exact hain.

Isliye **paise ke liye hamesha `decimal`**, `double` kabhi nahi. Double compare karna ho to tolerance ke saath: `Math.Abs(a - b) < 1e-9`.

> double binary fractions hai; decimal base-10. Money = decimal.

## Numbers aur string ko + se jodo
```csharp q
Console.WriteLine(1 + 2 + "3" + 4 + 5);
Console.WriteLine("1" + 2 + 3);
Console.WriteLine('A' + 1);
```
Output: **`3345`**, **`123`**, **`66`**.

`+` **left se right** chalta hai. `1 + 2` = 3 (dono int). Phir `3 + "3"` — ek taraf string hai to concatenation: `"33"`. Uske baad sab string: `"334"`, `"3345"`. Doosre mein pehla hi string hai, to sab concatenate: `"123"`.

`'A' + 1` — `char` + `int` = **int** (char ka numeric code 65 + 1 = 66). Character chahiye to `(char)('A' + 1)` = `'B'`.

> `+` left-to-right; ek operand string hua to baaki sab concatenation. char arithmetic = int.

## null string mein kuch jodo
```csharp q
string s = null;
Console.WriteLine(s + "x");
Console.WriteLine(s?.Length);
Console.WriteLine(s.Length);
```
Output: **`x`**, **khaali line**, phir **`NullReferenceException`**.

String concatenation mein `null` ko **empty string** maana jaata hai, isliye `null + "x"` = `"x"` — exception nahi. `s?.Length` null-conditional hai: `s` null hai to poora expression `null` (type `int?`), aur `Console.WriteLine(null)` khaali line print karta hai. `s.Length` pe null ka member access — `NullReferenceException`.

`string.IsNullOrEmpty(s)` / `IsNullOrWhiteSpace(s)` null-safe checks hain.

> concatenation null ko "" maanta hai; member access null pe crash.

## finally mein value badli — kya return hoga?
```csharp q
static int Get()
{
    int x = 1;
    try   { return x; }
    finally { x = 2; }
}
Console.WriteLine(Get());
```
Output: **`1`**.

`return x;` pe return value **usi waqt evaluate** ho ke ek alag jagah save ho jaati hai (1). Phir `finally` chalta hai aur local `x` ko 2 karta hai — par return hone wali value pehle hi 1 tay ho chuki hai.

Agar `x` ek **reference type** hota aur `finally` uski property badalta (`list.Add(...)`), to wo change dikhta — kyunki return value same object ka reference hai. Aur C# mein `finally` ke andar `return` likhna hi allowed nahi (compile error CS0157).

> return value `finally` se pehle capture ho jaati hai. finally hamesha chalta hai, return value nahi badalta (value type ke liye).

## catch blocks ka order
```csharp q
try { DoWork(); }
catch (Exception ex)         { Console.WriteLine("general"); }
catch (ArgumentException ex) { Console.WriteLine("argument"); }
```
**Compile error** (CS0160): *A previous catch clause already catches all exceptions of this or a super type.*

Catch blocks **upar se neeche** check hote hain aur pehla match chalta hai. `Exception` sabka parent hai, to wo har exception pakad lega — `ArgumentException` wala block kabhi nahi chalega. Compiler is dead code ko error bana deta hai.

Rule: **specific exceptions pehle, general baad mein**. Aur `when` filter se condition bhi laga sakte ho: `catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)`.

> catch order = specific → general.

## async void mein exception — caller pakad payega?
```csharp q
async void Fire() { await Task.Delay(10); throw new Exception("boom"); }

try { Fire(); }
catch (Exception) { Console.WriteLine("caught"); }
```
**Nahi pakda jaayega.** "caught" kabhi print nahi hoga, aur exception **process crash** kar sakta hai.

`async void` method koi `Task` return nahi karta, to caller ke paas exception pakadne ka koi zariya nahi. `Fire()` pehle `await` tak chalta hai aur return ho jaata hai — `try` block tab tak khatam. Baad mein exception aata hai to wo seedha SynchronizationContext / thread pool pe phenka jaata hai → unhandled.

Isliye **`async void` sirf event handlers** ke liye. Baaki hamesha `async Task`, aur caller `await` kare — tab exception normal `try/catch` mein aata hai.

```csharp
async Task FireAsync() { await Task.Delay(10); throw new Exception("boom"); }
try { await FireAsync(); } catch (Exception) { Console.WriteLine("caught"); }   // pakda gaya
```

> exception Task ke andar store hota hai; `async void` ke paas Task hi nahi.

## Task ko await kiye bina chhod diya
```csharp q
Task.Delay(2000);
Console.WriteLine("A");

_ = Task.Run(() => throw new Exception("x"));
Console.WriteLine("B");
```
Output: **`A` turant**, phir **`B` turant**, aur koi exception dikhega nahi.

`Task.Delay(2000)` ek task banata hai jo 2 second baad complete hoga — par bina `await` ke koi uska wait nahi karta, to "A" turant print hota hai. (Compiler warning CS4014 deta hai.)

Doosra task fail hota hai, par kisi ne use `await` nahi kiya — exception task ke andar pada rehta hai (**unobserved**). .NET 4.5+ mein isse process crash nahi hota; exception chup-chaap nigal liya jaata hai (`TaskScheduler.UnobservedTaskException` event pe milta hai). Isliye "fire and forget" khatarnak hai — errors gayab ho jaate hain. Background kaam chahiye to proper queue/`BackgroundService` use karo aur exceptions log karo.

> await ke bina na wait hota hai, na exception bahar aata hai.

## Do boxed ints compare karo
```csharp q
object a = 5;
object b = 5;
Console.WriteLine(a == b);
Console.WriteLine(a.Equals(b));
Console.WriteLine((int)a == (int)b);
```
Output: **`False`**, **`True`**, **`True`**.

`a` aur `b` dono ke liye **alag-alag box** heap pe bane. `==` yahan `object` type pe chal raha hai → **reference comparison** → do alag objects → False. `Equals()` virtual hai, runtime pe `Int32.Equals` chalta hai jo **value** compare karta hai → True. Unbox karke `int == int` → True.

> `==` compile-time type (object → reference) pe chalta hai, `Equals` runtime type pe.

## Do same string literals — same object?
```csharp q
string a = "hello";
string b = "hello";
string c = new string("hello".ToCharArray());
Console.WriteLine(ReferenceEquals(a, b));
Console.WriteLine(ReferenceEquals(a, c));
Console.WriteLine(a == c);
```
Output: **`True`**, **`False`**, **`True`**.

C# compiler **string literals ko intern** karta hai — same literal poore program mein ek hi object hota hai, isliye `a` aur `b` same reference. `c` runtime pe naya string bana — alag object. Par `string` ka `==` **content** compare karta hai, isliye `a == c` True.

Isliye strings compare karne ke liye hamesha `==` / `Equals` — kabhi reference pe bharosa mat karo. Case-insensitive ke liye `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)`.

> literals interned hote hain; runtime strings nahi. `==` string pe content compare.

## Static aur instance constructor ka order
```csharp q
class A
{
    static A() { Console.Write("S"); }
    public A()  { Console.Write("I"); }
}
new A();
new A();
```
Output: **`SII`**.

**Static constructor** class ke pehle use se theek pehle **sirf ek baar** chalta hai (CLR guarantee karta hai, thread-safe bhi). Instance constructor har `new` pe chalta hai. Static constructor ke parameters ya access modifier nahi ho sakte, aur ise manually call nahi kar sakte. Isme exception aaya to class us app mein kabhi use nahi ho payegi (`TypeInitializationException`).

> static = class ke liye ek baar; instance = har object ke liye.

## Derived class mein field initializer aur base constructor — kaun pehle?
```csharp q
class Base    { public Base() { Console.Write("B"); } }
class Derived : Base
{
    string f = Log("F");
    public Derived() { Console.Write("D"); }
    static string Log(string s) { Console.Write(s); return s; }
}
new Derived();
```
Output: **`FBD`**.

C# mein order hai: **derived class ke field initializers → base constructor → derived constructor body**. Log aksar sochte hain base pehle chalega ("BFD"), par field initializers base constructor se bhi pehle chalte hain. (Java mein ulta hai — wahan base constructor pehle.)

> C# order = derived initializers → base ctor → derived ctor body.

## Base constructor se virtual method call kiya
```csharp q
class Base
{
    public Base() { Show(); }
    public virtual void Show() => Console.WriteLine("Base");
}
class Derived : Base
{
    private string _name;
    public Derived() { _name = "Derived"; }
    public override void Show() => Console.WriteLine(_name ?? "null");
}
new Derived();
```
Output: **`null`**.

Base constructor mein `Show()` virtual call hai — object asal mein `Derived` hai, to **Derived ka override** chalta hai. Par us waqt **Derived ka constructor body abhi chala hi nahi**, to `_name` abhi `null` hai.

Isliye rule: **constructor se virtual methods mat bulao** — child adhoori state mein hota hai. (Agar `_name` field initializer se set hota — `string _name = "Derived";` — to wo base ctor se pehle chal jaata aur "Derived" print hota.)

> virtual call runtime type pe jaata hai, chahe object adha bana ho.

## new se hide kiya method — kaunsa chalega?
```csharp q
class Base    { public void Hi() => Console.Write("Base "); }
class Derived : Base { public new void Hi() => Console.Write("Derived "); }

Base b = new Derived();
Derived d = new Derived();
b.Hi();
d.Hi();
```
Output: **`Base Derived`**.

`new` keyword **method hiding** hai, overriding nahi. Non-virtual method call **compile-time type** (variable ka type) se decide hota hai: `b` ka type `Base` hai → Base ka `Hi`. `d` ka type `Derived` → Derived ka `Hi`. Agar Base mein `virtual` aur Derived mein `override` hota, to dono "Derived" print karte.

> `override` = runtime type decide kare. `new`/non-virtual = compile-time type decide kare.

## Overload ko null bheja
```csharp q
void M(object o)  => Console.Write("object ");
void M(string s)  => Console.Write("string ");

M(null);
M((object)null);
```
Output: **`string object`**.

`null` string bhi ho sakta hai aur object bhi. Compiler **sabse specific** overload chunta hai — `string`, `object` ka child hai, to `M(string)`. Cast karke `object` diya to `M(object)`.

Twist: agar overloads `M(string)` aur `M(StringBuilder)` hon (dono unrelated), to `M(null)` **ambiguous** — compile error, kyunki koi zyada specific nahi.

> overload resolution sabse specific type chunta hai; barabar ho to ambiguity error.

## Integer division aur divide by zero
```csharp q
Console.WriteLine(5 / 2);
Console.WriteLine(5 / 2.0);
Console.WriteLine(5.0 / 0);
int zero = 0;
Console.WriteLine(5 / zero);
```
Output: **`2`**, **`2.5`**, **`∞`** (Infinity), phir **`DivideByZeroException`**.

Dono operands int → **integer division**, decimal part kat jaata hai (round nahi hota — `-5 / 2` = -2). Ek bhi double → floating division. **Double divide by zero exception nahi deta** — `Infinity` (ya `0.0/0` pe `NaN`). **Integer divide by zero** → exception. Aur `5 / 0` seedha likha (constant) to compile error.

Percent nikalte waqt ye bug common hai: `done / total * 100` int mein hamesha 0 aata hai jab `done < total`. `done * 100.0 / total` likho.

> int/int = int (truncate). int pe /0 exception, double pe Infinity.

## Nullable int ke saath comparison
```csharp q
int? x = null;
Console.WriteLine(x + 1);
Console.WriteLine(x > 0);
Console.WriteLine(x <= 0);
Console.WriteLine(x == null);
```
Output: **khaali line**, **`False`**, **`False`**, **`True`**.

Nullable ke saath operators "**lifted**" hote hain: koi operand null ho to arithmetic ka result null (`x + 1` = null → khaali line). Comparison (`<`, `>`, `<=`, `>=`) null ke saath **hamesha false** — isliye `x > 0` aur `x <= 0` **dono false**! Ye logic bug ka bada kaaran hai: `if (x > 0) ... else ...` mein null wala case else mein chala jaata hai jaise wo ≤ 0 ho.

`==`/`!=` null ke saath normally kaam karte hain.

> lifted operators — null ke saath comparison false, arithmetic null.

## foreach ke andar list se remove kiya
```csharp q
var list = new List<int> { 1, 2, 3, 4 };
foreach (var n in list)
    if (n % 2 == 0) list.Remove(n);
```
**`InvalidOperationException`**: *Collection was modified; enumeration operation may not execute.*

`foreach` enumerator use karta hai, aur `List` ek version number rakhta hai. Loop ke dauraan add/remove kiya to version badal jaata hai aur enumerator agle step pe exception phenkta hai.

Fixes: `list.RemoveAll(n => n % 2 == 0);` (sabse saaf), ya **peeche se** `for` loop (`for (int i = list.Count - 1; i >= 0; i--)`), ya ek copy pe loop (`foreach (var n in list.ToList())`).

> enumeration ke dauraan collection badalna allowed nahi.

## Query banayi, phir list mein add kiya
```csharp q
var list = new List<int> { 1, 2, 3 };
var q = list.Where(x => x > 1);
list.Add(4);
Console.WriteLine(q.Count());
```
Output: **`3`** (2, 3, 4).

`Where` **deferred** hai — `q` sirf ek recipe hai, filter abhi chala nahi. `Count()` ke waqt query chalti hai, aur tab tak list mein 4 bhi aa chuka hai. Agar `var q = list.Where(x => x > 1).ToList();` hota, to snapshot us waqt ban jaata aur answer 2 hota.

> deferred execution — query tab chalti hai jab result maango.

## LINQ query do baar chalayi — Select kitni baar chala?
```csharp q
int calls = 0;
var q = Enumerable.Range(1, 3).Select(x => { calls++; return x * 2; });
var a = q.ToList();
var b = q.ToList();
Console.WriteLine(calls);
```
Output: **`6`**.

Har `ToList()` (ya `foreach`, `Count()`) poori deferred query **dobara** chalata hai — Select ka lambda har baar har item pe phir se chalta hai. Agar lambda mehnga hai (DB call, API call, calculation) to ye bahut nuksaan karta hai. EF Core `IQueryable` pe har baar **nayi SQL query** jaati hai.

Fix: ek baar materialize karo (`var cached = q.ToList();`) aur use reuse karo.

> deferred query ka har enumeration = poora execution dobara.

## yield wale method mein validation kab chalegi?
```csharp q
IEnumerable<int> Numbers(int count)
{
    if (count < 0) throw new ArgumentException("negative");
    for (int i = 0; i < count; i++) yield return i;
}

var r = Numbers(-1);
Console.WriteLine("created");
foreach (var n in r) { }
```
Output: **`created`**, **phir** `ArgumentException` — foreach pe, call pe nahi.

`yield return` wala method **iterator** ban jaata hai — call karne pe uska body chalta hi nahi, sirf ek enumerator object banta hai. Body (validation samet) tab chalta hai jab pehli baar `MoveNext()` ho, yani enumeration shuru ho. Isliye error apni asli jagah se door dikhta hai.

Fix: validation ek normal (non-iterator) wrapper method mein, aur `yield` wala logic private local function mein.

```csharp
IEnumerable<int> Numbers(int count)
{
    if (count < 0) throw new ArgumentException("negative");   // turant chalta hai
    return Iterate();
    IEnumerable<int> Iterate() { for (int i = 0; i < count; i++) yield return i; }
}
```

> iterator method lazy hai — pehle MoveNext tak kuch nahi chalta.

## Struct ko box kiya, phir original badla
```csharp q
struct P { public int X; }
P p = new P { X = 1 };
object o = p;
p.X = 2;
Console.WriteLine(((P)o).X);
```
Output: **`1`**.

Boxing ke waqt struct ki **copy** heap pe box mein jaati hai. Baad mein `p` badalne se box wali copy pe koi asar nahi. Unbox karne pe bhi ek aur copy milti hai.

> boxing = copy. Box aur original ab alag hain.

## Generic class ka static field
```csharp q
class Cache<T> { public static int Count; }

Cache<int>.Count = 5;
Cache<string>.Count = 10;
Console.WriteLine(Cache<int>.Count);
Console.WriteLine(Cache<double>.Count);
```
Output: **`5`**, **`0`**.

Har **closed generic type** (`Cache<int>`, `Cache<string>`, `Cache<double>`) CLR ke liye **alag type** hai, aur har ek ke apne static fields hote hain. Isliye `Cache<int>.Count` aur `Cache<string>.Count` alag hain, aur `Cache<double>` ka abhi tak default 0 hai.

Ye trick kabhi-kabhi jaan-boojh ke use hoti hai — per-type cache (`EqualityComparer<T>.Default` isi pe chalta hai).

> har `Generic<T>` ka apna static storage.

## Equals override kiya, GetHashCode nahi
```csharp q
class Emp
{
    public int Id;
    public override bool Equals(object? o) => o is Emp e && e.Id == Id;
}
var set = new HashSet<Emp> { new Emp { Id = 1 } };
Console.WriteLine(set.Contains(new Emp { Id = 1 }));
```
Output: **aksar `False`** (compiler warning bhi deta hai).

`HashSet` aur `Dictionary` pehle **`GetHashCode()`** se bucket dhoondhte hain, phir us bucket mein `Equals` se compare karte hain. `GetHashCode` override nahi kiya, to default (object-identity based) chalta hai — do alag objects ke hash code alag, to set galat bucket mein dekhta hai aur match milta hi nahi, chahe `Equals` true de.

Fix: `public override int GetHashCode() => Id.GetHashCode();` — ya `record` use karo jo dono khud banata hai. Rule: do equal objects ka hash code **same** hona chahiye.

> hash collections pehle hash code se dhoondhte hain, Equals baad mein.

## record vs class equality
```csharp q
record  PR(int X);
class   PC { public int X; public PC(int x) => X = x; }

Console.WriteLine(new PR(1) == new PR(1));
Console.WriteLine(new PC(1) == new PC(1));
var r2 = new PR(1) with { X = 5 };
```
Output: **`True`**, **`False`**. Aur `r2` ek **naya** record hai `X = 5` ke saath; original nahi badla.

`record` compiler se **value-based equality** generate karwata hai — `Equals`, `GetHashCode`, `==`, `!=` sab properties compare karte hain. Class ka default `==` reference compare karta hai. `with` expression record ki copy banata hai kuch properties badal ke (non-destructive mutation) — immutable DTOs ke liye perfect.

> record = value equality; class = reference equality (by default).

## Enum mein galat number cast kiya
```csharp q
enum Color { Red = 1, Green = 2 }
var c = (Color)99;
Console.WriteLine(c);
Console.WriteLine(Enum.IsDefined(typeof(Color), c));
```
Output: **`99`**, **`False`** — koi exception nahi.

Enum asal mein ek **integer** hai naam ke saath. Koi bhi int value cast ho jaati hai, chahe us naam ka member na ho. Isliye API se aaya enum value (JSON/query) hamesha validate karo — `Enum.IsDefined` ya `[EnumDataType]`. `default(Color)` bhi `0` hoga, jo yahan defined hi nahi.

> enum = int with names; cast pe validation nahi hoti.

## default values
```csharp q
Console.WriteLine(default(int));
Console.WriteLine(default(bool));
Console.WriteLine(default(string) == null);
Console.WriteLine(default(DateTime));
Console.WriteLine(default(int?) == null);
```
Output: **`0`**, **`False`**, **`True`**, **`01-01-0001 00:00:00`**, **`True`**.

`default(T)` = "zero bits": value types ke liye 0/false/zero struct, reference types aur nullable ke liye `null`. `DateTime` ka default **1 January 0001** hai — agar DTO mein `DateTime` field client ne nahi bheji, to ye value aayegi (aur DB mein save ho sakti hai!). Optional date ke liye `DateTime?` use karo.

> default = zero memory. DateTime ka zero = 0001-01-01.

## as vs cast vs is
```csharp q
object o = "hello";
var a = o as StringBuilder;
var b = o is string s ? s.Length : -1;
var c = (StringBuilder)o;
```
`a` = **`null`**, `b` = **`5`**, aur `c` pe **`InvalidCastException`**.

**`as`** — cast try karta hai, fail ho to exception ki jagah **null**. Sirf reference types aur nullable ke saath (`o as int` compile error; `o as int?` chalega). **`is` pattern** — type check + variable ek saath, safe aur saaf. **Direct cast `(T)`** — fail ho to exception. Jab type galat hona **bug** hai tab direct cast; jab galat ho sakta hai tab `is`/`as`.

> `as` → null, cast → exception, `is` → bool + variable.

## Interface ka default method class variable se bulao
```csharp q
interface IGreeter { string Greet() => "Hello"; }
class Bot : IGreeter { }

var bot = new Bot();
// bot.Greet();
IGreeter g = bot;
Console.WriteLine(g.Greet());
```
`bot.Greet()` **compile error** hai — `Bot` mein `Greet` naam ka member nahi hai. `g.Greet()` chalta hai aur **`Hello`** print karta hai.

**Default interface methods** (C# 8+) class mein "inherit" nahi hote — wo sirf **interface ke through** accessible hain. Isse interface mein naya method jodne se purani implementing classes nahi tootti, par class ke public surface mein wo method nahi aata.

> default interface members sirf interface reference se dikhte hain.

## Do interfaces, same method naam
```csharp q
interface IA { void Run(); }
interface IB { void Run(); }
class X : IA, IB
{
    void IA.Run() => Console.Write("A ");
    void IB.Run() => Console.Write("B ");
}
var x = new X();
((IA)x).Run();
((IB)x).Run();
```
Output: **`A B`**. Aur `x.Run()` compile error.

Ye **explicit interface implementation** hai — method interface ke naam ke saath likha (`IA.Run`), access modifier nahi. Ye sirf us interface ke reference se call hota hai. Jab do interfaces ka same signature ho par behaviour alag chahiye, ya kisi member ko class ki public API se chhupana ho, tab use hota hai.

> explicit implementation sirf interface cast se dikhta hai.

## Parallel loop mein counter badhaya
```csharp q
int count = 0;
Parallel.For(0, 100_000, i => { count++; });
Console.WriteLine(count);
```
Output: **100,000 se kam** — har baar alag number.

`count++` **atomic nahi** hai — ye teen steps hain: padho, 1 jodo, likho. Do threads ek saath same value padh lete hain, dono jodte hain, dono likhte hain — ek increment kho jaata hai (**race condition**).

Fix: `Interlocked.Increment(ref count);` (sabse halka), ya `lock`, ya har thread local count rakhe aur end mein jodo. Collections ke liye `ConcurrentDictionary`/`ConcurrentBag`.

> `++` read-modify-write hai, atomic nahi. Shared state = synchronization chahiye.

## finally khud exception phenke
```csharp q
try
{
    throw new InvalidOperationException("original");
}
finally
{
    throw new Exception("from finally");
}
```
Caller ko **sirf "from finally"** wala exception milega — **original exception kho jaata hai.**

Jab `finally` (ya `Dispose`) khud exception phenkta hai, wo pehle wale exception ko replace kar deta hai. Isliye debugging mein asli root cause gayab ho jaata hai. Rule: `finally` aur `Dispose` mein exception mat phenko; cleanup code ko khud try/catch mein lapet ke log karo.

> naya exception propagate hote exception ko replace kar deta hai.

## readonly List mein add kiya
```csharp q
class Store
{
    private readonly List<int> _items = new();
    public void Add(int x) => _items.Add(x);
    public void Reset()    => _items = new List<int>();
}
```
`Add` **theek hai**, `Reset` **compile error** (readonly field constructor ke bahar assign nahi ho sakta).

`readonly` sirf **reference ko lock** karta hai — `_items` hamesha usi list ko point karega. Par list ka **content** badal sakta hai (`Add`, `Remove`, `Clear` sab chalte hain). Reset karna ho to `_items.Clear()`. Poori tarah immutable chahiye to `ImmutableList<T>` ya bahar `IReadOnlyList<T>` expose karo.

> readonly = variable fixed, object mutable.

## async method jisme await hi nahi
```csharp q
async Task<int> GetAsync()
{
    Thread.Sleep(2000);
    return 42;
}
var t = GetAsync();
Console.WriteLine("after call");
```
"after call" **2 second baad** print hoga, turant nahi. Compiler warning bhi deta hai (CS1998: async method lacks 'await').

`async` keyword method ko background thread pe nahi bhejta. Async method **synchronously chalta hai jab tak pehla `await`** na aaye jo incomplete task pe ho. Yahan koi `await` hai hi nahi, to poora method (2 second ka `Thread.Sleep` samet) caller ke thread pe chalta hai, aur end mein ek already-completed Task lautata hai.

Asli async wait ke liye `await Task.Delay(2000)`. CPU-bound kaam ko background mein chahiye to `await Task.Run(...)`.

> async sirf await points pe "ruk" sakta hai; await nahi to poora sync.

## using ke andar se object return kiya
```csharp q
StreamReader Open(string path)
{
    using var reader = new StreamReader(path);
    return reader;
}
var r = Open("data.txt");
Console.WriteLine(r.ReadLine());
```
**`ObjectDisposedException`** — reader bahar aate hi band ho chuka hai.

`using` ka Dispose scope ke end pe chalta hai — yahan method ke end pe, **return ke baad** — to caller ko jo reader milta hai wo already disposed hai. Rule: jo object caller ko de rahe ho use `using` mein mat daalo; **disposal ki zimmedari caller ki** hai (`using var r = Open(...)`).

> using scope khatam = Dispose, chahe object bahar ja raha ho.
