# Threading aur concurrency (.NET)

## Thread, ThreadPool aur Task mein farak kya hai?
- **Thread** — OS ka asli execution unit. `new Thread(...)` banana **mehenga** hai (~1 MB stack, OS call). Aaj kal seedha kam use hota hai.
- **ThreadPool** — .NET ke paas pehle se bane threads ka **pool**; kaam do, free thread utha leta hai, khatam hone pe thread wapas pool mein. Banane-mitaane ka kharcha bachta hai. ASP.NET Core har request isi pool ke thread pe chalata hai.
- **Task** — ek **kaam ka promise** (future) — "ye kaam hoga aur result dega". Andar aam taur pe ThreadPool use karta hai, par ye thread nahi hai: **I/O wala Task (DB call) chalte waqt koi thread nahi pakadta**. Result, exception, cancellation, continuation (`await`) — sab Task deta hai.

Rule: **I/O ke liye `async/await`** (thread free rehta hai), **CPU-heavy kaam ke liye `Task.Run`** (background thread pe, UI/desktop mein — ASP.NET mein Task.Run se aksar fayda nahi, kyunki request already pool thread pe hai).

**Thread starvation**: pool ke saare threads block ho jaayein (`.Result`, `Thread.Sleep`, sync DB calls) to nayi requests ko thread nahi milta → app "hang" lagti hai jabki CPU khaali hai. Fix: poora async.

```csharp
// I/O — thread free rehta hai jab tak DB jawab de
var orders = await db.Orders.ToListAsync();

// CPU-heavy — background thread pe (desktop/worker mein)
var hash = await Task.Run(() => ComputeHeavyHash(bytes));
```

## lock kya hai aur race condition kaise hoti hai?
**Race condition** — do threads ek saath **shared data** padh-likh rahe hain aur result is baat pe depend karta hai ki kaun pehle chala. Classic: `count++` asal mein teen steps hai (padho, +1, likho) — do threads ek saath padhein to ek increment kho jaata hai.

**`lock`** — ek code block mein **ek waqt ek hi thread** (critical section). Baaki wait karte hain.

Rules:
- Lock ke liye **private readonly object** — `lock(this)` ya `lock(typeof(X))` ya string pe kabhi nahi (bahar wala bhi lock kar sakta hai → deadlock).
- Lock ke andar **kam se kam kaam**, aur **`await` nahi kar sakte** lock ke andar (compile error) — async ke liye `SemaphoreSlim`.
- Kai locks ho to **hamesha same order** mein lo, warna **deadlock**.
- .NET 9 mein naya `System.Threading.Lock` type (tez).

Simple counter ke liye lock bhi zyada hai — **`Interlocked`** (atomic operation, lock-free).

```csharp
public class Counter
{
    private readonly object _gate = new();
    private int _count;
    private readonly Dictionary<string, int> _hits = new();

    public void Hit(string page)
    {
        lock (_gate)                                // ek waqt ek thread
        {
            _hits[page] = _hits.GetValueOrDefault(page) + 1;
        }
    }

    public void Inc() => Interlocked.Increment(ref _count);   // simple counter — lock-free
}
```

! `lock` ke andar `await` — compile hi nahi hoga. Async code mein mutual exclusion ke liye `SemaphoreSlim(1, 1)` aur `WaitAsync()`.

## SemaphoreSlim kya hai aur kab use karte ho?
**Semaphore** — ek saath **N threads/tasks** ko andar aane do (lock = N ka 1 wala case). **`SemaphoreSlim`** halka, in-process version hai aur **async support** karta hai (`WaitAsync`).

Do bade use:
1. **Async code mein lock** — `new SemaphoreSlim(1, 1)` + `await WaitAsync()` — kyunki `lock` mein await nahi ho sakta. Jaise: token refresh ek hi baar ho, chahe 10 requests ek saath expire token dekhein.
2. **Concurrency limit (throttling)** — "ek saath max 5 API calls" — third-party API ka rate limit, ya 1000 files process karni hain par DB pe ek saath 10 hi.

**`try/finally` mein `Release()`** hamesha — exception aaye to bhi, warna slot hamesha ke liye band.

Ye sirf **ek process** ke andar kaam karta hai. Kai servers ke beech lock chahiye to **distributed lock** (Redis `SET NX PX`, DB advisory lock).

```csharp
private static readonly SemaphoreSlim _throttle = new(5);   // max 5 saath

public async Task<IEnumerable<string>> FetchAll(IEnumerable<string> urls)
{
    var tasks = urls.Select(async url =>
    {
        await _throttle.WaitAsync();
        try { return await _http.GetStringAsync(url); }
        finally { _throttle.Release(); }                  // hamesha release
    });
    return await Task.WhenAll(tasks);
}
```

