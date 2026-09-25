# Resume deep-dive — Kafka

## Kafka ke building blocks — Producer, Broker, Topic, Partition, Offset, Consumer
**Kafka** ek distributed **event streaming platform** hai — ek bahut tez, durable, append-only log jismein producers events likhte hain aur consumers apni speed se padhte hain. Message padhne ke baad delete nahi hota (queue ki tarah); wo retention period tak log mein rehta hai.

- **Producer** — events likhne wala (jaise GPS packet parser jo har location update Kafka mein daalta hai).
- **Broker** — ek Kafka server. Kai brokers milke **cluster** banate hain; data brokers mein baanta aur replicate hota hai.
- **Topic** — events ki ek named category (`vehicle-locations`, `trip-events`). Database table jaisa socho.
- **Partition** — topic ke tukde. Har partition ek **ordered, append-only log** hai. Partitions hi Kafka ka **parallelism** hain — alag partitions alag brokers pe, alag consumers padh sakte hain. **Ordering sirf ek partition ke andar guaranteed** hai, poore topic mein nahi.
- **Offset** — partition mein har message ka sequence number (0, 1, 2…). Consumer yaad rakhta hai ki usne kis offset tak padh liya (**committed offset**) — restart pe wahin se shuru.
- **Consumer / Consumer group** — padhne wale. Ek group ke consumers partitions aapas mein baant lete hain.
- **Replication** — har partition ki copies (replication factor, jaise 3) alag brokers pe; ek **leader** reads/writes sambhalta hai, followers copy rakhte hain. Broker gira to follower leader ban jaata hai.

```text
Topic: vehicle-locations (3 partitions)
  P0: [0][1][2][3][4] ...   ← vehicle A, D ke events (key se)
  P1: [0][1][2] ...         ← vehicle B, E
  P2: [0][1][2][3] ...      ← vehicle C
Producer → hash(key) % 3 → partition
Consumer group "processor": C1←P0, C2←P1, C3←P2
```

! "Kafka poore topic mein order guarantee karta hai" — nahi, sirf partition ke andar. Order chahiye to related events same partition mein bhejo (same key).

> Apne note mein likho: tumhare system mein kaunse topics the, kitne partitions, replication factor kya tha.

## Consumer group aur rebalancing
**Consumer group** ek logical consumer hai jiske kai instances hote hain. Kafka ek topic ke partitions group ke members mein **baant** deta hai — **har partition group ke andar exactly ek consumer ko** milta hai. Isse kaam parallel hota hai aur har message group mein ek hi baar process hota hai. Alag group (jaise "analytics") same topic ko apne aap poora independently padh sakta hai.

Isliye **consumers ki ginti ka faayda partitions ki ginti tak hi hai**: 6 partitions aur 8 consumers → 2 consumers khaali baithe rahenge. Scale karna hai to pehle partitions badhao.

**Rebalancing**: jab consumer group join/leave karta hai (naya instance aaya, koi crash hua, deploy hua, ya `max.poll.interval.ms` ke andar poll nahi kiya), Kafka partitions dobara baantta hai. Purane (eager) protocol mein rebalance ke dauraan **poora group ruk jaata hai** ("stop the world") — processing pause, lag badhta hai. Naye **cooperative (incremental) rebalancing** mein sirf jin partitions ko move hona hai wahi rukte hain. **Static membership** (`group.instance.id`) se restart pe bekaar rebalance nahi hota.

Common problem: ek message ka processing bahut lamba (slow DB call) → `max.poll.interval.ms` cross → Kafka consumer ko dead samajh ke nikaal deta hai → rebalance → wahi message doosre consumer ko → phir wahi. Fix: processing tez karo, `max.poll.records` kam karo, ya interval badhao.

```csharp
var config = new ConsumerConfig
{
    BootstrapServers = "kafka:9092",
    GroupId = "location-processor",           // same group = partitions share
    EnableAutoCommit = false,                  // offset khud commit karenge
    AutoOffsetReset = AutoOffsetReset.Earliest,
    PartitionAssignmentStrategy = PartitionAssignmentStrategy.CooperativeSticky
};
```

## Partition key kaise choose ki — ordering kaise mili?
Producer har message ke saath ek **key** de sakta hai. Kafka `hash(key) % partitions` se partition chunta hai — isliye **same key ke saare messages hamesha same partition mein** jaate hain, aur ek partition ke andar order guaranteed hai. Yani **per-key ordering** milti hai.

