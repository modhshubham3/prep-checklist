# Coding round — patterns

## LRU cache — Dictionary + LinkedList se O(1) get/put
? LRU cache design karo jisme get aur put dono O(1) hon. Capacity full ho to least recently used hatao.
**Ek line:** `Dictionary<key, LinkedListNode>` se O(1) lookup, aur `LinkedList` se recency order — front = sabse recent, back = sabse purana (evict yahi hoga).

- `Get`: dictionary se node lo, list ke front pe le jao, value return. Na mile to -1 / default
- `Put`: key already hai to value update + front pe; naya hai aur capacity full to **back wala hatao** (list + dictionary dono se), phir naya front pe add
- Time **O(1)** get/put, Space **O(capacity)**
- Edge cases: capacity 1, same key baar baar put, capacity 0 (reject ya no-op — interviewer se poocho)
- **Thread-safety:** plain `Dictionary`/`LinkedList` thread-safe nahi. Simple fix: har operation pe `lock`. Kyunki `Get` bhi list reorder karta hai, "read lock" kaam nahi karta — read bhi write hai. Production mein `MemoryCache` / Redis use karo, khud mat likho

```csharp
public class LruCache<TKey, TValue> where TKey : notnull
{
    private readonly int _capacity;
    private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value)>> _map = new();
    private readonly LinkedList<(TKey Key, TValue Value)> _list = new(); // First = most recent
    private readonly object _lock = new();

    public LruCache(int capacity)
    {
        if (capacity <= 0) throw new ArgumentOutOfRangeException(nameof(capacity));
        _capacity = capacity;
    }

    public bool TryGet(TKey key, out TValue? value)
    {
        lock (_lock)
        {
            if (_map.TryGetValue(key, out var node))
            {
                _list.Remove(node); _list.AddFirst(node);   // O(1): node already in hand
                value = node.Value.Value; return true;
            }
            value = default; return false;
        }
    }

    public void Put(TKey key, TValue value)
    {
        lock (_lock)
        {
            if (_map.TryGetValue(key, out var node))
            {
                _list.Remove(node);
                node.Value = (key, value);
                _list.AddFirst(node);
                return;
            }
            if (_map.Count == _capacity)
            {
                var last = _list.Last!;
                _map.Remove(last.Value.Key);   // dictionary se bhi hatao — yahi isliye key node mein rakhi
                _list.RemoveLast();
            }
            _map[key] = _list.AddFirst((key, value));
        }
    }
}
```

! Sirf `List` use karna — remove/move O(n) ho jaata hai. Aur eviction pe dictionary se entry hatana bhool jana (isliye node mein key store karte hain).
> Dictionary = dhoondhna O(1), LinkedList = jagah badalna O(1). Dono milke LRU.

## Stack/queue problems — valid parentheses, min stack, queue via two stacks
? Valid parentheses check karo. Phir ek stack banao jo O(1) mein minimum bataye. Phir do stacks se queue banao.
**Ek line:** teeno mein stack ka LIFO hi trick hai — bas kya push karte ho wo alag hai.

**1. Valid parentheses** — opening push karo; closing aaye to top se match karo. End mein stack **khali** hona chahiye. Time O(n), Space O(n).

**2. Min stack** — har push ke saath "ab tak ka minimum" bhi saath rakho (ya alag min-stack). `GetMin` O(1).

**3. Queue using two stacks** — `inbox` mein push; dequeue pe agar `outbox` khali hai tabhi inbox ka sab `outbox` mein ulta do. Har element sirf ek baar move hota hai, isliye **amortized O(1)**.

```csharp
static bool IsValid(string s)
{
    var st = new Stack<char>();
    foreach (var c in s)
    {
        if (c is '(' or '[' or '{') st.Push(c);
        else
        {
            if (st.Count == 0) return false;               // "]" bina opening ke
            var o = st.Pop();
            if (!((o == '(' && c == ')') || (o == '[' && c == ']') || (o == '{' && c == '}'))) return false;
        }
    }
    return st.Count == 0;                                    // "((" ab bhi invalid
}

public class MinStack
{
    private readonly Stack<(int Val, int Min)> _s = new();
    public void Push(int x) => _s.Push((x, _s.Count == 0 ? x : Math.Min(x, _s.Peek().Min)));
    public int Pop() => _s.Pop().Val;
    public int GetMin() => _s.Peek().Min;                    // empty pe InvalidOperationException
}

public class MyQueue<T>
{
    private readonly Stack<T> _in = new(), _out = new();
    public void Enqueue(T x) => _in.Push(x);
    public T Dequeue()
    {
        if (_out.Count == 0) while (_in.Count > 0) _out.Push(_in.Pop());
        return _out.Pop();                                   // dono khali ho to exception
    }
}
```

! Queue mein har dequeue pe poora transfer karna — O(n) per op. Transfer **sirf tab** jab outbox khali ho.
> Parentheses = last khula, pehle band. Min stack = har level pe min yaad. Queue = ulta-ulta = seedha.

## Longest substring without repeating characters — sliding window
? Ek string mein sabse lambi substring ki length batao jisme koi character repeat na ho.
**Ek line:** do pointers (`left`, `right`) ki window, aur ek dictionary jo har char ka last index yaad rakhe. Duplicate dikha to `left` ko uske last index ke **aage** jump karo.

- Time **O(n)** (har char ek baar), Space **O(min(n, charset))**
- Edge cases: empty string → 0; sab same ("aaaa") → 1; "abba" (left kabhi peeche nahi jaana chahiye)

```csharp
static int LengthOfLongest(string s)
{
    var last = new Dictionary<char, int>();
    int best = 0, left = 0;
    for (int right = 0; right < s.Length; right++)
    {
        if (last.TryGetValue(s[right], out int prev) && prev >= left)
            left = prev + 1;                     // window ke andar duplicate tha
        last[s[right]] = right;
        best = Math.Max(best, right - left + 1);
    }
    return best;
}
// "abcabcbb" → 3 ("abc"),  "abba" → 2
```

! `prev >= left` check bhool gaye to "abba" mein `left` peeche chala jaata hai aur galat answer (3) aata hai.
> Window phailao, duplicate mile to left ko uske aage le jao — kabhi peeche nahi.

## HashMap patterns — two-sum, group anagrams, subarray sum equals k
? Two-sum O(n) mein karo. Anagrams ko group karo. Aur ek array mein kitne subarrays ka sum k hai?
**Ek line:** teeno mein "pehle dekha hua" dictionary mein rakho, taaki nested loop (O(n²)) ki jagah ek pass (O(n)) lage.

- **Two-sum:** har number pe dekho `target - x` pehle aa chuka hai kya. Time O(n), Space O(n)
- **Group anagrams:** key = sorted letters ("eat" → "aet"). Time O(n·k log k), k = word length
- **Subarray sum = k:** **prefix sum** — `prefix[j] - prefix[i] == k` matlab `prefix[i] == prefix[j] - k`. Dictionary mein har prefix ki count rakho; shuru mein `{0:1}` daalo (poora prefix khud k ho to). Negative numbers ke saath bhi chalta hai — isliye sliding window yahan galat hai. Time O(n)

```csharp
static int[] TwoSum(int[] a, int target)
{
    var seen = new Dictionary<int, int>();           // value → index
    for (int i = 0; i < a.Length; i++)
    {
        if (seen.TryGetValue(target - a[i], out int j)) return new[] { j, i };
        seen[a[i]] = i;                               // check ke BAAD add — warna x khud se pair ho jaata
    }
    return Array.Empty<int>();
}

static IEnumerable<List<string>> GroupAnagrams(string[] words) =>
    words.GroupBy(w => new string(w.OrderBy(c => c).ToArray()))
         .Select(g => g.ToList());

static int SubarraySum(int[] a, int k)
{
    var count = new Dictionary<int, int> { [0] = 1 };
    int sum = 0, result = 0;
    foreach (var x in a)
    {
        sum += x;
        if (count.TryGetValue(sum - k, out int c)) result += c;
        count[sum] = count.GetValueOrDefault(sum) + 1;
    }
    return result;
}
// SubarraySum([1,1,1], 2) → 2
```

! `{0:1}` seed bhoolna — jo subarray index 0 se shuru hota hai wo miss ho jaata hai. Aur sum bade ho sakte hain — large inputs mein `long` socho.
> Two-sum = complement dhoondo. Subarray-k = prefix minus k dhoondo.

## Tree problems — level-order BFS, max depth, validate BST
? Binary tree ka level-order traversal likho, max depth nikalo, aur check karo ki ye valid BST hai ya nahi.
**Ek line:** level-order = `Queue` (BFS); depth = recursion; BST validate = har node ke liye allowed `(min, max)` range pass karo — sirf parent se compare karna galat hai.

