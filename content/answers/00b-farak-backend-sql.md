# Farak samjho — ASP.NET Core aur EF Core

## Transient vs Scoped vs Singleton — object kitni baar banta hai?
? DbContext ko kis lifetime mein register karoge, aur Singleton mein kyun nahi?
@viz di-lifetimes
**Ek line:** **Transient** = har baar maango, **naya** object. **Scoped** = ek **request** mein ek object (poori request mein wahi). **Singleton** = poori **app mein ek** object, jab tak app chal rahi hai.

| | Kitni baar banta hai | Example |
| --- | --- | --- |
| `AddTransient` | Har inject pe naya | Halke, bina state ke helpers |
| `AddScoped` | Har HTTP request mein ek | **DbContext**, current user service |
| `AddSingleton` | Poori app mein ek | Cache, config, `HttpClient` factory |

**Aise socho:** shaadi ka khana —
- **Transient** = **paper cup** — har baar paani piyo, naya cup.
- **Scoped** = **ek mehmaan ki ek plate** — poore khane (request) mein wahi plate, agla mehmaan nayi plate.
- **Singleton** = hall ki **paani ki tanki** — ek hi, sab usi se lete hain, shaadi khatam hone tak.

```csharp
builder.Services.AddTransient<IPdfMaker, PdfMaker>();
builder.Services.AddScoped<AppDbContext>();          // AddDbContext default = Scoped
builder.Services.AddSingleton<ICache, MemoryCacheService>();
```

! **Singleton ke andar Scoped inject** mat karo — tanki ke andar ek mehmaan ki plate chipka di: wo plate hamesha ke liye wahin, sab mehmaan use kar rahe hain. DbContext ke saath ye threads ke bugs laata hai.

> Paper cup = Transient. Mehmaan ki plate = Scoped. Paani ki tanki = Singleton.

## Middleware vs Filter — dono request ke beech mein, farak kya?
? Har request ka time log karna hai, static files samet — middleware likhoge ya action filter?
@viz middleware
**Ek line:** **Middleware** har request pe chalta hai (poori app ka gate). **Filter** sirf **controller action** ke aas-paas chalta hai, aur use pata hota hai kaunsa action, kaunsa model.

| | Middleware | Filter |
| --- | --- | --- |
| Kab chalta hai | **Har request** — static file, health check, API sab | Sirf MVC/API **action** pe |
| Action / model ki jaankari | ❌ Nahi | ✅ Action ka naam, arguments, ModelState |
| Kahan lagta hai | `Program.cs` pipeline | Global, controller ya action pe `[Attribute]` |
| Use | Logging, exception handling, CORS, auth | Validation, action-specific auth, caching, audit |

**Aise socho:** office building — **Middleware** = building ka **main gate security** — har aane wala guzrega, courier ho ya employee. **Filter** = kisi ek **department ke andar** ka receptionist — sirf usi department ke kaam wale se milta hai, aur use pata hai tum kis se milne aaye ho.

```csharp
app.Use(async (ctx, next) =>                        // middleware — har request
{
    var sw = Stopwatch.StartNew();
    await next();
    Console.WriteLine($"{ctx.Request.Path} {sw.ElapsedMilliseconds}ms");
});

public class AuditFilter : IActionFilter              // filter — sirf actions
{
    public void OnActionExecuting(ActionExecutingContext c) =>
        Console.WriteLine($"Action: {c.ActionDescriptor.DisplayName}, args: {c.ActionArguments.Count}");
    public void OnActionExecuted(ActionExecutedContext c) { }
}
```

> Sabke liye → middleware. Sirf controller actions ke liye, action ki info chahiye → filter.

## Authentication vs Authorization — 401 vs 403
? User logged in hai par admin page khol raha hai jiski permission nahi — 401 doge ya 403?
**Ek line:** **Authentication** = "**tum kaun ho?**" (login). **Authorization** = "**tum kya kar sakte ho?**" (permission). Pehle authentication, phir authorization.

| | Sawaal | Fail hone pe | ASP.NET mein |
| --- | --- | --- | --- |
| Authentication | Tum kaun ho? | **401 Unauthorized** — login karo | `UseAuthentication()`, JWT, cookie |
| Authorization | Ye kar sakte ho? | **403 Forbidden** — pata hai kaun ho, par ijazat nahi | `UseAuthorization()`, `[Authorize(Roles = "Admin")]` |

