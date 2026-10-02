# 2 Oct interview — jo galat ya aadha gaya

## Apna intro — 60 second, numbers ke saath
? "Brief me about yourself" — kya bologe?
**Ek line:** intro mein **numbers** chahiye — 700 buses, 6 million packets, 2.7s se 0.28s. Bina number ke intro bhool jaata hai interviewer.

| Hissa | Kya bolna |
| --- | --- |
| Kaun | Full-stack .NET developer, Amnex, **2.7 saal** (har jagah yahi number) |
| Kya banaya | AVLS — real-time bus tracking, Navi Mumbai + Assam + Odisha |
| Scale | ~700 buses, har **10 second** packet, ~6 million/din |
| Stack | TCP device parsing, Kafka, PostgreSQL, ASP.NET Core API, Angular |
| Ek jeet | Production query 2.7s se 0.28s |

> "I'm a full-stack .NET developer at Amnex, about 2.7 years. I'm the primary developer on AVLS — real-time bus tracking for Navi Mumbai, Assam and Odisha. About 700 buses send a GPS packet every 10 seconds, around 6 million a day. I work on the TCP service that parses device protocols, the Kafka pipeline, PostgreSQL, the APIs and the Angular console. Recently I brought a production query from 2.7 seconds to under 300 milliseconds."

! Interview mein "2.9 years" aur "har 5 second" bola — resume par 2.5+ aur ~10 second hai. Ek sach wala number, har jagah.

## virtual vs override vs new — kaunsa method chalega?
? Base class reference se call kiya to `override` aur `new` mein kya alag hoga?
**Ek line:** `override` base method ko **runtime par badal** deta hai; `new` sirf **chhupata** hai — base reference se call karo to base wala hi chalega.

| | override | new |
| --- | --- | --- |
| Base mein chahiye | `virtual` / `abstract` | kuch nahi |
| `Base b = new Child()` se call | **Child** ka method | **Base** ka method |
| Kab decide | Runtime (asli object) | Compile time (reference type) |
| Matlab | Polymorphism | Method hiding |

```csharp
class Base { public virtual void Show() => Console.WriteLine("Base"); }
class A : Base { public override void Show() => Console.WriteLine("A"); }
class B : Base { public new void Show() => Console.WriteLine("B"); }

Base x = new A(); x.Show();   // A
Base y = new B(); y.Show();   // Base  <- new ne sirf chhupaya
((B)y).Show();                // B
```

! Interview mein `new` ko "object banane wala keyword" bata diya. Yahan modifier wala `new` poochha tha.

> Override = badal diya. New = parda daal diya — peeche se dekho to purana hi dikhega.

## LINQ kya hai — EF ka hissa nahi
? LINQ explain karo.
**Ek line:** LINQ **C# ka query feature** hai — collections, XML, aur EF ke through database, sab par ek hi syntax. EF ka "code-first" bilkul alag cheez hai.

| | LINQ to Objects | LINQ to Entities (EF) |
| --- | --- | --- |
| Kis par | `List`, array, memory | Database table |
| Interface | `IEnumerable<T>` | `IQueryable<T>` |
| Kahan chalta | Memory mein C# | SQL ban ke DB mein |
| Kab chalta | Deferred — `foreach`/`ToList()` par | Deferred — `ToList()` par query jaati hai |

```csharp
var fast = buses.Where(b => b.Speed > 60).Select(b => b.Number);   // memory list par
var trips = db.Trips.Where(t => t.BusId == 42).ToList();          // EF: SQL WHERE banta hai
```

! "LINQ is how we use Entity Framework, code-first approach" — galat. Code-first = class se table banana; LINQ = query likhna.

> LINQ ek bhasha hai; EF us bhasha ko SQL mein translate karta hai.

## PostgreSQL mein index — clustered/non-clustered mat bolo
? Index kya hai, kitne type?
**Ek line:** index = data tak pahunchne ka shortcut (B-tree). "Clustered/non-clustered" **SQL Server** ki bhasha hai — Postgres ke paas index **types** hain.

