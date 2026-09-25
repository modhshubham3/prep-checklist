# Tricky — EF Core aur LINQ scenarios

## ToList ke baad Where lagaya — kitna data aaya?
```csharp q
var active = db.Users
    .ToList()
    .Where(u => u.IsActive)
    .Take(10);
```
**Poori `users` table** memory mein aa gayi. `ToList()` pe SQL chal gaya — `SELECT * FROM users` bina WHERE ke. `Where` aur `Take` uske baad **C# memory** mein chale.

1 lakh users ho to 1 lakh rows network pe aayengi, 10 rakhne ke liye. Fix: filtering, paging, projection sab `ToList()` se **pehle**, taaki SQL mein jaaye: `db.Users.Where(u => u.IsActive).Take(10).ToListAsync()`.

> ToList = SQL yahin chala. Uske baad sab in-memory.

## Count phir ToList — kitni queries?
```csharp q
var q = db.Orders.Where(o => o.Status == "Paid");
var total = await q.CountAsync();
var list  = await q.ToListAsync();
foreach (var o in q) { }
```
**Teen alag SQL queries**: ek `COUNT(*)`, ek `SELECT ...`, aur `foreach` pe phir se `SELECT ...`. `q` sirf query ki definition hai; har execution naya round-trip.

Paging mein count + page do queries normal hain. Par result pe baar-baar loop karna ho to ek baar `list` banao aur use hi use karo — `q` pe dobara nahi.

> IQueryable pe har enumeration = nayi database query.

## AsNoTracking entity badli aur SaveChanges kiya
```csharp q
var user = await db.Users.AsNoTracking().FirstAsync(u => u.Id == 1);
user.Name = "New Name";
var n = await db.SaveChangesAsync();
Console.WriteLine(n);
```
Output: **`0`** — kuch save nahi hua, koi error bhi nahi.

`AsNoTracking` ki wajah se DbContext ne ye entity yaad hi nahi rakhi, to use pata nahi ki kuch badla. Save karna hai to tracking wali query use karo, ya `db.Update(user)` (par wo **saare columns** update karega), ya `db.Attach(user)` karke sirf badli property ko `IsModified = true`.

> change tracker jo entity jaanta hi nahi, uska change save nahi kar sakta.

## SaveChanges do baar
```csharp q
var o = await db.Orders.FindAsync(42);
o!.Status = "Shipped";
await db.SaveChangesAsync();
await db.SaveChangesAsync();
```
Pehla `SaveChanges` → ek `UPDATE`. Doosra → **koi SQL nahi**. Save hone ke baad EF entity ki state `Unchanged` kar deta hai aur naya snapshot le leta hai; doosri baar compare karne pe koi farak nahi milta.

## Find do baar — kitni queries?
```csharp q
var a = await db.Users.FindAsync(1);
var b = await db.Users.FindAsync(1);
var c = await db.Users.FirstAsync(u => u.Id == 1);
Console.WriteLine(ReferenceEquals(a, b));
Console.WriteLine(ReferenceEquals(a, c));
```
Queries: **do** (pehla `Find` aur `First`). Output: **`True`**, **`True`**.

`Find` pehle **change tracker** mein dekhta hai — entity already tracked hai to database jaata hi nahi. `First` hamesha query bhejta hai, par jo row aati hai uski primary key tracker mein already hai, to EF **wahi existing object** lauta deta hai (identity resolution) — naya object nahi banata. Isliye teeno same object hain.

Side effect: agar DB mein kisi aur ne row badal di, `First` ke baad bhi tumhe **purani (tracked) values** dikhengi — naye data ke liye `AsNoTracking` ya `Entry(a).ReloadAsync()`.

## Where mein apna C# method call kiya
```csharp q
bool IsVip(Customer c) => c.TotalSpent > 100000 && c.Orders.Count > 10;

var vips = await db.Customers.Where(c => IsVip(c)).ToListAsync();
```
**Runtime exception**: *The LINQ expression ... could not be translated.* EF Core expression tree ko SQL mein badalta hai — tumhare C# method ka SQL version usse pata nahi.