**Aise socho:** office — gate pe **ID card** dikhaya = authentication (tum kaun ho). Andar **server room** mein jaana hai, card pe access nahi = authorization fail. Card hi nahi hai → gate pe roke gaye (**401**). Card hai par server room ki permission nahi (**403**).

```csharp
app.UseAuthentication();      // pehle — kaun ho
app.UseAuthorization();       // phir — kya kar sakte ho

[Authorize]                         // login chahiye, warna 401
[HttpGet("profile")] public IActionResult Profile() => Ok();

[Authorize(Roles = "Admin")]        // logged in par Admin nahi → 403
[HttpDelete("users/{id}")] public IActionResult Delete(int id) => NoContent();
```

! Naam ulta hai — **401 "Unauthorized"** asal mein "**unauthenticated**" hai (login nahi). Permission na hone ka code **403**.

> 401 = pehchaan nahi. 403 = pehchaan hai, ijazat nahi.

## Eager vs Lazy vs Explicit loading — related data kab aata hai?
? Order list ke saath har order ke customer ka naam dikhana hai — kaunsi loading, aur galat chunne pe kya hoga?
@viz n-plus-one
**Ek line:** **Eager** = main data ke **saath hi** related data (`Include`). **Lazy** = related data tab aata hai jab **property chhuo** (har baar alag query). **Explicit** = tum **khud bolo** kab laana hai.

| | Kab load hota | Queries | Kab use |
| --- | --- | --- | --- |
| Eager (`Include`) | Pehli query mein hi | 1 (JOIN) | Pata hai related data chahiye — **default choice** |
| Lazy | Property access karte hi | Har row pe ek → **N+1** | Bahut kam; production mein aksar band |
| Explicit (`Entry().Load()`) | Jab tum `Load()` bulao | Jab chaho | Kabhi-kabhi chahiye, condition pe |

**Aise socho:** grocery — **Eager** = list bana ke ek hi trip mein sab le aao. **Lazy** = har cheez yaad aane pe **alag trip** — doodh ke liye gaye, wapas aaye, phir cheeni ke liye... 100 cheezein = 100 trips (N+1). **Explicit** = pehle main saamaan laao, zaroorat pade to khud decide karke ek aur trip.

```csharp
// Eager — ek query, JOIN
var orders = await db.Orders.Include(o => o.Customer).ToListAsync();

// Lazy (proxies on) — 1 query orders ki + har order pe 1 customer ki = N+1
foreach (var o in db.Orders) Console.WriteLine(o.Customer.Name);

// Explicit — jab chahiye tab
var order = await db.Orders.FindAsync(5);
await db.Entry(order!).Reference(o => o.Customer).LoadAsync();
```

> Pata hai chahiye → Include. Lazy loading = N+1 ka khatra.

## Tracking vs AsNoTracking — EF data ko yaad rakhe ya nahi?
? Dashboard ke liye 5000 rows sirf dikhani hain, kuch update nahi karna — tracking chahiye?
**Ek line:** normal query mein EF har object ko **yaad rakhta hai** (change tracking) taaki `SaveChanges` pe pata ho kya badla. `AsNoTracking()` = "**sirf padhna hai, yaad mat rakho**" — tez aur kam memory.

| | Tracking (default) | `AsNoTracking()` |
| --- | --- | --- |
| EF yaad rakhta hai | ✅ Har object ki copy | ❌ |
| `SaveChanges` se update | ✅ Seedha property badlo | ❌ (Attach/Update karna padega) |
| Speed / memory | Dheema, zyada | **Tez, kam** |
| Use | Edit karke save karna hai | List, report, dashboard, API GET |

**Aise socho:** library — **tracking** = kitaab **issue** karwai, register mein entry hui; lautate waqt check hoga kya badla. **AsNoTracking** = library mein baith ke **padh li**, koi entry nahi — jaldi aur aasaan, par ghar nahi le ja sakte.

```csharp
var list = await db.Products.AsNoTracking().Where(p => p.Active).ToListAsync();   // sirf dikhana

var p = await db.Products.FirstAsync(x => x.Id == 5);   // tracked
p.Price = 999;
await db.SaveChangesAsync();                            // EF ko pata hai Price badla
```

> Sirf padhna → AsNoTracking. Badal ke save karna → normal (tracking).

# Farak samjho — SQL

