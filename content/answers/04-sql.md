# Database aur SQL

## Primary Key
? Primary key kya hai? Primary key aur unique key mein farak batao.
**Primary key** wo column (ya columns ka combination) hai jo table ki **har row ko uniquely pehchaanta** hai. Do rules: value **unique** honi chahiye aur **NULL nahi** ho sakti. Ek table mein sirf ek primary key hoti hai.

Database primary key pe apne aap ek **unique index** bana deta hai, isliye id se lookup bahut tez hota hai. Foreign keys isi ko refer karti hain.

Types: **surrogate key** (koi business meaning nahi — auto-increment `serial`/`identity` ya UUID) aur **natural key** (asli data — jaise PAN number). Aam taur pe surrogate key better hai kyunki business data badal sakta hai. **Composite key** — do+ columns milkar unique (jaise `order_id + product_id` junction table mein). UUID distributed systems mein achha hai par index bada aur random insert order ki wajah se thoda slow; PostgreSQL mein `bigint generated always as identity` common default hai.

```sql
CREATE TABLE employee (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       varchar(200) NOT NULL UNIQUE,
    name        varchar(100) NOT NULL
);

CREATE TABLE order_item (                       -- composite key
    order_id    bigint,
    product_id  bigint,
    qty         int NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```

## Foreign Key
? Foreign key kya hai aur `ON DELETE CASCADE` kya karta hai?
**Foreign key** ek table ka column hai jo **doosri table ki primary key ko refer** karta hai — do tables ke beech relationship banata hai aur **referential integrity** enforce karta hai. Yani tum aisa `order` insert nahi kar sakte jiska `customer_id` customers table mein exist hi nahi karta, aur aisa customer delete nahi kar sakte jiske orders abhi bhi pade hain (jab tak rule na batao).

`ON DELETE` rules batate hain parent delete hone pe child ka kya ho: `RESTRICT`/`NO ACTION` (default — delete roko), `CASCADE` (children bhi delete), `SET NULL` (child ka FK null karo). `CASCADE` sochke lagao — ek delete se hazaaron rows gayab ho sakti hain.

**Performance note**: PostgreSQL foreign key column pe **apne aap index nahi banata** (sirf referenced primary key pe hota hai). JOIN aur parent delete ke waqt child table scan hoti hai — isliye FK columns pe index khud banao.

```sql
CREATE TABLE orders (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount      numeric(12,2) NOT NULL
);
CREATE INDEX idx_orders_customer ON orders(customer_id);   -- Postgres khud nahi banata

INSERT INTO orders (customer_id, amount) VALUES (99999, 500);
-- ERROR: insert or update violates foreign key constraint
```

! "Foreign key pe index automatically banta hai" — PostgreSQL mein nahi. Khud banao.

## Unique
? UNIQUE constraint kya hai? Kya isme NULL allowed hai?
**UNIQUE constraint** ensure karta hai ki column (ya columns ka combination) mein **koi duplicate value** na ho — jaise email, username, mobile number. Primary key se farak: ek table mein kai unique constraints ho sakte hain, aur unique column mein **NULL allowed** hai.

NULL ka behaviour: SQL mein NULL = "pata nahi", aur do NULL barabar nahi maane jaate — isliye PostgreSQL mein unique column mein **kai NULLs** aa sakte hain. PostgreSQL 15+ mein `UNIQUE NULLS NOT DISTINCT` se ek hi NULL allow kar sakte ho.

Unique constraint andar se ek **unique index** banata hai, isliye us column pe lookup bhi tez ho jaata hai. **Partial unique index** bhi bana sakte ho — jaise "active users mein email unique" (`WHERE deleted_at IS NULL`), jo soft delete ke saath bahut kaam aata hai.

**Application check kaafi nahi**: "pehle check karo email exist karta hai, phir insert" — do requests ek saath aayein to dono check pass kar lengi. Asli guarantee sirf DB constraint deta hai; app mein `23505` (unique_violation) error pakad ke 409 Conflict lautao.

```sql
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Soft delete ke saath: sirf active rows mein unique
CREATE UNIQUE INDEX uq_active_email ON users(email) WHERE deleted_at IS NULL;
```

## Not Null
? NOT NULL constraint kya hai?
**NOT NULL** constraint kehta hai ki column mein **value hona zaroori** hai — NULL allowed nahi. Required fields (naam, email, amount, created_at) pe lagao.

Kyun important? NULL ek teesri state hai ("pata nahi") jo logic ko ajeeb bana deti hai: `NULL = NULL` true nahi, balki NULL hota hai; `amount > 100` NULL rows ko chhod deta hai; `COUNT(column)` NULLs nahi ginta; `SUM` NULL ignore karta hai; `NOT IN` list mein ek NULL ho to poori query kuch nahi lautati. Jitne kam NULL, utne kam surprise.

Existing table mein NOT NULL jodna ho to pehle purani NULL rows fix karo (ya default do), warna `ALTER` fail hoga. EF Core mein non-nullable reference type (`string`) ya `[Required]` se column NOT NULL banta hai.

```sql
CREATE TABLE product (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name   varchar(200) NOT NULL,
    price  numeric(10,2) NOT NULL,
    notes  text                        -- optional, NULL allowed
);

UPDATE product SET notes = '' WHERE notes IS NULL;
ALTER TABLE product ALTER COLUMN notes SET NOT NULL;
```

## Default
? DEFAULT constraint kya hai?
**DEFAULT** constraint column ki **value batata hai jab insert mein wo column diya hi na jaaye**. Jaise `created_at DEFAULT now()`, `is_active DEFAULT true`, `status DEFAULT 'New'`.

Dhyan: default sirf tab lagta hai jab column **omit** kiya jaaye. Agar tumne explicitly `NULL` bheja, to NULL hi jaayega (default nahi). Default koi function bhi ho sakta hai — `now()`, `gen_random_uuid()`, sequence.