- BFS: Time O(n), Space O(w) (w = sabse chaudi level)
- Depth: Time O(n), Space O(h) recursion stack (skewed tree mein h = n — bahut gehra tree ho to stack overflow, iterative BFS safe)
- BST: inorder traversal sorted aani chahiye (strictly increasing), ya bounds ke saath

```csharp
public class Node { public int Val; public Node? Left, Right; }

static List<List<int>> LevelOrder(Node? root)
{
    var res = new List<List<int>>();
    if (root == null) return res;
    var q = new Queue<Node>(); q.Enqueue(root);
    while (q.Count > 0)
    {
        int size = q.Count;                       // is level ke nodes
        var level = new List<int>();
        for (int i = 0; i < size; i++)
        {
            var n = q.Dequeue(); level.Add(n.Val);
            if (n.Left != null) q.Enqueue(n.Left);
            if (n.Right != null) q.Enqueue(n.Right);
        }
        res.Add(level);
    }
    return res;
}

static int MaxDepth(Node? n) => n == null ? 0 : 1 + Math.Max(MaxDepth(n.Left), MaxDepth(n.Right));

static bool IsValidBst(Node? n, long min = long.MinValue, long max = long.MaxValue)
{
    if (n == null) return true;
    if (n.Val <= min || n.Val >= max) return false;   // duplicates BST mein allowed nahi maan rahe
    return IsValidBst(n.Left, min, n.Val) && IsValidBst(n.Right, n.Val, max);
}
```

! BST check mein sirf `left.Val < node.Val < right.Val` dekhna — galat. Root ke right subtree mein andar kahin chhota value ho sakta hai. Bounds `long` isliye ki node ki value `int.MinValue` bhi ho sakti hai.
> BFS = queue + level ka size. BST = har node ke upar range ka pehra.

## Binary search variants — first/last occurrence
? Sorted array mein ek value ka pehla aur aakhri index batao (duplicates hain). Na mile to -1.
**Ek line:** match milne pe ruko mat — answer save karo aur **ek taraf** search jaari rakho (pehle ke liye left, aakhri ke liye right). Time **O(log n)**, Space O(1).

```csharp
static int FirstOccurrence(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1, ans = -1;
    while (lo <= hi)
    {
        int mid = lo + (hi - lo) / 2;            // (lo+hi)/2 overflow kar sakta hai
        if (a[mid] == target) { ans = mid; hi = mid - 1; }   // aur left mein dekho
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return ans;
}
// LastOccurrence: wahi code, bas match pe `lo = mid + 1`
// [1,2,2,2,3], target 2 → first 1, last 3. Count = last - first + 1
```

- Edge cases: empty array, ek element, target sabse chhota/bada, sab elements same
- Variant: "pehla element >= target" (lower bound) — insert position yahi deta hai. .NET mein `Array.BinarySearch` duplicates mein koi bhi index de sakta hai, pehla guarantee nahi

! `while (lo < hi)` vs `<=` ka mix-up, aur `mid = (lo + hi) / 2` overflow. Array sorted nahi hai to binary search galat hai — pehle poocho.
> Mila to answer likho, phir aur aage dhoondo — pehle ke liye left, aakhri ke liye right.

# LLD — machine coding

## Parking lot design — classes, enums, strategy
? Parking lot ka low-level design karo. Pehle 5 minute mein kya bologe?
**Ek line:** pehle requirements aur scope lock karo, phir entities (Vehicle, Slot, Ticket, Level), phir behaviour **interfaces** ke peeche (slot allocation, pricing) taaki naya rule aaye to code na tootey.

**Pehle 5 minute mein bolo:**
1. Requirements poocho: vehicle types (bike/car/truck)? levels? entry/exit gates? pricing hourly ya flat? payment scope mein hai? concurrency (do gate ek hi slot)? 
2. Scope declare karo: "Main core flow — park, unpark, fee — karunga; payment gateway out of scope."
3. Entities + 2-3 interfaces bolo, phir code

- **Enums:** `VehicleType`, `SlotType`, `TicketStatus`
- **Classes:** `Vehicle`, `ParkingSlot`, `Level`, `ParkingLot`, `Ticket`
- **Strategy 1 — `ISlotAllocationStrategy`:** nearest slot, ya level-wise fill
- **Strategy 2 — `IPricingStrategy`:** hourly, flat, weekend rate
- **SOLID:** SRP (pricing alag class), OCP (naya strategy = nayi class, purana code nahi chhedna), DIP (`ParkingLot` interfaces pe depend kare, DI se inject)
- **Concurrency:** slot allocate karte waqt lock / atomic state change — do car ko ek hi slot nahi milna chahiye

```csharp
public enum VehicleType { Bike, Car, Truck }

public record Vehicle(string Plate, VehicleType Type);

public class ParkingSlot
{
    public int Id { get; }
    public VehicleType Supports { get; }
    public bool IsFree { get; private set; } = true;
    public ParkingSlot(int id, VehicleType supports) { Id = id; Supports = supports; }
    public bool TryOccupy() { if (!IsFree) return false; IsFree = false; return true; }
    public void Release() => IsFree = true;
}

public record Ticket(Guid Id, string Plate, int SlotId, DateTime EntryUtc);

public interface ISlotAllocationStrategy
{
    ParkingSlot? Find(IEnumerable<ParkingSlot> slots, VehicleType type);
}
public class FirstFreeSlotStrategy : ISlotAllocationStrategy
{
    public ParkingSlot? Find(IEnumerable<ParkingSlot> slots, VehicleType t) =>
        slots.FirstOrDefault(s => s.IsFree && s.Supports == t);
}

public interface IPricingStrategy { decimal Fee(DateTime inUtc, DateTime outUtc, VehicleType type); }
public class HourlyPricing : IPricingStrategy
{
    private readonly decimal _ratePerHour;
    public HourlyPricing(decimal ratePerHour) => _ratePerHour = ratePerHour;
    public decimal Fee(DateTime i, DateTime o, VehicleType t) =>
        Math.Max(1, (decimal)Math.Ceiling((o - i).TotalHours)) * _ratePerHour;   // min 1 hour
}

public class ParkingLot
{
    private readonly List<ParkingSlot> _slots;
    private readonly ISlotAllocationStrategy _alloc;
    private readonly IPricingStrategy _pricing;
    private readonly Dictionary<Guid, Ticket> _active = new();
    private readonly object _lock = new();

    public ParkingLot(List<ParkingSlot> slots, ISlotAllocationStrategy alloc, IPricingStrategy pricing)
        => (_slots, _alloc, _pricing) = (slots, alloc, pricing);

    public Ticket Park(Vehicle v)
    {
        lock (_lock)
        {
            var slot = _alloc.Find(_slots, v.Type) ?? throw new InvalidOperationException("Lot full");
            slot.TryOccupy();
            var t = new Ticket(Guid.NewGuid(), v.Plate, slot.Id, DateTime.UtcNow);
            _active[t.Id] = t; return t;
        }
    }

    public decimal Unpark(Guid ticketId, VehicleType type)
    {
        lock (_lock)
        {
            if (!_active.Remove(ticketId, out var t)) throw new KeyNotFoundException("Invalid ticket");
            _slots.First(s => s.Id == t.SlotId).Release();
            return _pricing.Fee(t.EntryUtc, DateTime.UtcNow, type);
        }
    }
}
```

! Code shuru karne se pehle requirements na poochna, ya `if (type == Car) ... else if (type == Bike)` ki lambi chain likhna — OCP toot jaata hai. Pricing ko `ParkingLot` ke andar hardcode mat karo.
> Pehle sawal, phir entities, phir interfaces. Rule badle to naya class, purana nahi.

## 60-90 minute machine-coding round — kaise approach karein
? Machine coding round mein 60-90 minute milte hain. Tumhara plan kya hoga?
**Ek line:** zyada features nahi, **chalta hua, saaf, extensible code** chahiye — pehle kaam karne wala core, phir polish.

| Time | Kya karna hai |
| --- | --- |
| 0-5 min | Requirements poocho, scope aur assumptions likho |
| 5-15 min | Entities, relationships, 2-3 interfaces; folder/class skeleton |
| 15-55 min | Core flow code karo (happy path pehle), chhote steps mein run karte raho |
| 55-75 min | Edge cases, validation, errors, in-memory sab ek jagah |
| 75-90 min | 2-3 tests (xUnit), README ke 3 line, extensibility explain karo |