Options: condition seedha expression mein likho (`Where(c => c.TotalSpent > 100000 && c.Orders.Count > 10)`), ya reusable chahiye to `Expression<Func<Customer, bool>>` banao. EF Core 3+ chupke se data memory mein laa ke filter nahi karta (purane versions karte the) — isliye exception milta hai, silent full table scan nahi.

```csharp
static readonly Expression<Func<Customer, bool>> IsVipExpr =
    c => c.TotalSpent > 100000 && c.Orders.Count > 10;

var vips = await db.Customers.Where(IsVipExpr).ToListAsync();   // SQL mein translate hota hai
```

## Include kiya par phir Select kiya
```csharp q
var list = await db.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items)
    .Select(o => new { o.Id, o.Amount })
    .ToListAsync();
```
Dono **`Include` ignore** ho jaate hain. `Select` projection batata hai exactly kya chahiye — sirf `Id` aur `Amount`. Customer aur Items ki zaroorat hi nahi, to JOIN hota hi nahi. Include tabhi matter karta hai jab poori entity lautao.

Aur agar projection mein related data chahiye (`o.Customer.Name`), to EF bina Include ke khud JOIN kar deta hai.

> projection jo maangta hai wahi aata hai; Include entities ke liye hai.

## DTO se entity banake Update kiya — kaunse columns badle?
```csharp q
// Client ne sirf { id: 5, name: "Ravi" } bheja
var user = new User { Id = 5, Name = dto.Name };
db.Users.Update(user);
await db.SaveChangesAsync();
```
**Saare columns** update ho jaate hain — `Email`, `Phone`, `CreatedAt`, sab `null`/default se **overwrite**! `Update()` detached entity ki har property ko Modified mark karta hai.

Sahi tareeka: entity DB se load karo, sirf bheji gayi fields set karo, save karo (EF sirf badle columns ka UPDATE bhejega). Ya bulk: `ExecuteUpdateAsync(s => s.SetProperty(u => u.Name, dto.Name))`.

```csharp
var user = await db.Users.FindAsync(dto.Id);
if (user is null) return NotFound();
user.Name = dto.Name;                 // sirf ye column Modified
await db.SaveChangesAsync();
```

! Production data loss ka bahut common kaaran — partial DTO ko `Update()` karna.

## Navigation property null kyun aa rahi hai?
```csharp q
var order = await db.Orders.FirstAsync(o => o.Id == 42);
Console.WriteLine(order.Customer.Name);
```
**`NullReferenceException`** — `order.Customer` null hai, jabki DB mein customer hai.

EF Core **related data apne aap load nahi karta** (lazy loading by default off hai). Customer chahiye to batana padega: `Include(o => o.Customer)`, ya projection mein `o.Customer.Name`, ya explicit load. Ek aur twist: agar customer pehle se isi DbContext mein tracked tha, to EF use apne aap jod deta hai ("fix-up") — isliye ye bug kabhi dikhta hai kabhi nahi.

## Same DbContext pe do queries parallel
```csharp q
var usersTask  = db.Users.ToListAsync();
var ordersTask = db.Orders.ToListAsync();
await Task.WhenAll(usersTask, ordersTask);
```
**`InvalidOperationException`**: *A second operation was started on this context instance before a previous operation completed.*

DbContext **thread-safe nahi** hai aur ek waqt pe ek hi operation chala sakta hai. Parallel chahiye to do alag contexts (`IDbContextFactory`) — ya bas sequentially await karo; aam taur pe do chhoti queries ka parallel hona zyada farak nahi deta.

## Skip/Take bina OrderBy ke
```csharp q
var page1 = await db.Products.Skip(0).Take(20).ToListAsync();
var page2 = await db.Products.Skip(20).Take(20).ToListAsync();
```
Pages mein **items repeat ya gayab** ho sakte hain. SQL mein `ORDER BY` ke bina database rows ka koi guaranteed order nahi deta — do queries mein alag order aa sakta hai (khaas kar updates, parallel scans ke baad). EF Core warning bhi deta hai.

Fix: hamesha deterministic order — `OrderBy(p => p.Name).ThenBy(p => p.Id)` (unique column tie-breaker).