| Type | Kab |
| --- | --- |
| B-tree (default) | `=`, range, ORDER BY — 90% case |
| BRIN | Bade, time-order mein bhare tables — GPS packets jaise; bahut chhota |
| GIN | jsonb, arrays, full-text |
| GiST | Geo / range types |
| Partial | Sirf kuch rows — `WHERE status = 'active'` |
| Composite | Kai columns — `(bus_id, packet_time)`, left se order matter karta hai |

```sql
CREATE INDEX ix_pkt_time ON gps_packets USING brin (packet_time);
CREATE INDEX ix_pkt_bus  ON gps_packets (bus_id, packet_time DESC);
CREATE INDEX ix_open_inc ON incidents (bus_id) WHERE closed_at IS NULL;
```

! Partitioning ko index ke jawab mein mila diya. Partition = table ko tukdon mein baantna; index = shortcut. Alag cheezein.

> Detail: card "Index types — B-tree, GIN, GiST, BRIN, partial aur covering index".

## Existing method mein naya parameter — callers kaise na tootein?
? Method ke 2 parameter hain, 1 aur chahiye. Naya parameter jodoge ya naya method?
**Ek line:** jo pehle se call kar rahe hain unka code **na toote** — isliye default value wala **optional parameter**, ya ek **overload** jo purane ko call kare. Overriding ka yahan koi kaam nahi.

| Tareeka | Kab |
| --- | --- |
| Optional parameter | Sabse aasaan, purane callers waise hi chalte |
| Overload | Naya behaviour alag ho, ya public library ho |
| Parameter object (class) | Parameters 4-5 se zyada ho gaye |

```csharp
public Trip GetTrip(int id, bool includeStops = false) { ... }   // purana GetTrip(5) chalta rahega

public Trip GetTrip(int id) => GetTrip(id, includeStops: false);   // ya overload
```

! Overloading aur overriding dono mila diye. Overriding = child class; yahan same class ki baat hai.

> Pehla sawaal: kaun-kaun call karta hai? Unhe todna nahi hai.

## Exception user se chhupao, par tumhe pata chale
? Exception user ko nahi dikhana, par tumhe kaise pata chalega ki aayi?
**Ek line:** global middleware pakde → **poori exception + traceId log** karo (Kibana) → user ko sirf generic message aur **wahi traceId** do. User traceId bataye, tum Kibana mein seedha dhoondh lo.

| Kise | Kya milta |
| --- | --- |
| User | "Something went wrong" + traceId |
| Log (Kibana) | Message, stack trace, traceId, user, URL |

```csharp
app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var traceId = ctx.TraceIdentifier;
    logger.LogError(ex, "Unhandled error {TraceId}", traceId);   // poori detail log mein
    ctx.Response.StatusCode = 500;
    await ctx.Response.WriteAsJsonAsync(new { error = "Something went wrong", traceId });
}));
```

! Try-catch aur middleware bola, par **logging** ka naam nahi liya — jabki Kibana resume par likha hai.

> User ko token number, tumhe poori file.

## Method kai jagah se call hota hai — change ka impact kaise dekhoge?
? Method API, background job aur scheduler teeno se call hota hai. Change kaise karoge?
**Ek line:** pehle **saare callers nikaalo**, unka abhi ka behaviour **test se pakdo**, change **backward-compatible** rakho, phir har raasta test karo.

| Step | Kaise |
| --- | --- |
| 1. Callers | Find All References / Call Hierarchy (Shift+F12) |
| 2. Har raasta | API, job, scheduler — har ek kya expect karta hai |
| 3. Test pehle | Abhi ka output test mein pakdo |
| 4. Change | Optional parameter / feature flag — purana behaviour default |
| 5. Verify | Har caller ka test, phir staging |

! "Naya method banake references ek-ek badlunga" — yeh impact analysis nahi, yeh kaam ko double karna hai.

> Pehle dekho kaun use karta hai, phir chhuo.

## Binding redirect kya hai
? .NET Framework project mein binding redirect kya hota hai?
**Ek line:** do DLL ek hi library ke **alag version** maangein (jaise Newtonsoft.Json 9 aur 12), to `web.config`/`app.config` mein bata dete ho ki **sab ek version** use karein. Warna runtime par "could not load file or assembly".