PostgreSQL 11+ mein **non-volatile default** ke saath naya column jodna (`ADD COLUMN ... DEFAULT false`) instant hai — poori table rewrite nahi hoti. Purane versions mein bade table pe ye lamba lock leta tha.

```sql
CREATE TABLE orders (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status      varchar(20) NOT NULL DEFAULT 'New',
    created_at  timestamptz NOT NULL DEFAULT now(),
    public_id   uuid NOT NULL DEFAULT gen_random_uuid()
);

INSERT INTO orders DEFAULT VALUES;           -- sab defaults lagenge
INSERT INTO orders (status) VALUES (NULL);   -- ERROR — NULL bheja, default nahi laga (NOT NULL hai)
```

## Check
? CHECK constraint kya hai? Example do.
**CHECK constraint** ek **condition** lagata hai jo har row ko satisfy karni hi padegi, warna insert/update fail. Jaise `salary > 0`, `end_date >= start_date`, `status IN ('New','Paid','Cancelled')`, `age BETWEEN 18 AND 120`.

Ye **database level pe business rules** ki aakhri deewar hai — chahe data API se aaye, script se, ya kisi ne seedha SQL chalaya, galat data andar nahi jaa sakta. Application validation user ko achha error dikhane ke liye hai; CHECK data ki guarantee ke liye.

CHECK sirf **usi row** ke columns dekh sakta hai — doosri row ya doosri table nahi (uske liye trigger ya foreign key). Condition NULL aaye to CHECK pass maana jaata hai, isliye saath mein NOT NULL bhi lagao.

```sql
CREATE TABLE leave_request (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    days        int  NOT NULL CHECK (days > 0),
    status      text NOT NULL CHECK (status IN ('Pending','Approved','Rejected')),
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);
```

## View
? View kya hai aur kab use karte ho?
**View** ek **saved query** hai jo virtual table ki tarah use hoti hai. View khud **data store nahi karta** — jab bhi tum view se SELECT karte ho, uski underlying query har baar chalti hai aur fresh data aata hai.

Use cases: (1) complex JOIN/logic ek jagah rakhna taaki har jagah dohrana na pade; (2) **security** — user ko sirf view ka access do jisme sensitive columns (salary, password) nahi hain; (3) purane table structure ko badalte waqt backward compatibility.

Performance: view sirf query ka alias hai — tez nahi karta. Planner view ki query ko outer query ke saath jod ke optimize karta hai. Simple views (ek table, koi aggregate nahi) **updatable** hote hain — unpe INSERT/UPDATE chal sakta hai.

```sql
CREATE VIEW active_customer_orders AS
SELECT c.id, c.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.is_active
GROUP BY c.id, c.name;

SELECT * FROM active_customer_orders WHERE total > 10000;   -- har baar fresh
```

## Materialized View
? Materialized view kya hai aur normal view se kaise alag hai?
**Materialized view** bhi ek saved query hai, par ye query ka **result physically disk pe store** kar leta hai. Isliye isse padhna bahut tez hai — bhaari JOIN/aggregate dobara nahi chalta. Par data **stale** ho sakta hai: underlying tables badlein to materialized view apne aap update nahi hota, tumhe `REFRESH MATERIALIZED VIEW` chalana padta hai.

Kab use karein: dashboards, reports, analytics — jahan query bhaari hai aur thoda purana data (5 min, 1 ghanta) chalega. Refresh cron job, pg_cron, ya app scheduler se.

`REFRESH` normal mode mein view ko **lock** kar deta hai (refresh ke dauraan reads ruk jaate hain). `REFRESH ... CONCURRENTLY` reads ko nahi rokta, par uske liye materialized view pe **unique index** chahiye. Normal tables ki tarah iss pe indexes bana sakte ho.

| View | Materialized View |
|---|---|
| Data store nahi karta | Result disk pe store |
| Har baar query chalti hai | Stored result padhta hai |
| Hamesha fresh | Refresh tak stale |
| Index nahi | Index bana sakte ho |
| Simple abstraction | Bhaari reports/dashboards |

```sql
CREATE MATERIALIZED VIEW daily_sales AS
SELECT date_trunc('day', created_at) AS day, SUM(amount) AS total, COUNT(*) AS orders
FROM orders GROUP BY 1;

CREATE UNIQUE INDEX ON daily_sales(day);
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales;   -- reads block nahi hote
```

## Inner Join
? INNER JOIN kya return karta hai? Example ke saath batao.
**INNER JOIN** dono tables se sirf wo rows lautata hai jinka **match dono taraf mile**. Jis customer ka koi order nahi, ya jis order ka customer nahi mila — wo result mein nahi aayenge. `JOIN` likhna matlab `INNER JOIN`.

Match `ON` condition se hota hai, usually foreign key = primary key. Ek taraf ki ek row doosri taraf ki kai rows se match ho sakti hai (one-to-many) — to result mein wo row kai baar dikhegi. Isliye JOIN ke baad `SUM`/`COUNT` karte waqt dhyan rakho ki rows multiply to nahi ho gayi.

Performance: JOIN columns pe index hona chahiye (FK side pe khaas kar). PostgreSQL teen strategies use karta hai — **Nested Loop** (chhote data), **Hash Join** (bada data, equality), **Merge Join** (sorted data) — `EXPLAIN` mein dikhta hai.

```sql
SELECT o.id, o.amount, c.name
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01';
-- sirf wo orders jinka customer exist karta hai
```

> Bina match wali rows gayab ho jaati hain — yahi LEFT JOIN se farak hai.