## ConcurrentDictionary aur thread-safe collections
Normal `List<T>`, `Dictionary<K,V>` **thread-safe nahi** — kai threads ek saath likhein to data corrupt, `InvalidOperationException`, ya infinite loop tak ho sakta hai. Har jagah `lock` lagane ki jagah **`System.Collections.Concurrent`**:

| Collection | Kaam |
| --- | --- |
| **`ConcurrentDictionary<K,V>`** | Thread-safe dictionary — in-memory cache, connection/session maps |
| **`ConcurrentQueue<T>`** | FIFO queue, lock-free |
| **`ConcurrentBag<T>`** | Order ki parwah nahi, bas items jama karne hain |
| **`BlockingCollection<T>`** | Producer–consumer — khaali ho to consumer wait kare |
| **`Channel<T>`** | Modern async producer–consumer (bounded, backpressure) — naye code mein yahi |

`ConcurrentDictionary` ke atomic methods use karo: **`GetOrAdd`**, **`AddOrUpdate`**, `TryRemove`. "Check phir add" (`if (!ContainsKey) Add`) do steps hain — race condition. Dhyan: `GetOrAdd` ka value factory **do baar chal sakta** hai race mein (sirf ek jeet-ta hai) — mehenga kaam ho to `Lazy<T>` value rakho.

**Immutable collections** (`ImmutableList`) — badalte hi nayi copy; padhne wale kabhi atke nahi.

```csharp
private readonly ConcurrentDictionary<string, DeviceState> _devices = new();

public void OnPacket(string imei, GpsPoint p) =>
    _devices.AddOrUpdate(imei,
        _ => new DeviceState(p),                        // naya device
        (_, old) => old with { Last = p, Seen = DateTime.UtcNow });   // update

// Producer–consumer with Channel
var ch = Channel.CreateBounded<GpsPoint>(10_000);
await ch.Writer.WriteAsync(point);                      // producer
await foreach (var pt in ch.Reader.ReadAllAsync())      // consumer
    await SaveAsync(pt);
```

## Task.WhenAll vs Task.WhenAny — aur parallel API calls
**`Task.WhenAll`** — kai tasks **ek saath chalao** aur sab khatam hone ka wait. Teen independent API calls (user, orders, notifications) — ek ke baad ek await = 300+200+100 = 600 ms; WhenAll se ~300 ms (sabse lambi wali jitna).

**`Task.WhenAny`** — jo **pehla** khatam ho. Use: timeout lagana, ya do sources mein se jo jaldi jawab de.

Details jo interviewer poochhta hai:
- WhenAll mein ek task fail ho to `await` **pehli exception** throw karta hai; saari chahiye to `whenAllTask.Exception.InnerExceptions`.
- Tasks **pehle start** karo, phir WhenAll — `var t1 = GetA(); var t2 = GetB();` (yahan dono chal pade), phir `await Task.WhenAll(t1, t2)`.
- **Same DbContext pe parallel queries nahi** — DbContext thread-safe nahi; "A second operation was started on this context" error. Alag scope/context lo ya sequential rakho.
- Hazaaron tasks ek saath — throttle karo (SemaphoreSlim ya `Parallel.ForEachAsync` with `MaxDegreeOfParallelism`).

```csharp
var userTask   = _users.GetAsync(id);          // teeno abhi start ho gaye
var ordersTask = _orders.GetRecentAsync(id);
var alertsTask = _alerts.GetAsync(id);

await Task.WhenAll(userTask, ordersTask, alertsTask);
var dashboard = new Dashboard(userTask.Result, ordersTask.Result, alertsTask.Result);  // ab .Result safe

// Timeout with WhenAny
var work = _slowApi.GetAsync();
if (await Task.WhenAny(work, Task.Delay(3000)) != work) throw new TimeoutException();
```

## CancellationToken kya hai aur kaise use karte ho?
**`CancellationToken`** — lambe kaam ko **beech mein rokne ka signal**. .NET mein cancellation **cooperative** hai — koi zabardasti thread nahi maarta; kaam khud token check karta hai aur ruk jaata hai.

Kahan se aata hai:
- ASP.NET Core **action parameter** `CancellationToken ct` — user ne browser band kiya / request timeout hua to cancel. Isko **EF, HttpClient, har async call tak pass karo** — warna client chala gaya par DB query chalti rahegi.
- **`CancellationTokenSource`** — khud banao; `cts.Cancel()` ya `new CancellationTokenSource(TimeSpan.FromSeconds(5))` (timeout).
- `BackgroundService.ExecuteAsync(stoppingToken)` — app band ho rahi hai.

Kaam ke andar: async methods ko token do; loop mein `ct.ThrowIfCancellationRequested()`. Cancel hone pe **`OperationCanceledException`** aati hai — isko error ki tarah log mat karo (normal hai).

