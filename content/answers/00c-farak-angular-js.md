# Farak samjho — Angular aur JavaScript

## Promise vs Observable
? Search box mein har keystroke pe results chahiye aur purani request cancel honi chahiye — Promise loge ya Observable?
**Ek line:** **Promise** = **ek** jawab, ek baar, turant shuru, cancel nahi. **Observable** = **kai** values ka stream, tab shuru jab koi subscribe kare, aur cancel ho sakta hai.

| | Promise | Observable |
| --- | --- | --- |
| Kitni values | Ek | Zero, ek ya bahut |
| Kab shuru | Banate hi (eager) | `subscribe` pe (lazy) |
| Cancel | ❌ | ✅ `unsubscribe` |
| Operators | `.then` | `map`, `filter`, `switchMap`, `debounceTime`… |
| Angular mein | Kam | `HttpClient`, forms, router — sab |

**Aise socho:** **Promise** = **courier ka parcel** — ek baar aayega, bas; order de diya to rok nahi sakte. **Observable** = **YouTube channel subscribe** — video aate rehte hain jab tak subscribed ho; unsubscribe karo, aana band.

```typescript
// Promise — ek jawab
fetch('/api/user').then(r => r.json()).then(u => console.log(u));

// Observable — stream, cancel ho sakta hai
const sub = interval(1000).subscribe(n => console.log(n));   // 0, 1, 2, ...
sub.unsubscribe();                                          // band

// Angular HttpClient Observable deta hai — subscribe nahi kiya to request jaayegi hi nahi
this.http.get<User[]>('/api/users').subscribe(u => this.users = u);
```

> Promise = parcel (ek baar). Observable = subscription (baar-baar, band kar sakte ho).

## switchMap vs mergeMap vs concatMap vs exhaustMap — naya aaye to purane ka kya?
? Login button pe user 5 baar jaldi-jaldi click kar de to bhi sirf ek request jaani chahiye — kaunsa operator?
@viz rx-maps
**Ek line:** chaaron "har value pe ek naya observable (jaise API call)" chalate hain. Farak ye hai ki **pehla wala chal hi raha ho aur naya aa jaaye** to kya karein.

| Operator | Naya aaya, purana abhi chal raha hai | Kab use |
| --- | --- | --- |
| `switchMap` | **Purana cancel**, naya chalao | Search box, route params — sirf latest chahiye |
| `mergeMap` | **Dono saath** chalao | Independent kaam — kai files upload |
| `concatMap` | **Line mein lagao** — purana khatam hone do | Order matter kare — save requests ek ke baad ek |
| `exhaustMap` | **Naya ignore** jab tak purana chal raha | Login / submit button — double click |

**Aise socho:** lift ka button —
- `switchMap` = naye floor ka button dabaya to lift **purana floor chhod ke** naye pe jaaye.
- `mergeMap` = har button pe **alag lift** — sab saath chal padein.
- `concatMap` = **line mein** — pehle 3rd floor, phir 7th, order se.
- `exhaustMap` = lift chal rahi hai to **naye button suno hi mat** — pahunch jaaye, phir dekhenge.

```typescript
search.valueChanges.pipe(debounceTime(300), switchMap(q => this.api.search(q)));   // latest hi
files$.pipe(mergeMap(f => this.api.upload(f)));                                   // sab saath
saves$.pipe(concatMap(s => this.api.save(s)));                                    // order se
loginClick$.pipe(exhaustMap(() => this.auth.login(this.form.value)));             // double click ignore
```

! Save button pe `switchMap` — doosra click pehli save request **cancel** kar dega, data aadha save ho sakta hai. Save pe `concatMap` ya `exhaustMap`.

> Sirf latest → switch. Sab saath → merge. Line se → concat. Busy ho to ignore → exhaust.

## Subject vs BehaviorSubject vs ReplaySubject — der se aane wale ko kya milega?
? Logged-in user ki info service mein rakhni hai, aur baad mein bana component bhi turant current user dekhe — kaunsa Subject?
@viz subjects
**Ek line:** teeno se tum khud values bhej sakte ho (`next`). Farak — jo **baad mein subscribe** kare, use **purani value** milegi ya nahi.