## WHERE vs HAVING — filter kab lagta hai?
? Wo departments chahiye jinme 5 se zyada employees hain — WHERE lagega ya HAVING?
**Ek line:** `WHERE` **grouping se pehle** har **row** ko chhaanta hai. `HAVING` **GROUP BY ke baad** poore **group** ko chhaanta hai. `COUNT`, `SUM` jaisi conditions sirf HAVING mein.

| | Kab chalta hai | Kya chhaanta hai | `COUNT(*) > 5` likh sakte? |
| --- | --- | --- | --- |
| `WHERE` | GROUP BY se **pehle** | Rows | ❌ |
| `HAVING` | GROUP BY ke **baad** | Groups | ✅ |

**Aise socho:** class ke students — **WHERE** = pehle sirf **ladkiyon** ko alag karo (har student ko dekh ke). Phir section-wise group banao. **HAVING** = sirf wo **sections** rakho jinme 10 se zyada ladkiyaan hain (poore group ko dekh ke).

```sql
SELECT dept, COUNT(*) AS total
FROM employees
WHERE city = 'Pune'          -- pehle: sirf Pune ki rows
GROUP BY dept
HAVING COUNT(*) > 5;         -- baad mein: sirf bade groups

-- ❌ WHERE COUNT(*) > 5    → error: aggregate WHERE mein nahi
```

> Row pe condition → WHERE. Group / COUNT / SUM pe condition → HAVING.

## DELETE vs TRUNCATE vs DROP — kya-kya mitta hai?
? Test table ka saara data turant saaf karna hai par table rehni chahiye — DELETE, TRUNCATE ya DROP?
**Ek line:** `DELETE` = **kuch ya saari rows** hatao (WHERE ke saath). `TRUNCATE` = **saari rows** ek jhatke mein, tez. `DROP` = **table hi khatam** — structure bhi.

| | Kya hatata | WHERE | Speed | Table bachti? | Identity reset |
| --- | --- | --- | --- | --- | --- |
| `DELETE` | Chuni hui rows | ✅ | Dheema (row-by-row) | ✅ | ❌ |
| `TRUNCATE` | Saari rows | ❌ | **Bahut tez** | ✅ | ✅ |
| `DROP` | Poori table | ❌ | Tez | ❌ | — |

**Aise socho:** almari — **DELETE** = almari se **kuch kapde** nikaalo (chun ke). **TRUNCATE** = almari **poori khaali** kar do, almari rahegi. **DROP** = **almari hi** ghar se bahar phenk do.

```sql
DELETE FROM orders WHERE status = 'Cancelled';   -- sirf cancelled
TRUNCATE TABLE temp_import;                      -- saari rows, table bachi
DROP TABLE old_logs;                             -- table hi gayi
```

! DELETE mein **WHERE bhoole** to saari rows gayi. Production pe pehle `SELECT` chala ke dekho kitni rows aayengi, phir wahi WHERE DELETE mein.

> DELETE = kuch kapde. TRUNCATE = almari khaali. DROP = almari hi gayi.

## INNER vs LEFT vs RIGHT vs FULL JOIN — kaunsi rows bachti hain?
? Saare customers chahiye, chahe unka koi order ho ya na ho — kaunsa join?
@viz joins
**Ek line:** `INNER` = sirf **dono taraf match** wali rows. `LEFT` = **left table ki saari** + jo match ho (warna NULL). `RIGHT` = ulta. `FULL` = **dono ki saari**.

| Join | Customers (left) | Orders (right) | Match na ho to |
| --- | --- | --- | --- |
| `INNER` | Sirf jinka order hai | Sirf jinka customer hai | Row gayab |
| `LEFT` | **Saare** | Match wale | Order columns NULL |
| `RIGHT` | Match wale | **Saare** | Customer columns NULL |
| `FULL` | Saare | Saare | Jahan match nahi, NULL |

**Aise socho:** party — left side **mehmaan**, right side **gifts**. **INNER** = sirf wo mehmaan jo gift laaye (aur wahi gifts). **LEFT** = **saare mehmaan**, gift laaye to gift ke saath, warna khaali haath (NULL). **FULL** = saare mehmaan aur saare gifts, jinka jodi na mile wo bhi.