Vehicle tracking mein natural key **vehicle ID / device IMEI** hai: ek gaadi ke saare location updates order mein process honge (trip start → move → stop), jo zaroori hai — warna gaadi "peeche" jaati dikhegi ya galat stop detect hoga. Alag gaadiyan alag partitions mein parallel.

Key choose karte waqt dhyan:
- **Ordering kis level pe chahiye** — wahi key (vehicle, order id, user id).
- **Hot partition / skew** — agar kuch keys bahut zyada traffic bhejti hain, ek partition overload aur baaki khaali. Key mein kaafi unique values honi chahiye.
- **Partitions badhane se mapping badal jaati hai** — `hash % 3` aur `hash % 6` alag partition dete hain; beech ke waqt ordering toot sakti hai. Isliye shuru mein hi thode zyada partitions rakho.
- Bina key (null) ke messages sticky/round-robin se baant-te hain — koi ordering nahi.

Producer side pe ordering ke liye **idempotent producer** (`enable.idempotence=true`) — retry pe duplicate ya reorder nahi hota.

```csharp
await producer.ProduceAsync("vehicle-locations", new Message<string, string>
{
    Key = packet.Imei,                 // ek gaadi → ek partition → order bana rahe
    Value = JsonSerializer.Serialize(packet)
});
```

> Note mein likho: tumne kya key rakhi aur kyun; kitne partitions; koi hot-partition problem aayi?

## At-least-once vs at-most-once vs exactly-once
Ye batata hai ki failure pe message **kitni baar** process ho sakta hai — aur ye **offset kab commit** karte ho usse decide hota hai.

**At-most-once** — pehle offset commit, phir process. Processing ke beech crash hua to message **kho gaya** (dobara nahi aayega). Kabhi duplicate nahi. Use: jahan kuch data khona chalega (metrics, logs sampling).

**At-least-once** — pehle process, phir commit. Processing ke baad aur commit se pehle crash hua to restart pe message **dobara aayega**. Kabhi khota nahi, par **duplicates ho sakte hain**. **Ye sabse common default hai** — aur isliye consumers **idempotent** banane padte hain.

**Exactly-once** — Kafka **transactions** + idempotent producer + `isolation.level=read_committed` se, par ye guarantee **Kafka ke andar** (Kafka se padho → process → Kafka mein likho) poori tarah milti hai. Jab side effect bahar ho (database update, email, API call), to end-to-end exactly-once ke liye idempotency ya outbox jaisa pattern chahiye.

Interview answer: "Hum at-least-once use karte the — process ke baad manual commit — aur duplicates ko consumer side pe idempotency se handle karte the."

| | Commit kab | Crash pe | Duplicate? | Loss? |
|---|---|---|---|---|
| At-most-once | Process se pehle | Message kho gaya | Nahi | Ho sakta hai |
| At-least-once | Process ke baad | Dobara aayega | Ho sakta hai | Nahi |
| Exactly-once | Transaction | — | Nahi (Kafka ke andar) | Nahi |

```csharp
var result = consumer.Consume(ct);
await ProcessAsync(result.Message);   // pehle kaam
consumer.Commit(result);              // phir commit → at-least-once
```

## Duplicate processing kaise handle kiya (idempotency)?
At-least-once mein duplicate **aayenge hi** — rebalance, crash, retry. Isliye consumer **idempotent** hona chahiye: same message do baar process ho to result ek baar jaisa hi rahe.

Tareeke:
- **Unique message ID + dedup table**: har message ka unique id (producer deta hai, ya `topic-partition-offset`). Process karne se pehle check karo ki ye id already processed hai; DB mein **unique constraint** ke saath save karo — duplicate insert fail hoga aur skip. Processed-id insert aur business update **ek hi DB transaction** mein.
- **Natural idempotency / upsert**: operation ko aisa likho ki dobara chalana harmless ho — `INSERT ... ON CONFLICT DO NOTHING/UPDATE`, "last location = X" set karna (increment ki jagah).
- **Version / timestamp check**: purana event naye state ko overwrite na kare — `UPDATE ... WHERE event_time > last_event_time`. Out-of-order aur duplicate dono se bachata hai.

