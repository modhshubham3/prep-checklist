# Database — queries aur PostgreSQL features

## Normalization (1NF, 2NF, 3NF) vs denormalization
? Normalization kya hai? 1NF, 2NF, 3NF ek example se samjhao, aur denormalize kab karte ho?
**Ek line:** **normalization** = data ko aise todna ki **ek baat ek hi jagah** likhi ho — duplicate kam, update mein galti kam. **Denormalization** = speed ke liye jaan-boojh ke thoda duplicate rakhna.

| Form | Rule (aasaan bhasha) | Toota hua example | Fix |
| --- | --- | --- | --- |
| **1NF** | Har cell mein **ek hi value**, repeating groups nahi | `phones = '98xx, 97xx'` | Alag `customer_phones` table |
| **2NF** | 1NF + har column **poori primary key** pe depend kare (composite key ka aadha hissa nahi) | `(order_id, product_id)` key, par `product_name` sirf product_id pe depend | `product_name` products table mein |
| **3NF** | 2NF + non-key column **doosre non-key** pe depend na kare | `orders` mein `customer_id` aur `customer_city` dono | City customers table mein |

**Aise socho:** school register mein har bachche ke saath uske **class teacher ka phone** likha ho — teacher ka number badla to 40 jagah badalna padega, ek bhool gaye to galat data. Normalization = teacher ka phone **teachers ki list mein ek baar**, bachche ke saath sirf teacher ka ID.

**Denormalize kab:** reports/dashboards jahan bahut saare joins slow hain, read bahut zyada aur write kam; jaise `orders.total` (items ka sum) pehle se save, ya reporting table / materialized view. Keemat: data sync rakhna padta hai (trigger, job ya app code).

> Normalize = ek baat ek jagah (OLTP ke liye). Denormalize = speed ke liye jaan-boojh ke copy (reports ke liye).

## DDL, DML, DCL, TCL — kaunsa command kis group mein
? DDL aur DML mein farak batao; TRUNCATE kis group mein aata hai aur GRANT kis mein?
**Ek line:** SQL commands ke 4 group — **structure** badalne wale, **data** badalne wale, **permission** wale, aur **transaction** wale.

| Group | Matlab | Commands |
| --- | --- | --- |
| **DDL** (Definition) | Table/structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME` |
| **DML** (Manipulation) | Data | `INSERT`, `UPDATE`, `DELETE`, `MERGE` (aur `SELECT` — kabhi DQL bolte hain) |
| **DCL** (Control) | Permission | `GRANT`, `REVOKE` |
| **TCL** (Transaction) | Transaction | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` |

**Aise socho:** ghar — DDL = **deewar/kamre banana-todna**, DML = **saaman rakhna-hatana**, DCL = kisko **chaabi** deni hai, TCL = "abhi tak ka kaam **pakka** karo ya **undo**".

PostgreSQL mein DDL bhi transaction mein chal sakta hai (`BEGIN; ALTER TABLE ...; ROLLBACK;` — wapas ho jaata hai) — SQL Server/MySQL se alag, migrations ke liye badhiya.

```sql
CREATE TABLE products (id int PRIMARY KEY, name text);          -- DDL
INSERT INTO products VALUES (1, 'Pen');                          -- DML
GRANT SELECT ON products TO report_user;                         -- DCL
BEGIN; UPDATE products SET name = 'Pencil' WHERE id = 1; ROLLBACK;   -- TCL
```

> DDL = dhaancha. DML = data. DCL = chaabi. TCL = pakka/undo.

## Roles, GRANT/REVOKE aur schema (search_path)
? App ke DB user ko sirf zaroori permissions kaise doge? Schema aur search_path kya hai?
**Ek line:** PostgreSQL mein users aur groups dono **roles** hain; `GRANT` se permission do, `REVOKE` se lo. **Schema** = database ke andar folder (namespace); **search_path** = bina schema likhe table dhoondhne ka order.

- **Least privilege**: app ka role sirf `SELECT, INSERT, UPDATE, DELETE` — `DROP`, `CREATE`, superuser nahi. Migrations alag role se.
- Report/read-only user ko sirf `SELECT`.
- **Schema**: `sales.orders`, `hr.employees` — ek DB mein modules alag, ya har tenant ka schema. Default schema `public`.
- **search_path**: `SET search_path = sales, public;` ke baad `orders` likhne pe pehle `sales.orders` dhoondha jaayega.
- `ALTER DEFAULT PRIVILEGES` — aage banne wali tables pe bhi permission apne aap.

```sql
CREATE ROLE app_user LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE shop TO app_user;
GRANT USAGE ON SCHEMA sales TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sales TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

CREATE ROLE report_user LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA sales TO report_user;
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO report_user;
REVOKE DELETE ON sales.orders FROM app_user;          -- permission wapas
```

