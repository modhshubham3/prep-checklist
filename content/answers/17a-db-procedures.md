# Database — functions, procedures, triggers aur cursors

## Function vs stored procedure — PostgreSQL mein farak
? PostgreSQL mein function aur stored procedure mein kya farak hai, aur transaction COMMIT kaunse ke andar kar sakte ho?
**Ek line:** **function** value/table **lautata** hai aur `SELECT` ke andar chal sakta hai; **procedure** (PostgreSQL 11+) kuch lautane ke liye nahi, **kaam karne** ke liye hai, `CALL` se chalta hai — aur uske andar **COMMIT/ROLLBACK** kar sakte ho.

| | Function | Procedure |
| --- | --- | --- |
| Kaise chalate | `SELECT fn(...)` / `FROM fn(...)` | `CALL proc(...)` |
| Value lautata | ✅ `RETURNS int / TABLE / SETOF / refcursor` | ❌ (sirf `INOUT` / `OUT` params) |
| Query ke andar use | ✅ `WHERE`, `SELECT` mein | ❌ |
| Andar `COMMIT` / `ROLLBACK` | ❌ Caller ki transaction mein chalta hai | ✅ Batches mein commit kar sakte ho |
| Kab use | Calculation, report data, reusable query | Bulk job, migration, "10 kaam ek ke baad ek" |

**Aise socho:** function = **calculator** — number do, jawab lo, kahin bhi use karo. Procedure = **kaam karne wala mazdoor** — "ye 10 kaam karo", jawab nahi deta, par beech-beech mein kaam **save (commit)** kar sakta hai.

SQL Server mein bhi yahi farak: function `SELECT` mein chalti hai aur data change nahi kar sakti; stored procedure `EXEC` se chalti hai, DML aur transactions kar sakti hai.

```sql
-- Function: value lautata hai
CREATE OR REPLACE FUNCTION order_total(p_order_id int)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(qty * price), 0) FROM order_items WHERE order_id = p_order_id;
$$;
SELECT id, order_total(id) FROM orders WHERE customer_id = 7;     -- query ke andar

-- Procedure: kaam karta hai, beech mein COMMIT
CREATE OR REPLACE PROCEDURE archive_old_orders(p_days int)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < now() - make_interval(days => p_days);
  DELETE FROM orders WHERE created_at < now() - make_interval(days => p_days);
  COMMIT;                                                        -- procedure mein allowed
END $$;
CALL archive_old_orders(365);
```

! PostgreSQL 11 se pehle procedure hote hi nahi the — log "stored procedure" bolke **function** hi likhte the. Isliye purane projects mein `RETURNS void` wale functions dikhte hain jo asal mein procedure ka kaam kar rahe hain.

> Jawab chahiye → function. Kaam karwana hai (aur beech mein commit) → procedure.

## Refcursor kya hai — function se result set lautana aur .NET se padhna
? PostgreSQL function refcursor lautata hai — ye kya hota hai aur .NET (Npgsql) se isko kaise padhoge?
**Ek line:** **refcursor** ek **pointer (naam)** hai jo DB ke andar khule hue result set ki taraf ishara karta hai. Function data nahi, **cursor ka naam** lautata hai; caller phir us naam se `FETCH` karke rows padhta hai — **usi transaction ke andar**.

Kab dikhta hai: purane / Oracle se migrate hue systems mein, jahan ek procedure **kai result sets** lautata hai (orders + items + summary). Naye code mein aam taur pe `RETURNS TABLE(...)` / `SETOF` better hai — seedha `SELECT * FROM fn()`.

| | `RETURNS TABLE` / `SETOF` | `RETURNS refcursor` |
| --- | --- | --- |
| Caller kaise padhe | `SELECT * FROM fn()` | Transaction → fn call → `FETCH ALL IN "cursor_name"` |
| Transaction chahiye | ❌ | ✅ **Zaroori** — commit hote hi cursor band |
| Kai result sets | Ek | Kai cursors lauta sakta hai |
| .NET mein | Normal query | Transaction + do commands |

**Aise socho:** `RETURNS TABLE` = waiter **plate hi le aaya**. refcursor = waiter ne **token number** diya — "counter pe jaake ye number bolo, khana milega" — aur counter tabhi tak khula hai jab tak tum restaurant (transaction) mein ho.