## Pehla SaveChanges hua, phir exception
```csharp q
db.Orders.Add(order);
await db.SaveChangesAsync();          // 1

db.Payments.Add(payment);
throw new Exception("gateway down");
await db.SaveChangesAsync();          // 2 — chala hi nahi
```
Order **save ho chuka hai**, payment nahi. Har `SaveChanges` apna **alag transaction** hai aur commit ho jaata hai. Beech mein fail hone pe pehla wapas nahi hota — data inconsistent.

Fix: dono ek hi `SaveChanges` mein (ek transaction), ya explicit transaction: `await using var tx = await db.Database.BeginTransactionAsync(); ... await tx.CommitAsync();` — exception pe dispose hote hi rollback. External calls (payment gateway) ke saath distributed transaction nahi hota — wahan outbox/compensation pattern.

## Do users ne ek saath same record edit kiya
```text q
10:00:00  User A form kholta hai   — price = 100
10:00:05  User B form kholta hai   — price = 100
10:00:30  User A save: price = 120
10:00:40  User B save: stock = 50  (price B ke form mein abhi bhi 100)
```
By default **last write wins** — agar B ka update poori entity bhejta hai to A ka price change (120) **chup-chaap wapas 100** ho jaata hai. Na error, na warning (**lost update**).

Fix: **optimistic concurrency** — ek version/row-version column (`[Timestamp]`, PostgreSQL mein `xmin` ya apna `Version` column). EF UPDATE mein `WHERE id = @id AND version = @oldVersion` lagata hai; koi aur pehle badal chuka hai to 0 rows affect → `DbUpdateConcurrencyException`. API usse **409 Conflict** lautaye aur user ko "data badal gaya, refresh karo" dikhe.

```csharp
public class Product
{
    public int Id { get; set; }
    public decimal Price { get; set; }
    [ConcurrencyCheck] public int Version { get; set; }   // har save pe badhao
}
```

# Tricky — SQL scenarios

## NOT IN mein NULL aa gaya
```sql q
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
-- orders.customer_id mein ek row NULL hai
```
Result: **zero rows** — chahe aise customers ho jinka koi order nahi.

`x NOT IN (1, 2, NULL)` = `x <> 1 AND x <> 2 AND x <> NULL`. `x <> NULL` hamesha **NULL (unknown)** hai, aur `AND` mein ek bhi NULL ho to poora result TRUE nahi ho sakta → koi row pass nahi hoti.

Fix: **`NOT EXISTS`** (NULL-safe aur aksar tez), ya subquery mein `WHERE customer_id IS NOT NULL`.

```sql
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

> NULL ke saath comparison = unknown, TRUE nahi.

## COUNT(*) vs COUNT(column) vs COUNT(DISTINCT)
```sql q
-- employees: 5 rows, manager_id values: 1, 1, 2, NULL, NULL
SELECT COUNT(*), COUNT(manager_id), COUNT(DISTINCT manager_id) FROM employees;
```
Output: **`5, 3, 2`**.

`COUNT(*)` **saari rows** ginta hai. `COUNT(column)` sirf wo rows jahan column **NULL nahi** hai. `COUNT(DISTINCT column)` unique non-null values. Isliye LEFT JOIN ke baad "kitne orders" ginne ke liye `COUNT(o.id)` — `COUNT(*)` bina order wale customer ko bhi 1 ginega.

## WHERE status <> 'Cancelled' — NULL wali rows?
```sql q
-- status values: 'Paid', 'Cancelled', NULL
SELECT COUNT(*) FROM orders WHERE status <> 'Cancelled';
```
Sirf `'Paid'` wali rows aati hain — **NULL status wali rows bhi chhoot jaati hain**. `NULL <> 'Cancelled'` TRUE nahi, unknown hai.

NULLs bhi chahiye to: `WHERE status IS DISTINCT FROM 'Cancelled'` (PostgreSQL, NULL-safe) ya `WHERE status <> 'Cancelled' OR status IS NULL`. Isliye aise columns pe NOT NULL + default rakhna better hai.

## SELECT ka alias WHERE mein
```sql q
SELECT salary * 12 AS annual FROM employees WHERE annual > 600000;
SELECT salary * 12 AS annual FROM employees ORDER BY annual DESC;
```
Pehli query **error**: `column "annual" does not exist`. Doosri **chalti hai**.

SQL ka logical order: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`. WHERE, SELECT se **pehle** chalta hai — alias tab tak bana hi nahi. ORDER BY baad mein chalta hai, isliye alias dikhta hai. WHERE mein expression dobara likho, ya subquery/CTE mein wrap karo.