> Role = user ya group. App ko utni hi chaabi do jitna kaam hai. Schema = DB ke andar folder.

## COMMIT, ROLLBACK aur SAVEPOINT
? Transaction ke beech mein ek step fail ho jaaye to sirf woh step undo karna hai, poora nahi — kaise?
**Ek line:** `COMMIT` = sab pakka, `ROLLBACK` = sab undo, **`SAVEPOINT`** = transaction ke beech mein **checkpoint** — `ROLLBACK TO SAVEPOINT` se sirf wahan tak ka kaam undo.

**Aise socho:** video game — COMMIT = game **save**, ROLLBACK = poora level **restart**, SAVEPOINT = beech ka **checkpoint** — mare to wahin se, shuru se nahi.

PostgreSQL ki khaas baat: transaction mein **ek bhi error** aaya to poori transaction "aborted" ho jaati hai — aage har command fail (`current transaction is aborted`). Savepoint se error wale hisse ko rollback karke aage badh sakte ho. EF Core bhi `SaveChanges` mein savepoints use karta hai.

```sql
BEGIN;
INSERT INTO orders(id, customer_id) VALUES (1, 7);
SAVEPOINT before_items;
INSERT INTO order_items(order_id, product_id) VALUES (1, 999);   -- error: product 999 nahi hai
ROLLBACK TO SAVEPOINT before_items;                               -- sirf ye hissa undo
INSERT INTO order_items(order_id, product_id) VALUES (1, 5);
COMMIT;                                                            -- order + sahi item save
```

```csharp
await using var tx = await db.Database.BeginTransactionAsync();
await tx.CreateSavepointAsync("beforeItems");
try { /* ... */ await db.SaveChangesAsync(); }
catch { await tx.RollbackToSavepointAsync("beforeItems"); }
await tx.CommitAsync();
```

> COMMIT = save. ROLLBACK = restart. SAVEPOINT = checkpoint.

## INSERT ... ON CONFLICT (upsert) aur RETURNING
? Record hai to update karo, nahi hai to insert — ek hi query mein kaise? Aur insert ke baad naya id kaise milega?
**Ek line:** **`ON CONFLICT`** = unique/primary key takraaye to error ki jagah **update ya ignore** (upsert). **`RETURNING`** = INSERT/UPDATE/DELETE ke baad badli hui rows (jaise naya `id`) **turant wapas** — alag SELECT nahi.

- `ON CONFLICT (email) DO NOTHING` — duplicate aaye to chup-chaap chhod do.
- `ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name` — **`EXCLUDED`** = jo naya row insert hone wala tha.
- Conflict target pe **unique index/constraint** hona zaroori.
- "Pehle SELECT, na mile to INSERT" — do users ek saath karein to race condition; upsert **atomic** hai.
- SQL Server mein iske liye `MERGE`.

```sql
INSERT INTO device_status (device_id, last_seen, lat, lng)
VALUES (101, now(), 19.07, 72.87)
ON CONFLICT (device_id)
DO UPDATE SET last_seen = EXCLUDED.last_seen, lat = EXCLUDED.lat, lng = EXCLUDED.lng
RETURNING device_id, (xmax = 0) AS inserted;       -- inserted = true to naya bana, false to update

INSERT INTO orders (customer_id, total) VALUES (7, 500) RETURNING id, created_at;
DELETE FROM sessions WHERE expires_at < now() RETURNING user_id;
```

> Upsert = ON CONFLICT DO UPDATE (EXCLUDED = naya wala). Badla hua data chahiye = RETURNING.

## CTE, recursive CTE aur temp table vs subquery
? CTE kya hai, subquery aur temp table se kab better hai? Employee-manager hierarchy recursive CTE se nikaalo.
**Ek line:** **CTE** (`WITH naam AS (...)`) = query ke andar ek **naam wala temporary result** — lambi query ko steps mein todta hai. **Recursive CTE** = khud ko bulaane wala CTE — tree/hierarchy (manager chain, category tree) ke liye.

| | Subquery | CTE | Temp table |
| --- | --- | --- | --- |
| Padhne mein | Uljhi (andar-andar) | **Saaf, steps mein** | Saaf |
| Kitni baar use | Jahan likhi | Ek query mein kai baar | Poori session mein, kai queries |
| Index laga sakte | ❌ | ❌ | ✅ |
| Kab | Chhoti condition | Readable multi-step query, recursion | Bada intermediate data, kai queries mein reuse |

PostgreSQL 12+ mein CTE aam taur pe inline ho jaata hai (subquery jitna hi tez); `MATERIALIZED` likh ke ek baar calculate karwa sakte ho.