## Left Join
? LEFT JOIN kya hai? Aise customers nikaalo jinka koi order nahi.
**LEFT JOIN** (LEFT OUTER JOIN) left table ki **saari rows** lautata hai, aur right table ki matching rows. Jahan right mein match nahi mila, wahan right ke columns **NULL** aa jaate hain.

Use cases: "saare customers aur unke orders (agar hain)", "har product ki sales, chahe zero ho". Aur famous trick — **anti-join**: LEFT JOIN karke `WHERE right.id IS NULL` lagao to wo rows milti hain jinka **koi match nahi** (jinhone kabhi order nahi kiya). `NOT EXISTS` bhi yahi karta hai aur aksar utna hi tez hai.

**Common galti**: LEFT JOIN ke baad right table ke column pe `WHERE` condition lagayi (`WHERE o.status = 'Paid'`), to NULL wali rows filter ho jaati hain aur LEFT JOIN chupke se INNER JOIN ban jaata hai. Right table ki condition `ON` mein daalo.

```sql
-- Har customer + order count (zero bhi)
SELECT c.name, COUNT(o.id) AS orders          -- COUNT(o.id): NULL nahi ginega → 0
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name;

-- Jinhone kabhi order nahi kiya
SELECT c.* FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- Condition ON mein, WHERE mein nahi
SELECT c.name, o.id FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'Paid';
```

! Right table ke column pe `WHERE` = LEFT JOIN ka INNER JOIN ban jaana.

> WHERE o.id IS NULL laga do to "jinhone kabhi order nahi kiya" mil jaayenge.

## Right Join
? RIGHT JOIN kya hai?
**RIGHT JOIN** LEFT JOIN ka ulta hai — **right table ki saari rows**, aur left ki matching rows; match nahi to left ke columns NULL.

Practically ise bahut kam use karte hain, kyunki tables ka order ulta karke wahi kaam LEFT JOIN se ho jaata hai, aur zyada tar log LEFT JOIN padhne ke aadi hain. `A RIGHT JOIN B` = `B LEFT JOIN A`. Code mein consistency ke liye aksar sirf LEFT JOIN use karne ka rule hota hai.

```sql
SELECT d.name AS department, e.name AS employee
FROM employee e
RIGHT JOIN department d ON d.id = e.department_id;
-- har department, chahe usme koi employee na ho

-- Wahi, LEFT JOIN se (zyada common):
SELECT d.name, e.name FROM department d
LEFT JOIN employee e ON e.department_id = d.id;
```

## Full Join
? FULL OUTER JOIN kya hai?
**FULL OUTER JOIN** dono tables ki **saari rows** lautata hai — match mila to jodi, left mein extra hai to right NULL, right mein extra hai to left NULL. Ye LEFT aur RIGHT ka union jaisa hai.

Kab kaam aata hai? **Data reconciliation** — do systems ka data compare karna: kaunse records dono mein hain, kaunse sirf system A mein, kaunse sirf B mein. Jaise bank statement vs internal payments, ya purana vs naya table migration ke baad.

| Join | Kya lautata hai |
|---|---|
| INNER | Sirf dono taraf match wali |
| LEFT | Left ki saari + right ka match (warna NULL) |
| RIGHT | Right ki saari + left ka match (warna NULL) |
| FULL | Dono ki saari, match na ho to NULL |
| CROSS | Har left × har right (cartesian) |

```sql
SELECT COALESCE(b.txn_id, p.txn_id) AS txn_id,
       b.amount AS bank_amount, p.amount AS our_amount,
       CASE WHEN b.txn_id IS NULL THEN 'Missing in bank'
            WHEN p.txn_id IS NULL THEN 'Missing in our system'
            WHEN b.amount <> p.amount THEN 'Amount mismatch'
            ELSE 'OK' END AS result
FROM bank_statement b
FULL OUTER JOIN payments p ON p.txn_id = b.txn_id;
```

## Where vs Having
? WHERE aur HAVING mein farak kya hai?
Dono filter karte hain, par **alag stage** pe:

**WHERE** — rows ko **grouping se pehle** filter karta hai. Aggregate functions (`COUNT`, `SUM`) yahan use nahi ho sakte, kyunki groups abhi bane hi nahi.

**HAVING** — **GROUP BY ke baad** groups ko filter karta hai, aggregate results pe — jaise "wo departments jinme 5 se zyada employees hain".

