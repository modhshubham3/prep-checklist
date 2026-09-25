# Entity Framework Core

## EF Core
? Entity Framework Core kya hai? Iske fayde aur nuksaan batao.
**Entity Framework Core** .NET ka **ORM (Object-Relational Mapper)** hai. ORM ka kaam: database tables ko C# classes (**entities**) se jodna, taaki tum SQL likhne ki jagah LINQ likho aur objects ke saath kaam karo. EF Core LINQ ko SQL mein translate karta hai, results ko objects mein bharta hai, aur objects mein kiye changes ko track karke `INSERT/UPDATE/DELETE` generate karta hai.

Ye kai databases support karta hai **providers** ke through — PostgreSQL (Npgsql), SQL Server, MySQL, SQLite. Main features: LINQ queries, change tracking, migrations (schema versioning), relationships (one-to-many, many-to-many), transactions, concurrency tokens.

Trade-off: productivity bahut badhti hai, par generated SQL pe nazar rakhni padti hai — N+1 queries, bekaar ke columns, missing indexes. Performance-critical reads ke liye log **Dapper** (micro-ORM, raw SQL, bahut tez) ya EF ke `FromSql`/raw SQL bhi use karte hain. Development mein SQL logging on rakho (`LogTo` ya `EnableSensitiveDataLogging` sirf dev mein).

```csharp
var orders = await db.Orders
    .Where(o => o.CustomerId == 7)
    .OrderByDescending(o => o.CreatedAt)
    .ToListAsync();
// EF generate karta hai:
// SELECT ... FROM orders WHERE customer_id = 7 ORDER BY created_at DESC
```

| EF Core | Dapper |
|---|---|
| Full ORM, LINQ | Micro ORM, SQL khud likho |
| Change tracking, migrations | Sirf mapping |
| Tez development | Tez execution, poora control |
| Complex writes ke liye achha | Heavy reads/reports ke liye achha |

## DbContext
? `DbContext` kya hai aur uski lifetime kya honi chahiye?
**DbContext** EF Core ka **central class** hai — database ke saath ek session. Ye: connection sambhalta hai, `DbSet<T>` properties se tables expose karta hai, queries chalata hai, **change tracker** rakhta hai (kaunse objects load hue aur kya badla), aur `SaveChanges()` pe saare changes ek transaction mein save karta hai. Ye **Unit of Work** pattern ka implementation hai.

Configuration `OnModelCreating` (Fluent API) mein ya attributes se hoti hai — table names, keys, relationships, indexes, column types.

**Lifetime**: DbContext **short-lived** hona chahiye aur **thread-safe nahi** hai. ASP.NET Core mein `AddDbContext` use **Scoped** register karta hai — har request ek naya context. Ek hi context ko do parallel tasks mein use karoge (`Task.WhenAll` do queries pe) to "A second operation was started on this context" error aayega. Singleton mein kabhi mat daalo. Background jobs ke liye `IDbContextFactory` ya naya scope.

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Order>().ToTable("orders").HasIndex(o => o.CreatedAt);
        mb.Entity<Order>().HasOne(o => o.Customer).WithMany(c => c.Orders);
    }
}

builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));   // Scoped
```

! Ek DbContext pe do queries ek saath (`Task.WhenAll`) — exception. DbContext thread-safe nahi hai.

## DbSet
? `DbSet` kya hai?
`DbSet<T>` DbContext ki ek property hai jo ek **table (entity collection)** ko represent karti hai. Isse do kaam hote hain: **query** (ye `IQueryable<T>` hai, to LINQ chalta hai) aur **changes register** karna — `Add`, `AddRange`, `Update`, `Remove`, `Attach`.

`Add`/`Remove` database ko turant nahi chhoote — wo sirf change tracker mein entity ki state badalte hain (`Added`, `Deleted`). Database tab update hota hai jab `SaveChanges()` call ho. `Find(id)` pehle change tracker mein dekhta hai (already loaded ho to DB call nahi karta), phir DB mein.

.NET 7+ mein **bulk operations** bhi hain — `ExecuteUpdateAsync` aur `ExecuteDeleteAsync` — jo entities load kiye bina seedha ek SQL `UPDATE`/`DELETE` chala dete hain. Hazaaron rows badalni ho to ye bahut tez hai.

```csharp
db.Orders.Add(new Order { CustomerId = 7, Amount = 500 });   // state: Added
var o = await db.Orders.FindAsync(42);
db.Orders.Remove(o!);                                        // state: Deleted
await db.SaveChangesAsync();                                 // ab SQL chala