- **Checklist:** requirements → entities → interfaces (strategy jahan rule badal sakta ho) → core flow → validation/exceptions → tests → extension points (naya vehicle type, naya pricing)
- Console `Main` mein demo chalao jisse evaluator output dekh sake
- Clean naming, chhoti methods, magic numbers nahi; `static` global state nahi (testable rakho)
- Persistence maango nahi gaya to **in-memory** + repository interface — baad mein DB lagana aasaan
- Jo nahi kiya wo bolo: "Concurrency ke liye lock lagaya; production mein DB transaction/optimistic lock hota"

! Pehle 40 minute pattern/diagram mein laga dena aur kuch run na hona; ya sab kuch ek bade `Program.cs` mein. Chalne wala simple code > adhoora fancy code.
> Pehle chalao, phir sajao. Aur jo chhoda wo zubaan se bolo.

# SQL — interview patterns (PostgreSQL + SQL Server)

## Top-N per group aur Nth highest salary — ROW_NUMBER vs DENSE_RANK
? Har department ke top 3 salary wale employees do. Aur poori company mein 2nd/Nth highest salary kaise nikaloge?
**Ek line:** `PARTITION BY` group ke andar numbering, phir outer query mein filter. Window function `WHERE` mein seedha nahi chalta — CTE/subquery chahiye.

| Function | Ties pe | Use |
| --- | --- | --- |
| `ROW_NUMBER()` | Alag-alag number (1,2,3) | Strictly N rows, ek per group |
| `RANK()` | Same rank, phir gap (1,1,3) | Olympic-style |
| `DENSE_RANK()` | Same rank, gap nahi (1,1,2) | **Nth highest salary** (distinct value) |

Syntax dono (PostgreSQL aur SQL Server) mein **same** chalta hai:

```sql
-- Har department ke top 3 distinct salary levels (ties saath)
WITH r AS (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
  FROM employees e
)
SELECT * FROM r WHERE rnk <= 3;

-- Poori company mein 2nd highest salary (2 ki jagah N)
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees
) t WHERE rnk = 2;
```

Nth highest ka dusra tareeka, jahan syntax **alag** hai (OFFSET se):

```sql
-- PostgreSQL
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;     -- 2nd highest

-- SQL Server
SELECT DISTINCT salary FROM employees ORDER BY salary DESC OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY;
-- (SQL Server mein SELECT TOP 1 ... bhi chalta hai par OFFSET ke saath nahi)
```

- Edge case: N se kam distinct salaries hon to result **khali** (NULL nahi) — interviewer pooche to `MAX(...)` wrap karke NULL return kar sakte ho
- `LIMIT 1 OFFSET 1` pe `DISTINCT` zaroori, warna 2 log same top salary pe hon to galat answer

! Top-3 salary maangne pe `ROW_NUMBER` use karna — tie hone par jo log barabar salary pe hain wo kat jaate hain. Poochho: "ties include karne hain?"
> Ties chahiye → DENSE_RANK. Ek hi row chahiye → ROW_NUMBER.

## Running total aur gaps/islands — window functions
? Date-wise running total nikalo. Aur consecutive IDs ke "islands" (continuous blocks) kaise dhoondoge?
**Ek line:** running total = `SUM() OVER (ORDER BY ...)`. Islands = `id - ROW_NUMBER()` ka constant value ek continuous block ko pehchaan deta hai.

```sql
-- Running total (PostgreSQL aur SQL Server dono)
SELECT order_date, amount,
       SUM(amount) OVER (ORDER BY order_date, id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders;
```

**Frame explicitly likho.** Sirf `ORDER BY` likhne par default frame `RANGE` hota hai — same date wali rows ko ek saath gin leta hai (ties pe surprise), aur SQL Server mein `ROWS` se kaafi tez bhi hai.

**Islands:** `1,2,3,7,8,10` ke blocks → (1-3), (7-8), (10-10):

```sql
-- Islands: dono databases mein same
SELECT MIN(id) AS island_start, MAX(id) AS island_end
FROM (
  SELECT id, id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM numbers
) t
GROUP BY grp
ORDER BY island_start;
```

- **Gaps** (missing numbers): `LEAD(id) OVER (ORDER BY id)` se next id lo, jahan `next - id > 1` wahan gap hai
- Dates ke liye: `date - ROW_NUMBER()` (PostgreSQL: `order_date - (ROW_NUMBER() OVER (ORDER BY order_date))::int`; SQL Server: `DATEADD(day, -ROW_NUMBER() OVER (ORDER BY d), d)`)
- Duplicates hon to pehle `DISTINCT` karo, nahi to `grp` toot jaata hai

! Running total mein `ORDER BY` sirf non-unique column pe (jaise date) lagana — default RANGE frame ke saath ek hi din ki saari rows ka total ek jaisa dikhega. Tie-breaker (`id`) daalo aur `ROWS` frame likho.
> Running total = SUM OVER. Island = value minus row number.

## Duplicate rows delete karo — latest rakhna hai
? Table mein duplicate emails hain. Har email ki sirf latest row rakho, baaki delete karo.
**Ek line:** `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC)` — jo `rn > 1` hain wo purane duplicates hain, wahi delete.

```sql
-- SQL Server: CTE ke through seedha DELETE chalta hai
WITH d AS (
  SELECT ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC, id DESC) AS rn
  FROM users
)
DELETE FROM d WHERE rn > 1;

-- PostgreSQL: CTE ke through delete nahi hota — id se match karo
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC, id DESC) AS rn
    FROM users
  ) t WHERE rn > 1
);
```

- Pehle **SELECT chala ke dekho** kya delete hoga; production mein transaction/backup ke saath
- `id DESC` tie-breaker rakho taaki same `created_at` pe result deterministic ho
- Future mein rokne ke liye **UNIQUE constraint / index** lagao (`UNIQUE(email)`) — delete sirf ilaaj hai, constraint bachav hai
- Table bahut badi ho to batches mein delete (lock aur log growth kam)

! Bina `ORDER BY` ke `ROW_NUMBER` — kaunsi row bachegi koi guarantee nahi. Aur `DISTINCT`/`GROUP BY` se naya table banana tab tak theek jab tak latest row ki zaroorat na ho.
> Number do, rn > 1 hatao, phir UNIQUE lagao.

# EF Core — advanced

## Global query filters aur soft delete — IgnoreQueryFilters
? Soft delete EF Core mein kaise karoge taaki har query mein `WHERE IsDeleted = 0` na likhna pade?
**Ek line:** `HasQueryFilter` model mein ek baar likho — EF har query (aur `Include`) mein ye condition khud jod deta hai.

```csharp
public class Product { public int Id { get; set; } public string Name { get; set; } = ""; public bool IsDeleted { get; set; } }

protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<Product>().HasQueryFilter(p => !p.IsDeleted);
}

// Normal query — deleted rows nahi aayengi
var live = await db.Products.ToListAsync();

// Admin / restore screen — filter band
var all = await db.Products.IgnoreQueryFilters().ToListAsync();
```

- **Soft delete** ko `Remove()` pe rokne ke liye `SaveChanges` override / interceptor mein `EntityState.Deleted` ko `Modified` + `IsDeleted = true` mein badlo
- Multi-tenant ke liye bhi yehi (`TenantId == _tenant.Id`)
- Filter `Include` ke andar related entities pe bhi lagta hai. Required navigation pe filter ho to parent filter hua aur child nahi — mismatch warning aati hai; dono pe filter lagao
- Unique index soft-deleted rows ko bhi gintay hain — PostgreSQL mein partial index (`WHERE NOT is_deleted`), SQL Server mein filtered index (`WHERE IsDeleted = 0`)
- Raw SQL (`FromSqlRaw`) pe bhi filter compose hota hai jab LINQ upar se lage; `ExecuteDelete`/`ExecuteUpdate` mein filter lagta hai — **check docs** apne EF version ke liye
- Recent: EF Core 10 mein **named query filters** (ek entity pe kai filters, alag-alag band karna) aaye hain — check docs

! `IgnoreQueryFilters()` se **saare** filters hat jaate hain (tenant filter bhi!) — security bug ban sakta hai. Aur filter ke bawajood `FindAsync` / tracked entity cache se deleted row de sakta hai.
> Filter model mein, bypass sirf soch-samajh ke.

## EF Core inheritance — TPH vs TPT vs TPC
? EF Core mein class hierarchy ko tables mein kaise map karte hain? TPH, TPT, TPC mein farak?
**Ek line:** **TPH** = ek table (default); **TPT** = har class ki apni table, JOIN se; **TPC** = har concrete class ki apni poori table, koi base table nahi.