SQL ka logical execution order samajh lo, sab clear ho jaayega: `FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. Isi wajah se `SELECT` mein diya alias `WHERE` mein use nahi kar sakte (WHERE pehle chalta hai).

Performance tip: jo filter row-level pe lag sakta hai use `WHERE` mein daalo, `HAVING` mein nahi — WHERE pehle rows kam karta hai, to grouping kam data pe hoti hai aur index bhi use ho sakta hai.

| WHERE | HAVING |
|---|---|
| Rows filter | Groups filter |
| GROUP BY se pehle | GROUP BY ke baad |
| Aggregate nahi chalega | Aggregate pe hi kaam |
| `WHERE salary > 50000` | `HAVING COUNT(*) > 5` |

```sql
SELECT department_id, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employee
WHERE is_active = true             -- pehle: sirf active employees
GROUP BY department_id
HAVING COUNT(*) > 5                -- phir: sirf bade departments
ORDER BY avg_salary DESC;
```

> WHERE rows chhaanta hai, HAVING groups chhaanta hai.

## Indexes
? Index kya hai, kaise kaam karta hai, aur zyada indexes ka nuksaan kya hai?
**Index** ek alag data structure hai jo database ko rows **jaldi dhoondhne** mein madad karta hai — kitaab ke peeche wali index jaisa. Bina index ke PostgreSQL ko poori table scan karni padti hai (**Seq Scan**); index ke saath wo seedha sahi rows pe pahunchta hai (**Index Scan**).

PostgreSQL mein default **B-tree** index hai — equality (`=`), range (`<`, `>`, `BETWEEN`), `ORDER BY` aur prefix `LIKE 'abc%'` ke liye. Aur bhi types: **GIN** (JSONB, arrays, full-text search), **GiST** (geo data, PostGIS), **BRIN** (bahut badi, time-ordered tables jaise logs), **Hash**.

**Composite index** `(a, b)` mein order matter karta hai — ye `WHERE a = ?` aur `WHERE a = ? AND b = ?` mein kaam aata hai, par sirf `WHERE b = ?` mein nahi (leftmost prefix rule). **Partial index** sirf kuch rows pe (`WHERE status = 'Pending'`). **Covering index** (`INCLUDE`) se Index Only Scan.

**Trade-offs**: index disk leta hai, aur har `INSERT/UPDATE/DELETE` pe index bhi update hota hai — writes slow. Kam unique values wale column (jaise boolean) pe index aksar bekaar. Column pe function lagaya (`WHERE lower(email) = ...`) to normal index use nahi hoga — **expression index** chahiye. Index kab banana hai ye **query patterns aur `EXPLAIN ANALYZE`** se decide karo.

```sql
CREATE INDEX idx_vehicle_date ON vehicle_log(vehicle_id, created_at);   -- composite
CREATE INDEX idx_pending ON orders(created_at) WHERE status = 'Pending'; -- partial
CREATE INDEX idx_email_lower ON users(lower(email));                     -- expression
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders(customer_id);    -- prod: table lock nahi
```

! Production table pe `CREATE INDEX` (bina CONCURRENTLY) writes ko lock kar deta hai jab tak index ban raha hai.

> Trade-off: SELECT fast, INSERT/UPDATE slow, extra disk. Har column pe index lagana galat hai.

## Explain Analyze
? `EXPLAIN ANALYZE` kya hai aur slow query debug karne mein isko kaise padhte ho?
`EXPLAIN` batata hai PostgreSQL query **kaise chalane ka plan** bana raha hai. `EXPLAIN ANALYZE` query ko **sach mein chalata hai** aur plan ke saath **asli numbers** deta hai — har step ka actual time, actual rows, loops. Slow query debug karne ka ye pehla aur sabse zaroori tool hai.

Kya dekhna hai:
- **Scan type** — bade table pe `Seq Scan` jahan chhota result chahiye = missing index
- **estimated rows vs actual rows** — bahut bada farak = purani statistics, `ANALYZE table` chalao
- **Join type** — Nested Loop bade data pe slow ho sakta hai
- **Sort / Hash** mein "external merge Disk" = `work_mem` kam, disk pe spill
- Sabse zyada time kis node pe laga — wahi bottleneck

`EXPLAIN (ANALYZE, BUFFERS)` se pata chalta hai kitna data memory (cache hit) se aaya aur kitna disk se.

**Dhyan**: `EXPLAIN ANALYZE` query sach mein chalata hai — `UPDATE`/`DELETE` pe chalaya to data badal jaayega. Aise case mein `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM vehicle_log WHERE vehicle_id = 100 AND created_at >= now() - interval '1 day';

-- Seq Scan on vehicle_log  (rows=1200 actual rows=1180) (actual time=0.02..842.1)
--   Filter: ...   Rows Removed by Filter: 9,800,000      ← index missing
-- Index index ke baad:
-- Index Scan using idx_vehicle_date ... (actual time=0.03..1.9)
```

> EXPLAIN = plan. EXPLAIN ANALYZE = plan + sach mein chala ke asli time.

## Transactions
? Transaction kya hai? SQL mein kaise likhte ho?
**Transaction** kai SQL operations ka ek group hai jo **ek unit** ki tarah chalta hai — ya to **saare** successful (COMMIT), ya **koi nahi** (ROLLBACK). Beech mein kuch fail hua to database pehle wali state mein wapas.

Classic example: bank transfer. Account A se 100 kato, account B mein 100 jodo. Agar pehla hua aur doosra fail — paisa gayab. Transaction dono ko jod deta hai.

Syntax: `BEGIN` → operations → `COMMIT` (ya error pe `ROLLBACK`). `SAVEPOINT` se transaction ke andar partial rollback. .NET mein EF Core ka `SaveChanges` apne aap transaction use karta hai; kai operations ke liye `BeginTransactionAsync`.

**Achhi practice**: transactions **chhote** rakho. Lambi transaction locks pakde rakhti hai (doosri queries wait karti hain) aur PostgreSQL mein VACUUM ko dead rows saaf karne se rokti hai (table bloat). Transaction ke andar kabhi HTTP call ya user input ka wait mat karo.

```sql
BEGIN;
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;                      -- dono ek saath permanent
-- kuch galat hua to: ROLLBACK;
```

```csharp
await using var tx = await db.Database.BeginTransactionAsync();
try
{
    // ... kai SaveChanges / raw SQL
    await tx.CommitAsync();
}
catch { await tx.RollbackAsync(); throw; }
```

> Stored proc mein 10 dependent insert ho to poora block transaction mein daalo.

## Atomicity
? Atomicity kya hai? Example do.
**Atomicity** (ACID ka A): transaction **"all or nothing"** hai. Uske andar ke saare operations ek atom ki tarah hain — aadha kaam kabhi save nahi hoga. Power cut ho, query error aaye, constraint toote — transaction poora rollback.

PostgreSQL ise **WAL (Write-Ahead Log)** aur MVCC se implement karta hai: changes pehle log mein likhe jaate hain; commit record likhne se pehle crash hua to wo changes kabhi dikhenge hi nahi.

PostgreSQL ki ek khaas baat: transaction ke andar **ek bhi statement fail** hua to poori transaction "aborted" state mein chali jaati hai — aage ki har query error degi jab tak `ROLLBACK` na karo (ya `SAVEPOINT` use na karo).

```sql
BEGIN;
INSERT INTO orders (id, amount) VALUES (1, 500);
INSERT INTO orders (id, amount) VALUES (1, 700);   -- duplicate key — fail
COMMIT;                                             -- asal mein ROLLBACK hoga — pehla insert bhi gaya
```

> Paisa A se kata aur B mein nahi pahuncha = Atomicity toot gayi.

## Consistency
? Consistency (ACID ka C) kya hai?
**Consistency** (ACID ka C): transaction database ko **ek valid state se doosri valid state** mein le jaata hai. Saare rules — PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL constraints — transaction ke baad bhi sach rehne chahiye. Koi rule toota to transaction reject.

Jaise rule "balance kabhi negative nahi" (`CHECK (balance >= 0)`) — agar transfer ke baad balance -50 hota, to poori transaction fail. Database kabhi aisi state commit nahi karega jo uske constraints todti ho.

Dhyan: ye sirf **database ke rules** ki guarantee hai. Business logic ki consistency (jaise "order total = items ka sum") tabhi guaranteed hai jab tum use constraint/trigger se enforce karo ya application sahi likho.

```sql
ALTER TABLE account ADD CONSTRAINT chk_balance CHECK (balance >= 0);