```sql
-- Saare customers + orders (jinka order nahi, unke order columns NULL)
SELECT c.name, o.id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;

-- Wo customers jinka ek bhi order NAHI
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

> INNER = dono mein ho. LEFT = left ke saare. "Jinka X nahi hai" = LEFT JOIN + `IS NULL`.

## Clustered vs non-clustered index
? Table pe sirf ek clustered index kyun ho sakta hai, par non-clustered bahut saare?
@viz index
**Ek line:** **Clustered** index = table ka **data khud usi order mein** rakha hota hai (isliye ek hi). **Non-clustered** = **alag list** jo batati hai row kahan hai (jitne chaho).

| | Clustered | Non-clustered |
| --- | --- | --- |
| Data kaise | Data khud index ke order mein | Alag structure, row ka pointer |
| Kitne | **Sirf 1** | Bahut saare |
| Default | Primary key (SQL Server) | Tum banate ho |
| Tez kab | Range queries (date between), ORDER BY | Specific column lookup (email, phone) |

**Aise socho:** **dictionary (shabdkosh)** = clustered — shabd **khud A se Z order** mein chhape hain; ek hi order ho sakta hai. **Kitaab ke peeche ka index** = non-clustered — "Kafka … page 45", alag list jo batati hai kahan dekho; aise index kai ho sakte hain (topic-wise, naam-wise).

```sql
-- SQL Server
CREATE CLUSTERED INDEX ix_orders_date ON orders(order_date);
CREATE NONCLUSTERED INDEX ix_orders_email ON orders(customer_email);

-- PostgreSQL: saare indexes "non-clustered" jaise hain; CLUSTER command ek baar sort karta hai
CREATE INDEX ix_orders_email ON orders(customer_email);
```

> Clustered = dictionary (data khud sorted, ek hi). Non-clustered = kitaab ka index (alag list, kai).

## UNION vs UNION ALL — duplicate hatane hain ya nahi?
? Do tables ke results jodne hain aur duplicates se koi farak nahi — UNION ya UNION ALL, aur kyun?
**Ek line:** dono do queries ke result **upar-neeche jodte** hain. `UNION` **duplicate hata** deta hai (isliye dheema); `UNION ALL` **sab rakhta** hai (tez).

| | Duplicates | Speed |
| --- | --- | --- |
| `UNION` | Hata deta hai | Dheema (sort/compare karna padta) |
| `UNION ALL` | Rakhta hai | **Tez** |

**Aise socho:** do classes ki attendance list jodni hai — **UNION ALL** = dono list ek ke neeche ek chipka do. **UNION** = chipkane ke baad baith ke **dohraye hue naam kaato** — zyada mehnat.

```sql
SELECT email FROM customers
UNION ALL                   -- sab emails, duplicate bhi
SELECT email FROM newsletter_subscribers;

SELECT city FROM customers
UNION                       -- unique cities
SELECT city FROM suppliers;
```

! Dono queries mein **columns ki ginti aur type same** honi chahiye.

> Duplicate hatane hain → UNION. Nahi → UNION ALL (tez).

## Primary key vs unique key vs foreign key
? Email column mein duplicate nahi chahiye par wo primary key nahi hai — kya lagaoge?
**Ek line:** **Primary key** = row ki **asli pehchaan** (unique + null nahi, ek hi). **Unique key** = column mein **duplicate nahi** (kai ho sakte). **Foreign key** = doosri table ki primary key se **rishta**.

| | Duplicate allowed | NULL allowed | Kitne per table | Kaam |
| --- | --- | --- | --- | --- |
| Primary key | ❌ | ❌ | **1** | Row ki pehchaan |
| Unique key | ❌ | ✅ (aam taur pe) | Kai | Duplicate rokna (email, phone) |
| Foreign key | ✅ | ✅ | Kai | Do tables jodna, galat reference rokna |

**Aise socho:** school — **roll number** = primary key (har bachche ka ek, khaali nahi ho sakta). **Aadhaar number** = unique key (kisi do ka same nahi, par kisi ka na bhi ho). **Class teacher ka ID** har bachche ke record mein = foreign key (teachers table se jud-ta hai; aisa ID nahi daal sakte jo teacher exist hi na kare).

```sql
CREATE TABLE customers (
  id    SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name  TEXT NOT NULL
);
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id)    -- foreign key
);
INSERT INTO orders (customer_id) VALUES (9999);   -- ❌ error agar customer 9999 nahi hai
```

> Primary = pehchaan (ek). Unique = duplicate nahi (kai). Foreign = rishta.