| | TPH | TPT | TPC |
| --- | --- | --- | --- |
| Tables | 1 (discriminator column) | Base + har derived | Har concrete class |
| Query speed | Sabse tez, no JOIN | JOIN chahiye, dheema | Concrete query tez; base type query = UNION |
| Nullable columns | Derived ke columns nullable | Nahi | Nahi |
| Normalization | Kam | Zyada | Duplicate columns |
| Default | **Haan** | Nahi (`UseTptMappingStrategy`) | Nahi (`UseTpcMappingStrategy`) |

- TPC EF Core **7** se available hai (check docs apne version ke liye)
- Zyada-tar cases mein TPH hi sahi — performance achhi, simple. Doosre tab jab schema clean chahiye ya derived mein bahut alag columns hon
- TPC mein base ke liye identity auto-generate dikkat de sakta hai (alag tables mein ID clash) — GUID/sequence socho

```csharp
modelBuilder.Entity<Payment>().UseTphMappingStrategy();          // default
modelBuilder.Entity<Payment>().UseTptMappingStrategy();
modelBuilder.Entity<Payment>().UseTpcMappingStrategy();

modelBuilder.Entity<Payment>()
    .HasDiscriminator<string>("Kind")
    .HasValue<CardPayment>("card")
    .HasValue<UpiPayment>("upi");
```

! "TPT sabse achha kyunki normalized hai" — EF Core mein JOIN cost aksar performance maarta hai; default TPH ko bina wajah mat badlo.
> TPH = ek table, TPT = JOIN, TPC = har class akeli.

## Owned types aur value converters
? EF Core mein Address jaisa value object kaise store karte ho? Enum ko string ya custom type ko column mein kaise map karte ho?
**Ek line:** **Owned type** = alag identity ke bina, owner ke saath hi store hone wala type (columns owner ki table mein). **Value converter** = ek column ki C# value ko DB value mein badalna aur wapas.

```csharp
public class Customer
{
    public int Id { get; set; }
    public Address Home { get; set; } = new();       // owned
    public OrderStatus Status { get; set; }          // enum
    public Money Balance { get; set; }               // value object
}
public class Address { public string Street { get; set; } = ""; public string City { get; set; } = ""; }
public enum OrderStatus { New, Paid, Shipped }
public readonly record struct Money(decimal Amount, string Currency);

modelBuilder.Entity<Customer>(e =>
{
    e.OwnsOne(c => c.Home);                          // Home_Street, Home_City columns
    e.Property(c => c.Status).HasConversion<string>();   // "Paid" store hota hai, 1 nahi
    e.Property(c => c.Balance).HasConversion(
        m => m.Amount, v => new Money(v, "INR"));    // sirf amount store; currency fixed
});
```

- OwnsOne → same table ke columns; `OwnsMany` → alag table (owner ki FK ke saath)
- Enum as string: readable, naye enum value order badalne se safe; thoda zyada storage aur index size
- Converter ke andar **query translation** limits: converted column pe kuch LINQ operations translate nahi hote — check docs
- Complex types (EF Core 8+) bhi ek option hain value-object-style mapping ke liye — owned se alag semantics, check docs

! Enum ko int store karna aur baad mein enum ke beech mein naya value daalna — purana data galat meaning le leta hai.
> Owned = owner ke saath, converter = alag roop mein store.

## SaveChanges interceptor — CreatedAt / UpdatedBy audit fields
? Har entity pe CreatedAt, UpdatedAt, UpdatedBy automatically kaise set karoge, har service mein likhe bina?
**Ek line:** `SaveChangesInterceptor` mein `SavingChangesAsync` override karo, `ChangeTracker` se Added/Modified entities dekho aur fields bharo. Ek jagah, DI se current user.

```csharp
public interface IAuditable { DateTime CreatedAt { get; set; } DateTime UpdatedAt { get; set; } string? UpdatedBy { get; set; } }

public class AuditInterceptor(ICurrentUser user, TimeProvider clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        foreach (var entry in e.Context!.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAt = now;
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = user.Id;
            }
        }
        return base.SavingChangesAsync(e, result, ct);
    }
}

// Registration
builder.Services.AddScoped<AuditInterceptor>();
builder.Services.AddDbContext<AppDb>((sp, o) =>
    o.UseNpgsql(cs).AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
```

- Sync `SaveChanges()` ke liye `SavingChanges` bhi override karo (dono)
- `ExecuteUpdate/ExecuteDelete` change tracker se nahi guzarte — interceptor wahan nahi chalega
- UTC store karo, `TimeProvider` inject karo to test mein time freeze ho sakta hai
- Alternative: `SaveChangesAsync` override DbContext mein — chalta hai, par interceptor reusable aur testable hai

! Sirf `SaveChangesAsync` override karke sync `SaveChanges` ko chhod dena. Aur `ExecuteUpdate` se audit fields skip ho jaana.
> ChangeTracker se entries uthao, save se pehle fields bharo.

## DbContext pooling, compiled queries, EnableRetryOnFailure
? EF Core performance ke liye kya-kya karoge? Aur retry on failure ke saath manual transaction kaise chalate hain?
**Ek line:** pooling = DbContext instance reuse; compiled query = LINQ-to-SQL translation ek baar; retry = transient errors pe auto-retry (par user transaction ke liye `CreateExecutionStrategy` zaroori).

**1. `AddDbContextPool`** — har request ke liye naya context banane ki cost bachti hai. Context ko **state-free** rakho (extra scoped state/fields nahi) — kyunki instance reset hoke reuse hota hai.

**2. Compiled queries** — hot path ki query ke liye `EF.CompileAsyncQuery`. Chhoti bachat hai, par bahut baar chalne wali query pe fark dikhta hai; pehle measure karo.

**3. `EnableRetryOnFailure`** — transient failures (network blip, deadlock-type errors) pe retry. Retry strategy poora **operation** dobara chalati hai, isliye user-started transaction ko strategy ke andar wrap karna padta hai, nahi to `InvalidOperationException`.

```csharp
builder.Services.AddDbContextPool<AppDb>(o =>
    o.UseSqlServer(cs, sql => sql.EnableRetryOnFailure(maxRetryCount: 5)));
// PostgreSQL (Npgsql): .UseNpgsql(cs, npg => npg.EnableRetryOnFailure(5))

// Compiled query
static readonly Func<AppDb, int, Task<Product?>> ById =
    EF.CompileAsyncQuery((AppDb db, int id) => db.Products.FirstOrDefault(p => p.Id == id));
var p = await ById(db, 42);

// Retry + manual transaction: poora block strategy ke andar
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var tx = await db.Database.BeginTransactionAsync();
    db.Orders.Add(order);
    await db.SaveChangesAsync();
    await db.Payments.AddAsync(payment);
    await db.SaveChangesAsync();
    await tx.CommitAsync();
});
```

- Retry block mein **side effects** (email, API call) mat rakho — block do baar chal sakta hai; idempotent rakho
- Commit ke time connection tootne se outcome ambiguous ho sakta hai — retry block ko idempotent rakho (check docs: commit-ambiguity handling)

! `EnableRetryOnFailure` laga ke seedha `BeginTransaction` karna — runtime exception aata hai. Aur pooled context mein per-request data field mein rakhna — dusre request ko leak ho sakta hai.
> Pool = context reuse, compile = translate ek baar, retry + tx = strategy.ExecuteAsync.

## N+1 problem — before/after aur logging se detect karna
? Orders list karte waqt page slow hai aur DB ko hazaaron queries ja rahi hain. Kya ho raha hai, kaise dhoondoge, kaise theek karoge?
**Ek line:** 1 query parent ke liye + N queries har parent ke child ke liye. Fix: `Include` ya (behtar, read-only list ke liye) **projection**.

```csharp
// BEFORE — N+1 (lazy loading ya loop mein alag query)
var orders = await db.Orders.ToListAsync();                 // 1 query
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);                     // har order pe ek aur query (lazy loading on ho to)

// AFTER 1 — Include: ek JOIN query
var orders1 = await db.Orders.Include(o => o.Customer).ToListAsync();

// AFTER 2 — projection: sirf chahiye columns, tracking ki zaroorat nahi
var rows = await db.Orders
    .Select(o => new OrderRow(o.Id, o.Customer.Name, o.Total))
    .ToListAsync();

// Collection Include bahut bade hon to split query
var big = await db.Orders.Include(o => o.Lines).AsSplitQuery().ToListAsync();
```

**Detect kaise karein:**
- Development mein logging on: `optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)` aur `.EnableSensitiveDataLogging()` (sirf dev)
- Ek page load pe same-shape SQL baar-baar dikhe = N+1
- MiniProfiler / Application Insights dependency count, ya SQL profiler / `pg_stat_statements` mein calls count