```sql
-- CTE — steps mein
WITH dept_avg AS (
  SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id
)
SELECT e.name, e.salary, d.avg_sal
FROM employees e JOIN dept_avg d USING (dept_id)
WHERE e.salary > d.avg_sal;

-- Recursive CTE — CEO se neeche tak poori chain
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS level FROM employees WHERE manager_id IS NULL   -- start: CEO
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.level + 1
  FROM employees e JOIN chain c ON e.manager_id = c.id                              -- har baar ek level neeche
)
SELECT repeat('  ', level - 1) || name AS org_chart FROM chain ORDER BY level;
```

! Recursive CTE mein cycle (A ka manager B, B ka A) ho to query kabhi khatam nahi hogi — `level < 20` jaisi limit ya PostgreSQL 14+ ka `CYCLE` clause.

> CTE = query ko naam wale steps mein todo. Recursive = tree / hierarchy.

## Self join — employee aur uska manager
? Employees table mein manager_id hai — har employee ke saath uske manager ka naam kaise nikaaloge?
**Ek line:** **self join** = table ko **khud se** join karna, do alag alias ke saath — jaise ek hi table ke do copy ho. Manager bhi employee hi hai, isliye `employees` ko `e` (employee) aur `m` (manager) bana ke jodte hain.

- **LEFT JOIN** lagao — CEO ka manager nahi hai, INNER JOIN se CEO gayab ho jaayega.
- Use: manager–employee, same city ke customers ke pairs, pichhle din se compare (ya window function `LAG`).

```sql
SELECT e.name AS employee, COALESCE(m.name, '— (top)') AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;

-- Wo employees jo apne manager se zyada kamaate hain
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

> Self join = ek table, do naam (e aur m). CEO bachana hai to LEFT JOIN.

## Window functions — PARTITION BY, running total, LAG/LEAD, NTILE
? Har department mein salary ka rank, running total aur pichhle mahine se farak — ye sab GROUP BY ke bina kaise?
**Ek line:** **window function** har row ke saath uske **group ka calculation** lagata hai — par GROUP BY ki tarah rows **ek nahi karta**; har row bani rehti hai. `OVER (PARTITION BY ... ORDER BY ...)` batata hai kaunsa group aur kis order mein.

| Function | Kya deta hai | Example |
| --- | --- | --- |
| `ROW_NUMBER / RANK / DENSE_RANK` | Group mein number/rank | Department mein top 3 salary |
| `SUM(...) OVER (ORDER BY ...)` | **Running total** | Mahine-dar cumulative sales |
| `AVG(...) OVER (PARTITION BY ...)` | Group ka average har row ke saath | Salary vs department average |
| `LAG(col) / LEAD(col)` | **Pichhli / agli** row ki value | Pichhle mahine se growth |
| `FIRST_VALUE / LAST_VALUE` | Group ki pehli/aakhri value | Har vehicle ka pehla location |
| `NTILE(4)` | Rows ko 4 barabar hisson mein | Customers ke quartiles |

**Aise socho:** GROUP BY = har class ka **ek summary slip**. Window function = har bachche ki marksheet pe **"class average"** aur **"class mein rank"** bhi likh dena — marksheets utni hi rahin.

```sql
SELECT name, dept, salary,
       RANK()      OVER (PARTITION BY dept ORDER BY salary DESC) AS rank_in_dept,
       AVG(salary) OVER (PARTITION BY dept)                      AS dept_avg
FROM employees;

SELECT month, sales,
       SUM(sales) OVER (ORDER BY month)                         AS running_total,
       sales - LAG(sales) OVER (ORDER BY month)                 AS vs_last_month,
       ROUND(100.0 * (sales - LAG(sales) OVER (ORDER BY month)) / LAG(sales) OVER (ORDER BY month), 1) AS growth_pct
FROM monthly_sales;

-- Top 3 per department
SELECT * FROM (
  SELECT name, dept, salary, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS r FROM employees
) t WHERE r <= 3;
```

! `LAST_VALUE` default frame mein "ab tak" tak hi dekhta hai, poore group ka nahi — `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` lagao.

> Window = har row rahe, saath mein group ka hisaab. PARTITION BY = group, ORDER BY = order.

## CASE WHEN se conditional aggregation
? Ek hi query mein har department ke Paid, Pending aur Cancelled orders ki ginti alag-alag columns mein kaise?
**Ek line:** `CASE WHEN` = SQL ka **if/else**. Aggregate ke andar lagao (`SUM(CASE WHEN ... THEN 1 ELSE 0 END)`) to ek hi query mein **kai conditions ke counts/sums alag columns** mein — pivot jaisa report.

PostgreSQL mein chhota tareeka: **`COUNT(*) FILTER (WHERE ...)`**.

```sql
SELECT customer_id,
       COUNT(*)                                             AS total_orders,
       SUM(CASE WHEN status = 'Paid'      THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END)  AS paid_amount,
       COUNT(*) FILTER (WHERE status = 'Pending')           AS pending      -- PostgreSQL style