BEGIN;
UPDATE account SET balance = balance - 1000 WHERE id = 1;   -- balance 200 tha
-- ERROR: violates check constraint "chk_balance" → transaction fail, data valid raha
```

## Isolation
? Isolation kya hai? Isolation levels kaunse hain?
**Isolation** (ACID ka I): ek saath chal rahi transactions **ek doosre ke beech ke adhoore kaam ko galat tareeke se na dekhein**. Har transaction aisa behave kare jaise wo akeli chal rahi ho — kitna strictly, ye **isolation level** decide karta hai.

Problems jo isolation rokti hai: **Dirty read** (doosri transaction ka uncommitted data padhna), **Non-repeatable read** (ek hi row do baar padhi, beech mein kisi ne badal di), **Phantom read** (same query do baar chalayi, beech mein nayi rows aa gayi), **Lost update** (do log ek saath padh ke update karein, ek ka change mit jaaye).

PostgreSQL ka default **Read Committed** hai: har statement sirf committed data dekhta hai. Dirty reads PostgreSQL mein kabhi nahi hote. **Repeatable Read** mein poori transaction ek snapshot dekhti hai. **Serializable** sabse strict hai — conflict ho to ek transaction serialization error ke saath fail hoti hai aur use retry karna padta hai. Zyada isolation = zyada safety, par kam concurrency.

**Lost update** ka aam fix: `SELECT ... FOR UPDATE` (row lock), atomic update (`SET stock = stock - 1`), ya optimistic concurrency (version column).

| Level | Dirty read | Non-repeatable | Phantom |
|---|---|---|---|
| Read Committed (PG default) | Nahi | Ho sakta hai | Ho sakta hai |
| Repeatable Read | Nahi | Nahi | Nahi (PG mein) |
| Serializable | Nahi | Nahi | Nahi + koi anomaly nahi |

```sql
-- Lost update se bachao: atomic update
UPDATE product SET stock = stock - 1 WHERE id = 5 AND stock > 0;

-- Ya row lock
BEGIN;
SELECT stock FROM product WHERE id = 5 FOR UPDATE;   -- doosre wait karenge
UPDATE product SET stock = stock - 1 WHERE id = 5;
COMMIT;
```

## Durability
? Durability kya hai?
**Durability** (ACID ka D): ek baar transaction **COMMIT ho gaya, to wo data permanent hai** — turant baad server crash ho, power jaaye, OS restart ho, phir bhi data bachega.

PostgreSQL ise **WAL (Write-Ahead Log)** se karta hai: commit ke waqt pehle change WAL file mein likha jaata hai aur disk pe **fsync** (sach mein disk tak flush) hota hai, tabhi client ko "COMMIT successful" milta hai. Asli table files baad mein (checkpoint pe) update hoti hain. Crash ke baad restart pe PostgreSQL WAL replay karke saara committed data wapas le aata hai. Replication aur point-in-time recovery bhi isi WAL se hoti hai.

`synchronous_commit = off` performance badhata hai par crash pe aakhri kuch milliseconds ke commits kho sakte hain — durability ka trade-off.

| Letter | Matlab | Example |
|---|---|---|
| A — Atomicity | Sab ya kuch nahi | Transfer ke dono steps saath |
| C — Consistency | Rules kabhi na tootein | Balance negative na ho |
| I — Isolation | Parallel transactions ek doosre ko na bigaadein | Do log ek saath last seat na book karein |
| D — Durability | Commit = permanent | Crash ke baad bhi payment record bacha |

## Delete
? DELETE command kya karta hai? Isko rollback kar sakte hain?
**DELETE** table se **specific rows** hatata hai — `WHERE` condition ke saath (bina WHERE ke saari rows). Ye **DML** command hai: transaction mein hota hai, **ROLLBACK** ho sakta hai, har row ke liye triggers chalte hain, aur foreign key rules (CASCADE/RESTRICT) check hote hain.

Bade tables pe slow ho sakta hai kyunki har row alag se process hoti hai, aur PostgreSQL mein row **turant physically nahi hat-ti** — wo "dead tuple" ban jaati hai jise baad mein VACUUM saaf karta hai (isliye disk space turant kam nahi hota).

Lakhon rows delete karni ho to ek baar mein mat karo — lamba lock aur bada WAL. **Batches** mein delete karo, ya purana data partition mein ho to poora partition drop karo. Aur hamesha pehle `SELECT COUNT(*)` usi `WHERE` ke saath chala ke dekho kitni rows jaayengi.

```sql
DELETE FROM sessions WHERE expires_at < now();
DELETE FROM orders WHERE id = 42 RETURNING *;          -- jo hata wo dikhao