- `Include` bina zaroorat ke bhi bura: bahut zyada data aur cartesian explosion (collections) — `AsSplitQuery` ya projection
- Lazy loading proxies ko production mein band rakhne ka sochna chahiye; explicit loading ya Include behtar

! "Include laga do" har jagah — list screen ko aksar poore entity ki zaroorat hi nahi. Projection pehle socho.
> Loop ke andar DB-hit dikhe to N+1. Fix = ek query, ya sirf zaroori columns.

# Concurrency + API design

## Aakhri seat do users ek saath book karein — double booking kaise roke
? Do users ek hi aakhri seat ek saath book karte hain. Kaise ensure karoge ki sirf ek ko mile?
**Ek line:** check-then-insert race hai; **database ko referee banao** — unique constraint, optimistic concurrency (RowVersion), ya pessimistic lock (`FOR UPDATE`). App-level `if (seat.IsFree)` kaafi nahi.

| Tareeka | Kaise | Kab |
| --- | --- | --- |
| **Unique constraint** | `UNIQUE(show_id, seat_no)` on bookings | Sabse simple aur safe; hara hua user ko unique violation milta hai |
| **Optimistic** | Row pe `RowVersion`; update tabhi jab version same | Conflict kam hota hai; retry/"seat gone" message |
| **Pessimistic** | `SELECT ... FOR UPDATE` (PostgreSQL) / `UPDLOCK` (SQL Server) | Contention bahut ho; lock short rakho |
| **Idempotency key** | Same request retry par dobara booking nahi | Network retry / double click |

```csharp
// Optimistic (EF Core): entity pe concurrency token
public class Seat
{
    public int Id { get; set; }
    public bool IsBooked { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = default!;   // SQL Server rowversion
}
// PostgreSQL (Npgsql): xmin system column as concurrency token — check docs for current API

try
{
    var seat = await db.Seats.FindAsync(seatId);
    if (seat!.IsBooked) return Conflict("Seat already taken");
    seat.IsBooked = true;
    await db.SaveChangesAsync();
    return Ok();
}
catch (DbUpdateConcurrencyException)
{
    return Conflict("Someone else booked this seat");        // UPDATE ... WHERE RowVersion = @old ne 0 rows touch kiya
}
```

```sql
-- PostgreSQL pessimistic
BEGIN;
SELECT * FROM seats WHERE id = 42 FOR UPDATE;      -- doosra transaction yahin ruka rahega
UPDATE seats SET is_booked = true WHERE id = 42;
COMMIT;

-- SQL Server
SELECT * FROM seats WITH (UPDLOCK, ROWLOCK) WHERE id = 42;   -- transaction ke andar
```

- EF Core mein `FOR UPDATE` ka built-in LINQ operator nahi — raw SQL (`FromSql`) chahiye
- Duplicate-request ke liye **idempotency key**: `Idempotency-Key` header + (key, response) store; same key pe purana response
- Seat hold (timeout ke saath) alag pattern hai: "reserve 5 min, phir confirm"

! Sirf `if (!seat.IsBooked)` check — do transactions dono ko free dekhte hain. Constraint ya version check ke bina double booking hoti hai.
> Race ho to DB se faisla karwao: unique, version, ya lock.

## Payment API design — idempotency, outbox, retries
? Payment API design karo jo network failure ya retry mein bhi double charge na kare.
**Ek line:** client **idempotency key** bheje; server uske saath payment ek DB transaction mein save kare; baahar ke events/calls **outbox** se bheje jaayein; failure states clear hon.

1. **Idempotency:** `POST /payments` ke saath `Idempotency-Key: <uuid>`. Server `(key)` pe unique constraint rakhe. Pehli baar process; dobara aaye to **wahi purana response** de (naya charge nahi). Same key par alag body aaye to 422/409
2. **State machine:** `Pending → Succeeded | Failed` — status transitions validate karo, "Succeeded" se wapas "Pending" nahi
3. **Outbox:** payment row aur `OutboxMessage` (event: PaymentSucceeded) ek **hi transaction** mein save. Alag worker outbox padh kar broker/email bheje. Isse "DB commit hua par event gaya nahi" wala dual-write bug nahi
4. **Retries:** client side exponential backoff + jitter; sirf transient (5xx, timeout) pe, aur wohi idempotency key ke saath. 4xx pe retry nahi
5. **Gateway timeout:** unknown outcome ko `Pending` rakho aur gateway se reconcile / webhook se confirm karo — "fail maan lo" mat karo
6. **Audit:** immutable ledger table; amount `decimal`, currency saath

```csharp
[HttpPost("payments")]
public async Task<IActionResult> Pay([FromHeader(Name = "Idempotency-Key")] string key, PayRequest req)
{
    var existing = await db.Payments.SingleOrDefaultAsync(p => p.IdempotencyKey == key);
    if (existing != null) return Ok(existing.ToResponse());          // replay

    await using var tx = await db.Database.BeginTransactionAsync();
    var p = new Payment { IdempotencyKey = key, Amount = req.Amount, Status = PaymentStatus.Pending };
    db.Payments.Add(p);
    db.Outbox.Add(OutboxMessage.For(new PaymentRequested(p.Id)));
    try { await db.SaveChangesAsync(); await tx.CommitAsync(); }
    catch (DbUpdateException)   // unique(key) race — doosre request ne pehle bana diya
    { /* dobara read karke existing return karo */ }
    return Accepted(p.ToResponse());
}
```

! "Retry laga denge" bina idempotency ke — retry hi double charge ka sabab hai. Aur DB save + message broker publish ko alag steps rakhna (dual write).
> Key se dobara nahi, outbox se kho nahi, state machine se galat nahi.

## Refresh token rotation, reuse detection aur Angular ke "ek saath kai 401" ki race
? Access token expire hone pe ek saath 5 API calls 401 deti hain. Angular mein refresh kaise karoge ki refresh sirf ek baar chale? Aur refresh token chori ho jaye to?
**Ek line:** **server pe rotation + reuse detection**; **client pe single-flight refresh** — pehla 401 refresh shuru kare, baaki intezaar karein aur naye token se retry karein.

**Server (rotation):** har refresh pe naya refresh token do, purana "used" mark karo. Agar **used token dobara** aaye to samjho chori hua — uski poori token **family revoke** karo, user ko dobara login karwao. Token DB mein hash karke rakho.

**Client (single-flight):** BehaviorSubject/`shareReplay` se ek hi refresh call share karo.

```typescript
let refreshing$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const withToken = (r: HttpRequest<unknown>, t: string | null) =>
    t ? r.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : r;

  return next(withToken(req, auth.accessToken)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || req.url.includes('/auth/refresh'))
        return throwError(() => err);

      refreshing$ ??= auth.refresh().pipe(          // ek hi in-flight refresh
        map(tokens => tokens.accessToken),
        finalize(() => (refreshing$ = null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      return refreshing$.pipe(
        switchMap(newToken => next(withToken(req, newToken))),
        catchError(e => { auth.logout(); return throwError(() => e); })   // refresh fail = logout
      );
    })
  );
};
```

- Refresh endpoint khud 401 de to **loop** na bane (upar `/auth/refresh` skip)
- Refresh fail → logout + login page
- Refresh token storage: `HttpOnly` secure cookie behtar (XSS se bacha); localStorage mein XSS risk
- Multi-tab: ek tab ne rotate kiya to doosre tab ka purana token "reuse" lagega — BroadcastChannel / grace window ya ek tab ko refresh karne do (design decision, bolo)

! Har failed request apna alag refresh kare — rotation ke saath ye khud reuse detection trigger karke user ko logout kara deta hai. Single-flight zaroori hai.
> Server: ghumao aur chor pakdo. Client: ek refresh, baaki line mein.

## Cursor/keyset vs offset pagination — REST mein kaunsi
? Offset pagination mein kya dikkat hai? Cursor (keyset) pagination kaise karte hain?
**Ek line:** offset (`OFFSET 100000`) DB ko pehle 100000 rows padh ke fenkna padta hai (slow) aur beech mein insert/delete se rows skip/duplicate hoti hain. Keyset: "last dekhi hui key ke baad ki rows" — index se seedha, fast aur stable.

| | Offset/limit | Keyset (cursor) |
| --- | --- | --- |
| Deep page | Slow (O(offset)) | Fast (index seek) |
| Insert/delete beech mein | Rows skip/duplicate | Stable |
| "Page 7 pe jao" | Haan | Nahi (sirf next/prev) |
| Implement | Aasaan | Unique, indexed sort key chahiye |