## GROUP BY mein column bhool gaye
```sql q
SELECT department_id, name, COUNT(*)
FROM employees
GROUP BY department_id;
```
PostgreSQL **error**: *column "employees.name" must appear in the GROUP BY clause or be used in an aggregate function.*

Ek department mein kai employees hain — group ki ek row mein kaunsa `name` dikhaye? Ambiguous. Ya `name` ko GROUP BY mein daalo (tab har name alag group), ya aggregate lagao (`STRING_AGG(name, ', ')`, `MAX(name)`). (MySQL ke purane modes ek random value de dete the — isliye ye "chal jaata hai" wala bug hai.) Exception: agar primary key se group kiya hai to us table ke baaki columns allowed hain.

## Khaali table pe SUM aur AVG
```sql q
SELECT SUM(amount), AVG(amount), COUNT(*), MAX(amount)
FROM orders WHERE 1 = 0;
```
Output: **`NULL, NULL, 0, NULL`**.

`COUNT` khaali set pe **0** deta hai, par `SUM`, `AVG`, `MAX`, `MIN` **NULL** dete hain (0 nahi!). App mein ye `decimal` mein map hote waqt null exception de sakta hai. Fix: `COALESCE(SUM(amount), 0)`.

Aur `AVG` NULL values ko **ignore** karta hai — `AVG(rating)` jahan kuch ratings NULL hain, sirf non-null ka average. NULL ko 0 maanna ho to `AVG(COALESCE(rating, 0))` — result alag aayega.

## Integer division PostgreSQL mein
```sql q
SELECT 5 / 2, 5 / 2.0, 5::numeric / 2, 1 / 3 * 100;
```
Output: **`2`, `2.5000…`, `2.5000…`, `0`**.

Dono integers → **integer division** (truncate). Percentage calculations mein classic bug: `done / total * 100` hamesha 0 jab done < total. Pehle numeric/decimal mein cast karo ya 100.0 se pehle multiply karo: `done * 100.0 / total`. Aur `total` 0 ho sakta hai to `NULLIF(total, 0)`.

## BETWEEN dates ke saath aakhri din gayab
```sql q
SELECT * FROM orders
WHERE created_at BETWEEN '2026-09-01' AND '2026-09-30';
-- created_at timestamp hai
```
**30 September ke orders (aadhi raat ke baad wale) chhoot jaate hain.** `'2026-09-30'` timestamp mein `2026-09-30 00:00:00` banta hai, to 30 tareekh ka 00:00:01 ke baad ka sab bahar.

Fix: **half-open range** — `created_at >= '2026-09-01' AND created_at < '2026-10-01'`. Ye index bhi use karta hai aur har tarah ke timestamps pe sahi hai. `created_at::date BETWEEN ...` bhi sahi result deta hai par index nahi use hota.

## UNION vs UNION ALL
```sql q
SELECT city FROM customers
UNION
SELECT city FROM suppliers;
```
`UNION` dono results jodta hai aur **duplicates hata deta hai** — iske liye poore result ko sort/hash karna padta hai (mehnga). `UNION ALL` bas jod deta hai, duplicates rehte hain — **tez**.

Jab pata ho duplicates nahi honge ya chahiye, to hamesha `UNION ALL`. Dono queries ke columns ki ginti aur types match hone chahiye; column names pehli query se aate hain.

## JOIN ke baad SUM bada aa gaya
```sql q
-- order 1: amount 1000, 3 items, 2 payments
SELECT o.id, SUM(o.amount)
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN payments p    ON p.order_id = o.id
GROUP BY o.id;
```
Result: **6000**, 1000 nahi.

One-to-many JOINs rows ko **multiply** karte hain (fan-out): 3 items × 2 payments = 6 rows, har row mein `amount` 1000 → SUM 6000. Ye reports mein chupke se galat numbers ka bahut common kaaran hai.

