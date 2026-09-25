# Tricky — Angular, RxJS aur JavaScript

## Service call kiya par network tab mein request nahi dikhi
```typescript q
deleteOrder(id: number) {
  this.http.delete(`/api/orders/${id}`);
  this.toast.show('Deleted');
}
```
Request **gayi hi nahi** — aur user ko "Deleted" bhi dikh gaya!

`HttpClient` ke methods **cold Observable** lautate hain — Observable **lazy** hai, `subscribe()` (ya `async` pipe, `firstValueFrom`) ke bina execute hi nahi hota. Fix: subscribe karo, aur success message response aane ke baad dikhao.

```typescript
deleteOrder(id: number) {
  this.http.delete(`/api/orders/${id}`).subscribe({
    next: () => this.toast.show('Deleted'),
    error: () => this.toast.show('Delete failed')
  });
}
```

> Observable lazy hai — subscribe = execute.

## Template mein async pipe do baar — kitni API calls?
```html q
<h2>{{ (user$ | async)?.name }}</h2>
<p>{{ (user$ | async)?.email }}</p>
<!-- user$ = this.http.get<User>('/api/me') -->
```
**Do HTTP calls.** Har `async` pipe apna alag subscription banata hai, aur HttpClient observable **cold** hai — har subscriber ke liye nayi request.

Fix: ek hi baar subscribe karke variable mein rakho — `@if (user$ | async; as user) { … user.name … user.email }` — ya observable ko `shareReplay(1)` se share karo.

```html
@if (user$ | async; as user) {
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
}
```

## OnPush component mein array mein push kiya — screen update nahi hui
```typescript q
// Parent
this.items.push(newItem);

// Child
@Component({ selector: 'app-list', changeDetection: ChangeDetectionStrategy.OnPush, ... })
export class ListComponent { @Input() items: Item[] = []; }
```
Child ki list **update nahi hogi**. OnPush component tabhi check hota hai jab `@Input` ka **reference** badle (ya event/async pipe/markForCheck). `push` same array ko badalta hai — reference wahi, Angular ko lagta hai kuch nahi badla.

Fix: naya array — `this.items = [...this.items, newItem];`. Object ke liye `{ ...obj, name: 'x' }`. Isliye OnPush ke saath immutable updates ka pattern.

## Route /orders/1 se /orders/2 — data purana hi dikh raha hai
```typescript q
ngOnInit() {
  const id = Number(this.route.snapshot.paramMap.get('id'));
  this.api.getOrder(id).subscribe(o => this.order = o);
}
```
Same component pe sirf parameter badla to Angular **component reuse** karta hai — naya nahi banata — isliye **`ngOnInit` dobara nahi chalta**, aur `snapshot` purani value hi rakhta hai. Screen pe order 1 hi dikhta rehta hai.

Fix: `paramMap` **observable** pe subscribe karo aur `switchMap` se data laao — har param change pe naya data, aur purani request cancel.

```typescript
order$ = this.route.paramMap.pipe(
  map(p => Number(p.get('id'))),
  switchMap(id => this.api.getOrder(id))
);
```

## Constructor mein @Input undefined kyun?
```typescript q
export class ChildComponent {
  @Input() userId!: number;
  constructor(private api: UserService) {
    this.api.load(this.userId);
  }
}
```
`this.userId` **undefined** hai. Angular pehle class ka object banata hai (constructor chalta hai), **phir** inputs set karta hai, phir `ngOnChanges` aur `ngOnInit`. Constructor ke waqt input abhi aaya hi nahi.

Fix: logic `ngOnInit` mein (ya `ngOnChanges` agar input baad mein badal sakta hai). Constructor sirf DI ke liye.

## switchMap save button pe laga diya
```typescript q
this.saveClick$.pipe(
  switchMap(() => this.api.save(this.form.value))
).subscribe();
```
User jaldi-jaldi do baar save dabaye (ya auto-save har change pe) to **pehla save cancel** ho sakta hai — agar pehli request ka jawab aane se pehle doosra click aaya, to switchMap pehli ko unsubscribe kar deta hai (HTTP abort). Server pe kabhi pahunchi, kabhi nahi — unpredictable data loss.

Save ke liye: **`concatMap`** (har save order mein, koi nahi chhootega) ya **`exhaustMap`** (chalte save ke dauraan naye clicks ignore — double-submit rokne ke liye). `switchMap` sirf wahan jahan purana result bekaar ho (search).