```sql
-- PostgreSQL / SQL Server dono: row-value ke bajaye explicit condition (SQL Server mein row-value comparison nahi)
SELECT * FROM orders
WHERE (created_at < @lastCreated) OR (created_at = @lastCreated AND id < @lastId)
ORDER BY created_at DESC, id DESC
LIMIT 20;                                  -- SQL Server: SELECT TOP (20) ... ya OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
-- Index: (created_at DESC, id DESC)
```

```csharp
var items = await db.Orders
    .Where(o => o.CreatedAt < lastCreated || (o.CreatedAt == lastCreated && o.Id < lastId))
    .OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id)
    .Take(pageSize + 1).ToListAsync();                 // +1 se pata chalta hai next page hai ya nahi
var hasNext = items.Count > pageSize;
// response: { items, nextCursor: base64(createdAt|id) }
```

- Sort key **unique** honi chahiye — isliye `id` tie-breaker
- Cursor ko opaque (base64) rakho; client ko andar ki cheez pata na chale
- Total count chahiye to alag `COUNT` (mehnga) — ya "has more" kaafi ho to count chhod do

! Sirf `created_at` pe cursor — same timestamp wali rows beech mein gum ho jaati hain. Tie-breaker column zaroor.
> Offset = gino aur fenko. Keyset = index pe kudo.

# Async + RxJS

## Channel<T> producer-consumer aur IAsyncEnumerable
? Background mein jobs process karne ke liye producer-consumer kaise banaoge? IAsyncEnumerable kab kaam aata hai?
**Ek line:** `Channel<T>` = thread-safe, async queue (BlockingCollection ka async version) — bounded rakho to **backpressure** milta hai. `IAsyncEnumerable<T>` = data **ek-ek karke stream** karo (`await foreach`).

```csharp
var channel = Channel.CreateBounded<int>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait,   // full ho to producer ruk jaye (backpressure)
    SingleReader = false
});

// Producer
_ = Task.Run(async () =>
{
    for (int i = 0; i < 1000; i++) await channel.Writer.WriteAsync(i);
    channel.Writer.Complete();                // zaroori — warna consumer hamesha intezaar karega
});

// Consumers (3 workers)
var workers = Enumerable.Range(0, 3).Select(_ => Task.Run(async () =>
{
    await foreach (var job in channel.Reader.ReadAllAsync())
        await ProcessAsync(job);
}));
await Task.WhenAll(workers);

// IAsyncEnumerable — poori list memory mein nahi, stream
public async IAsyncEnumerable<Order> StreamOrdersAsync([EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var o in db.Orders.AsAsyncEnumerable().WithCancellation(ct))
        yield return o;
}
// ASP.NET Core action se IAsyncEnumerable<T> return karo to response stream/serialize hota hai
```

- Unbounded channel mein producer tez ho to memory badhti jaati hai — bounded rakho
- `Writer.Complete()` bhoolna = classic hang
- `IAsyncEnumerable`: bade result set ko paginate/stream karo; `[EnumeratorCancellation]` se token pass hota hai

! `Complete()` na bulaana, aur bina limit ke unbounded channel. Dono production mein dikkat dete hain.
> Channel = async queue + backpressure. IAsyncEnumerable = ek-ek karke aao.

## Task.WhenAll vs sequential awaits aur CancellationToken propagation
? Teen independent API calls hain. Sequential await vs WhenAll ka farak? Cancellation sab jagah kaise pass karoge?
**Ek line:** independent kaam ek saath shuru karo aur `WhenAll` se wait karo — total time = sabse dheema call, sum nahi. `CancellationToken` har async layer se neeche tak pass karo.

```csharp
// Sequential — ~ a + b + c time
var u = await GetUserAsync(id, ct);
var o = await GetOrdersAsync(id, ct);
var p = await GetPrefsAsync(id, ct);

// Parallel — ~ max(a, b, c)
var userTask = GetUserAsync(id, ct);
var ordersTask = GetOrdersAsync(id, ct);
var prefsTask = GetPrefsAsync(id, ct);
await Task.WhenAll(userTask, ordersTask, prefsTask);
var result = (userTask.Result, ordersTask.Result, prefsTask.Result);   // complete ho chuke hain — safe
```

- Ek bhi task fail ho to `await WhenAll` pehli exception throw karta hai; saare errors `whenAllTask.Exception.InnerExceptions` mein
- Ek hi `DbContext` pe parallel queries **nahi** chalti (thread-safe nahi) — alag context/scope chahiye
- Dependent calls (b ko a ka result chahiye) sequential hi rahengi
- **Cancellation:** controller action ka `CancellationToken ct` → service → repository → `ToListAsync(ct)`/`HttpClient.GetAsync(url, ct)`. Client request cancel kare to server kaam rokta hai
- Timeout: `CancellationTokenSource.CreateLinkedTokenSource(ct)` + `CancelAfter(TimeSpan.FromSeconds(5))`
- Cancellation ke baad `OperationCanceledException` aati hai — ise error ki tarah log mat karo

! Await ko loop ke andar ek-ek karke chalana jabki calls independent hain; aur token ko beech ki layer pe drop kar dena (uske neeche cancel kabhi nahi hota).
> Shuru sab karo, wait ek baar. Token neeche tak.

## RxJS error handling — catchError, retry with backoff, shareReplay pitfalls
? HTTP call fail ho jaye to Rx mein kya karoge? Retry kaise karte ho? shareReplay mein kya pitfalls hain?
**Ek line:** error stream ko **maar deta hai**; `catchError` se replacement stream do, `retry` se dobara subscribe karo (transient errors pe, backoff ke saath), `shareReplay` se result cache/share karo (par refCount dhyan se).

```typescript
// Retry with exponential backoff (RxJS 7+)
this.http.get<User[]>('/api/users').pipe(
  retry({
    count: 3,
    delay: (error, attempt) =>
      error.status >= 500 || error.status === 0
        ? timer(2 ** attempt * 500)           // 1s, 2s, 4s
        : throwError(() => error)             // 4xx pe retry nahi
  }),
  catchError(err => { this.toast.error('Load failed'); return of([] as User[]); })
);

// shareReplay — ek hi HTTP call, kai subscribers
users$ = this.http.get<User[]>('/api/users').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

- **catchError ka jagah** mayne rakhta hai: bahar ke stream pe lagaya to wo stream mar jaata hai; `switchMap` ke **andar inner** pe lagao taaki outer (search box) zinda rahe
- `catchError` mein ya to fallback value (`of(...)`) do ya `throwError` se dobara phenko
- **shareReplay pitfalls:** `refCount: false` (purana tareeka) mein source kabhi unsubscribe nahi hota — leak; data stale cache rehta hai jab tak refresh na karo; infinite source ke saath dhyan
- Nayi RxJS mein `shareReplay` error pe reset hota hai ya nahi version pe depend karta hai — **check docs**
- Angular mein `async` pipe subscribe/unsubscribe khud karta hai

! `retry()` sab errors pe, bina delay ke — 400/401 pe bhi loop chalta hai aur server pe load. Aur outer pipe pe `catchError` laga ke search stream hamesha ke liye khatam kar dena.
> catchError = bacha ke do. retry = soch ke, delay ke saath. Inner stream mein error pakdo.

## RxJS flattening operators — search box, parallel uploads, ordered saves, login button
? switchMap, mergeMap, concatMap, exhaustMap mein farak kya hai? Har ek ka ek concrete use batao.
**Ek line:** sab outer value ko inner Observable mein badalte hain — farak ye hai ki **nayi value aane par purane inner ke saath kya karein**.

| Operator | Purane inner ka kya | Concrete use |
| --- | --- | --- |
| `switchMap` | Cancel kar do, naya chalu | **Search box / typeahead** — sirf latest query ka result chahiye |
| `mergeMap` | Sab saath chalne do | **Parallel uploads** / independent calls (order important nahi) |
| `concatMap` | Line mein, ek ke baad ek | **Ordered saves** — draft v1, v2, v3 ussi order mein jaana chahiye |
| `exhaustMap` | Naya ignore (jab tak purana chal raha) | **Login / Submit button** — double click pe dusri request nahi |

```typescript
search.valueChanges.pipe(
  debounceTime(300), distinctUntilChanged(),
  switchMap(q => this.api.search(q).pipe(catchError(() => of([]))))
);

from(files).pipe(mergeMap(f => this.api.upload(f), 3));      // max 3 parallel

save$.pipe(concatMap(doc => this.api.save(doc)));             // order preserved