-- Batch delete
DELETE FROM logs WHERE id IN (
    SELECT id FROM logs WHERE created_at < now() - interval '90 days' LIMIT 10000
);
```

! `DELETE FROM users;` — WHERE bhool gaye to saari rows gayi. Transaction mein chalao, pehle SELECT se check karo.

## Truncate
? TRUNCATE kya hai aur DELETE se kaise alag hai?
**TRUNCATE** table ki **saari rows ek jhatke mein** hata deta hai — table ko khaali kar deta hai, par **table ka structure** (columns, indexes, constraints) bacha rehta hai.

DELETE se bahut **tez** hai kyunki row-by-row kaam nahi karta — seedha table ki data files chhod ke nayi khaali file bana deta hai, aur disk space **turant** wapas milta hai. `WHERE` nahi laga sakta. Row-level triggers nahi chalte. `RESTART IDENTITY` se auto-increment counter bhi reset.

PostgreSQL mein TRUNCATE **transactional hai** — `BEGIN; TRUNCATE ...; ROLLBACK;` kaam karta hai (kai doosre databases mein nahi). Par ye table pe **ACCESS EXCLUSIVE lock** leta hai — us dauraan koi padh bhi nahi sakta. Agar doosri table foreign key se refer karti hai, to `CASCADE` chahiye (jo unhe bhi khaali kar dega — khatarnak).

```sql
TRUNCATE TABLE staging_import;
TRUNCATE TABLE audit_log RESTART IDENTITY;
TRUNCATE TABLE customers CASCADE;        -- orders bhi khaali! sochke
```

## Drop
? DROP, TRUNCATE aur DELETE mein farak kya hai?
**DROP** poore **object ko hi hata** deta hai — table ka data, structure, indexes, constraints, triggers — sab. `DROP TABLE`, `DROP INDEX`, `DROP VIEW`, `DROP DATABASE`. Ye **DDL** command hai.

PostgreSQL mein ye bhi transaction ke andar rollback ho sakta hai, par commit ke baad data sirf **backup** se wapas aayega. Agar doosre objects (views, foreign keys) is table pe depend karte hain to DROP fail hoga; `CASCADE` unhe bhi hata dega. Scripts mein `DROP TABLE IF EXISTS` taaki error na aaye.

| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Kya hatata hai | Chuni hui rows | Saari rows | Poori table |
| WHERE | Haan | Nahi | — |
| Structure | Bacha | Bacha | Gayab |
| Speed | Slow (row by row) | Bahut tez | Tez |
| Triggers | Chalte hain | Row triggers nahi | Nahi |
| Disk space | VACUUM ke baad reuse | Turant wapas | Turant wapas |
| Type | DML | DDL | DDL |
| Rollback (PostgreSQL) | Haan | Haan | Haan (commit se pehle) |

```sql
DROP TABLE IF EXISTS temp_report;
DROP INDEX CONCURRENTLY IF EXISTS idx_old;
```

> DELETE = kuch rows. TRUNCATE = saari rows, dabba bacha. DROP = dabba hi gaya.

## PostgreSQL MVCC / VACUUM
? PostgreSQL mein MVCC kya hai aur VACUUM kyun zaroori hai?
**MVCC (Multi-Version Concurrency Control)** PostgreSQL ka tareeka hai ek saath kai transactions chalane ka **bina readers aur writers ko ek doosre ke liye block kiye**. Jab tum row UPDATE karte ho, PostgreSQL purani row ko badalta nahi — **nayi version (tuple) banata hai** aur purani ko "dead" mark karta hai. DELETE bhi row ko hatata nahi, sirf dead mark karta hai. Har transaction apne snapshot ke hisaab se sahi version dekhta hai. Isliye "readers don't block writers, writers don't block readers".

Iski keemat: **dead tuples** jama hote jaate hain. Yahi wajah hai ki DELETE ke baad disk space kam nahi hota, aur baar-baar update hone wali table phool jaati hai (**bloat**) — scans slow ho jaate hain.

**VACUUM** dead tuples dhoondh ke unki jagah **reusable** bana deta hai (nayi rows wahan aa sakti hain), statistics update karta hai (`VACUUM ANALYZE`), aur transaction ID wraparound se bachata hai. Ye table lock nahi karta. **Autovacuum** background mein ye apne aap karta hai — ise band mat karo. **VACUUM FULL** table ko poora rewrite karke **OS ko disk wapas deta hai**, par **exclusive lock** leta hai (table us dauraan use nahi ho sakti) — production mein planned downtime mein, ya `pg_repack` jaise tool se bina lock.

Lambi chalti (ya "idle in transaction") transactions VACUUM ko dead tuples saaf karne se rokti hain — bloat ka bada kaaran.

```sql
DELETE FROM logs WHERE created_at < '2026-01-01';   -- disk size same rahega
VACUUM (VERBOSE, ANALYZE) logs;                       -- space reusable, stats update
SELECT relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;   -- sabse zyada dead rows
VACUUM FULL logs;                                      -- OS ko space wapas, par table LOCK
```

```text
UPDATE row  →  nayi version + purani "dead"
DELETE row  →  "dead" mark
VACUUM      →  dead jagah reusable (file size same)
VACUUM FULL →  table rewrite, file chhoti (exclusive lock)
```

> Isliye DELETE ke baad disk kam nahi hoti. VACUUM FULL OS ko jagah wapas deta hai par table lock karta hai.

## 2nd Highest Salary
? Employee table se 2nd highest salary nikaalne ki query likho.
Classic interview SQL. Teen tareeke, aur interviewer aksar **duplicates** aur **Nth** wala follow-up poochta hai.

**Tareeka 1 — Subquery**: jo salary sabse badi se kam hai, unme sabse badi. Duplicate highest salaries ho to bhi sahi chalta hai. Koi 2nd salary na ho to NULL.

**Tareeka 2 — DISTINCT + OFFSET**: distinct salaries ko descending sort karo, ek skip karo, ek lo. Nth ke liye `OFFSET n-1`.

**Tareeka 3 — DENSE_RANK()** (sabse flexible): har salary ko rank do; same salary = same rank, aur ranks mein gap nahi. Nth highest, per department Nth highest — sab isi se. `RANK()` ties ke baad gap chhodta hai (1,1,3), `DENSE_RANK()` nahi (1,1,2), `ROW_NUMBER()` ties ko bhi alag number deta hai (1,2,3).

```sql
-- 1. Subquery
SELECT MAX(salary) FROM employee
WHERE salary < (SELECT MAX(salary) FROM employee);