## catchError kahan lagaya — stream mar gayi
```typescript q
this.search$.pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
  catchError(() => of([]))
).subscribe(r => this.results = r);
```
Pehli API error ke baad **search hamesha ke liye band** ho jaata hai. Jab error outer stream tak aata hai, `catchError` use fallback observable (`of([])`) se **replace** kar deta hai — jo ek value deke complete ho jaata hai. Outer stream khatam; agli typing pe kuch nahi hota.

Fix: `catchError` **inner** observable pe lagao (switchMap ke andar), taaki sirf wo ek request fail ho, outer stream zinda rahe.

```typescript
switchMap(q => this.api.search(q).pipe(catchError(() => of([]))))
```

> error observable ko terminate karta hai — jahan catch karoge usse upar tak sab khatam.

## forkJoin kabhi emit hi nahi kar raha
```typescript q
forkJoin({
  user:   this.api.getUser(),
  filter: this.filterCtrl.valueChanges
}).subscribe(r => console.log(r));
```
**Kabhi kuch print nahi hoga.** `forkJoin` tab emit karta hai jab **saare** observables **complete** ho jaayein, aur har ki **last value** deta hai. HTTP complete ho jaata hai, par `valueChanges` (form, interval, Subject, store) **kabhi complete nahi** hota → forkJoin hamesha wait karta rahega.

Jab ek stream lagataar values deti hai aur tumhe har baar latest combination chahiye → **`combineLatest`**. `forkJoin` sirf finite, ek-baar wale calls (parallel HTTP requests) ke liye. Aur agar forkJoin ka koi source bina value ke complete ho jaaye to forkJoin bhi bina value complete ho jaata hai.

## Subject vs BehaviorSubject — late subscriber ko kya milega?
```typescript q
const s  = new Subject<number>();
const bs = new BehaviorSubject<number>(0);

s.next(1);  bs.next(1);

s.subscribe(v  => console.log('S',  v));
bs.subscribe(v => console.log('BS', v));

s.next(2);  bs.next(2);
```
Output: **`BS 1`**, phir **`S 2`**, **`BS 2`**.

`Subject` sirf **subscribe ke baad** ki values deta hai — 1 pehle aaya tha, `S` ko nahi mila. `BehaviorSubject` **latest value yaad rakhta hai** aur naye subscriber ko turant deta hai (isliye initial value zaroori). State (current user, cart) ke liye BehaviorSubject; events (button clicked) ke liye Subject. `ReplaySubject(n)` aakhri n values replay karta hai.

## ngModel lagaya — "Can't bind to 'ngModel'" error
```html q
<input [(ngModel)]="name" />
<!-- Error: Can't bind to 'ngModel' since it isn't a known property of 'input' -->
```
`ngModel` directive **`FormsModule`** mein hai, aur component ne use import nahi kiya. Standalone component ke `imports: [FormsModule]` mein daalo (ya purane style mein module ke imports mein). Reactive forms ke `formControlName`/`[formGroup]` ke liye `ReactiveFormsModule`. Yahi error pattern kisi bhi directive/component ke liye aata hai jo import nahi hua.

## ExpressionChangedAfterItHasBeenCheckedError kya hai?
```typescript q
ngAfterViewInit() {
  this.title = 'Loaded';     // template mein {{ title }} hai
}
```
**Development mode** mein Angular change detection ke baad ek **doosra check** chalata hai ki values stable hain. Agar pehle check ke baad kisi lifecycle hook (jaise `ngAfterViewInit`) ne binding wali value badal di, to dono checks mein farak → ye error. Production mein doosra check nahi hota — error nahi dikhta, par UI purani value dikha sakta hai (asli bug).

Fix: value pehle set karo (`ngOnInit`, ya constructor); agar view ke baad hi pata chalti hai to design badlo, ya aakhri upay `ChangeDetectorRef.detectChanges()` / agle tick mein set karna. Aksar ye parent-child ke beech data flow galat hone ka sign hai.

## Card ke andar button — dono ke click chal gaye
```html q
<div class="card" (click)="openDetails(order)">
  {{ order.id }}
  <button (click)="delete(order)">Delete</button>
</div>
```
Delete dabaya to **delete bhi hua aur details bhi khul gayi**. DOM events **bubble** karte hain — button ka click upar parent div tak jaata hai, aur div ka handler bhi chalta hai.

Fix: button handler mein propagation roko.

```html
<button (click)="delete(order); $event.stopPropagation()">Delete</button>
```