loginClick$.pipe(exhaustMap(() => this.api.login(form.value)));
```

- `mergeMap(fn, concurrency)` — upload mein limit zaroor lagao
- `switchMap` write/mutation (POST payment) pe **dangerous** — cancel hone par request server tak pahunch chuki ho sakti hai; response ignore hoga par kaam ho gaya
- `switchMap` jab outer baar-baar emit kare tab purana HTTP abort hota hai (browser level)

! Save/payment button pe `switchMap` — user ne do baar click kiya to pehla response drop ho jaata hai par server ne process kar diya ho sakta hai. Mutation ke liye `concatMap` ya `exhaustMap`.
> Search = switch, upload = merge, save = concat, login = exhaust.

# Ops + quality

## FluentValidation vs DataAnnotations aur [ApiController] ka auto-400
? Validation kaise karte ho ASP.NET Core Web API mein? [ApiController] ka kya role hai? FluentValidation kyun?
**Ek line:** `[ApiController]` model validation fail hone par controller ke action tak pahunche bina khud **400 + ProblemDetails** de deta hai (`ModelState` check ki zaroorat nahi). Rules **DataAnnotations** (attributes) ya **FluentValidation** (alag validator class) se aate hain.

| | DataAnnotations | FluentValidation |
| --- | --- | --- |
| Kahan | Model pe attributes | Alag `AbstractValidator<T>` class |
| Complex/conditional rules | Mushkil | Aasaan (`When`, cross-field) |
| DI / DB check | Mushkil | Validator mein service inject ho sakti hai |
| Testing | Awkward | Validator unit test karna simple |
| Model ko clean rakhna | Nahi (attributes bharte hain) | Haan |

```csharp
public record CreateUserRequest(string Email, string Password, int Age);

public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).MinimumLength(8);
        RuleFor(x => x.Age).InclusiveBetween(18, 100).WithMessage("Age 18-100 honi chahiye");
    }
}

builder.Services.AddValidatorsFromAssemblyContaining<CreateUserValidator>();

// Manual call (recommended aaj kal)
public async Task<IActionResult> Create(CreateUserRequest req, IValidator<CreateUserRequest> v)
{
    var result = await v.ValidateAsync(req);
    if (!result.IsValid) return ValidationProblem(new ValidationProblemDetails(result.ToDictionary()));
    ...
}
```

- FluentValidation ka purana **auto-validation integration** (`FluentValidation.AspNetCore`) ab maintain nahi hota — validator ko manually bulana recommended hai (check docs/latest guidance)
- Auto-400 band karna ho: `ConfigureApiBehaviorOptions(o => o.SuppressModelStateInvalidFilter = true)`
- Client-side validation ke saath server validation **zaroori** hai — client bypass ho sakta hai
- Business rules (email already exists) ko validation nahi, service layer / unique constraint se handle karo

! "Frontend ne validate kar diya, backend ki zaroorat nahi" — kabhi nahi. Aur FluentValidation ko auto-hook samajh ke `ValidateAsync` na bulana.
> [ApiController] = free 400. Complex rules = FluentValidation.

## Structured logging — Serilog, correlation id aur OpenTelemetry
? Production mein ek request ka poora trace kaise follow karoge? Serilog structured logging kya hai?
**Ek line:** **Structured logging** = message ke saath properties (JSON) — `"Order {OrderId} paid"` (string concat nahi) — taaki Seq/Elastic/App Insights mein `OrderId` se search ho. **Correlation id** = ek request ki saari logs (API, services, queue) ko jodne wala id.

```csharp
// Program.cs
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(new CompactJsonFormatter()));

// Correlation id middleware
app.Use(async (ctx, next) =>
{
    var id = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString();
    ctx.Response.Headers["X-Correlation-Id"] = id;
    using (LogContext.PushProperty("CorrelationId", id))
        await next();
});

_logger.LogInformation("Order {OrderId} paid by {UserId}", order.Id, userId);  // structured, interpolation nahi
```

- **End to end:** Angular interceptor har request pe header lagaye (ya server banaye) → downstream `HttpClient` calls mein bhi wahi header forward → queue message mein bhi id
- **OpenTelemetry (ek paragraph):** vendor-neutral standard jo **traces, metrics, logs** deta hai. ASP.NET Core aur `HttpClient` ka instrumentation lagao, to har incoming/outgoing call ek `Activity` (span) banta hai, aur W3C `traceparent` header se **trace id** services ke beech chalti hai. Exporter (OTLP) se Jaeger/Grafana/App Insights ko bhejo. Correlation id ka kaam trace id bhi kar sakta hai (`Activity.Current?.TraceId`)
- Secrets/PII (password, token, card) kabhi log mat karo
- Log levels: Debug (dev), Information (flow), Warning, Error (exception ke saath), Fatal

! `_logger.LogInformation($"Order {id} paid")` — string interpolation structure khatam kar deta hai (property nahi banti). Template + argument use karo.
> Message template, properties alag. Ek id poore safar ka.

## Unit test — xUnit + Moq/NSubstitute, arrange-act-assert aur edge cases
? Service ka unit test kaise likhoge? Mock aur stub mein kya hai? Moq aur NSubstitute mein farak?
**Ek line:** dependencies (repository, email sender) ko **fake/mock** se badlo, taaki sirf service ki logic test ho — Arrange (setup) → Act (call) → Assert (check).

- **Stub** = fixed jawab deta hai. **Mock** = verify bhi karte ho ki call hua ya nahi
- **Moq:** `new Mock<IRepo>()`, `.Setup(...).ReturnsAsync(...)`, `.Verify(...)`
- **NSubstitute:** `Substitute.For<IRepo>()`, `.Returns(...)`, `.Received()` — syntax chhota
- Sirf **interface/virtual** members mock hote hain — isliye DI aur interfaces

```csharp
public class OrderService(IOrderRepo repo, IEmailSender email)
{
    public async Task<decimal> ApplyDiscountAsync(int orderId, decimal percent)
    {
        if (percent is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(percent));
        var order = await repo.GetAsync(orderId) ?? throw new KeyNotFoundException();
        order.Total -= order.Total * percent / 100;
        await repo.SaveAsync(order);
        await email.SendAsync(order.CustomerEmail, "Discount applied");
        return order.Total;
    }
}

public class OrderServiceTests
{
    private readonly Mock<IOrderRepo> _repo = new();
    private readonly Mock<IEmailSender> _email = new();

    [Fact]
    public async Task ApplyDiscount_10Percent_ReducesTotalAndSendsEmail()
    {
        // Arrange
        _repo.Setup(r => r.GetAsync(1)).ReturnsAsync(new Order { Total = 200, CustomerEmail = "a@b.com" });
        var sut = new OrderService(_repo.Object, _email.Object);
        // Act
        var total = await sut.ApplyDiscountAsync(1, 10);
        // Assert
        Assert.Equal(180m, total);
        _repo.Verify(r => r.SaveAsync(It.IsAny<Order>()), Times.Once);
        _email.Verify(e => e.SendAsync("a@b.com", It.IsAny<string>()), Times.Once);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task ApplyDiscount_InvalidPercent_Throws(decimal pct)
    {
        var sut = new OrderService(_repo.Object, _email.Object);
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => sut.ApplyDiscountAsync(1, pct));
        _repo.Verify(r => r.SaveAsync(It.IsAny<Order>()), Times.Never);   // kuch save nahi hua
    }