FROM orders
GROUP BY customer_id;

SELECT name,
       CASE WHEN salary >= 100000 THEN 'High'
            WHEN salary >= 50000  THEN 'Medium'
            ELSE 'Low' END AS band
FROM employees;
```

> CASE WHEN = SQL ka if/else. SUM(CASE ...) = ek query, kai counts.

## NULL, string aur date functions — COALESCE, NULLIF, ILIKE, date_trunc
? NULL ko 0 dikhana, divide by zero se bachna, case-insensitive search aur mahine-wise group — kaunse functions?
**Ek line:** roz ke kaam ke functions ke teen group — NULL sambhalne wale, text wale, aur date wale.

| Kaam | Function | Example |
| --- | --- | --- |
| NULL ki jagah default | `COALESCE(a, b, 0)` | Pehli non-NULL value |
| Value ko NULL banana | `NULLIF(a, b)` | `total / NULLIF(qty, 0)` — divide by zero se bachav |
| Jodna | `concat(a, ' ', b)` | NULL ko khaali maanta hai (double-pipe operator NULL de deta hai) |
| Case-insensitive search | `ILIKE` | `name ILIKE '%asha%'` |
| Todna | `split_part('a-b-c', '-', 2)` | `'b'` |
| Mahine/din pe round | `date_trunc('month', created_at)` | Month-wise group |
| Umar / farak | `age(now(), dob)`, `now() - interval '7 days'` | Pichhle 7 din |
| Date series | `generate_series(start, end, '1 day')` | Khaali din bhi report mein |
| Part nikaalna | `EXTRACT(YEAR FROM created_at)` | Year |

```sql
SELECT name, COALESCE(phone, 'N/A') AS phone,
       ROUND(total_amount / NULLIF(total_qty, 0), 2) AS avg_price
FROM customers;

-- Mahine-wise orders, jin mahino mein 0 order the wo bhi dikhe
SELECT m.month, COUNT(o.id) AS orders
FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m(month)
LEFT JOIN orders o ON date_trunc('month', o.created_at) = m.month
GROUP BY m.month ORDER BY m.month;
```

! `WHERE date_trunc('day', created_at) = '2026-09-01'` — column pe function, index nahi lagega. Range likho: `created_at >= '2026-09-01' AND created_at < '2026-09-02'`.

> NULL → COALESCE / NULLIF. Text → ILIKE, split_part. Date → date_trunc, interval, generate_series.

## string_agg, array_agg aur JSONB
? Har customer ke saare product names ek comma-separated column mein chahiye; aur flexible attributes JSONB mein kaise store aur query karoge?
**Ek line:** **`string_agg`** / **`array_agg`** = group ki rows ko **ek string / array** mein jodna. **JSONB** = JSON ko binary form mein store karna — flexible fields ke liye, index bhi lag sakta hai.

**JSONB kab**: har row ke alag-alag optional attributes (product specs, device config, API payload/log). **Kab nahi**: jo fields har row mein hain aur jin pe join/filter/constraint chahiye — unke liye normal columns. `json` (text jaisa) vs **`jsonb`** (parsed, tez query, index) — hamesha jsonb.

| Operator | Kaam |
| --- | --- |
| `->` | JSON field (JSON ki tarah) |
| `->>` | JSON field **text** mein |
| `#>>` | Nested path text mein: `data #>> '{address,city}'` |
| `@>` | "Kya ye JSON andar hai?" — GIN index use karta hai |
| `?` | Key exist karti hai? |

```sql
SELECT c.name, string_agg(p.name, ', ' ORDER BY p.name) AS products, array_agg(DISTINCT p.category) AS categories
FROM customers c JOIN orders o ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id
GROUP BY c.name;

CREATE TABLE devices (id int PRIMARY KEY, config jsonb);
INSERT INTO devices VALUES (1, '{"model":"GT06","gps":{"interval":10},"tags":["bus","depot-3"]}');
SELECT id, config->>'model' AS model, (config #>> '{gps,interval}')::int AS interval_sec FROM devices;
SELECT id FROM devices WHERE config @> '{"model":"GT06"}';                 -- GIN index se tez
CREATE INDEX ix_devices_config ON devices USING GIN (config);
UPDATE devices SET config = jsonb_set(config, '{gps,interval}', '30') WHERE id = 1;
```

> string_agg = rows ko ek string. JSONB = flexible fields; `->>` text nikaalo, `@>` + GIN se search.