GPS example: same packet do baar aaya → `(imei, device_timestamp)` pe unique constraint → doosra insert ignore. "Vehicle ki latest position" update → `WHERE new_time > current_time` → purana/duplicate packet kuch nahi badlega.

```sql
INSERT INTO location_history (imei, device_time, lat, lng)
VALUES (@imei, @time, @lat, @lng)
ON CONFLICT (imei, device_time) DO NOTHING;          -- duplicate packet ignore

UPDATE vehicle_live SET lat = @lat, lng = @lng, last_time = @time
WHERE imei = @imei AND last_time < @time;             -- purana event naya overwrite na kare
```

! "Kafka exactly-once deta hai to duplicate nahi aayenge" — DB/API side effect ke saath ye guarantee nahi milti. Consumer idempotent banana padta hai.

## Consumer lag badhne pe kya karoge?
**Consumer lag** = partition ka latest offset − consumer ka committed offset. Yani **kitne messages pending** hain. Lag badh raha hai matlab consumers produce rate ke saath nahi chal pa rahe — live tracking data late dikhega.

Diagnose (andaze se nahi):
1. **Kaunse partitions** mein lag hai — sab mein (consumer slow) ya ek mein (hot partition / ek consumer atka).
2. **Consumer ka processing time** per message — kahan time ja raha hai? Zyada tar **downstream** (DB insert, API call) slow hota hai.
3. **Rebalance loops** — logs mein baar-baar rebalancing? (slow processing → max.poll.interval cross)
4. **Errors / poison message** — ek kharab message pe consumer baar-baar fail aur retry kar raha hai, aage hi nahi badh raha.
5. **Traffic spike** — produce rate achanak badha?

Fixes:
- **Scale out** — consumers badhao (partitions ki ginti tak); zaroorat ho to partitions badhao.
- **Processing tez** — DB mein **batch inserts** (ek-ek row ki jagah 500 ek saath, `COPY`), indexes, connection pool, slow external calls async/parallel.
- **Batch consume** — `max.poll.records` tune.
- **Poison message** — retry limit ke baad **dead-letter topic** mein bhejo aur aage badho.
- Monitoring: lag pe **alert** (Burrow, Kafka exporter + Grafana, `kafka-consumer-groups --describe`).

```bash
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group location-processor
# TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# vehicle-locations 0  1203400  1203450  50
# vehicle-locations 1   980000  1150000  170000   ← yahi atka hai
```

## Retention aur log compaction
Kafka messages consume hone ke baad delete nahi karta — **retention policy** tay karti hai kab hatenge:

**Time/size based retention** (`cleanup.policy=delete`) — `retention.ms` (jaise 7 din) ya `retention.bytes` cross hone pe purane **segments** (log files) delete. Isse consumer down ho ke wapas aaye to 7 din ka data abhi bhi padh sakta hai, aur naya consumer purana data **replay** kar sakta hai. Disk usage = produce rate × retention.

**Log compaction** (`cleanup.policy=compact`) — har **key ki sirf latest value** rakhta hai; purani values background mein hata di jaati hain. Topic ek "latest state" table jaisa ban jaata hai — jaise har vehicle ki last known config/status. Value `null` bhejo (**tombstone**) to wo key delete ho jaati hai. Kafka apne consumer offsets bhi compacted topic (`__consumer_offsets`) mein rakhta hai.

Dono combine bhi ho sakte hain (`compact,delete`).

| Delete (retention) | Compact |
|---|---|
| Time/size ke baad purana data gaya | Har key ki latest value hamesha |
| Event history ke liye | Current state / snapshot ke liye |
| Location stream, logs | Vehicle config, user profile |

## Kafka vs RabbitMQ — kab kya?
Dono message brokers hain par design alag hai:

**RabbitMQ** — traditional **message queue** (smart broker). Message consume + acknowledge hote hi **delete**. Flexible **routing** (exchanges: direct, topic, fanout, headers), per-message ack, priorities, delayed messages, request-reply. Task/job queues ke liye badhiya — "ye kaam kisi ek worker ko do". Throughput achha, par Kafka jitna nahi; replay nahi.