| | Shuru mein value | Der se subscribe karne wale ko | Kab use |
| --- | --- | --- | --- |
| `Subject` | Nahi | **Kuch nahi** — sirf aage ki values | Events: button click, "saved" notification |
| `BehaviorSubject` | **Zaroori** | **Latest ek value** turant | Current state: logged-in user, cart, theme |
| `ReplaySubject(n)` | Nahi | **Pichhli n values** | Pichhle kuch messages / history chahiye |

**Aise socho:** cricket match —
- `Subject` = **live TV** — der se on kiya to jo ho chuka wo gaya, aage ka dikhega.
- `BehaviorSubject` = TV ke kone mein **scoreboard** — kabhi bhi on karo, **abhi ka score** turant dikhega.
- `ReplaySubject(3)` = **last 3 overs ka highlights** — on karte hi pichhle 3 overs dikhenge, phir live.

```typescript
const s = new Subject<number>();
s.next(1);
s.subscribe(v => console.log('S', v));   // 1 nahi milega
s.next(2);                               // S 2

const b = new BehaviorSubject<number>(0);
b.next(1);
b.subscribe(v => console.log('B', v));   // B 1 — latest turant
console.log(b.value);                    // 1 — seedha padh bhi sakte ho
```

> Event → Subject. "Abhi ki state" → BehaviorSubject. History → ReplaySubject.

## constructor vs ngOnInit — kaunsa code kahan?
? Component mein @Input se aaye id ke hisaab se API call karni hai — constructor mein karoge ya ngOnInit mein?
**Ek line:** **constructor** = class **banti** hai — sirf services inject karo. **ngOnInit** = Angular ne **inputs set kar diye** — API call aur setup yahan.

| | constructor | ngOnInit |
| --- | --- | --- |
| Kaun bulata | JavaScript (class `new`) | Angular (lifecycle hook) |
| `@Input` values | ❌ Abhi undefined | ✅ Aa chuki |
| Kya karo | Sirf DI (services lena) | API calls, data load, subscriptions |

**Aise socho:** naya ghar — **constructor** = ghar ki **deewarein khadi hui** — abhi furniture (inputs) nahi aaya. **ngOnInit** = saaman **aa gaya**, ab sajao (data load karo).

```typescript
export class OrderComponent implements OnInit {
  @Input() orderId!: number;

  constructor(private api: OrderService) {
    console.log(this.orderId);        // undefined — input abhi nahi aaya
  }

  ngOnInit() {
    this.api.get(this.orderId).subscribe(o => this.order = o);   // ✅ yahan
  }
}
```

> constructor = deewarein (sirf DI). ngOnInit = saaman aa gaya (kaam shuru).

## ngOnChanges vs ngOnInit vs ngOnDestroy — lifecycle ka order
? Parent se aaya @Input baar-baar badalta hai aur har baar data reload karna hai — kaunsa hook?
@viz ng-lifecycle
**Ek line:** **ngOnChanges** = `@Input` **badla** (har baar). **ngOnInit** = component ready (**ek baar**). **ngOnDestroy** = component **hatne wala** hai — safai.

| Hook | Kitni baar | Kya karo |
| --- | --- | --- |
| `ngOnChanges` | Har `@Input` badlav pe (ngOnInit se pehle bhi) | Input ke hisaab se reload |
| `ngOnInit` | **Ek baar** | Pehli baar data load |
| `ngAfterViewInit` | Ek baar | `@ViewChild` wale elements use |
| `ngOnDestroy` | Ek baar, end mein | Unsubscribe, timers clear |

**Aise socho:** naukri — **ngOnInit** = **joining day** (ek baar, sab setup). **ngOnChanges** = har baar **manager naya task** de (input badla). **ngOnDestroy** = **last working day** — laptop lautao, access band karo (unsubscribe).

```typescript
ngOnChanges(ch: SimpleChanges) {
  if (ch['vehicleId']) this.load(ch['vehicleId'].currentValue);   // har badlav pe
}
ngOnInit() { this.timer = setInterval(() => this.refresh(), 30000); }
ngOnDestroy() { clearInterval(this.timer); this.sub?.unsubscribe(); }   // safai
```