## Index types — B-tree, GIN, GiST, BRIN, partial aur covering index
? PostgreSQL mein B-tree ke alawa kaunse index hote hain? JSONB, full-text, geo aur bahut badi time-series table ke liye kaunsa?
**Ek line:** default **B-tree** (=, <, >, ORDER BY) — 90% cases. Baaki khaas data ke liye: **GIN** (JSONB, array, full-text), **GiST** (geo, range, nearest), **BRIN** (bahut badi, time ke order mein aayi table). Plus **partial** (sirf kuch rows) aur **covering** (`INCLUDE` columns) indexes.

| Index | Kiske liye | Example |
| --- | --- | --- |
| **B-tree** | Equality, range, sort | `WHERE email = ?`, `ORDER BY created_at` |
| **GIN** | Ek row mein kai values — JSONB, array, full-text | `config @> '{...}'`, `tags @> ARRAY['bus']` |
| **GiST** | Geometry, ranges, "sabse paas" | PostGIS `ST_DWithin`, overlap |
| **BRIN** | Bahut badi table jahan data order mein aata hai | GPS logs by `recorded_at` — chhota index |
| **Hash** | Sirf `=` | Rare |
| **Partial** | Sirf condition wali rows | `WHERE status = 'Pending'` — chhota aur tez |
| **Covering** (`INCLUDE`) | Query ke columns index mein hi | Table pe jaana hi nahi (Index Only Scan) |

**Aise socho:** B-tree = kitaab ka **A–Z index**. GIN = "ye shabd kin-kin pages pe hai" wala **reverse index**. GiST = **map pe area** dhoondhna. BRIN = register ke har 100 pages pe likha "yahan 1–10 Jan ka data" — bahut chhota, moti-moti jagah batata hai.

```sql
CREATE INDEX ix_orders_created ON orders (created_at);                          -- B-tree
CREATE INDEX ix_orders_pending ON orders (created_at) WHERE status = 'Pending'; -- partial
CREATE INDEX ix_orders_cust_cov ON orders (customer_id) INCLUDE (total, status); -- covering
CREATE INDEX ix_devices_cfg ON devices USING GIN (config);                      -- JSONB
CREATE INDEX ix_gps_time ON gps_points USING BRIN (recorded_at);                -- huge time-series
CREATE INDEX CONCURRENTLY ix_users_email ON users (lower(email));               -- expression, bina lock ke
```

! Production pe bade table pe `CREATE INDEX` bina `CONCURRENTLY` — writes lock ho jaati hain jab tak index na bane.

> Default B-tree. JSONB/array → GIN. Geo → GiST. Huge time-series → BRIN. Kuch hi rows → partial.

## EXPLAIN padhna — Seq Scan, Index Scan, Bitmap Scan aur join types
? EXPLAIN ANALYZE mein Seq Scan, Index Scan, Bitmap Heap Scan, Nested Loop, Hash Join dikhe — inka matlab kya hai?
**Ek line:** `EXPLAIN` batata hai database query **kaise chalayega** (plan); `EXPLAIN ANALYZE` query **chala ke** asli time aur rows dikhata hai. Scan type = rows kaise dhoondhi; join type = do tables kaise jodi.

| Scan | Matlab | Kab theek |
| --- | --- | --- |
| **Seq Scan** | Poori table padhi | Chhoti table, ya zyada rows chahiye (index se fayda nahi) |
| **Index Scan** | Index se row dhoondhi, phir table se | Kam rows chahiye |
| **Index Only Scan** | Sirf index se jawab (covering) | Sabse tez |
| **Bitmap Heap Scan** | Index se row list banayi, phir table pages order mein padhe | Medium number of rows, ya kai indexes mila ke |

| Join | Kaise | Kab |
| --- | --- | --- |
| **Nested Loop** | Har outer row ke liye inner mein dhoondho | Ek side chhoti + index |
| **Hash Join** | Chhoti table ka hash banao, badi ko ek baar padho | Badi tables, equality join |
| **Merge Join** | Dono sorted, saath-saath chalo | Dono already sorted (index) |