-- 2. DISTINCT + OFFSET (Nth: OFFSET N-1)
SELECT DISTINCT salary FROM employee
ORDER BY salary DESC
OFFSET 1 LIMIT 1;

-- 3. DENSE_RANK — employee details bhi, ties ke saath
SELECT name, salary FROM (
    SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employee
) t WHERE rnk = 2;

-- Har department ka 2nd highest
SELECT * FROM (
    SELECT department_id, name, salary,
           DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
    FROM employee
) t WHERE rnk = 2;
```

! `ORDER BY salary DESC LIMIT 1 OFFSET 1` bina DISTINCT ke — agar do log highest salary pe hain to "2nd highest" bhi wahi highest aa jaayegi.

## Duplicate Records
? Table mein duplicate records kaise dhoondhoge?
Duplicate dhoondhne ka standard tareeka: jin columns se duplicate decide hota hai, unpe `GROUP BY` karo aur `HAVING COUNT(*) > 1` se sirf wo groups rakho jinme ek se zyada rows hain.

Kai columns milkar duplicate bante hain to sabko GROUP BY mein daalo (jaise `first_name, last_name, dob`). Kaunsi-kaunsi rows duplicate hain (ids ke saath) dekhni ho to `STRING_AGG`/`ARRAY_AGG` ya window function `COUNT(*) OVER (PARTITION BY ...)`.

Case/space ka farak ho sakta hai (`A@x.com` vs `a@x.com `) — `lower(trim(email))` pe group karo. Duplicates saaf karne ke baad **UNIQUE constraint** lagao taaki phir na aayein.

```sql
-- Kaunse emails duplicate hain
SELECT email, COUNT(*) AS cnt
FROM employee
GROUP BY email
HAVING COUNT(*) > 1;

-- Ids ke saath
SELECT lower(trim(email)) AS email, COUNT(*), ARRAY_AGG(id ORDER BY id) AS ids
FROM employee
GROUP BY lower(trim(email))
HAVING COUNT(*) > 1;

-- Har duplicate row poori dikhao
SELECT * FROM (
    SELECT *, COUNT(*) OVER (PARTITION BY email) AS cnt FROM employee
) t WHERE cnt > 1;
```

## Department Employee Count
? Har department mein kitne employees hain — query likho.
Har department mein kitne employees hain — `GROUP BY department_id` aur `COUNT(*)`.

Follow-ups jo aksar aate hain: (1) **Department ka naam** chahiye → department table se JOIN. (2) **Zero employees wale departments bhi** dikhne chahiye → department table se **LEFT JOIN** karo aur `COUNT(e.id)` (na ki `COUNT(*)`) — kyunki `COUNT(*)` NULL wali row ko bhi 1 ginega, jabki `COUNT(e.id)` NULL ko skip karke 0 dega. (3) Sirf bade departments → `HAVING`.

```sql
-- Basic
SELECT department_id, COUNT(*) AS emp_count
FROM employee
GROUP BY department_id;

-- Naam ke saath, zero wale bhi
SELECT d.name, COUNT(e.id) AS emp_count
FROM department d
LEFT JOIN employee e ON e.department_id = d.id
GROUP BY d.id, d.name
ORDER BY emp_count DESC;
```

! LEFT JOIN ke saath `COUNT(*)` — khaali department ko 0 ki jagah 1 dikhayega.

## Department Highest Salary
? Har department ki highest salary aur us employee ka naam nikaalo.
Har department ki **highest salary** — `GROUP BY` + `MAX()`. Par asli follow-up hota hai: "**us employee ka naam bhi batao** jiski salary sabse zyada hai" — aur wahan simple GROUP BY kaam nahi karta, kyunki GROUP BY mein `name` daaloge to har employee alag group ban jaayega.

Solutions: **window function** (`RANK()`/`DENSE_RANK()` with `PARTITION BY department`) — ties ho to sab dikhayega; ya **JOIN with subquery** (department + max salary pe join); ya PostgreSQL ka `DISTINCT ON` (har department ki pehli row, ek hi employee).

```sql
-- Sirf salary
SELECT department_id, MAX(salary) AS max_salary
FROM employee GROUP BY department_id;

-- Employee ke naam ke saath (ties bhi)
SELECT department_id, name, salary FROM (
    SELECT department_id, name, salary,
           RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
    FROM employee
) t WHERE rnk = 1;