> Joining = OnInit. Naya task = OnChanges. Last day = OnDestroy.

## *ngIf vs [hidden] — element hatta hai ya chhupta hai?
? Ek bhaari chart wala tab hai jo user kabhi-kabhi kholta hai — *ngIf use karoge ya [hidden]?
**Ek line:** `*ngIf` false hone pe element **DOM se hata deta** hai (component destroy). `[hidden]` element **DOM mein rakhta** hai, sirf CSS se chhupata hai.

| | `*ngIf` / `@if` | `[hidden]` |
| --- | --- | --- |
| DOM mein rehta? | ❌ Hat jaata | ✅ Rehta hai |
| Component ka kya | Destroy, dobara dikhe to naya bane (ngOnInit phir chalega) | Zinda rehta, state bachi rehti |
| Kab achha | Bhaari cheez, kabhi-kabhi dikhe | Baar-baar toggle, state bachani hai |

**Aise socho:** `*ngIf` = mehmaan aaye to **sofa bahar se laao**, jaaye to **wapas godown mein**. `[hidden]` = sofa kamre mein hi hai, bas **chadar dhak di**.

```html
@if (showChart) { <app-heavy-chart /> }          <!-- false → component destroy -->
<app-filters [hidden]="!showFilters" />          <!-- sirf chhupa, state bachi -->
```

> Hatana hai → ngIf. Sirf chhupana hai → hidden.

## var vs let vs const — JavaScript mein
? Loop ke andar setTimeout mein i print karna hai aur 0, 1, 2 chahiye — var loge ya let?
**Ek line:** `var` = **function** bhar mein dikhta hai, pehle use karo to `undefined`. `let` = sirf **{ } block** mein, dobara value de sakte ho. `const` = block mein, **dobara assign nahi** (par object ke andar badal sakte ho).

| | Scope | Dobara assign | Declare se pehle use |
| --- | --- | --- | --- |
| `var` | Function | ✅ | `undefined` (hoisting) |
| `let` | Block `{ }` | ✅ | ❌ Error |
| `const` | Block `{ }` | ❌ | ❌ Error |

**Aise socho:** `var` = ghar ka **common TV** — kisi bhi kamre (block) se dikhta hai, sab ek hi use karte hain. `let` = **kamre ka apna TV** — sirf usi kamre mein. `const` = kamre ka TV jo **deewar pe fit** hai — badal nahi sakte, par channel (andar ki values) badal sakte ho.

```javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3 — ek hi i
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j));   // 0 1 2 — har baar naya j

const user = { name: 'Asha' };
user.name = 'Ravi';     // ✅ andar badal sakte ho
// user = {};           // ❌ dobara assign nahi
```

> Default `const`, badalna ho to `let`, `var` kabhi nahi.

## == vs === aur null vs undefined — JavaScript
? API se aaya "0" string aur number 0 compare karna hai — == lagaoge ya ===?
**Ek line:** `==` pehle **type badal ke** compare karta hai (surprise deta hai). `===` **type aur value dono** check karta hai. `undefined` = value **di hi nahi**; `null` = **jaan-boojh ke khaali**.

| | `0 == "0"` | `0 === "0"` | `null == undefined` | `null === undefined` |
| --- | --- | --- | --- | --- |
| Result | `true` | `false` | `true` | `false` |

**Aise socho:** `==` = "dono **kaagaz pe ₹500** likha hai na? same hai" — chahe ek note ho, ek cheque. `===` = "dono **₹500 ke note** hain?" — type bhi same chahiye. `undefined` = form ka field **bhara hi nahi**. `null` = field mein likha "**N/A**" — jaan-boojh ke khaali.

```javascript
0 == ''            // true  😬
0 === ''           // false
let a;             // undefined — value di hi nahi
let b = null;      // null — khud khaali rakha
if (x == null) {}  // null aur undefined dono pakadta hai — ye ek jagah theek hai
```

> Hamesha `===`. undefined = diya hi nahi, null = jaan ke khaali.