// Bulk — entities load nahi hoti
await db.Orders.Where(x => x.CreatedAt < cutoff)
               .ExecuteDeleteAsync();                        // DELETE FROM orders WHERE ...
```

## Migration
? EF Core migration kya hai? Production pe migration kaise apply karte ho?
**Migrations** database **schema ko version control** mein rakhne ka tareeka hain. Jab tum entity badalte ho (nayi property, naya table, index), `Add-Migration` EF Core ek C# file banata hai jisme `Up()` (change lagao) aur `Down()` (change wapas lo) hote hain. `Update-Database` ye migrations database pe lagata hai. Database ek `__EFMigrationsHistory` table mein yaad rakhta hai ki kaunsi migrations lag chuki hain.

Fayda: har developer aur har environment (dev, UAT, prod) ka schema same rehta hai, aur changes code review mein dikhte hain.

**Production mein dhyan**: `Database.Migrate()` app startup pe chalana risky hai (kai instances ek saath migrate karne ki koshish karenge). Better: CI/CD mein **SQL script generate** karo (`dotnet ef migrations script --idempotent`) aur DBA/pipeline use review karke lagaye. Column rename ko EF kabhi-kabhi drop + add samajh leta hai — **data chala jaata hai**. Generated migration hamesha padho.

```bash
dotnet ef migrations add AddOrderStatus      # C# migration file banega
dotnet ef database update                    # DB pe lagao
dotnet ef migrations script --idempotent -o migrate.sql   # prod ke liye script
```

```csharp
public partial class AddOrderStatus : Migration
{
    protected override void Up(MigrationBuilder mb) =>
        mb.AddColumn<string>("status", "orders", nullable: false, defaultValue: "New");
    protected override void Down(MigrationBuilder mb) =>
        mb.DropColumn("status", "orders");
}
```

! Rename ko EF drop + add bana sakta hai — generated migration padhe bina prod pe mat lagao.

## Code First
? Code First approach kya hai?
**Code First** approach mein tum pehle **C# entity classes** likhte ho, aur EF Core unse **database schema banata hai** (migrations ke through). Schema ka "source of truth" tumhara code hai.

Workflow: entity class banao/badlo → `Add-Migration` → `Update-Database`. Relationships, keys, lengths, indexes Fluent API ya attributes se define karte ho.

Kab achha hai: **naye projects** jahan database tum khud design kar rahe ho, aur team chahti hai ki schema changes code ke saath version-controlled rahein. Fayda: DB schema aur code hamesha sync mein, aur har environment migrations se ek jaisa banta hai.

```csharp
public class Product
{
    public int Id { get; set; }                       // convention: primary key
    [MaxLength(200)] public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int CategoryId { get; set; }               // foreign key
    public Category Category { get; set; } = null!;   // navigation
}
// Add-Migration → CREATE TABLE products (id serial PRIMARY KEY, name varchar(200), ...)
```

## Database First
? Database First approach kya hai aur Code First se kab behtar hai?
**Database First** mein database **pehle se maujood** hota hai (legacy system, DBA-managed schema, ya kisi doosri team ka DB), aur EF Core us database se **C# entities aur DbContext generate** (scaffold) karta hai.

Command: `dotnet ef dbcontext scaffold "<connection>" Npgsql.EntityFrameworkCore.PostgreSQL -o Models`. Ye har table ki class aur relationships bana deta hai. Schema badle to dobara scaffold karo (`--force`).

Dhyan: generated classes mein apna code likhoge to regenerate pe mit jaayega — isliye **partial classes** mein apna logic rakho. Kab achha hai: jab DB schema DBA ya purana system control karta hai, ya bahut saare stored procedures/functions pe business logic hai.

| Code First | Database First |
|---|---|
| Code se DB banta hai | DB se code banta hai |
| Migrations se schema changes | DB mein change, phir re-scaffold |
| Naye projects | Legacy / DBA-controlled DB |
| Source of truth: C# | Source of truth: database |

```bash
dotnet ef dbcontext scaffold "Host=db;Database=app;Username=u;Password=p" \
    Npgsql.EntityFrameworkCore.PostgreSQL -o Models --context AppDbContext