**Kafka** — **distributed log** (dumb broker, smart consumer). Messages retention tak rehte hain, **replay** possible, bahut **high throughput** (lakhon messages/sec), partition-level ordering, kai consumer groups same data independently padh sakte hain. Event streaming, high-volume telemetry (GPS!), event sourcing, analytics pipelines ke liye.

GPS/vehicle tracking jaisa lagataar, high-volume stream jise kai services (live map, alerts, history storage, analytics) alag-alag padhein — Kafka natural fit hai.

| Kafka | RabbitMQ |
|---|---|
| Distributed log | Message queue |
| Retention tak data rehta hai, replay | Ack ke baad delete |
| Bahut high throughput | Moderate throughput |
| Partition ke andar order | Queue ke andar order (single consumer) |
| Consumer offset khud track karta hai | Broker delivery track karta hai |
| Streaming, telemetry, event sourcing | Task queues, complex routing, RPC |

> Note mein likho: tumhare project ne Kafka kyun chuna (volume, replay, multiple consumers?).

# Resume deep-dive — Redis

## Redis ke data structures — string, hash, list, set, sorted set
**Redis** ek **in-memory** key-value store hai — data RAM mein, isliye reads/writes sub-millisecond. Par ye sirf "string cache" nahi, iske **data structures** hi iski taaqat hain, aur har ek ke atomic operations:

- **String** — simple value, counter (`INCR` atomic), serialized JSON cache. `SET key value EX 60`.
- **Hash** — ek key ke andar field-value pairs, object jaisa. Vehicle ka live status: `HSET vehicle:42 lat 19.07 lng 72.87 speed 40`. Poora object padhe bina ek field update/read.
- **List** — ordered list, dono taraf push/pop. Simple queue (`LPUSH`/`BRPOP`), last N events (`LPUSH` + `LTRIM`).
- **Set** — unique, unordered. Online devices ka set, tags, "kaunse vehicles route X pe hain". `SADD`, `SISMEMBER`, intersections.
- **Sorted Set (ZSET)** — har member ka ek score, score se sorted. Leaderboards, time-based data (score = timestamp), "last 5 min mein active vehicles" (`ZRANGEBYSCORE`), rate limiting windows.
- Aur: **Streams** (append-only log, consumer groups ke saath), **Geo** (`GEOADD`, `GEOSEARCH` — nearby vehicles), **Bitmaps**, **HyperLogLog** (approx unique count), **Pub/Sub**.

Har command **atomic** hai (Redis command execution single-threaded hai), isliye `INCR` pe race condition nahi hoti.

```text
SET   cache:routes:12 "<json>" EX 300          # string cache, 5 min TTL
HSET  vehicle:42 lat 19.07 lng 72.87 ts 1726900000
ZADD  active_vehicles 1726900000 42            # score = last seen
ZRANGEBYSCORE active_vehicles (now-300) +inf   # pichhle 5 min mein active
GEOADD vehicles:geo 72.87 19.07 42
GEOSEARCH vehicles:geo FROMLONLAT 72.87 19.07 BYRADIUS 2 km
```

> Note mein likho: tumne kaunsa structure kis kaam ke liye use kiya.

## Redis kyun, seedha database kyun nahi?
Interviewer check karta hai ki tumne Redis "fashion" ke liye lagaya ya asli wajah thi. Jawab **tumhare use case** ke hisaab se do:

**Speed** — Redis RAM se sub-millisecond deta hai; PostgreSQL disk + query planning + network ke saath milliseconds. Jo data **har second hazaaron baar** padha jaata hai (har vehicle ki latest position live map ke liye), use har baar DB se laana DB ko maar dega.

**DB ka load kam** — hot reads Redis se, DB sirf durable writes aur complex queries ke liye. Connections aur CPU bachte hain.

**Data structures** — "pichhle 5 min mein active vehicles" (sorted set), "nearby vehicles" (geo), atomic counters, rate limiting — ye Redis mein ek command hai, SQL mein bhaari query.

**Shared state across instances** — kai API/processor instances ek hi live state dekhein (in-memory cache har instance ka alag hota).

**Pub/Sub / Streams** — real-time updates baantna.

Aur honest part: **Redis source of truth nahi tha** — permanent data (history, trips) PostgreSQL mein, Redis mein sirf "latest / hot" state jo DB ya stream se dobara ban sakti hai. Isse Redis restart/crash se data loss ka darr nahi.