Fix: pehle har child table ko alag **aggregate** karo (subquery/CTE mein), phir join karo.

```sql
SELECT o.id, o.amount, i.item_count, p.paid
FROM orders o
LEFT JOIN (SELECT order_id, COUNT(*) AS item_count FROM order_items GROUP BY order_id) i ON i.order_id = o.id
LEFT JOIN (SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id) p ON p.order_id = o.id;
```

## RANK vs DENSE_RANK vs ROW_NUMBER — ties pe output
```sql q
-- salaries: 900, 800, 800, 700
SELECT salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS drnk
FROM employees;
```
| salary | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 900 | 1 | 1 | 1 |
| 800 | 2 | 2 | 2 |
| 800 | 3 | 2 | 2 |
| 700 | 4 | 4 | 3 |

`ROW_NUMBER` ties ko bhi alag number deta hai (kaunsa 2 aur kaunsa 3, guaranteed nahi). `RANK` ties ko same number aur phir **gap** (4 pe jump). `DENSE_RANK` ties same, **gap nahi**. "Nth highest salary" ke liye `DENSE_RANK`; duplicates hatane ke liye `ROW_NUMBER`.

## Composite index (a, b) — WHERE b = ? pe use hoga?
```sql q
CREATE INDEX idx_ab ON orders (customer_id, created_at);

SELECT * FROM orders WHERE customer_id = 7;                          -- 1
SELECT * FROM orders WHERE customer_id = 7 AND created_at > now() - interval '7 days'; -- 2
SELECT * FROM orders WHERE created_at > now() - interval '7 days';  -- 3
```
Query 1 aur 2 **index use karti hain**. Query 3 aam taur pe **nahi**.

B-tree composite index **leftmost prefix** se kaam karta hai — jaise phone directory pehle surname, phir first name se sorted hai: surname se dhoondh sakte ho, sirf first name se nahi. Query 3 ke liye `created_at` pe alag index chahiye. (PostgreSQL kabhi-kabhi poora index scan kar leta hai, par wo efficient nahi hota.) Column order chunte waqt: equality wala column pehle, range wala baad mein.

## LIKE '%abc' aur lower(email) — index kyun nahi laga?
```sql q
CREATE INDEX idx_email ON users (email);

SELECT * FROM users WHERE email LIKE 'ravi%';        -- 1
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- 2
SELECT * FROM users WHERE lower(email) = 'ravi@x.com'; -- 3
```
Sirf **query 1** normal B-tree index use kar sakti hai (prefix search — aur non-C collation mein `text_pattern_ops` wala index chahiye). Query 2 mein shuru mein wildcard hai — sorted index se "end kya hai" nahi dhoondh sakte → Seq Scan. Query 3 mein column pe **function** hai — index `email` ka hai, `lower(email)` ka nahi.

Fixes: query 3 ke liye **expression index** `CREATE INDEX ON users (lower(email));` (ya `citext` type). Query 2 (contains/ends-with) ke liye **`pg_trgm` GIN index**.

## varchar(n) vs text — PostgreSQL mein kaunsa tez?
**Performance mein koi farak nahi.** PostgreSQL mein `text`, `varchar` aur `varchar(n)` andar se ek hi tarah store hote hain. `varchar(n)` sirf ek **length check** jodta hai. (`char(n)` alag hai — spaces se pad karta hai, aam taur pe bekaar.)

To choice **business rule** ki hai: length limit sach mein rule hai (PIN code, country code) to `varchar(n)` ya CHECK constraint; warna `text`. Baad mein limit badhane ke liye ALTER karna padta hai — bekaar ki limits (`varchar(50)` naam ke liye) se bacho.

## Sequence mein gaps kyun hain?
```text q
Orders ki ids: 1, 2, 3, 5, 6, 9 — 4, 7, 8 kahan gaye? Kisi ne delete kiye?
```
Zaroori nahi ki delete hue hon. **Sequences transactional nahi hain** — `nextval()` jo number de deta hai wo kabhi wapas nahi hota, chahe transaction **rollback** ho jaaye (insert fail, validation error, exception). Isse sequence tez aur concurrent-safe rehta hai (kisi transaction ke commit ka wait nahi karna padta). Server crash/restart pe cached values bhi skip ho sakti hain.