```

## Change Tracking
? EF Core change tracking kaise kaam karti hai?
**Change tracking** EF Core ka wo system hai jo yaad rakhta hai ki DbContext ne kaunse entities load kiye aur unme kya badla. Query se entity aate hi uska ek **snapshot** (original values) ban jaata hai. `SaveChanges()` pe EF current values ko snapshot se compare karta hai aur sirf **badle hue columns** ka `UPDATE` bhejta hai.

Har tracked entity ki ek **state** hoti hai: `Unchanged`, `Modified`, `Added`, `Deleted`, `Detached` (track nahi ho rahi). `db.Entry(entity).State` se dekh/badal sakte ho.

**Cost**: tracking mein memory aur CPU lagta hai (snapshots, comparisons). Sirf padhne wali queries (reports, GET APIs) mein iska koi fayda nahi — wahan `AsNoTracking()` lagao. Aur ek hi context mein hazaaron entities load karoge to change tracker slow ho jaata hai.

**Disconnected scenario** (API mein aam): client se DTO aaya, entity DB se load nahi hui. Tab `db.Update(entity)` saare columns ko Modified mark karta hai — ya better, entity load karo, values set karo, save karo.

```csharp
var order = await db.Orders.FirstAsync(o => o.Id == 42);   // tracked, Unchanged
order.Status = "Shipped";                                  // ab Modified
Console.WriteLine(db.Entry(order).State);                  // Modified
await db.SaveChangesAsync();
// SQL: UPDATE orders SET status = 'Shipped' WHERE id = 42   (sirf ek column)
```

## AsNoTracking
? `AsNoTracking()` kya hai aur kab use karoge?
`AsNoTracking()` query ke results ko **change tracker mein register nahi karta**. EF entities bhar ke de deta hai, par unka snapshot nahi rakhta aur unhe yaad nahi rakhta.

Fayda: **kam memory, kam CPU, tez queries** — khaas kar bade result sets pe. Isliye sirf padhne wali jagahon pe hamesha lagao: GET APIs, reports, dashboards, lists. Dhyan: no-tracking entities ko badal ke `SaveChanges()` karoge to kuch save nahi hoga, kyunki EF ko pata hi nahi. Aur ek hi row do jagah aaye to do alag objects banenge (identity resolution nahi) — zaroorat ho to `AsNoTrackingWithIdentityResolution()`.

Poore context ke liye default bhi set kar sakte ho: `UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)`. Aur agar query `Select` se DTO bana rahi hai, to wahan tracking waise bhi nahi hoti — `AsNoTracking` ki zaroorat nahi.

**Hamesha tez?** Zyada tar haan, par ek-do rows pe farak na ke barabar hai. Asli fayda bade result sets pe.

```csharp
var report = await db.Orders
    .AsNoTracking()                       // read-only — snapshot nahi
    .Where(o => o.CreatedAt >= from)
    .ToListAsync();