Padhne ke tips: **neeche se upar** padho (andar wala node pehle chalta hai); **estimated rows vs actual rows** mein bahut farak = stale statistics (`ANALYZE table`); sabse zyada **time** wala node dhoondho; `BUFFERS` option se disk reads.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= now() - interval '1 day';
--  Hash Join (actual time=0.9..12.4 rows=850)
--    -> Index Scan using ix_orders_created on orders o (rows=850)
--    -> Hash -> Seq Scan on customers c (rows=5000)
```

> Seq = poori kitaab. Index = seedha page. Bitmap = pehle page numbers ki list, phir order mein padho. Estimate ≠ actual → ANALYZE.

## Partitioning — range vs list, partition pruning
? GPS points ki table 2 saal mein 5 TB ki ho gayi — partitioning kaise madad karegi?
**Ek line:** **partitioning** = ek badi table ko andar se **chhoti tables (partitions)** mein todna — bahar se ek hi table dikhti hai. Query mein partition key ki condition ho to DB **sirf zaroori partitions** padhta hai (**partition pruning**).

| Type | Kaise todte | Example |
| --- | --- | --- |
| **Range** | Value ki range | Har mahine ka alag partition (`created_at`) |
| **List** | Specific values | Region / tenant: `'north'`, `'south'` |
| **Hash** | Hash se barabar baantna | Load barabar karna |

Fayde: purana data hatana = **`DROP` partition** (turant, bina bloat — DELETE ki tarah lakhon rows nahi), queries tez (pruning), VACUUM/index chhote. Nuksaan: har query mein partition key nahi to saare partitions padhe jaayenge; primary key/unique mein partition key shamil karni padti hai; bahut zyada partitions (hazaaron) se planning slow.

**Aise socho:** saal bhar ke bills ek bade dabbe mein vs **har mahine ki alag file** — September ka bill chahiye to sirf September ki file kholo; purana saal phenkna ho to 12 files utha ke phenk do.

```sql
CREATE TABLE gps_points (
  device_id int, recorded_at timestamptz NOT NULL, lat float8, lng float8
) PARTITION BY RANGE (recorded_at);

CREATE TABLE gps_points_2026_09 PARTITION OF gps_points FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE gps_points_2026_10 PARTITION OF gps_points FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

SELECT * FROM gps_points WHERE recorded_at >= '2026-09-20' AND recorded_at < '2026-09-21';   -- sirf Sept partition
DROP TABLE gps_points_2024_01;                                                                -- purana data turant saaf
```

> Partition = badi table ki mahine-wise files. Query mein partition key do, warna fayda nahi.

## Running query dekhna aur kill karna — pg_stat_activity, blocking vs deadlock
? Production DB slow hai — kaunsi query chal rahi hai, kaun kisko block kar raha hai, aur usko kaise rokoge?
**Ek line:** **`pg_stat_activity`** = abhi DB pe kya-kya chal raha hai (query, kab se, state, wait). `pg_cancel_backend(pid)` = query **roko**; `pg_terminate_backend(pid)` = poora connection **kaato**.

**Blocking vs deadlock:**
- **Blocking** = A ne lock liya, B **wait** kar raha hai. A khatam → B chalega. Temporary, par lamba chale to app hang lagti hai.
- **Deadlock** = A, B ka wait kar raha aur B, A ka — **koi kabhi aage nahi**. PostgreSQL khud pakad ke ek ko **kill** karta hai (`deadlock detected`). Fix: rows hamesha **same order** mein lock/update karo, transactions chhoti rakho.

`idle in transaction` sessions sabse khatarnak — transaction khuli chhod di, locks pakde baithe hain (app mein commit bhoola). `idle_in_transaction_session_timeout` lagao.

```sql
-- Kya chal raha hai, kab se
SELECT pid, usename, state, now() - query_start AS running_for, wait_event_type, left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle' ORDER BY running_for DESC;

-- Kaun kisko block kar raha hai
SELECT blocked.pid AS blocked_pid, left(blocked.query, 60) AS blocked_query,
       blocker.pid AS blocker_pid, left(blocker.query, 60) AS blocker_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocker ON blocker.pid = ANY (pg_blocking_pids(blocked.pid));

SELECT pg_cancel_backend(12345);      -- sirf query roko
SELECT pg_terminate_backend(12345);   -- connection hi band
```

SQL Server mein: `sp_who2`, `sys.dm_exec_requests`, `KILL <spid>`; slow queries ke liye DMV `sys.dm_exec_query_stats`. PostgreSQL mein slow queries ka itihaas: `pg_stat_statements`.

> pg_stat_activity = abhi kya chal raha. Blocking = wait; deadlock = dono atke, DB ek ko maarta hai.

## Connection pooling aur PgBouncer
? PostgreSQL mein max_connections 100 hai aur 10 app servers hain — connection pooling kyun zaroori hai, PgBouncer kya karta hai?
**Ek line:** har PostgreSQL connection ek **alag process** hai (~5–10 MB memory) — hazaaron connections DB ko maar dete hain. **Connection pool** = connections ko **baar-baar reuse** karna. **PgBouncer** = app aur DB ke beech ek halka pooler jo hazaaron app connections ko kuch dozen asli DB connections pe chalata hai.

- **Npgsql ka apna pool** already hota hai (per app instance) — `Maximum Pool Size=50` connection string mein. Par 20 instances × 50 = 1000 connections → DB pe bhaari. Tab PgBouncer.
- PgBouncer modes: **transaction pooling** (sabse common — har transaction ke liye connection, phir wapas) vs session pooling.
- Transaction mode mein dhyan: session-level cheezein (`SET`, session prepared statements, `LISTEN`, temp tables) kaam nahi karti / alag handle karni padti hain.
- Symptom bina pooling ke: "too many connections", DB CPU context switching mein, latency spikes.

**Aise socho:** har customer ke liye **naya waiter hire** karna (connection) vs **10 waiters** jo saare tables sambhalte hain (pool). PgBouncer = restaurant ka **manager** jo bahar ki bheed ko andar ke limited waiters mein baant-ta hai.

```text
App (Npgsql pool 20) ×10 instances  →  PgBouncer (pool_mode = transaction, default_pool_size = 40)  →  PostgreSQL (max_connections = 100)