> Note mein likho: kaunsa data Redis mein tha, kaunsa DB mein, aur kitne reads/sec bache.

## Cache-aside vs write-through vs write-behind
Cache aur database ko sync rakhne ke teen patterns:

**Cache-aside (lazy loading)** — app pehle cache dekhti hai; miss pe DB se laati hai aur cache mein daalti hai. Write pe DB update karke cache **delete/invalidate**. Sabse common aur simple; cache mein sirf wahi jo maanga gaya. Nuksaan: pehli request (miss) slow; invalidation bhooli to stale data.

**Write-through** — har write **pehle cache mein, saath hi DB mein** (synchronously). Cache hamesha fresh; reads hamesha hit. Nuksaan: har write thoda slow (do jagah likhna), aur aisa data bhi cache mein jo kabhi padha nahi jaayega.

**Write-behind (write-back)** — write sirf **cache mein**, DB mein **baad mein async batch** mein. Writes bahut tez, DB pe load kam (batching). Nuksaan: cache crash ho gaya to jo abhi DB tak nahi pahuncha wo **kho gaya**; complexity zyada.

Live GPS jaisa case: latest position ko Redis mein likhna (write-through jaisa — har packet pe update) aur history DB mein batch mein (write-behind jaisa) — mix common hai.

| Pattern | Write path | Read | Risk |
|---|---|---|---|
| Cache-aside | DB, phir cache invalidate | Miss pe DB se bharo | Stale data, cold misses |
| Write-through | Cache + DB saath | Hamesha hit | Slow writes |
| Write-behind | Sirf cache, DB async | Hamesha hit | Crash pe data loss |

## TTL aur eviction policies (LRU, LFU)
**TTL (Time To Live)** — key pe expiry lagao (`SET key val EX 300` ya `EXPIRE`). Time khatam → key apne aap delete. Cache mein **hamesha TTL lagao** taaki stale data hamesha ke liye na rahe, aur invalidation bhool bhi jao to ek limit ke baad theek ho jaaye. Saari keys ka TTL same ho aur ek saath expire hon to **cache stampede** — isliye TTL mein thoda random jitter.

**Eviction** — jab Redis ki memory `maxmemory` limit tak bhar jaaye, to nayi writes ke liye kaunsi keys hataye, ye `maxmemory-policy` decide karti hai:
- `noeviction` — koi key nahi hatao, nayi writes pe **error** (default in many setups). Cache ke liye galat, data store ke liye sahi.
- `allkeys-lru` — **sabse kam haal mein use hui** key hatao (Least Recently Used). Cache ke liye common default.
- `allkeys-lfu` — **sabse kam baar use hui** hatao (Least Frequently Used). Jab kuch keys hamesha popular hon.
- `volatile-lru` / `volatile-lfu` / `volatile-ttl` — sirf un keys mein se hatao jin pe TTL laga hai (baaki safe).
- `allkeys-random`, `volatile-random`.

Redis ka LRU/LFU **approximate** hai (sampling se), exact nahi — memory bachane ke liye.

```text
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
SET route:12 "<json>" EX 3600
TTL route:12            # kitne second bache
```

## Cache invalidation strategy tumhare project mein kya thi?
Ye **tumhare project** ka sawaal hai — apna asli jawab note mein likh ke rakho. Answer ka structure aur common strategies:

**1. TTL-based** — sabse simple: data 5 min / 1 ghante baad khud expire. Thoda stale data chalega to kaafi hai (master data, route lists).

**2. Explicit invalidation on write** — data badla (admin ne route update kiya) to usi code path mein `DEL cache:key`. Agli read DB se fresh laayegi. Dhyan: DB update aur cache delete ke beech race — isliye "pehle DB update, phir cache delete", aur TTL backup ke roop mein.

**3. Write-through / overwrite** — naya data aate hi cache overwrite (live vehicle position har packet pe).

**4. Event-based** — DB change pe event (Kafka message, Postgres NOTIFY) aaye aur saare instances apna cache invalidate karein — jab kai services same data cache karti hain.

**5. Versioned keys** — `routes:v17`; data badla to version badha do, purani keys TTL se mar jaayengi.

Interview structure: "Live data (positions) har update pe overwrite hota tha, TTL ke saath taaki band gaadi ka stale data khud hat jaaye. Master data (routes, stops) cache-aside tha, 1 ghante TTL, aur admin update pe explicit delete."