report[0].Status = "X";
await db.SaveChangesAsync();              // kuch save nahi hoga — tracked hi nahi tha
```

> Reports aur GET APIs mein hamesha lagao. Update karna ho to mat lagao.

## Include
? `Include()` kya karta hai aur N+1 problem se kaise bachata hai?
`Include()` **eager loading** karta hai — main entity ke saath uski related entities (navigation properties) **usi query mein** le aata hai, SQL `JOIN` ke through. `ThenInclude()` se aur gehrai tak (Order → Items → Product).

Bina `Include` ke navigation property `null` (ya khaali collection) rahegi, jab tak lazy loading on na ho. `Include` se N+1 problem khatam hota hai — 100 orders aur unke customers ek hi query mein.

**Cartesian explosion** trap: ek entity pe kai collections include karoge (`Include(Items).Include(Payments)`), to JOIN mein rows multiply ho jaati hain (10 items × 10 payments = 100 rows per order). Iske liye `AsSplitQuery()` — EF alag-alag queries bhejta hai. Aur agar sirf kuch fields chahiye, to `Include` ki jagah `Select` projection better hai.

```csharp
var orders = await db.Orders
    .Include(o => o.Customer)                          // JOIN customers
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)                   // JOIN items, products
    .Where(o => o.Status == "Paid")
    .AsSplitQuery()                                    // collections alag queries mein
    .ToListAsync();
```

## Lazy Loading
? Lazy loading kya hai aur isko production mein kyun avoid karte hain?
**Lazy loading** mein related data **tab load hota hai jab tum pehli baar us navigation property ko access karte ho** — chupke se, ek alag SQL query se. `order.Customer.Name` likha aur tabhi DB call hui.

EF Core mein ye by default **off** hai. On karne ke liye `Microsoft.EntityFrameworkCore.Proxies` package, `UseLazyLoadingProxies()`, aur navigation properties `virtual` banani padti hain (EF runtime pe proxy class banata hai jo property override karti hai).

**Khatra**: loop mein lazy loading = **N+1 problem**. 100 orders pe loop chala ke `order.Customer.Name` padha to 1 + 100 queries. Code dekhne mein bilkul innocent lagta hai, isliye pakadna mushkil hai. Web APIs mein ek aur problem: JSON serializer har navigation property touch karta hai, to serialization ke dauraan dher saari queries chal jaati hain. Isliye APIs mein lazy loading avoid karte hain aur explicit `Include`/`Select` use karte hain.

```csharp
var orders = db.Orders.ToList();              // 1 query
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);       // har baar ek naya query → 100 queries
```

> Lazy loading loop mein chala to N+1 problem ban jaati hai.

## Explicit Loading
? Explicit loading kya hai?
**Explicit loading** mein entity pehle load karte ho, phir **baad mein, khud ke decide karne pe**, uska related data alag se load karte ho — `db.Entry(entity).Reference(...).LoadAsync()` (single navigation) ya `.Collection(...).LoadAsync()` (collection).

Kab kaam aata hai? Jab related data **har baar nahi, sirf kisi condition pe** chahiye — jaise order ke items sirf tab load karo jab status "Pending" ho. Isse lazy loading jaisi flexibility milti hai par **control tumhare haath** mein — koi chupi hui query nahi. Collection load karte waqt filter bhi laga sakte ho (`.Query().Where(...)`).

```csharp
var order = await db.Orders.FindAsync(42);

if (order!.Status == "Pending")
{
    await db.Entry(order).Collection(o => o.Items).LoadAsync();     // items ab load
}
await db.Entry(order).Reference(o => o.Customer).LoadAsync();       // customer load

var count = await db.Entry(order).Collection(o => o.Items).Query().CountAsync();  // load kiye bina count
```

## SaveChanges
? `SaveChanges()` call karne pe kya hota hai? Kya ye transaction mein hota hai?
`SaveChanges()` / `SaveChangesAsync()` change tracker mein jitne bhi changes hain (Added, Modified, Deleted) — un sabke liye SQL generate karke database pe bhejta hai, aur **by default ek transaction mein**. Yani sab save honge ya koi nahi; beech mein ek fail hua to poora rollback.

Return value: kitni rows affect hui. Naye entities ke generated IDs (identity/serial) save ke baad entity pe apne aap aa jaate hain. EF Core commands ko **batch** karta hai — kai inserts ek round-trip mein.

Achhi practice: request ke end mein **ek hi baar** `SaveChanges` karo, har `Add` ke baad nahi (har call ek alag transaction aur round-trip hai). Loop mein `SaveChanges` sabse common performance galti hai. Kai `SaveChanges` ko ek transaction mein chahiye to `db.Database.BeginTransactionAsync()`. Concurrency conflict (kisi aur ne row badal di) pe `DbUpdateConcurrencyException` — iske liye `[ConcurrencyCheck]`/row version column.

```csharp
foreach (var item in items)
    db.OrderItems.Add(item);           // sirf track ho raha hai