```sql
CREATE OR REPLACE FUNCTION get_customer_orders(p_cust int)
RETURNS refcursor LANGUAGE plpgsql AS $$
DECLARE c refcursor := 'orders_cur';
BEGIN
  OPEN c FOR SELECT id, total, status FROM orders WHERE customer_id = p_cust ORDER BY id;
  RETURN c;                           -- data nahi, cursor ka naam lautaya
END $$;

-- psql mein
BEGIN;
SELECT get_customer_orders(7);        -- 'orders_cur'
FETCH ALL IN "orders_cur";
COMMIT;
```

```csharp
// Npgsql — transaction ke bina cursor turant band ho jaata hai
await using var conn = new NpgsqlConnection(cs);
await conn.OpenAsync();
await using var tx = await conn.BeginTransactionAsync();

await using var call = new NpgsqlCommand("SELECT get_customer_orders(@c)", conn, tx);
call.Parameters.AddWithValue("c", 7);
var cursorName = (string)(await call.ExecuteScalarAsync())!;

await using var fetch = new NpgsqlCommand($"FETCH ALL IN \"{cursorName}\"", conn, tx);
await using var reader = await fetch.ExecuteReaderAsync();
while (await reader.ReadAsync())
    Console.WriteLine($"{reader.GetInt32(0)} {reader.GetDecimal(1)}");

await tx.CommitAsync();
```

! Bina transaction ke call kiya to error: `cursor "orders_cur" does not exist` — auto-commit hote hi cursor band ho chuka tha.

> refcursor = token number. Transaction ke andar hi FETCH karo.

## Stored procedure / function ke andar exception handling
? PL/pgSQL function mein error aaye to kaise pakdoge, apna error kaise phenkoge, aur transaction ka kya hoga?
**Ek line:** PL/pgSQL mein `BEGIN ... EXCEPTION WHEN ... THEN ... END` block error pakadta hai; apna error **`RAISE EXCEPTION`** se phenkte ho. Exception block ke andar ka kaam **apne aap rollback** hota hai (andar ek savepoint jaisa lagta hai).