`CreateLinkedTokenSource` — do tokens jodna (request cancel **ya** 5 sec timeout, jo pehle ho).

```csharp
[HttpGet("report")]
public async Task<IActionResult> Report(CancellationToken ct)      // ASP.NET khud deta hai
{
    var rows = await _db.Trips.Where(t => t.Date >= from).ToListAsync(ct);   // pass karo
    return Ok(rows);
}

public class Poller(ILogger<Poller> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await DoWorkAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
```

## async void kyun avoid karte hain? ConfigureAwait(false) kya hai?
**`async void`** — caller ke paas **await karne ko kuch nahi** (Task hi nahi). Nateeja:
- Exception **caller tak nahi pahunchti** — seedha process crash kar sakti hai (unhandled).
- Pata nahi kab khatam hua; unit test nahi kar sakte.
- **Sirf event handlers** mein allowed (button click jaisa, jahan signature void maangta hai). Baaki har jagah **`async Task`**.

**`ConfigureAwait(false)`** — "await ke baad **original context pe wapas mat aao**, koi bhi thread chalega".
- UI apps (WinForms/WPF) aur purane ASP.NET mein **SynchronizationContext** hota tha — await ke baad wapas usi (UI) thread pe aana. Library code mein ConfigureAwait(false) se tez aur **deadlock se bachav** (`.Result` + context = deadlock).
- **ASP.NET Core mein SynchronizationContext hai hi nahi** — app code mein ConfigureAwait(false) ki zaroorat nahi. **Reusable libraries** mein ab bhi lagana achha hai (kaun jaane kaunsi app use kare).

**Sync-over-async** (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`) — thread block karta hai → starvation, aur context wali apps mein deadlock. **"Async all the way."**

```csharp
// Galat
public async void SaveAsync() { await _db.SaveChangesAsync(); }     // exception kho jaayegi

// Sahi
public async Task SaveAsync() { await _db.SaveChangesAsync(); }

// Library code
var json = await _http.GetStringAsync(url).ConfigureAwait(false);
```

## Parallel.ForEach vs Task.WhenAll vs PLINQ — kab kaunsa?
Teeno "ek saath kai kaam" hain par alag kaam ke liye:

| | Kis kaam ke liye | Dhyan |
| --- | --- | --- |
| **`Parallel.For / ForEach`** | **CPU-heavy** kaam (image resize, calculations) — cores pe baant-ta hai | Sync delegates; andar async lambda mat do (`async void` ban jaata hai) |
| **`Parallel.ForEachAsync`** (.NET 6+) | **Async I/O** items pe, **concurrency limit** ke saath | `MaxDegreeOfParallelism` set karo |
| **`Task.WhenAll`** | Kuch **async I/O** calls ek saath | Hazaaron items pe bina limit mat chalao |
| **PLINQ `.AsParallel()`** | LINQ query CPU-heavy ho to cores pe | Chhote data pe ulta slow (overhead); order chahiye to `AsOrdered()` |

ASP.NET Core API ke andar `Parallel.ForEach` se aksar bacho — request threads already pool se hain, aur parallel CPU kaam doosri requests ke threads kha jaata hai. Heavy CPU kaam background worker/queue mein.

```csharp
// CPU-bound
Parallel.ForEach(images, new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    img => Resize(img));

// Async I/O with limit
await Parallel.ForEachAsync(deviceIds, new ParallelOptions { MaxDegreeOfParallelism = 10 },
    async (id, ct) => await SyncDeviceAsync(id, ct));
```

## volatile, Interlocked aur memory visibility
Multi-threading mein ek thread ka likha value doosre thread ko **turant dikhe, ye guarantee nahi** — CPU cache aur compiler optimizations (value register mein rakh lena, instructions reorder karna) ki wajah se. Classic bug: ek thread `_running = false` karta hai, doosre ka `while(_running)` loop kabhi rukta hi nahi.

- **`volatile`** — field ko har baar memory se padho/likho, reorder mat karo. Sirf simple flags ke liye; `count++` ko atomic **nahi** banata.
- **`Interlocked`** — **atomic** operations: `Increment`, `Decrement`, `Add`, `Exchange`, **`CompareExchange`** (lock-free algorithms ka base). Counters/stats ke liye best.
- **`lock`** — visibility + atomicity dono deta hai (andar memory barrier).

Aam rule: khud low-level mat khelo — `lock`, `Interlocked`, concurrent collections, ya `Channel` use karo. `volatile` aur lock-free code bahut kam jagah chahiye.

```csharp
private volatile bool _stop;                 // flag — doosre thread ko turant dikhe
private long _processed;

void Worker()
{
    while (!_stop)
    {
        Process();
        Interlocked.Increment(ref _processed);   // atomic counter
    }
}
public void Stop() => _stop = true;
public long Processed => Interlocked.Read(ref _processed);
```