! "Cache kabhi invalidate nahi karna padta" ya "TTL laga diya bas" — dono adhoore. Batao **stale data kitni der chalega** aur kyun.

## Pub/Sub vs Streams
Dono Redis mein messaging ke liye hain, par guarantees bilkul alag:

**Pub/Sub** — **fire-and-forget**. Publisher channel pe message bhejta hai, us waqt jo subscribers connected hain unhe milta hai. **Koi storage nahi** — subscriber offline tha to message **gaya**. Koi ack nahi, koi replay nahi. Bahut halka aur tez. Use: live notifications jahan ek-do miss chalega — jaise SignalR backplane, "cache invalidate karo" broadcast.

**Streams** (Redis 5+) — **append-only log** (Kafka jaisa, chhote scale pe). Messages store hote hain, har ek ka ID, **consumer groups**, **acknowledgement** (`XACK`), pending messages (`XPENDING`) — consumer crash hua to message dobara claim ho sakta hai. Use: jab message khona nahi chahiye aur Kafka bahut bhaari lagta hai — jobs, events.

| Pub/Sub | Streams |
|---|---|
| Store nahi hota | Log mein store |
| Offline subscriber ko nahi milta | Baad mein padh sakte ho |
| Ack nahi | Consumer groups + XACK |
| Real-time broadcast | Reliable queue / event log |

```text
PUBLISH vehicle-updates '{"id":42,"lat":19.07}'
SUBSCRIBE vehicle-updates

XADD events * type trip_end vehicle 42
XREADGROUP GROUP workers w1 COUNT 10 STREAMS events >
XACK events workers 1726900000000-0
```

## Persistence: RDB vs AOF
Redis in-memory hai, par disk pe data bacha ke rakh sakta hai taaki restart pe sab na jaaye:

**RDB (snapshot)** — har kuch minute (ya N writes ke baad) poore dataset ka **point-in-time snapshot** ek compact file mein (`dump.rdb`). Fork karke background mein likhta hai. Fayde: chhoti file, tez restart, backups ke liye achha. Nuksaan: crash pe **aakhri snapshot ke baad ka data kho jaata hai** (minutes ka).

**AOF (Append Only File)** — **har write command** ek log mein append. `appendfsync everysec` (default) pe zyada se zyada ~1 second ka data kho sakta hai; `always` pe har write fsync (slow). File badi hoti hai, background mein rewrite/compact hoti hai. Restart thoda slow (commands replay).

Production mein aksar **dono** (ya Redis 7 ka hybrid AOF with RDB preamble). Aur agar Redis sirf **cache** hai jo DB se dobara ban sakta hai, to persistence off bhi rakh sakte ho — restart pe cache khaali, warm-up ho jaayega.

| RDB | AOF |
|---|---|
| Periodic snapshot | Har write log |
| Crash pe minutes ka loss | ~1 second ka loss (everysec) |
| Chhoti file, tez restart | Badi file, slow restart |
| Backups ke liye | Durability ke liye |

## Redis kab galat choice hai?
Achha engineer tool ki limits bhi jaanta hai — interviewer yahi sunna chahta hai:

- **Primary / source-of-truth data** — Redis in-memory hai; persistence ke baad bhi crash pe kuch data khona possible hai. Paisa, orders, legal records → PostgreSQL.
- **Data RAM se bada** — Redis mein saara data memory mein rehna chahiye. 500 GB history Redis mein rakhna mehnga aur bekaar; wo DB/object storage ka kaam hai.
- **Complex queries / relations** — joins, ad-hoc filtering, aggregations, reporting → SQL database. Redis mein access pattern pehle se pata hona chahiye (key design).
- **Strong consistency / multi-key transactions** jaisa ACID chahiye → database. Redis `MULTI` transactions rollback nahi karte.
- **Reliable messaging** Pub/Sub se — message loss hota hai; Streams ya Kafka use karo.
- **Chhota app jahan in-memory cache kaafi hai** — ek instance hai to `IMemoryCache` se kaam chal jaata hai; Redis ek extra service hai jise chalana, monitor aur secure karna padta hai.

> Redis = tez, temporary, hot data. Durable aur queryable data = database.