Connection string: Host=pgbouncer;Port=6432;Database=app;Username=app;Maximum Pool Size=20;No Reset On Close=true
```

> Connection = mehenga process. Pool = reuse. PgBouncer = bahut saari apps ke liye beech ka manager.

## Backup aur restore — pg_dump, pg_restore aur PITR
? PostgreSQL database ka backup kaise lete ho aur restore kaise? Logical aur physical backup mein farak?
**Ek line:** **`pg_dump`** = **logical** backup (SQL/objects ki file) — ek database/table, chhote–medium DB, doosre version pe restore. **Physical** backup (`pg_basebackup` + WAL archiving) = poori data directory — bade DB, aur **PITR** (kisi bhi second pe wapas jaana).

| | pg_dump (logical) | pg_basebackup + WAL (physical) |
| --- | --- | --- |
| Kya | Tables/data ki SQL ya custom file | Data files ki copy + transaction logs |
| Granularity | Ek DB / schema / table | Poora cluster |
| Kisi bhi time pe restore (PITR) | ❌ Sirf dump ke time ka | ✅ |
| Speed bade DB pe | Dheema | Tez |

- `-Fc` (custom format) + `pg_restore` — selective restore, parallel (`-j 4`).
- Backup **test karo** — kabhi restore nahi kiya hua backup, backup nahi hai.
- Managed DB (Azure/AWS/GCP) automatic backups + PITR dete hain.

```bash
pg_dump -h db -U app -Fc -d shop -f shop_2026_09_28.dump          # custom format
pg_dump -h db -U app -d shop -t orders --data-only > orders.sql    # sirf ek table ka data
pg_restore -h db2 -U app -d shop_restore -j 4 shop_2026_09_28.dump  # parallel restore
pg_restore -d shop_restore -t customers shop_2026_09_28.dump        # sirf ek table wapas
```

> pg_dump = logical, chhota/selective. Physical + WAL = bada DB, kisi bhi second pe wapas (PITR). Restore test karo.

## Replication — streaming vs logical
? PostgreSQL mein streaming aur logical replication mein kya farak hai? Read replica kaunse se banta hai?
**Ek line:** **streaming (physical)** = primary ka **poora WAL** byte-by-byte replica pe — exact copy, read-only standby, failover ke liye. **Logical** = **chuni hui tables** ke row changes (publish/subscribe) — alag version, alag schema, kuch tables hi.

| | Streaming (physical) | Logical |
| --- | --- | --- |
| Kya copy | Poora cluster | Chuni hui tables |
| Replica pe likh sakte | ❌ Read-only | ✅ (doosri tables pe) |
| Alag PostgreSQL version | ❌ Same major | ✅ — **zero-downtime upgrade** |
| Use | Read replica, HA/failover | Upgrade/migration, data doosre system mein, selective sync |

**Replication lag**: async replica thoda peeche — abhi likha data replica pe turant na dikhe. "Save karke turant padhna" wale flows primary se padho. Synchronous replication = lag nahi par writes slow.

```sql
-- Logical: primary pe
CREATE PUBLICATION orders_pub FOR TABLE orders, order_items;
-- subscriber pe
CREATE SUBSCRIPTION orders_sub CONNECTION 'host=primary dbname=shop user=repl' PUBLICATION orders_pub;