-- PostgreSQL: har dept ka ek top employee
SELECT DISTINCT ON (department_id) department_id, name, salary
FROM employee
ORDER BY department_id, salary DESC;
```

## Last 5 Days
? Pichhle 5 din ke records nikaalne ki query likho.
Pichhle 5 din ka data: `created_at >= CURRENT_DATE - INTERVAL '5 days'`.

Samajhne wali baat: **"5 din" ka matlab kya hai?** `CURRENT_DATE - 5 days` aaj ki **midnight** se 5 din peeche se shuru hota hai (poore calendar days). `now() - INTERVAL '5 days'` abhi ke **time** se theek 120 ghante peeche. Requirement ke hisaab se chuno.

**Performance trap**: column pe function mat lagao — `WHERE DATE(created_at) >= ...` ya `created_at::date` likhne se `created_at` ka index use nahi hoga. Hamesha column ko bina chhede compare karo. **Timezone**: `timestamptz` column aur server timezone ka dhyan rakho — IST vs UTC mein din ki boundary 5.5 ghante khisak jaati hai.

```sql
-- Aaj ki midnight se 5 din peeche (index use hoga)
SELECT * FROM vehicle_log
WHERE created_at >= CURRENT_DATE - INTERVAL '5 days';

-- Abhi se theek 5x24 ghante
SELECT * FROM vehicle_log WHERE created_at >= now() - INTERVAL '5 days';

-- Pichhle 5 poore din, aaj ko chhod ke
SELECT * FROM vehicle_log
WHERE created_at >= CURRENT_DATE - INTERVAL '5 days'
  AND created_at <  CURRENT_DATE;

-- GALAT (index use nahi hoga):
-- WHERE DATE(created_at) >= CURRENT_DATE - 5
```

## Find NULL
? Kisi column mein NULL wali rows kaise nikaaloge? `= NULL` kyun nahi chalta?
NULL dhoondhne ke liye **`IS NULL`** (aur ulta `IS NOT NULL`). `= NULL` kabhi kaam nahi karta.

Kyun? SQL mein NULL ka matlab "value pata nahi". "Pata nahi" kisi bhi cheez ke barabar hai ya nahi — ye bhi pata nahi. Isliye `manager_id = NULL` ka result TRUE nahi, balki NULL hota hai, aur WHERE sirf TRUE wali rows rakhta hai — result khaali.

Related tools: `COALESCE(col, 'default')` — NULL ho to default value. `NULLIF(a, b)` — a aur b barabar ho to NULL (divide by zero se bachne ke liye `x / NULLIF(y, 0)`). `IS DISTINCT FROM` — NULL-safe comparison (NULL vs NULL = barabar). `NOT IN (subquery)` mein ek bhi NULL ho to kuch nahi milega — `NOT EXISTS` use karo.

```sql
SELECT * FROM employee WHERE manager_id IS NULL;        -- sahi
SELECT * FROM employee WHERE manager_id = NULL;         -- hamesha khaali!

SELECT name, COALESCE(phone, 'N/A') FROM employee;
SELECT total / NULLIF(count, 0) FROM stats;             -- divide by zero nahi
SELECT * FROM a WHERE a.x IS DISTINCT FROM a.y;         -- NULL-safe "not equal"
```

! `WHERE col = NULL` — sabse common SQL galti. Hamesha `IS NULL`.

## Duplicate rows with ROW_NUMBER
? `ROW_NUMBER()` se duplicate rows kaise delete karoge, ek copy rakh ke?
`ROW_NUMBER()` window function har **partition (group)** ke andar rows ko 1, 2, 3… number deta hai. Duplicates ke liye: jin columns se duplicate bante hain unpe `PARTITION BY`, aur `ORDER BY` se decide karo kaunsi row "rakhni" hai (jaise sabse purani id). Phir `rn > 1` wali rows **duplicates** hain — inhe dekh ya delete kar sakte ho, aur har group ki ek row bachi rehti hai.

`GROUP BY + HAVING` sirf batata hai ki kaunse **values** duplicate hain; `ROW_NUMBER` batata hai kaunsi **exact rows** extra hain — delete ke liye yahi chahiye.

Delete karne se pehle hamesha SELECT se dekho, aur transaction mein karo. Baad mein UNIQUE constraint lagao.

```sql
-- Duplicates dekho (har email ki sabse purani row rn = 1)
SELECT * FROM (
    SELECT id, email,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM employee
) t WHERE rn > 1;

-- Delete (sirf extra copies)
BEGIN;
DELETE FROM employee
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
        FROM employee
    ) t WHERE rn > 1
);
-- check karo, phir
COMMIT;

ALTER TABLE employee ADD CONSTRAINT uq_employee_email UNIQUE (email);
```

## Acid
? ACID properties kya hain? Har ek ka example do.
**ACID** chaar properties hain jo database transaction ko **bharosemand** banati hain — khaas kar paisa, orders, inventory jaise critical data ke liye.

**A — Atomicity**: sab ya kuch nahi. Transfer mein kato aur jodo — dono honge ya koi nahi. **C — Consistency**: transaction ke baad saare rules (constraints) sach rahein — balance negative nahi, foreign key toote nahi. **I — Isolation**: ek saath chal rahi transactions ek doosre ke adhoore kaam ko galat na dekhein — do log ek saath aakhri seat book na kar sakein. **D — Durability**: commit ho gaya to permanent — crash ke baad bhi.

PostgreSQL poori tarah ACID compliant hai: Atomicity aur Durability WAL se, Isolation MVCC aur isolation levels se, Consistency constraints se. Interview mein har letter ke saath ek real example do — definition akele kamzor lagti hai. Distributed systems (microservices) mein ek transaction kai databases pe nahi chal sakta — wahan **Saga pattern** aur **eventual consistency** aate hain.

```sql
BEGIN;
UPDATE account SET balance = balance - 500 WHERE id = 1;   -- A: dono ya koi nahi
UPDATE account SET balance = balance + 500 WHERE id = 2;   -- C: CHECK (balance >= 0)
COMMIT;                                                     -- D: ab permanent
-- I: is dauraan koi doosri transaction adha transfer nahi dekhegi
```

> Paisa transfer: A se kata aur B mein nahi pahuncha — Atomicity toot gayi.