## trackBy nahi lagaya — input ka focus chala gaya
```html q
<div *ngFor="let row of rows">
  <input [value]="row.name" />
</div>
<!-- har 10 second polling se rows = naya array from API -->
```
Har polling pe user ka **typing ka focus chala jaata hai**, aur list flicker karti hai. Naya array aane pe bina `trackBy` ke Angular objects ko **reference se** pehchaanta hai — API se naye objects aaye, to wo sochta hai saari rows nayi hain, aur **saare DOM elements destroy karke dobara banata hai**. Focused input bhi destroy.

Fix: `trackBy` / `track` se stable id do — Angular sirf badli rows update karega.

```html
@for (row of rows; track row.id) { <input [value]="row.name" /> }
```

## Interceptors kis order mein chalte hain?
```typescript q
provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor, errorInterceptor]))
```
**Request** jaate waqt: array ke order mein — `auth → logging → error → server`. **Response** aate waqt: **ulta** — `server → error → logging → auth`. Har interceptor `next(req)` bula ke aage bhejta hai, aur response usi chain se wapas aata hai (middleware jaisa).

Isliye order matter karta hai: jaise logging ko auth header ke saath request dekhni hai to logging, auth ke baad aana chahiye; retry interceptor ko error handler se pehle hona chahiye taaki pehle retry ho, phir error dikhe.

## Event loop — setTimeout, Promise aur console.log
```javascript q
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
```
Output: **`A D C B`**.

JavaScript single-threaded hai. Pehle poora **synchronous code** chalta hai: A, D. Phir **microtask queue** (Promise callbacks, `queueMicrotask`) poori khaali hoti hai: C. Phir **macrotask queue** (setTimeout, setInterval, I/O events) se ek task: B. `setTimeout(fn, 0)` ka matlab "turant" nahi — "current kaam aur saare microtasks ke baad".

> sync → microtasks (Promise) → macrotasks (setTimeout).

## == vs === JavaScript mein
```javascript q
console.log(0 == '0', 0 === '0');
console.log(null == undefined, null === undefined);
console.log('' == 0, [] == false);
console.log(NaN === NaN);
```
Output: **`true false`**, **`true false`**, **`true true`**, **`false`**.

`==` compare karne se pehle **type coercion** karta hai (dono ko ek type mein badalta hai) — isliye ajeeb results: `'' == 0` true, `[] == false` true. `===` type aur value dono compare karta hai, koi conversion nahi. TypeScript/Angular mein **hamesha `===`**. Ek exception jo log jaan-boojh ke use karte hain: `x == null` — null aur undefined dono pakadta hai.

`NaN` kisi ke bhi barabar nahi, khud ke bhi nahi — check ke liye `Number.isNaN(x)`.

## typeof null aur array ka type
```javascript q
console.log(typeof null);
console.log(typeof []);
console.log(typeof function () {});
console.log(Array.isArray([]));
```
Output: **`object`**, **`object`**, **`function`**, **`true`**.

`typeof null === 'object'` JavaScript ka **purana bug** hai jo compatibility ke liye kabhi fix nahi hua. Array bhi object hi hai, to `typeof` se array pehchaan nahi sakte — `Array.isArray()` use karo. Null check ke liye `x === null`.

## var vs let — loop mein setTimeout
```javascript q
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j));
```
Output: **`3 3 3`**, phir **`0 1 2`**.

`var` **function-scoped** hai — poore loop mein ek hi `i`. Callbacks baad mein chalte hain jab loop khatam ho chuka (i = 3). `let` **block-scoped** hai aur loop har iteration ke liye **naya binding** banata hai, to har callback apni value pakadta hai. C# ke for-loop closure wale trap jaisa hi. Modern code mein `var` mat use karo — `let` / `const`.

## + aur - strings ke saath
```javascript q
console.log('5' + 2);
console.log('5' - 2);
console.log('5' * '2');
console.log([1, 2] + [3]);
console.log(1 + 2 + '3');
```
Output: **`52`**, **`3`**, **`10`**, **`1,23`**, **`33`**.

`+` ka ek operand string ho to **concatenation**. Baaki arithmetic operators (`-`, `*`, `/`) strings ko **number mein convert** karte hain. Arrays `+` pe string bante hain (`"1,2"` + `"3"`). Left-to-right: `1 + 2 = 3`, phir `3 + '3' = '33'`. Form inputs hamesha string dete hain — jodne se pehle `Number(x)` / `+x`, warna `'5' + 2 = '52'` wala bug.