    [Fact]
    public async Task ApplyDiscount_OrderNotFound_Throws()
    {
        _repo.Setup(r => r.GetAsync(99)).ReturnsAsync((Order?)null);
        var sut = new OrderService(_repo.Object, _email.Object);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => sut.ApplyDiscountAsync(99, 10));
    }
}
```

- Edge cases: 0%, 100%, invalid percent, order missing, repo exception, email fail hone par kya
- Ek test = ek behaviour; naam batata hai `Method_Scenario_Expected`
- Real DB logic (EF queries) ke liye in-memory provider bharose ka nahi — integration test real DB (Testcontainers) se

! Har cheez `Verify` karna (over-mocking) — test implementation se chipak jaata hai. Output/behaviour assert karo, andar ki har call nahi.
> Arrange, Act, Assert. Edge cases alag test.

# SQL Server vs PostgreSQL

## Clustered vs non-clustered index aur NOLOCK vs READ_COMMITTED_SNAPSHOT
? SQL Server mein clustered index kya hota hai aur PostgreSQL se kaise alag? NOLOCK kyun risky hai aur uska behtar vikalp kya hai?
**Ek line:** SQL Server mein **clustered index = table ka data khud usi order mein** (ek table pe sirf ek); PK banane par default yahi clustered ban jaata hai. PostgreSQL mein table **heap** hota hai, saare indexes secondary.

- **SQL Server:** PRIMARY KEY by default clustered (chaho to `PRIMARY KEY NONCLUSTERED`). Non-clustered index ke leaf mein clustering key hoti hai (key lookup). Random GUID clustered key = page splits, fragmentation; `NEWSEQUENTIALID()` ya int identity behtar
- **PostgreSQL:** index heap row (ctid) ko point karta hai. `CLUSTER` command ek baar ka reorder hai, maintain nahi hota
- **NOLOCK** (= `READ UNCOMMITTED`): dirty reads, rows double ya skip ho sakti hain (page split pe) — financial/accurate data pe nahi
- **Behtar:** `ALTER DATABASE db SET READ_COMMITTED_SNAPSHOT ON` — readers writers ko block nahi karte, aur committed snapshot padhte hain (tempdb mein row versions, thoda overhead)
- PostgreSQL mein ye problem hi alag: **MVCC** default hai — readers writers ko block nahi karte; `READ UNCOMMITTED` maango to bhi `READ COMMITTED` hi milta hai

! "NOLOCK se query fast ho jaati hai, laga do" — galat/duplicate rows ka risk. Pehle blocking ka asli reason (index, long transaction) dekho, ya RCSI on karo.
> SQL Server: PK = clustered. NOLOCK ka safe vikalp RCSI. PostgreSQL: MVCC pehle se.

## SQL Server vs PostgreSQL — syntax ke farak (identity, paging, TRUNCATE, temp table)
? Inserted ID kaise wapas lete ho dono mein? Paging aur temp table ka syntax? TRUNCATE rollback hota hai kya?
**Ek line:** concepts same, syntax alag — interview mein dono ke saath comfortable dikho aur jo project mein use kiya wo pakka bolo.

| Kaam | SQL Server | PostgreSQL |
| --- | --- | --- |
| Naya ID wapas | `SCOPE_IDENTITY()` ya `OUTPUT INSERTED.Id` | `INSERT ... RETURNING id` |
| Paging | `ORDER BY x OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` | `ORDER BY x LIMIT 10 OFFSET 20` |
| Top N | `SELECT TOP (5) ...` | `LIMIT 5` |
| Temp table | `#temp` (session), `##temp` (global) | `CREATE TEMP TABLE t (...)` |
| Auto ID | `IDENTITY(1,1)` | `GENERATED ALWAYS AS IDENTITY` / `SERIAL` |
| String concat | `+` ya `CONCAT` | `CONCAT` (ya double-pipe operator) |
| Current time | `GETDATE()` / `SYSUTCDATETIME()` | `NOW()` |

```sql
-- SQL Server
INSERT INTO orders (customer_id, total) OUTPUT INSERTED.id VALUES (1, 500);
SELECT SCOPE_IDENTITY();                  -- @@IDENTITY nahi: trigger ki identity bhi utha leta hai

-- PostgreSQL
INSERT INTO orders (customer_id, total) VALUES (1, 500) RETURNING id;

CREATE TEMP TABLE tmp_ids (id int) ON COMMIT DROP;     -- PostgreSQL: transaction ke baad gayab
```

- **TRUNCATE:** **PostgreSQL aur SQL Server dono mein transactional** hai — `BEGIN; TRUNCATE t; ROLLBACK;` rollback ho jaata hai. ("Truncate rollback nahi hota" purana mithak hai — Oracle/MySQL mein implicit commit hota hai)
- TRUNCATE: WHERE nahi, identity reset (SQL Server), FK se refer ho rahi table pe chalta nahi (PostgreSQL mein `CASCADE`), DELETE triggers nahi chalte
- EF Core mein dono ke liye `RETURNING`/`OUTPUT` provider khud karta hai — raw SQL likhte waqt farak yaad rakho

! `@@IDENTITY` use karna (trigger ke insert ki id aa sakti hai) aur "TRUNCATE rollback nahi hota" bolna — dono purane/galat jawab hain.
> SQL Server = SCOPE_IDENTITY/OUTPUT, OFFSET FETCH, #temp. PostgreSQL = RETURNING, LIMIT, TEMP TABLE. TRUNCATE dono mein rollback.

# Modern updates + story

## .NET, C# aur Angular ke recent updates — kya bolna safe hai
? .NET ke LTS versions kaun se hain? Latest C# mein kya naya hai? Angular mein standalone aur signals kab aaye?
**Ek line:** yaad rakho **kya stable aur kab** — par tarikhein aur support end dates ke liye **official support page verify karo** (ye badalte rehte hain).

**.NET releases:**
- LTS releases: **.NET 6, .NET 8, .NET 10**. Beech ke (7, 9) STS hote hain — chhota support window
- .NET 10 abhi (Nov 2026) current LTS hai — **verify on the official .NET support policy page**; end-of-support dates par bharosa mat karo bina check kiye (.NET 6 ka support khatam ho chuka hai, .NET 8 ki date page se dekho)
- Naye project ke liye LTS lo, purane ko upgrade plan rakho

**C# (recent, check docs):** C# 14 (.NET 10 ke saath):
- `field` keyword — property accessor ke andar auto-generated backing field ko seedha use karo (alag private field ki zaroorat nahi)
- **Extension members** — extension properties/static members bhi, sirf methods nahi
- Purane, pakke features: primary constructors (C# 12), collection expressions `[1,2,3]` (C# 12), records (C# 9)

**Angular:**
- **Standalone components** — v14 mein introduced; **v17 se `ng new` default standalone** hai; **v19 se `standalone: true` implicit** (likhna zaroori nahi, NgModule wale ke liye `standalone: false` chahiye)
- **Signals** — v16 mein introduced (developer preview); **v17 se `signal`/`computed` stable**. Kuch aur APIs (jaise `effect`, signal inputs/queries, `linkedSignal`, resource) alag-alag versions mein stable hue — **check docs** apne version ke liye
- Naya control flow `@if / @for` (v17+), `NgIf/NgFor` purane hain par chalte hain

```csharp
// C# 14 (recent) — field keyword
public string Name
{
    get;
    set => field = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
}
```

```typescript
// Angular 19+: standalone implicit
@Component({ selector: 'app-hello', template: `<p>{{ count() }}</p>` })
export class HelloComponent { count = signal(0); }
```

! Confidently date ya "yeh feature is version mein stable hua" bolna jab pakka na ho. Behtar: "Mere yaad se v17 se, par official docs se confirm karunga."
> LTS = 6, 8, 10. Standalone default v17, implicit v19. Signals 16 mein aaye, 17 se stable.

## Project story with numbers (maine, not hum)
? Apne project ke baare mein ek achhi kahani batao jisme tumhara asli contribution dikhe.
**Ek line:** "hum" nahi, "**maine**" — structure: **problem → mera decision → rejected alternatives → number → kya badalta**. Number sach hona chahiye; jo yaad na ho wo bolo mat.

| Step | Kya bolna hai |
| --- | --- |
| Problem | Kya toot raha tha, kitna bada (user/business impact) |
| My decision | **Maine** kya chuna aur kyun |
| Alternatives rejected | 1-2 options, kyun nahi (cost, risk, time) |
| Number | Before/after — latency, error rate, time saved |
| What I'd change | Ek honest kami / agla improvement |

**Template (apne facts bharo — `<>` placeholders):**

"`<System>` mein `<problem>` tha — `<N>` users/requests pe `<symptom>`. Maine `<decision>` kiya kyunki `<reason>`. Do aur options socha — `<alt 1>` (reject: `<reason>`) aur `<alt 2>` (reject: `<reason>`). Result: `<metric>` `<before>` se `<after>` hua (`<N>`% better). Agar dobara karta to `<change>`, kyunki `<learning>`."

**Worked example (sirf format dikhane ke liye — numbers apne daalo):**
"Order list API `<N>` seconds leti thi jab `<N>` rows hoti thin. Maine SQL profile karke dekha ki N+1 queries ja rahi thi, to `Include` ki jagah projection lagaya. Maine caching bhi socha tha par data har minute badalta tha, aur raw SQL socha par team maintainability chahti thi — dono reject. Result: p95 `<before>`ms se `<after>`ms, DB calls `<N>` se `<M>`. Agar dobara karta to pehle se load test aur monitoring dashboard lagata."

- Har project ke liye ek aisi story taiyar rakho; **sirf wohi number bolo jo tumne measure kiya** — interviewer deep-dive karega
- Number yaad na ho to approximate batao aur bolo ki approximate hai ("lagbhag")
- Team ka kaam ho to bolo kaunsa hissa **tumhara** tha

! "Hum ne kiya" bolte rehna — interviewer ko tumhara role pata hi nahi chalta. Aur kabhi invented number mat bolo — ek follow-up mein pakde jaoge.
> Problem, maine, rejected, number, aur kya badalta. Hum nahi, maine.