```xml
<dependentAssembly>
  <assemblyIdentity name="Newtonsoft.Json" publicKeyToken="30ad4fe6b2a6aeed" />
  <bindingRedirect oldVersion="0.0.0.0-13.0.0.0" newVersion="13.0.0.0" />
</dependentAssembly>
```

| | .NET Framework | .NET Core / 5+ |
| --- | --- | --- |
| Version clash | Binding redirect haath se | NuGet khud ek version chunta hai |

! Interview mein yeh nahi aaya. Legacy projects mein bahut poochha jaata hai.

> Do log alag version maange, config bole — sab yahi lo.

## Legacy solution, 50 projects — kaise samjhoge?
? Bina architecture jaane, 30-50 project wala .NET Framework solution kaise samjhoge?
**Ek line:** **entry point** se shuru karo, **ek request end-to-end** follow karo, dependency graph dekho — poora padhne ki koshish mat karo.

1. Startup project aur entry point — `Global.asax` / `Program.cs` / `Startup`
2. Config — `web.config`, connection strings, DI registrations
3. Project references ka graph — kaun kis par depend karta hai
4. Ek feature chuno, debugger se request ko UI se DB tak follow karo
5. Team / purane docs / git history se poochho — kisne kya kyun kiya

! "First understand the flow" — yeh jawab nahi, yeh sawaal dohrana hai. Steps bolo.

> Ek dhaaga pakdo aur aakhir tak chalo.

## Deadlock ho gaya — investigate kaise karoge?
? Production mein deadlock aaya. Kaise pakdoge aur theek karoge?
**Ek line:** Postgres khud deadlock pakad ke ek transaction maar deta hai aur **server log mein "deadlock detected" ke saath dono queries** likhta hai — wahin se shuru.

| Step | Kahan |
| --- | --- |
| Pakdo | Server log — `deadlock detected`, dono query, dono process |
| Abhi kaun atka | `pg_locks` + `pg_stat_activity` |
| Log zyada chahiye | `log_lock_waits = on` |
| Theek | Har jagah **same order** mein lock, chhote transactions, FK column par index |

```sql
SELECT pid, state, wait_event_type, query
FROM pg_stat_activity WHERE wait_event_type = 'Lock';
```

! Definition sahi di, par investigate kaise karoge woh nahi bataya.

> Detail: card "Running query dekhna aur kill karna — pg_stat_activity, blocking vs deadlock".

## Thousands transaction per minute, history query 2s se 3s — kya karoge?
? Bahut writes wala table, history query dheere ho gayi. Kaise theek karoge?
**Ek line:** pehle **kya badla** — data, deploy ya plan? Phir stats/bloat, index, partition, pagination, aur zaroorat ho to read replica ya cache.

1. Kya badla — `EXPLAIN (ANALYZE, BUFFERS)` aaj vs pehle
2. Itne writes par stats purane → `ANALYZE`; dead rows → autovacuum tune
3. Index query se match — `(account_id, txn_date DESC)`, `INCLUDE` se covering
4. Month-wise partition — query sirf haal ka partition chhue
5. OFFSET nahi, **keyset pagination**
6. Reads-writes takraayein → read replica, ya haal ki history Redis mein

```sql
SELECT * FROM txn
WHERE account_id = $1 AND txn_date < $2     -- keyset: pichhli page ki aakhri date
ORDER BY txn_date DESC LIMIT 50;
```

! Jawab nahi de paaye — aur yahi kaam NMMT par kiya hai.

> Apni story jodo: "I brought a production query from 2.7s to 0.28s on our bus-tracking database" — JIT off + missed-stop EXISTS rewrite.

## "Execution plan ka idea hai?" — basic mat bolo
? Execution plan aata hai?
**Ek line:** haan — aur **apni story** se saabit karo. Tumne production DB 100% CPU se nikaala, query 2.7s se 0.28s.

| Plan mein dekho | Matlab |
| --- | --- |
| Seq Scan bade table par | Index nahi laga |
| Rows estimate vs actual bahut alag | Stats purane — ANALYZE |
| Nested Loop lakhon rows par | Join galat chuna |
| JIT time zyada | Chhoti query par JIT bekaar — `jit = off` |

! Interview mein bola "A base, you can say sir" — jabki yeh kaam kar chuke ho.

> Jo production mein kiya hai, use kabhi "basic" mat bolo.