-- Lag dekhna (primary pe)
SELECT client_addr, state, replay_lag FROM pg_stat_replication;
```

> Streaming = poori photocopy (read replica, failover). Logical = chuni tables ka live feed (upgrade, migration).

## Foreign Data Wrapper (FDW) kya hai
? Doosre PostgreSQL server ki table ko apni query mein join karna hai — FDW kaise madad karta hai?
**Ek line:** **FDW** = doosre database (doosra PostgreSQL, MySQL, CSV file…) ki table ko **apne DB mein local table jaisa** dikhana — `SELECT`/`JOIN` seedha, data copy kiye bina. `postgres_fdw` sabse common.

- Use: purane system se data padhna migration ke dauraan, do DBs ka report ek query mein, occasional cross-DB lookup.
- Dhyan: har query network pe jaati hai — **slow** ho sakti hai; bade joins remote pe push na hon to saara data kheench laata hai. Heavy/regular use ke liye replication ya ETL better.
- Credentials `USER MAPPING` mein.

```sql
CREATE EXTENSION postgres_fdw;
CREATE SERVER legacy FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host 'old-db', dbname 'erp');
CREATE USER MAPPING FOR app_user SERVER legacy OPTIONS (user 'reader', password '...');
IMPORT FOREIGN SCHEMA public LIMIT TO (customers) FROM SERVER legacy INTO legacy_schema;

SELECT o.id, c.name FROM orders o JOIN legacy_schema.customers c ON c.id = o.customer_id;   -- remote table se join
```

> FDW = doosre DB ki table apne DB mein khidki ki tarah. Kabhi-kabhi ke liye theek, roz ke heavy kaam ke liye nahi.

## ALTER TABLE — badi table pe column add/drop/type change ka asar
? 5 crore rows wali production table mein naya column jodna hai aur ek column ka type badalna hai — kya dhyan rakhoge?
**Ek line:** kuch `ALTER` **turant** hote hain (sirf catalog badalta hai), kuch poori table **dobara likhte** hain aur tab tak table **lock** rehti hai — production pe downtime.

| Operation | Asar (PostgreSQL) |
| --- | --- |
| `ADD COLUMN` (NULL ya constant default) | ✅ Turant (PG 11+) |
| `ADD COLUMN ... DEFAULT now()` (volatile) | ❌ Poori table rewrite |
| `DROP COLUMN` | ✅ Turant (space baad mein VACUUM se) |
| `ALTER COLUMN TYPE` (int → bigint, text → int) | ❌ Aksar **rewrite + lock** |
| `SET NOT NULL` | Poori table scan (lock ke saath) |
| `ADD CONSTRAINT ... CHECK/FK` | Scan — `NOT VALID` phir `VALIDATE` se bina lamba lock |
| `CREATE INDEX` | Lock — `CONCURRENTLY` use karo |

Safe tareeka (bade tables): naya column add → background mein batches mein data copy → code dono padhe/likhe → switch → purana hatao ("expand and contract"). Lock wait na ho iske liye `SET lock_timeout = '5s'`.

```sql
SET lock_timeout = '5s';
ALTER TABLE orders ADD COLUMN notes text;                                  -- turant
ALTER TABLE orders ADD CONSTRAINT chk_total CHECK (total >= 0) NOT VALID;   -- turant
ALTER TABLE orders VALIDATE CONSTRAINT chk_total;                           -- scan, par writes block nahi
-- int → bigint: naya column + batch copy, ek hi ALTER TYPE se nahi (poori table lock)
ALTER TABLE orders ADD COLUMN id_new bigint;
```

> Chhota ALTER = catalog. Bada ALTER = rewrite + lock. Production pe lock_timeout, NOT VALID, CONCURRENTLY.

## SERIAL vs IDENTITY vs SEQUENCE
? PostgreSQL mein auto-increment ID ke liye SERIAL use karoge ya IDENTITY? Sequence kya hai?
**Ek line:** teeno ke peeche **sequence** hi hai (ek counter jo har baar agla number deta hai). **`SERIAL`** purana shortcut hai; **`GENERATED ... AS IDENTITY`** naya SQL-standard tareeka — **wahi use karo**.

| | SERIAL | IDENTITY | Sequence (khud) |
| --- | --- | --- | --- |
| Standard SQL | ❌ PostgreSQL ka | ✅ | ✅ |
| Galti se manual value | Chal jaata hai | `ALWAYS` mein error (zabardasti = `OVERRIDING SYSTEM VALUE`) | — |
| Permissions / ownership | Alag se sambhalni padti | Column ke saath | Khud |
| Kab | Purane schemas | **Naye tables** | Kai tables ek counter share karein, custom format (INV-0001) |

**Gaps normal hain**: rollback hui transaction ka number wapas nahi aata, cache, crash — ID "1, 2, 5" ho sakti hai. Gapless invoice number chahiye to alag counter table + lock.

```sql
CREATE TABLE orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, total numeric);
INSERT INTO orders (total) VALUES (500);                 -- id apne aap
-- INSERT INTO orders (id, total) VALUES (99, 1);        -- error (ALWAYS)

CREATE SEQUENCE invoice_seq START 1000;
SELECT 'INV-' || nextval('invoice_seq');                 -- INV-1000
```

> Naye tables = IDENTITY. Peeche sab sequence. Gaps bug nahi hain.