await db.SaveChangesAsync();           // ek transaction, batched inserts

// GALAT — 1000 round-trips aur 1000 transactions
foreach (var item in items) { db.OrderItems.Add(item); await db.SaveChangesAsync(); }
```

## Lazy Vs Eager Vs Explicit
Related data load karne ke teen tareeke, aur interview mein inka **trade-off** poocha jaata hai:

**Eager loading** (`Include`) — main entity ke saath hi related data ek query (JOIN) mein. **Predictable**: kitni queries hongi pata hai. API ke liye default choice. Risk: bekaar ka data ya cartesian explosion.

**Lazy loading** — property access pe chupke se query. **Convenient**, par N+1 ka sabse bada kaaran, aur queries code se dikhti nahi. APIs mein avoid.

**Explicit loading** — pehle entity, phir jab chaho `Entry().Collection().Load()`. **Control** tumhare paas, conditionally load kar sakte ho. Par har load ek extra round-trip.

Aur chautha, aksar sabse achha: **Projection** (`Select` into DTO) — sirf zaroori columns, related tables ke saath ek optimized query, koi tracking nahi.

| | Eager | Lazy | Explicit | Projection |
|---|---|---|---|---|
| Kaise | `Include()` | Property access | `Entry().Load()` | `Select(new Dto)` |
| Queries | 1 (ya split) | 1 + N | 1 + har load | 1 |
| Control | Upfront | Koi nahi | Poora | Poora |
| Risk | Zyada data | N+1 | Extra round-trips | — |
| Kab | Related data pakka chahiye | Desktop apps, kam data | Conditional | Read APIs, lists |

```csharp
var eager = await db.Orders.Include(o => o.Customer).ToListAsync();
var projected = await db.Orders
    .Select(o => new { o.Id, o.Amount, CustomerName = o.Customer.Name })
    .ToListAsync();                                  // ek JOIN, sirf 3 columns
```

> Predictable API performance ke liye: projection > eager > explicit > lazy.

## N+1 Problem
? N+1 problem kya hai? Isko detect aur fix kaise karoge?
**N+1 problem**: 1 query se N parent records aaye, aur phir **har parent ke liye 1 aur query** chali related data laane ke liye — total **N+1 queries**. 100 orders ke customers = 101 queries; 1000 orders = 1001. Har query chhoti hai par network round-trip ka overhead jud-jud ke API ko seconds mein le jaata hai.

Kahan se aata hai? Lazy loading wale loop se, ya aise code se jo loop ke andar repository/DB call karta hai (`foreach (var o in orders) o.Customer = await repo.GetCustomer(o.CustomerId)`). Development mein 10 rows pe pata nahi chalta, production mein data badhte hi dikhta hai.

**Pakdo kaise**: EF SQL logs dekho (ek request pe ek jaisi query baar-baar), APM/profiler, ya DB ke `pg_stat_statements` mein bahut high call count wali query.

**Fix**: `Include()` (eager loading), `Select` projection (ek JOIN query), ya IDs ikattha karke ek `WHERE id IN (...)` query aur phir memory mein Dictionary se jodna.

```csharp
// N+1 — 1 + 100 queries
var orders = await db.Orders.ToListAsync();
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);        // lazy load har baar

// Fix 1 — 1 query
var orders2 = await db.Orders.Include(o => o.Customer).ToListAsync();

// Fix 2 — projection, 1 query, sirf zaroori columns
var rows = await db.Orders.Select(o => new { o.Id, o.Customer.Name }).ToListAsync();

// Fix 3 — batch: 2 queries total
var ids = orders.Select(o => o.CustomerId).Distinct().ToList();
var customers = await db.Customers.Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id);
```

! "N+1 sirf lazy loading se hota hai" — nahi. Loop ke andar koi bhi DB/API call wahi problem hai.

> Fix: .Include() ya projection (.Select) se ek hi query.