## const object ki property badli
```javascript q
const user = { name: 'A' };
user.name = 'B';
user = { name: 'C' };
```
`user.name = 'B'` **chalta hai**; `user = {...}` **TypeError** (TypeScript mein compile error).

`const` sirf **variable binding** ko lock karta hai — `user` hamesha isi object ko point karega. Object khud **mutable** hai. C# ke `readonly` reference jaisa. Poora freeze chahiye to `Object.freeze(user)` (shallow) ya TypeScript mein `Readonly<T>` / `as const`.

## Spread se copy kiya, phir nested value badli
```javascript q
const a = { name: 'A', address: { city: 'Pune' } };
const b = { ...a };
b.name = 'B';
b.address.city = 'Mumbai';
console.log(a.name, a.address.city);
```
Output: **`A Mumbai`**.

Spread (`{...a}`) **shallow copy** hai — sirf top level properties copy hoti hain. `address` ek object hai, to uska **reference** copy hua — `a.address` aur `b.address` **same object**. `name` string (primitive) thi, alag copy ban gayi.

Deep copy ke liye `structuredClone(a)`, ya nested ko bhi spread karo (`{ ...a, address: { ...a.address } }`). NgRx/OnPush jaise immutable patterns mein ye galti state ko chupke se mutate kar deti hai.

## Arrow function vs normal function mein this
```typescript q
class Timer {
  seconds = 0;
  startA() { setInterval(function () { this.seconds++; }, 1000); }
  startB() { setInterval(() => { this.seconds++; }, 1000); }
}
```
`startA` **kaam nahi karega** — normal `function` ka `this` call ke tareeke se decide hota hai; `setInterval` use bina object ke call karta hai, to `this` class instance nahi hai (strict mode mein `undefined` → error). `startB` **sahi chalega** — arrow function ka apna `this` nahi hota, wo bahar wale scope ka (class instance) `this` use karta hai.

Angular mein callbacks (`subscribe`, `setTimeout`, event listeners) mein hamesha arrow functions — isi wajah se.

## 0.1 + 0.2 JavaScript mein
```javascript q
console.log(0.1 + 0.2);
console.log(0.1 + 0.2 === 0.3);
console.log((0.1 + 0.2).toFixed(2));
```
Output: **`0.30000000000000004`**, **`false`**, **`"0.30"`** (string).

JavaScript mein **har number double** (IEEE 754) hai — C# ke `double` jaisi hi problem. Paise frontend pe calculate karne se bacho; ya paise (rupaye) ko **paise (integer)** mein rakho (₹10.50 = 1050), ya decimal library. Display ke liye `toFixed` — par wo string lautata hai. Final amount hamesha backend (`decimal`) calculate kare.

## Observable ka unsubscribe bhool gaye — kya hoga?
```typescript q
export class DashboardComponent implements OnInit {
  ngOnInit() {
    interval(5000).pipe(switchMap(() => this.api.stats()))
      .subscribe(s => this.stats = s);
  }
}
// User dashboard pe 5 baar aaya-gaya
```
**5 polling loops ek saath** chal rahe hain — har 5 second pe 5 API calls, destroy ho chuke components ke liye bhi. `interval` kabhi complete nahi hota; component destroy hone se subscription apne aap band nahi hoti. Memory leak + server pe bekaar load, aur app use karte-karte slow.

Fix: `takeUntilDestroyed()` ya `async` pipe.

```typescript
stats$ = interval(5000).pipe(switchMap(() => this.api.stats()));   // template: stats$ | async
// ya
constructor() {
  interval(5000).pipe(switchMap(() => this.api.stats()), takeUntilDestroyed())
    .subscribe(s => this.stats = s);
}
```

## Promise.all mein ek fail hua
```javascript q
const results = await Promise.all([
  fetch('/api/a'),
  Promise.reject(new Error('b failed')),
  fetch('/api/c')
]);
```
`Promise.all` **turant reject** ho jaata hai pehli failure pe (`b failed`) — baaki ke results nahi milte (requests phir bhi background mein chalti rehti hain, cancel nahi hoti). RxJS ka `forkJoin` bhi aisa hi hai.

Har ek ka result chahiye, chahe kuch fail hon, to **`Promise.allSettled`** — har promise ka `{ status: 'fulfilled', value }` ya `{ status: 'rejected', reason }`. Aur `fetch` HTTP 404/500 pe reject **nahi** karta — sirf network failure pe; status `response.ok` se check karna padta hai.