Isliye **IDs ko continuous maan ke logic mat banao** (invoice numbers jaise legal continuous series chahiye to alag mechanism, locked counter table ke saath).

## EXISTS vs IN vs JOIN — duplicate rows
```sql q
-- customer 1 ke 3 orders hain
SELECT c.* FROM customers c JOIN orders o ON o.customer_id = c.id;          -- A
SELECT c.* FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);  -- B
```
Query A mein customer 1 **teen baar** aata hai (har order ke liye ek row). Query B mein **ek baar**.

"Jin customers ka koi order hai" — ye **semi-join** hai: sirf existence check. JOIN rows multiply karta hai; log fir `DISTINCT` laga dete hain jo extra kaam hai. `EXISTS` (ya `IN`) pehla match milte hi ruk jaata hai aur duplicate nahi banata. Related data (order amount) chahiye tab JOIN; sirf check chahiye tab EXISTS.

## Do transactions ulte order mein rows update karein
```sql q
-- T1:                               -- T2:
BEGIN;                                BEGIN;
UPDATE acc SET b=b-10 WHERE id=1;     UPDATE acc SET b=b-10 WHERE id=2;
UPDATE acc SET b=b+10 WHERE id=2;     UPDATE acc SET b=b+10 WHERE id=1;
```
**Deadlock.** T1 ne row 1 lock ki aur row 2 ka wait kar raha hai; T2 ne row 2 lock ki aur row 1 ka wait. PostgreSQL ~1 second (`deadlock_timeout`) baad detect karke ek transaction ko **abort** kar deta hai (`ERROR: deadlock detected`), doosri aage badhti hai. App ko us error pe transaction **retry** karni chahiye.

Bachav: rows hamesha **same order** mein lock/update karo (jaise chhoti id pehle), transactions chhote rakho.

## SELECT ... FOR UPDATE kya karta hai?
`SELECT ... FOR UPDATE` chuni hui rows pe **row-level lock** leta hai — transaction khatam hone tak doosri transactions un rows ko **update/delete ya FOR UPDATE nahi** kar sakti (wait karengi). Normal `SELECT` (padhna) block nahi hota (MVCC).

Use: "padho, check karo, phir update karo" jahan beech mein koi aur na badle — jaise stock check karke kam karna, seat booking, balance check. `NOWAIT` (lock na mile to turant error) aur `SKIP LOCKED` (locked rows chhod ke aage — job queue banane ke liye perfect) options bhi hain.

```sql
BEGIN;
SELECT stock FROM product WHERE id = 5 FOR UPDATE;   -- doosre wait karenge
-- app: stock > 0 hai? to
UPDATE product SET stock = stock - 1 WHERE id = 5;
COMMIT;

-- Job queue: har worker alag job uthaye
SELECT id FROM jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
```

## LIMIT bina ORDER BY ke
```sql q
SELECT * FROM orders LIMIT 10;
```
Koi bhi **10 rows** — "pehli 10" ya "latest 10" nahi. Bina `ORDER BY` ke SQL koi order guarantee nahi karta; aaj insert order jaisa dikh sakta hai, VACUUM, updates ya parallel scan ke baad badal jaayega. "Latest orders" chahiye to `ORDER BY created_at DESC, id DESC LIMIT 10`.

## Transaction commit kiye bina connection band ho gaya
```sql q
BEGIN;
DELETE FROM logs WHERE created_at < '2026-01-01';
-- yahan app crash / connection drop — COMMIT nahi hua
```
Saare changes **rollback** — kuch delete nahi hua. Commit ke bina transaction ka kuch bhi permanent nahi hota (Atomicity + Durability sirf commit pe). PostgreSQL connection toot-te hi transaction abort kar deta hai.

Ulta trap: tool (DBeaver/pgAdmin) mein **auto-commit off** ho aur tum `COMMIT` bhool jao to changes baaki sessions ko dikhenge hi nahi, aur wo transaction locks pakde rakhegi ("idle in transaction") — doosri queries atak jaayengi aur VACUUM ruk jaayega.