- **`RAISE EXCEPTION 'msg %', val USING ERRCODE = 'P0001'`** — apna error; caller (.NET) ko `PostgresException` milega.
- `RAISE NOTICE` / `RAISE WARNING` — sirf message, error nahi (debugging).
- **`WHEN unique_violation`**, `foreign_key_violation`, `division_by_zero`, `WHEN OTHERS` — specific error pakdo.
- **`SQLSTATE`, `SQLERRM`** — error code aur message; `GET STACKED DIAGNOSTICS` se detail.
- Pakad ke **`RAISE;`** — wahi error aage bhejo (C# ke `throw;` jaisa).
- Exception block **mehenga** hai (har baar savepoint banta hai) — har loop iteration mein mat lagao.

SQL Server mein: `BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH`, `ERROR_MESSAGE()`, `THROW`, aur catch mein `IF @@TRANCOUNT > 0 ROLLBACK`.

```sql
CREATE OR REPLACE FUNCTION transfer(p_from int, p_to int, p_amt numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_amt <= 0 THEN
    RAISE EXCEPTION 'Amount positive hona chahiye: %', p_amt USING ERRCODE = '22023';
  END IF;

  UPDATE accounts SET balance = balance - p_amt WHERE id = p_from AND balance >= p_amt;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % mein balance kam hai', p_from;
  END IF;
  UPDATE accounts SET balance = balance + p_amt WHERE id = p_to;

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Account exist nahi karta';
  WHEN OTHERS THEN
    INSERT INTO error_log(msg, code) VALUES (SQLERRM, SQLSTATE);   -- log (dhyan: ye bhi rollback hoga agar re-raise kiya)
    RAISE;                                                          -- wahi error aage
END $$;
```

```csharp
try { await db.Database.ExecuteSqlInterpolatedAsync($"SELECT transfer({from}, {to}, {amt})"); }
catch (PostgresException ex) when (ex.SqlState == "22023") { return BadRequest(ex.MessageText); }
```

! `WHEN OTHERS THEN NULL;` — error chupchaap nigal liya. Transaction aadha hua, kisi ko pata nahi. Hamesha log karo ya `RAISE;`.

> PL/pgSQL: EXCEPTION WHEN pakdo, RAISE EXCEPTION phenko, RAISE; aage bhejo. SQL Server: TRY/CATCH + THROW.

## Trigger kya hai — kab use karein aur kab nahi
? Har order update ka audit log rakhna hai — trigger se karoge ya application code se? Trigger ke nuksaan kya hain?
**Ek line:** **trigger** = table pe INSERT/UPDATE/DELETE hone pe **apne aap chalne wala function**. Koi bhi (app, script, DBA) data badle, trigger zaroor chalega — yahi uski taakat aur yahi uska khatra.

| Type | Kab chalta | Use |
| --- | --- | --- |
| `BEFORE` row | Row likhne se **pehle** — `NEW` badal sakte ho | `updated_at` set karna, validation |
| `AFTER` row | Row likhne ke **baad** | Audit log, doosri table update, `pg_notify` |
| Statement-level | Poori statement ke liye ek baar | Summary refresh |
| `INSTEAD OF` | Views pe | Updatable view |

**Use karo:** audit trail (kisne kab kya badla), `updated_at` timestamp, derived data sync, change notification (`NOTIFY`) — aisi cheezein jo **har haal mein** honi chahiye, chahe data kahin se bhi badle.

**Bacho:** business logic (order approve karna, email bhejna) trigger mein — **chhupa rehta hai** (code padhne wale ko dikhta nahi), debug/test mushkil, bulk update slow (har row pe chalega), trigger ke andar trigger (chain) ka jaal.

**Aise socho:** trigger = ghar ka **motion sensor light** — koi bhi guzre, light jalegi. Security ke liye badhiya. Par agar sensor se **geyser, TV, AC** bhi chalu karwa diye, to koi samajh nahi paayega ghar mein ye sab apne aap kyun ho raha hai.

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();          -- BEFORE trigger: row likhne se pehle badla
  RETURN NEW;
END $$;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION audit_orders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO orders_audit(order_id, old_status, new_status, changed_by, changed_at)
  VALUES (OLD.id, OLD.status, NEW.status, current_user, now());
  RETURN NULL;                      -- AFTER trigger: return value ignore hota hai
END $$;
CREATE TRIGGER trg_orders_audit AFTER UPDATE OF status ON orders
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION audit_orders();
```

> Trigger = motion sensor: audit/timestamp ke liye haan, business logic ke liye naa.

## .NET se stored procedure aur function call karna — EF Core, Dapper, ADO.NET
? EF Core se PostgreSQL function jo table lautata hai use kaise call karoge, aur procedure ko kaise?
**Ek line:** result lautane wale function ke liye **`FromSql`** (EF) ya `QueryAsync` (Dapper); kuch na lautane wale procedure ke liye **`ExecuteSql`** / `ExecuteAsync`. Parameters hamesha **parameterized** — string jodna nahi.

| Kaam | EF Core | Dapper |
| --- | --- | --- |
| Table lautane wala function → entities | `db.Orders.FromSql($"SELECT * FROM get_orders({id})")` | `conn.QueryAsync<Order>("SELECT * FROM get_orders(@id)", new { id })` |
| Scalar value | `db.Database.SqlQuery<decimal>($"SELECT order_total({id}) AS \"Value\"")` | `conn.ExecuteScalarAsync<decimal>(...)` |
| Procedure / koi return nahi | `db.Database.ExecuteSqlAsync($"CALL archive_old_orders({days})")` | `conn.ExecuteAsync("CALL archive_old_orders(@days)", new { days })` |
| Kai result sets | Seedha nahi — ADO.NET / Dapper | `QueryMultipleAsync` |

Dhyan:
- `FromSql` / `ExecuteSql` (interpolated) **safe** hain — `{id}` parameter ban jaata hai. **`FromSqlRaw` mein string concat** = SQL injection.
- `FromSql` ke baad bhi LINQ laga sakte ho (`.Where().OrderBy()`) — EF usko subquery bana deta hai (sirf composable SELECT pe).
- Function ke columns entity ke properties se match hone chahiye; na ho to keyless entity / DTO (`SqlQuery<T>` in EF 8+).
- SQL Server mein procedure: `EXEC dbo.GetOrders @Id = {id}` (FromSql pe compose nahi hota).

```csharp
// EF Core — table function → entities, upar se LINQ bhi
var orders = await db.Orders
    .FromSql($"SELECT * FROM get_orders_by_customer({customerId})")
    .Where(o => o.Status == "Paid")
    .AsNoTracking()
    .ToListAsync();

// EF Core — procedure
await db.Database.ExecuteSqlAsync($"CALL archive_old_orders({365})");

// Dapper — function
var total = await conn.ExecuteScalarAsync<decimal>("SELECT order_total(@id)", new { id = 42 });
```

! `FromSqlRaw("SELECT * FROM get_orders(" + id + ")")` — injection. Raw use karna ho to `FromSqlRaw("... get_orders({0})", id)` jaise placeholders ke saath.

> Result chahiye → FromSql / QueryAsync. Sirf kaam → ExecuteSql / CALL. String kabhi mat jodo.

## Cursor kya hai aur set-based query kyun better hai
? Ek lakh rows ka discount update cursor se loop karke karoge ya ek UPDATE se? Kyun?
**Ek line:** **cursor** result set ko **ek-ek row** karke process karta hai (loop). Database **set-based** (ek statement mein saari rows) kaam ke liye bana hai — cursor usse **10–100x slow** ho sakta hai.

| | Cursor / loop | Set-based |
| --- | --- | --- |
| Kaise | `FOR row IN SELECT ... LOOP UPDATE ...` | Ek `UPDATE ... FROM ... WHERE` |
| Speed | Har row pe alag statement — slow | Ek plan, optimizer ka poora fayda |
| Locks | Lambe | Chhote |
| Kab theek | Har row pe alag complex logic / external call, bahut bada batch tod ke commit | Almost hamesha |

**Aise socho:** 1000 chitthiyan post karni hain — cursor = **ek-ek chitthi** ke liye post office jaao. Set-based = saari ek **bore mein** daal ke ek baar jaao.

Refcursor (upar wala card) alag cheez hai — wo result set **lautane** ka tareeka hai; ye cursor **loop** karne ka.

```sql
-- ❌ Row-by-row
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM products WHERE category = 'toys' LOOP
    UPDATE products SET price = price * 0.9 WHERE id = r.id;
  END LOOP;
END $$;

-- ✅ Set-based — ek statement
UPDATE products SET price = price * 0.9 WHERE category = 'toys';
```

> Loop likhne se pehle poochho: kya ye ek UPDATE/INSERT...SELECT se ho sakta hai? 95% baar haan.

## EF Core vs Dapper vs ADO.NET — kab kaunsa?
? Reporting dashboard ki complex SQL queries ke liye EF Core loge ya Dapper? Aur CRUD ke liye?
**Ek line:** **ADO.NET** = sabse neeche ka raw tareeka (connection, command, reader). **Dapper** = ADO.NET ke upar halka mapper — SQL tum likho, objects wo banaye. **EF Core** = poora ORM — LINQ, change tracking, migrations; SQL wo banata hai.

| | ADO.NET | Dapper | EF Core |
| --- | --- | --- | --- |
| SQL kaun likhta | Tum | Tum | EF (LINQ se) |
| Mapping | Khud (`reader.GetInt32`) | Automatic | Automatic |
| Speed | Sabse tez | ADO.NET jitna hi | Thoda slow (tracking, translation) |
| Change tracking / migrations | ❌ | ❌ | ✅ |
| Best for | Bahut special cases, bulk | Reports, complex SQL, procedures | CRUD, domain logic, rapid dev |

**Aise socho:** ADO.NET = khud **engine** se gaadi chalana. Dapper = **manual car** — tum gear badlo, par gaadi aaram se chale. EF Core = **automatic car** — bas gas-brake, baaki wo sambhale; kabhi-kabhi wo galat gear (bekaar SQL) bhi laga deta hai.

Real projects mein aksar **dono**: EF Core likhne (CRUD, transactions) ke liye, Dapper padhne wali heavy reports ke liye — same connection string.

```csharp
// ADO.NET
using var cmd = new NpgsqlCommand("SELECT id, name FROM users WHERE city = @c", conn);
cmd.Parameters.AddWithValue("c", "Pune");
using var r = await cmd.ExecuteReaderAsync();
while (await r.ReadAsync()) list.Add(new User { Id = r.GetInt32(0), Name = r.GetString(1) });

// Dapper
var users = await conn.QueryAsync<User>("SELECT id, name FROM users WHERE city = @city", new { city = "Pune" });

// EF Core
var users2 = await db.Users.Where(u => u.City == "Pune").Select(u => new { u.Id, u.Name }).ToListAsync();
```

> CRUD + domain → EF Core. Heavy reports / procedures → Dapper. ADO.NET → sirf jab dono kam pad jaayein.
